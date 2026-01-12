import axios from 'axios';
import { config } from '../config';
import {
  DiscordWebhookPayload,
  DiscordEmbed,
  PipelineResult,
  KeywordMetric,
} from '../types';

/**
 * Discord notification service using Webhooks.
 * Sends rich embed messages to Discord channels.
 */

// Embed colors (decimal format)
const COLORS = {
  SUCCESS: 0x22c55e, // green-500
  ERROR: 0xef4444, // red-500
  WARNING: 0xf59e0b, // amber-500
  INFO: 0x3b82f6, // blue-500
};

// Maximum retry attempts for failed requests
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * Delay utility for retry logic.
 */
async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Sends a webhook payload to Discord with retry logic.
 * @param payload - Discord webhook payload
 * @returns true if successful, false otherwise
 */
async function sendWebhook(payload: DiscordWebhookPayload): Promise<boolean> {
  const webhookUrl = config.discordWebhookUrl;

  if (!webhookUrl) {
    console.log('⚠️ Discord webhook URL not configured, skipping notification');
    return false;
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await axios.post(webhookUrl, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      });

      console.log('✅ Discord notification sent successfully');
      return true;
    } catch (error) {
      const isLastAttempt = attempt === MAX_RETRIES;

      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = error.response?.data?.message || error.message;

        // Rate limit handling
        if (status === 429) {
          const retryAfter = error.response?.headers['retry-after'] || 5;
          console.log(`⏳ Rate limited, waiting ${retryAfter}s...`);
          await delay(Number(retryAfter) * 1000);
          continue;
        }

        console.error(
          `❌ Discord webhook error (attempt ${attempt}/${MAX_RETRIES}):`,
          `Status: ${status}, Message: ${message}`
        );
      } else {
        console.error(
          `❌ Discord webhook error (attempt ${attempt}/${MAX_RETRIES}):`,
          error
        );
      }

      if (!isLastAttempt) {
        await delay(RETRY_DELAY_MS * attempt);
      }
    }
  }

  console.error('❌ Failed to send Discord notification after all retries');
  return false;
}

/**
 * Truncates text to fit Discord limits.
 * @param text - Text to truncate
 * @param maxLength - Maximum length (default: 1024 for embed fields)
 */
function truncateText(text: string, maxLength: number = 1024): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Formats duration in human-readable format.
 */
function formatDuration(startTime: Date, endTime: Date): string {
  const durationMs = endTime.getTime() - startTime.getTime();
  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 0) {
    return `${minutes}分${remainingSeconds}秒`;
  }
  return `${seconds}秒`;
}

/**
 * Gets top keywords by lowest competition.
 */
function getTopKeywords(metrics: KeywordMetric[], count: number = 3): string {
  if (metrics.length === 0) return '無';

  const sorted = [...metrics].sort(
    (a, b) => a.allInTitleCount - b.allInTitleCount
  );

  return sorted
    .slice(0, count)
    .map((m, i) => `${i + 1}. \`${m.keyword}\` (競爭度: ${m.allInTitleCount})`)
    .join('\n');
}

/**
 * Calculates statistics from keyword metrics.
 */
function calculateStats(metrics: KeywordMetric[]): {
  avgCompetition: number;
  minCompetition: number;
  maxCompetition: number;
} {
  if (metrics.length === 0) {
    return { avgCompetition: 0, minCompetition: 0, maxCompetition: 0 };
  }

  const competitions = metrics.map((m) => m.allInTitleCount);
  return {
    avgCompetition: Math.round(
      competitions.reduce((a, b) => a + b, 0) / competitions.length
    ),
    minCompetition: Math.min(...competitions),
    maxCompetition: Math.max(...competitions),
  };
}

/**
 * Builds a success embed for pipeline completion.
 * Only includes basic stats, AI summary will be sent as separate message.
 */
function buildSuccessEmbed(result: PipelineResult): DiscordEmbed {
  const stats = calculateStats(result.metrics);
  const duration = formatDuration(result.startTime, result.endTime);

  const embed: DiscordEmbed = {
    title: '🎉 關鍵字探索完成',
    description: `成功找到 **${result.totalKeywords}** 個低競爭關鍵字！`,
    color: COLORS.SUCCESS,
    fields: [
      {
        name: '📊 統計數據',
        value: [
          `• 總關鍵字數：${result.totalKeywords}`,
          `• 平均競爭度：${stats.avgCompetition}`,
          `• 最低競爭度：${stats.minCompetition}`,
          `• 最高競爭度：${stats.maxCompetition}`,
        ].join('\n'),
        inline: true,
      },
      {
        name: '⏱️ 執行時間',
        value: duration,
        inline: true,
      },
      {
        name: '🏆 Top 3 推薦關鍵字',
        value: getTopKeywords(result.metrics, 3),
        inline: false,
      },
    ],
    footer: { text: 'Keyword Pipeline Auto' },
    timestamp: result.endTime.toISOString(),
  };

  // AI summary will be sent as separate plain text message
  // to avoid character limits and preserve markdown formatting

  return embed;
}

/**
 * Builds an error embed for pipeline failure.
 */
function buildErrorEmbed(result: PipelineResult): DiscordEmbed {
  const duration = formatDuration(result.startTime, result.endTime);

  return {
    title: '❌ 關鍵字探索失敗',
    description: '執行過程中發生錯誤',
    color: COLORS.ERROR,
    fields: [
      {
        name: '錯誤訊息',
        value: truncateText(result.error || '未知錯誤', 1024),
        inline: false,
      },
      {
        name: '⏱️ 執行時間',
        value: duration,
        inline: true,
      },
      {
        name: '📊 處理進度',
        value: `已找到 ${result.totalKeywords} 個關鍵字`,
        inline: true,
      },
    ],
    footer: { text: 'Keyword Pipeline Auto' },
    timestamp: result.endTime.toISOString(),
  };
}

/**
 * Discord message character limit
 */
const DISCORD_MESSAGE_LIMIT = 2000;

/**
 * Splits a long message into chunks that fit Discord's character limit.
 * Tries to split at newlines to preserve formatting.
 * @param message - The message to split
 * @param maxLength - Maximum length per chunk (default: 2000)
 * @returns Array of message chunks
 */
function splitMessage(message: string, maxLength: number = DISCORD_MESSAGE_LIMIT): string[] {
  if (message.length <= maxLength) {
    return [message];
  }

  const chunks: string[] = [];
  let remaining = message;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    // Try to find a good split point (newline) before the limit
    let splitIndex = remaining.lastIndexOf('\n', maxLength);

    // If no newline found, try to split at a space
    if (splitIndex === -1 || splitIndex < maxLength * 0.5) {
      splitIndex = remaining.lastIndexOf(' ', maxLength);
    }

    // If still no good split point, force split at limit
    if (splitIndex === -1 || splitIndex < maxLength * 0.5) {
      splitIndex = maxLength;
    }

    chunks.push(remaining.slice(0, splitIndex));
    remaining = remaining.slice(splitIndex).trimStart();
  }

  return chunks;
}

/**
 * Sends pipeline completion notification to Discord.
 * For success: sends embed + AI summary as separate plain text messages
 * For failure: sends error embed only
 * @param result - Pipeline execution result
 * @returns true if notification sent successfully
 */
export async function sendPipelineNotification(
  result: PipelineResult
): Promise<boolean> {
  if (result.success) {
    // Send success embed first
    const embed = buildSuccessEmbed(result);
    const embedPayload: DiscordWebhookPayload = {
      username: 'Keyword Pipeline',
      embeds: [embed],
    };

    const embedSent = await sendWebhook(embedPayload);
    if (!embedSent) return false;

    // Send AI summary as plain text message(s) to preserve markdown formatting
    if (result.aiSummary) {
      const summaryHeader = '## 🤖 AI 分析總結\n\n';
      const fullSummary = summaryHeader + result.aiSummary;
      const chunks = splitMessage(fullSummary);

      for (const chunk of chunks) {
        const textPayload: DiscordWebhookPayload = {
          content: chunk,
          username: 'Keyword Pipeline',
        };
        await sendWebhook(textPayload);
        // Small delay between messages to maintain order
        await delay(500);
      }
    }

    return true;
  } else {
    // Send error embed
    const embed = buildErrorEmbed(result);
    const payload: DiscordWebhookPayload = {
      username: 'Keyword Pipeline',
      embeds: [embed],
    };
    return sendWebhook(payload);
  }
}

/**
 * Sends a simple text message to Discord.
 * Useful for quick notifications or testing.
 * @param message - Text message to send
 */
export async function sendSimpleMessage(message: string): Promise<boolean> {
  const payload: DiscordWebhookPayload = {
    content: message,
    username: 'Keyword Pipeline',
  };

  return sendWebhook(payload);
}

/**
 * Sends a custom embed to Discord.
 * @param embed - Custom Discord embed
 */
export async function sendCustomEmbed(embed: DiscordEmbed): Promise<boolean> {
  const payload: DiscordWebhookPayload = {
    username: 'Keyword Pipeline',
    embeds: [embed],
  };

  return sendWebhook(payload);
}

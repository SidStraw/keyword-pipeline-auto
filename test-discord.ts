/**
 * Test script for Discord webhook integration.
 * Run with: npx ts-node test-discord.ts
 */

import { config } from './src/config';
import {
  sendPipelineNotification,
  sendSimpleMessage,
} from './src/services/discordService';
import { PipelineResult, KeywordMetric } from './src/types';

async function testDiscord(): Promise<void> {
  console.log('🧪 Testing Discord Webhook Integration\n');

  // Check if webhook URL is configured
  if (!config.discordWebhookUrl) {
    console.error('❌ DISCORD_WEBHOOK_URL not configured in .env');
    console.log('Please add: DISCORD_WEBHOOK_URL=your_webhook_url');
    process.exit(1);
  }

  console.log('✓ Webhook URL configured\n');

  // Test 1: Simple message
  console.log('📤 Test 1: Sending simple message...');
  const simpleResult = await sendSimpleMessage(
    '🧪 測試訊息：Discord Webhook 連線成功！'
  );
  console.log(simpleResult ? '✅ Simple message sent\n' : '❌ Failed\n');

  // Test 2: Success notification with mock data
  console.log('📤 Test 2: Sending success notification...');

  const mockMetrics: KeywordMetric[] = [
    { keyword: 'svg to jsx converter', source: 'google', totalResults: 50000, allInTitleCount: 12 },
    { keyword: 'json validator online', source: 'google', totalResults: 80000, allInTitleCount: 25 },
    { keyword: 'pdf merger free', source: 'google', totalResults: 120000, allInTitleCount: 38 },
    { keyword: 'markdown editor web', source: 'google', totalResults: 45000, allInTitleCount: 18 },
    { keyword: 'base64 encoder decoder', source: 'google', totalResults: 65000, allInTitleCount: 22 },
  ];

  const successResult: PipelineResult = {
    success: true,
    totalKeywords: mockMetrics.length,
    metrics: mockMetrics,
    aiSummary: `## 📊 總體評估

這批關鍵字整體競爭度偏低，都是實用型工具關鍵字，SEO 潛力很高！

## 🏆 優先建議

1. **svg to jsx converter** - 競爭度最低，開發者需求穩定
2. **markdown editor web** - 內容創作者剛需
3. **base64 encoder decoder** - 技術人員常用工具

## 📝 內容策略

建議製作工具型落地頁，搭配使用教學文章。

## ⚡ 下一步行動

1. 優先開發 SVG to JSX 轉換工具
2. 撰寫相關 SEO 文章
3. 建立 backlink 策略`,
    startTime: new Date(Date.now() - 120000), // 2 minutes ago
    endTime: new Date(),
    seeds: ['svg converter', 'online tools', 'developer utilities'],
  };

  const successNotification = await sendPipelineNotification(successResult);
  console.log(successNotification ? '✅ Success notification sent\n' : '❌ Failed\n');

  // Test 3: Error notification
  console.log('📤 Test 3: Sending error notification...');

  const errorResult: PipelineResult = {
    success: false,
    totalKeywords: 2,
    metrics: mockMetrics.slice(0, 2),
    aiSummary: null,
    error: 'API rate limit exceeded: Too many requests to Serper API',
    startTime: new Date(Date.now() - 45000), // 45 seconds ago
    endTime: new Date(),
    seeds: ['svg converter'],
  };

  const errorNotification = await sendPipelineNotification(errorResult);
  console.log(errorNotification ? '✅ Error notification sent\n' : '❌ Failed\n');

  console.log('🎉 Discord webhook tests completed!');
  console.log('Please check your Discord channel for the test messages.');
}

// Run tests
testDiscord().catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});

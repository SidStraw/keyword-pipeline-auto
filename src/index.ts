import { config } from './config';
import { fetchSuggestions, analyzeCompetition } from './services/keywordService';
import { saveKeywords } from './services/sheetService';
import { generateNicheIdeas, summarizeKeywordResults } from './services/aiService';
import { sendPipelineNotification } from './services/discordService';
import { KeywordMetric, PipelineResult } from './types';
import * as fs from 'fs';
import * as path from 'path';

// Maximum suggestions to process per seed (to save API credits)
const MAX_SUGGESTIONS_PER_SEED = 5;

// Maximum allInTitleCount threshold for filtering opportunities
// 注意：由於 Serper API 限制，我們使用估算值
// <= 50 表示低競爭（實際結果較少）
const MAX_ALLINTITLE_THRESHOLD = 50;

function formatDuration(startTime: Date, endTime: Date): string {
  const durationMs = endTime.getTime() - startTime.getTime();
  const totalSeconds = Math.floor(durationMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  return parts.join(' ');
}

function getTopKeywords(metrics: KeywordMetric[], count: number = 5): string {
  if (metrics.length === 0) {
    return '- None';
  }

  // "Top" here refers to the best opportunities with the lowest competition values
  const sorted = [...metrics].sort(
    (a, b) => a.allInTitleCount - b.allInTitleCount
  );

  return sorted
    .slice(0, count)
    .map(
      (m, i) =>
        `- ${i + 1}. \`${m.keyword}\` (competition: ${m.allInTitleCount})`
    )
    .join('\n');
}

function getAllKeywordsTable(metrics: KeywordMetric[]): string {
  if (metrics.length === 0) {
    return '*No keywords found*';
  }

  // Sort by competition (ascending) for display
  const sorted = [...metrics].sort(
    (a, b) => a.allInTitleCount - b.allInTitleCount
  );

  const header = '| # | Keyword | Competition | Source |';
  const separator = '|---|---------|-------------|--------|';
  const rows = sorted.map(
    (m, i) => `| ${i + 1} | ${m.keyword} | ${m.allInTitleCount} | ${m.source} |`
  );

  return [header, separator, ...rows].join('\n');
}

function getLogPaths(endTime: Date): {
  absoluteDir: string;
  absolutePath: string;
  relativePath: string;
} {
  const year = endTime.getUTCFullYear();
  const month = String(endTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(endTime.getUTCDate()).padStart(2, '0');
  const hour = String(endTime.getUTCHours()).padStart(2, '0');
  const minute = String(endTime.getUTCMinutes()).padStart(2, '0');
  const second = String(endTime.getUTCSeconds()).padStart(2, '0');

  const folder = `${year}_${month}`;
  const filename = `${day}_${hour}${minute}${second}.md`;

  const absoluteDir = path.resolve('logs', folder);
  const absolutePath = path.join(absoluteDir, filename);
  // Use POSIX paths for index entries to keep GitHub Pages URLs consistent
  const relativePath = path.posix.join(folder, filename);

  return { absoluteDir, absolutePath, relativePath };
}

function updateLogsIndex(relativePath: string): void {
  const indexPath = path.resolve('logs', 'index.json');
  let entries: string[] = [];

  if (fs.existsSync(indexPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
      if (Array.isArray(existing)) {
        entries = existing.filter((item): item is string => typeof item === 'string');
      } else {
        console.warn('⚠️ logs/index.json is not an array. Recreating index.');
      }
    } catch (error) {
      console.error('⚠️ Unable to parse existing logs/index.json, recreating it.', error);
    }
  }

  if (!entries.includes(relativePath)) {
    entries.push(relativePath);
  }

  entries.sort();
  fs.writeFileSync(indexPath, JSON.stringify(entries, null, 2), 'utf-8');
}

function writeRunLog(result: PipelineResult): string | null {
  if (!result.success) {
    return null;
  }

  try {
    const { absoluteDir, absolutePath, relativePath } = getLogPaths(result.endTime);
    fs.mkdirSync(absoluteDir, { recursive: true });

    const duration = formatDuration(result.startTime, result.endTime);
    const topKeywords = getTopKeywords(result.metrics, 5);
    const allKeywordsTable = getAllKeywordsTable(result.metrics);
    const seedsList = result.seeds.length > 0
      ? result.seeds.map((s, i) => `${i + 1}. \`${s}\``).join('\n')
      : '*No seeds provided*';

    const contentLines = [
      '# Keyword Pipeline Result (UTC)',
      '',
      '- Status: Success',
      `- Started at: ${result.startTime.toISOString()}`,
      `- Finished at: ${result.endTime.toISOString()}`,
      `- Duration: ${duration}`,
      `- Keywords found: ${result.totalKeywords}`,
      '',
      '## Seeds Used',
      seedsList,
      '',
      '## Top 5 Low-Competition Keywords',
      topKeywords,
      '',
      '## All Keywords',
      allKeywordsTable,
      '',
      '## AI Summary',
      result.aiSummary || '(No AI summary for this run)',
    ];

    fs.writeFileSync(absolutePath, contentLines.join('\n'), 'utf-8');
    updateLogsIndex(relativePath);

    return relativePath;
  } catch (error) {
    console.error('⚠️ Failed to write logs file:', error);
    return null;
  }
}

/**
 * Main execution function.
 */
async function main(): Promise<void> {
  const startTime = new Date();
  let aiSummary: string | null = null;
  const allMetrics: KeywordMetric[] = [];
  let seeds: string[] = [];

  console.log('Starting Keyword Discovery Automation...');
  console.log('---');

  try {
    // Step 1: Check Seeds

    if (config.seedKeywords.length > 0) {
      seeds = config.seedKeywords;
      console.log(`📋 Using provided seed keywords: ${seeds.join(', ')}`);
    } else {
      console.log('🤖 Auto-Pilot Mode: Generating seeds with Copilot CLI...');
      seeds = await generateNicheIdeas();

      if (seeds.length === 0) {
        console.error('❌ Failed to generate seed keywords. Exiting.');
        process.exit(1);
      }

      console.log(`🎯 Generated seeds: ${seeds.join(', ')}`);
    }

    console.log(`Max suggestions per seed: ${MAX_SUGGESTIONS_PER_SEED}`);
    console.log(`AllInTitle threshold: < ${MAX_ALLINTITLE_THRESHOLD}`);
    console.log('---');

    // Step 2: Analysis (The Loop)
    for (const seed of seeds) {
      console.log(`\n🔍 Processing seed: "${seed}"`);

      try {
        // Fetch suggestions from Google Suggest
        const suggestions = await fetchSuggestions(seed);
        console.log(`  Found ${suggestions.length} suggestions`);

        // Limit to top N suggestions to save API credits
        const limitedSuggestions = suggestions.slice(0, MAX_SUGGESTIONS_PER_SEED);
        console.log(`  Processing top ${limitedSuggestions.length} suggestions`);

        // Analyze competition for each suggestion
        for (const keyword of limitedSuggestions) {
          console.log(`    Analyzing: "${keyword}"`);

          const metric = await analyzeCompetition(keyword);

          // Filter: Only keep keywords with low competition
          if (metric.allInTitleCount < MAX_ALLINTITLE_THRESHOLD) {
            console.log(`      ✓ Added (allInTitle: ${metric.allInTitleCount})`);
            allMetrics.push(metric);
          } else {
            console.log(`      ✗ Skipped (allInTitle: ${metric.allInTitleCount} >= ${MAX_ALLINTITLE_THRESHOLD})`);
          }
        }
      } catch (error) {
        console.error(`  Error processing seed "${seed}":`, error);
      }
    }

    console.log('\n---');
    console.log(`📊 Total keywords found: ${allMetrics.length}`);

    // Step 3: Save results
    if (allMetrics.length > 0) {
      console.log('\n💾 Saving results to Google Sheets via GAS...');

      await saveKeywords(allMetrics);
      console.log('✅ Successfully saved all keywords!');

      // Step 4: Generate AI Summary and Recommendations
      console.log('\n🤖 Generating AI summary and recommendations...\n');

      try {
        aiSummary = await summarizeKeywordResults(allMetrics);

        // Output summary to console (visible in GitHub Actions)
        console.log('='.repeat(80));
        console.log('📊 AI 分析總結與建議');
        console.log('='.repeat(80));
        console.log('\n' + aiSummary + '\n');
        console.log('='.repeat(80));

        // Save summary to file
        const summaryData = {
          timestamp: new Date().toISOString(),
          totalKeywords: allMetrics.length,
          keywords: allMetrics,
          aiSummary,
        };

        fs.writeFileSync(
          'keyword-summary.json',
          JSON.stringify(summaryData, null, 2),
          'utf-8'
        );

        console.log('\n💾 Summary saved to keyword-summary.json');
      } catch (error) {
        console.error('⚠️ Error generating summary:', error);
        console.log('Continuing without AI summary...');
      }
    } else {
      console.log('\n⚠️ No keywords to save.');
    }

    console.log('\n🎉 Keyword Discovery Automation completed!');

    // Step 5: Send Discord notification (success)
    const endTime = new Date();
    const pipelineResult: PipelineResult = {
      success: true,
      totalKeywords: allMetrics.length,
      metrics: allMetrics,
      aiSummary,
      startTime,
      endTime,
      seeds,
    };

    // Per requirement: archive outputs only on successful runs
    const logPath = writeRunLog(pipelineResult);
    if (logPath) {
      console.log(`\n💾 執行結果已儲存：logs/${logPath}`);
    }

    console.log('\n📤 Sending Discord notification...');
    await sendPipelineNotification(pipelineResult);

  } catch (error) {
    // Send Discord notification (failure)
    const endTime = new Date();
    const errorMessage = error instanceof Error ? error.message : String(error);

    const pipelineResult: PipelineResult = {
      success: false,
      totalKeywords: allMetrics.length,
      metrics: allMetrics,
      aiSummary,
      error: errorMessage,
      startTime,
      endTime,
      seeds,
    };

    console.log('\n📤 Sending Discord error notification...');
    await sendPipelineNotification(pipelineResult);

    throw error;
  }
}

// Run the main function
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

import { config } from './config';
import { fetchSuggestions, analyzeCompetition, analyzeCompetitionWithVolume } from './services/keywordService';
import { saveKeywords } from './services/sheetService';
import { generateNicheIdeas, summarizeKeywordResults, assessKeywordDifficulty, generateToolSuggestions } from './services/aiService';
import { sendPipelineNotification } from './services/discordService';
import { calculatePriorityScore, calculateROIScore, estimateDevTime, rankMetrics } from './services/scoringService';
import { isGoogleSearchConfigured } from './services/googleSearchService';
import { KeywordMetric, PipelineResult, ToolSuggestion } from './types';
import * as fs from 'fs';
import * as path from 'path';

// Maximum suggestions to process per seed (increased for more coverage)
const MAX_SUGGESTIONS_PER_SEED = 5;

// Target number of keywords to generate per run
const TARGET_KEYWORD_COUNT = 15;

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

  // "Top" refers to the best opportunities with the highest priority scores
  const sorted = [...metrics].sort(
    (a, b) => (b.priorityScore || 0) - (a.priorityScore || 0)
  );

  return sorted
    .slice(0, count)
    .map(
      (m, i) => {
        const parts = [
          `- ${i + 1}. \`${m.keyword}\``,
          `priority: ${m.priorityScore || 'N/A'}`,
          `competition: ${m.allInTitleCount}`,
          m.roiScore ? `ROI: ${m.roiScore}` : '',
          m.estimatedDevTime ? `dev: ${m.estimatedDevTime}h` : '',
        ].filter(Boolean);
        return parts.join(' | ');
      }
    )
    .join('\n');
}

function getAllKeywordsTable(metrics: KeywordMetric[]): string {
  if (metrics.length === 0) {
    return '*No keywords found*';
  }

  // Sort by priority score (descending) for display
  const sorted = [...metrics].sort(
    (a, b) => (b.priorityScore || 0) - (a.priorityScore || 0)
  );

  const header = '| # | Keyword | Priority | Competition | Search Vol | Difficulty | ROI | Source |';
  const separator = '|---|---------|----------|-------------|------------|------------|-----|--------|';
  const rows = sorted.map(
    (m, i) => `| ${i + 1} | ${m.keyword} | ${m.priorityScore || 'N/A'} | ${m.allInTitleCount} | ${m.searchVolume || 'N/A'} | ${m.buildDifficulty || 'N/A'} | ${m.roiScore || 'N/A'} | ${m.source} |`
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

    // Build top suggestions section if available
    let topSuggestionsSection = '';
    if (result.topSuggestions && result.topSuggestions.length > 0) {
      const suggestionCards = result.topSuggestions.map((s, i) => `
### ${i + 1}. ${s.toolName}
- **關鍵字**: ${s.keyword}
- **概念**: ${s.concept}
- **技術棧**: ${s.techStack.join(', ')}
- **CTA**: ${s.ctaSuggestion}
- **一句話**: ${s.oneLiner}
- **優先分**: ${s.priorityScore} | **ROI**: ${s.roiScore} | **開發時間**: ${s.estimatedDevTime}h
`).join('\n');
      topSuggestionsSection = `
## 🎯 Top 3 Tool Suggestions
${suggestionCards}
`;
    }

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
      '## Top 5 Priority Keywords',
      topKeywords,
      topSuggestionsSection,
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
 * Enhanced workflow with:
 * - 15-20 keyword generation per run
 * - Google Custom Search API for precise competition (if configured)
 * - Google Trends for search volume estimation
 * - AI-powered build difficulty and relevance assessment
 * - Priority score calculation with ROI and dev time estimates
 * - Top 3 tool suggestions with detailed cards
 */
async function main(): Promise<void> {
  const startTime = new Date();
  let aiSummary: string | null = null;
  const allMetrics: KeywordMetric[] = [];
  let seeds: string[] = [];
  let topSuggestions: ToolSuggestion[] = [];

  console.log('🚀 Starting Enhanced Keyword Discovery Automation...');
  console.log('---');
  
  // Log API configuration status
  if (isGoogleSearchConfigured()) {
    console.log('✅ Google Custom Search API configured (precise competition data)');
  } else {
    console.log('ℹ️ Google Custom Search API not configured, using Serper API');
  }
  console.log('---');

  try {
    // Step 1: Generate or use provided seeds
    if (config.seedKeywords.length > 0) {
      seeds = config.seedKeywords;
      console.log(`📋 Using provided seed keywords: ${seeds.join(', ')}`);
    } else {
      console.log(`🤖 Auto-Pilot Mode: Generating ${TARGET_KEYWORD_COUNT} seeds with Copilot CLI...`);
      seeds = await generateNicheIdeas(TARGET_KEYWORD_COUNT);

      if (seeds.length === 0) {
        console.error('❌ Failed to generate seed keywords. Exiting.');
        process.exit(1);
      }

      console.log(`🎯 Generated ${seeds.length} seeds: ${seeds.join(', ')}`);
    }

    console.log(`Max suggestions per seed: ${MAX_SUGGESTIONS_PER_SEED}`);
    console.log(`AllInTitle threshold: < ${MAX_ALLINTITLE_THRESHOLD}`);
    console.log('---');

    // Step 2: Keyword Discovery and Analysis Loop
    for (const seed of seeds) {
      console.log(`\n🔍 Processing seed: "${seed}"`);

      try {
        // Fetch suggestions from Google Suggest
        const suggestions = await fetchSuggestions(seed);
        console.log(`  Found ${suggestions.length} suggestions`);

        // Limit to top N suggestions to save API credits
        const limitedSuggestions = suggestions.slice(0, MAX_SUGGESTIONS_PER_SEED);
        console.log(`  Processing top ${limitedSuggestions.length} suggestions`);

        // Analyze competition for each suggestion (with volume if available)
        for (const keyword of limitedSuggestions) {
          console.log(`    Analyzing: "${keyword}"`);

          const metric = await analyzeCompetitionWithVolume(keyword);

          // Filter: Only keep keywords with low competition
          if (metric.allInTitleCount < MAX_ALLINTITLE_THRESHOLD) {
            console.log(`      ✓ Added (allInTitle: ${metric.allInTitleCount}, volume: ${metric.searchVolume || 'N/A'})`);
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

    // Step 3: AI Assessment - Build Difficulty and Relevance
    if (allMetrics.length > 0) {
      console.log('\n🤖 Assessing build difficulty and relevance...');
      
      try {
        const keywords = allMetrics.map((m) => m.keyword);
        const assessments = await assessKeywordDifficulty(keywords);
        
        // Apply assessments to metrics
        for (const metric of allMetrics) {
          const assessment = assessments.get(metric.keyword);
          if (assessment) {
            metric.buildDifficulty = assessment.buildDifficulty;
            metric.relevance = assessment.relevance;
          }
        }
        console.log('✅ Build difficulty assessment completed');
      } catch (error) {
        console.warn('⚠️ Could not complete difficulty assessment:', error);
      }

      // Step 4: Calculate Priority Scores
      console.log('\n📈 Calculating priority scores...');
      
      for (const metric of allMetrics) {
        metric.priorityScore = calculatePriorityScore(metric);
        metric.roiScore = calculateROIScore(metric);
        metric.estimatedDevTime = estimateDevTime(
          metric.keyword,
          metric.buildDifficulty || 5
        );
      }
      
      // Sort by priority score
      allMetrics.sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
      console.log(`✅ Priority scores calculated. Top score: ${allMetrics[0]?.priorityScore || 'N/A'}`);

      // Step 5: Generate Top 3 Tool Suggestions
      console.log('\n🛠️ Generating top 3 tool suggestions...');
      
      try {
        const topMetrics = rankMetrics(allMetrics, 3);
        topSuggestions = await generateToolSuggestions(topMetrics);
        console.log(`✅ Generated ${topSuggestions.length} detailed tool suggestions`);
      } catch (error) {
        console.warn('⚠️ Could not generate tool suggestions:', error);
      }

      // Step 6: Save results to Google Sheets
      console.log('\n💾 Saving results to Google Sheets via GAS...');
      await saveKeywords(allMetrics);
      console.log('✅ Successfully saved all keywords!');

      // Step 7: Generate AI Summary and Recommendations
      console.log('\n🤖 Generating AI summary and recommendations...\n');

      try {
        aiSummary = await summarizeKeywordResults(allMetrics, topSuggestions);

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
          topSuggestions,
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

    console.log('\n🎉 Enhanced Keyword Discovery Automation completed!');

    // Step 8: Archive results and send Discord notification
    const endTime = new Date();
    const pipelineResult: PipelineResult = {
      success: true,
      totalKeywords: allMetrics.length,
      metrics: allMetrics,
      aiSummary,
      startTime,
      endTime,
      seeds,
      topSuggestions,
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
      topSuggestions,
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

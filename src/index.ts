import { config } from './config';
import { fetchSuggestions, analyzeCompetition } from './services/keywordService';
import { saveKeywords } from './services/sheetService';
import { generateNicheIdeas, summarizeKeywordResults } from './services/aiService';
import { sendPipelineNotification } from './services/discordService';
import { KeywordMetric, PipelineResult } from './types';
import * as fs from 'fs';

// Maximum suggestions to process per seed (to save API credits)
const MAX_SUGGESTIONS_PER_SEED = 5;

// Maximum allInTitleCount threshold for filtering opportunities
// 注意：由於 Serper API 限制，我們使用估算值
// <= 50 表示低競爭（實際結果較少）
const MAX_ALLINTITLE_THRESHOLD = 50;

/**
 * Main execution function.
 */
async function main(): Promise<void> {
  const startTime = new Date();
  let aiSummary: string | null = null;
  const allMetrics: KeywordMetric[] = [];

  console.log('Starting Keyword Discovery Automation...');
  console.log('---');

  try {
    // Step 1: Check Seeds
    let seeds: string[];

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
    };

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

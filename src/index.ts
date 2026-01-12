import { config } from './config';
import { fetchSuggestions, analyzeCompetition } from './services/keywordService';
import { SheetAdapter } from './services/sheetService';
import { KeywordMetric } from './types';

// Define seed keywords for keyword discovery
const SEEDS = ['pdf converter', 'image resizer', 'ai generator'];

// Maximum suggestions to process per seed (to save API credits)
const MAX_SUGGESTIONS_PER_SEED = 5;

// Maximum allInTitleCount threshold for filtering opportunities
const MAX_ALLINTITLE_THRESHOLD = 1000;

/**
 * Main execution function.
 */
async function main(): Promise<void> {
  console.log('Starting Keyword Discovery Automation...');
  console.log(`Seeds: ${SEEDS.join(', ')}`);
  console.log(`Max suggestions per seed: ${MAX_SUGGESTIONS_PER_SEED}`);
  console.log(`AllInTitle threshold: < ${MAX_ALLINTITLE_THRESHOLD}`);
  console.log('---');

  const allMetrics: KeywordMetric[] = [];

  // Process each seed keyword
  for (const seed of SEEDS) {
    console.log(`\nProcessing seed: "${seed}"`);

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
  console.log(`Total keywords found: ${allMetrics.length}`);

  // Save results to Google Sheets
  if (allMetrics.length > 0) {
    console.log('\nSaving results to Google Sheets...');

    try {
      const sheetAdapter = new SheetAdapter(config);
      await sheetAdapter.saveKeywords(allMetrics);
      console.log('Successfully saved all keywords to Google Sheets!');
    } catch (error) {
      console.error('Error saving to Google Sheets:', error);
      throw error;
    }
  } else {
    console.log('\nNo keywords to save.');
  }

  console.log('\nKeyword Discovery Automation completed!');
}

// Run the main function
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

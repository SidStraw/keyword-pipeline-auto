import { summarizeKeywordResults } from './src/services/aiService';
import { KeywordMetric } from './src/types';

/**
 * 測試 AI 總結功能
 */
async function testAISummary() {
  console.log('🧪 測試 AI 總結功能\n');

  // 模擬一些關鍵字數據
  const mockKeywords: KeywordMetric[] = [
    {
      keyword: 'openapi typescript generator',
      source: 'google-suggest',
      totalResults: 8,
      allInTitleCount: 8,
    },
    {
      keyword: 'docker compose visualization tool',
      source: 'google-suggest',
      totalResults: 5,
      allInTitleCount: 5,
    },
    {
      keyword: 'api documentation generator markdown',
      source: 'google-suggest',
      totalResults: 12,
      allInTitleCount: 12,
    },
    {
      keyword: 'json schema validator online',
      source: 'google-suggest',
      totalResults: 3,
      allInTitleCount: 3,
    },
    {
      keyword: 'rest api testing automation',
      source: 'google-suggest',
      totalResults: 15,
      allInTitleCount: 15,
    },
  ];

  console.log('📋 測試數據：');
  mockKeywords.forEach((k, i) => {
    console.log(`  ${i + 1}. "${k.keyword}" - 競爭度: ${k.allInTitleCount}`);
  });

  console.log('\n🤖 生成 AI 總結中...\n');

  try {
    const summary = await summarizeKeywordResults(mockKeywords);

    console.log('='.repeat(80));
    console.log('📊 AI 分析總結與建議');
    console.log('='.repeat(80));
    console.log('\n' + summary + '\n');
    console.log('='.repeat(80));

    console.log('\n✅ 測試成功！AI 總結已生成');
  } catch (error) {
    console.error('\n❌ 測試失敗：', error);
  }
}

testAISummary().catch(console.error);

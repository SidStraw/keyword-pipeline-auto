import { analyzeCompetition } from './src/services/keywordService';
import { config } from './src/config';

async function quickTest() {
  console.log('🧪 快速測試關鍵字分析功能\n');
  
  const testKeywords = [
    'openapi spec types',  // 高競爭（應該 = 100）
    'typescript openapi generator with custom templates tutorial 2026', // 中等競爭
  ];
  
  for (const testKeyword of testKeywords) {
    console.log(`\n測試關鍵字: "${testKeyword}"`);
    console.log('---');
    
    const result = await analyzeCompetition(testKeyword);
    
    console.log('📊 結果:');
    console.log(`  關鍵字: ${result.keyword}`);
    console.log(`  來源: ${result.source}`);
    console.log(`  總結果數: ${result.totalResults}`);
    console.log(`  AllInTitle 數量: ${result.allInTitleCount}`);
    
    if (result.allInTitleCount <= 50) {
      console.log('  ✅ 低競爭度 - 好機會！');
    } else {
      console.log('  ⚠️  高競爭度 - 已過濾');
    }
  }
  
  console.log('\n✅ 測試完成！');
}

quickTest().catch(console.error);

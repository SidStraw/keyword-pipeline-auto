import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * 測試 Serper API 連接和回應格式
 */
async function testSerperAPI() {
  const apiKey = process.env.SERPER_API_KEY;
  
  console.log('🔍 測試 Serper API 連接...\n');
  
  if (!apiKey) {
    console.error('❌ 錯誤：未設置 SERPER_API_KEY');
    console.log('請在 .env 檔案中設置您的 Serper API Key');
    process.exit(1);
  }
  
  console.log(`✅ API Key 已設置: ${apiKey.substring(0, 10)}...`);
  console.log('');

  const testKeywords = [
    'openapi spec types'
  ];

  for (const keyword of testKeywords) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`測試關鍵字: "${keyword}"`);
    console.log('='.repeat(60));

    try {
      // 測試 1: 一般搜尋
      console.log('\n📌 測試 1: 一般搜尋');
      const normalResponse = await axios.post(
        'https://google.serper.dev/search',
        {
          q: keyword,
        },
        {
          headers: {
            'X-API-KEY': apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('回應狀態:', normalResponse.status);
      console.log('搜尋資訊:', normalResponse.data.searchInformation);
      console.log('結果數量:', normalResponse.data.searchInformation?.totalResults || 'N/A');

      // 測試 2: allintitle 搜尋
      console.log('\n📌 測試 2: allintitle 搜尋');
      const allintitleResponse = await axios.post(
        'https://google.serper.dev/search',
        {
          q: `allintitle:${keyword}`,
        },
        {
          headers: {
            'X-API-KEY': apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('回應狀態:', allintitleResponse.status);
      console.log('搜尋資訊:', allintitleResponse.data.searchInformation);
      console.log('AllInTitle 結果數量:', allintitleResponse.data.searchInformation?.totalResults || 'N/A');

      // 顯示完整回應結構（第一個關鍵字）
      if (keyword === testKeywords[0]) {
        console.log('\n📋 完整 API 回應結構範例:');
        console.log('可用的欄位:');
        console.log('  - searchParameters:', allintitleResponse.data.searchParameters);
        console.log('  - organic 結果數量:', allintitleResponse.data.organic?.length || 0);
        console.log('  - peopleAlsoAsk 數量:', allintitleResponse.data.peopleAlsoAsk?.length || 0);
        console.log('  - relatedSearches 數量:', allintitleResponse.data.relatedSearches?.length || 0);
        console.log('  - credits 使用:', allintitleResponse.data.credits);
        
        console.log('\n⚠️  注意：Serper API 不提供 searchInformation.totalResults');
        console.log('我們使用 organic 結果數量作為參考指標');
      }

      // 等待一下避免速率限制
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error: any) {
      console.error('\n❌ 錯誤發生:');
      console.error('錯誤訊息:', error.message);
      
      if (error.response) {
        console.error('HTTP 狀態碼:', error.response.status);
        console.error('回應資料:', JSON.stringify(error.response.data, null, 2));
        
        if (error.response.status === 401) {
          console.error('\n⚠️  認證失敗：API Key 可能無效或已過期');
        } else if (error.response.status === 429) {
          console.error('\n⚠️  速率限制：請求太頻繁');
        }
      } else if (error.request) {
        console.error('請求已發送但無回應');
      }
    }
  }

  console.log('\n\n' + '='.repeat(60));
  console.log('測試完成');
  console.log('='.repeat(60));
}

testSerperAPI().catch(console.error);

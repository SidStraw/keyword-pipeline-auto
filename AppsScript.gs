// 設定一個你自己的私鑰,放在 GitHub Secrets 裡面
const API_KEY = "TEST"; 

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    // 簡單的安全性驗證
    if (data.auth !== API_KEY) {
      return ContentService.createTextOutput("Unauthorized").setMimeType(ContentService.MimeType.TEXT);
    }

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('RawData');
    
    // 檢查並設置表頭（只在第一次或表頭錯誤時執行）
    ensureHeaders(sheet);
    
    const metrics = data.payload; // 預期是一個陣列
    
    // 批次寫入資料（效能更好）
    if (metrics && metrics.length > 0) {
      const rows = metrics.map(item => [
        item.keyword,
        item.source,
        item.totalResults,
        item.allInTitleCount,
        new Date().toISOString()
      ]);
      
      // 一次性寫入所有資料
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 5).setValues(rows);
      
      Logger.log(`Successfully added ${rows.length} rows`);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      rowsAdded: metrics.length
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    Logger.error("Error in doPost: " + err.toString());
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 確保試算表有正確的表頭
 */
function ensureHeaders(sheet) {
  const headers = ['Keyword', 'Source', 'Est. Results', 'In Title Count', 'Last Updated'];
  
  // 如果工作表是空的，或第一行不正確，設置表頭
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    formatHeaders(sheet);
    Logger.log("Headers created");
  } else {
    // 檢查第一行是否正確
    const firstRow = sheet.getRange(1, 1, 1, 5).getValues()[0];
    const isHeaderCorrect = headers.every((header, index) => firstRow[index] === header);
    
    if (!isHeaderCorrect) {
      // 表頭不正確，修復它
      sheet.getRange(1, 1, 1, 5).setValues([headers]);
      formatHeaders(sheet);
      Logger.log("Headers fixed");
    }
  }
}

/**
 * 格式化表頭樣式
 */
function formatHeaders(sheet) {
  const headerRange = sheet.getRange(1, 1, 1, 5);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#4285f4');
  headerRange.setFontColor('#ffffff');
  headerRange.setHorizontalAlignment('center');
  
  // 凍結表頭行
  sheet.setFrozenRows(1);
  
  // 自動調整欄寬
  sheet.autoResizeColumns(1, 5);
}

/**
 * 手動初始化試算表（只需執行一次）
 */
function initializeSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('RawData');
  
  if (!sheet) {
    SpreadsheetApp.getActiveSpreadsheet().insertSheet('RawData');
    Logger.log("Sheet 'RawData' created");
  }
  
  // 清空並重新設置表頭
  sheet.clear();
  ensureHeaders(sheet);
  
  Logger.log("Sheet initialized successfully");
}

/**
 * 測試函數（可選）
 */
function testDoPost() {
  const testData = {
    postData: {
      contents: JSON.stringify({
        auth: API_KEY,
        payload: [
          {
            keyword: "test keyword",
            source: "test-source",
            totalResults: 100,
            allInTitleCount: 5
          }
        ]
      })
    }
  };
  
  const result = doPost(testData);
  Logger.log(result.getContent());
}

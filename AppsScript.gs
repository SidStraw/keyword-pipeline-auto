// 設定一個你自己的私鑰，放在 GitHub Secrets 裡面
const API_KEY = "TEST"; 

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    // 簡單的安全性驗證
    if (data.auth !== API_KEY) {
      return ContentService.createTextOutput("Unauthorized").setMimeType(ContentService.MimeType.TEXT);
    }

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('RawData');
    const metrics = data.payload; // 預期是一個陣列
    
    metrics.forEach(item => {
      sheet.appendRow([
        item.keyword,
        item.source,
        item.totalResults,
        item.allInTitleCount,
        new Date().toISOString()
      ]);
    });

    return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
  } catch (err) {
    return ContentService.createTextOutput("Error: " + err.toString()).setMimeType(ContentService.MimeType.TEXT);
  }
}

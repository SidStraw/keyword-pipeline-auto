# Keyword Pipeline Auto

Keyword Discovery Automation tool for GitHub Actions

## 本地開發設置

### 環境變數配置

1. **複製環境變數範本**

   ```bash
   cp .env.example .env
   ```

2. **填寫必要的 API Keys**

   在 `.env` 文件中填入以下必要的環境變數：

   #### SERPER_API_KEY (必填)

   - 用於 Google 搜尋建議和競爭分析
   - 取得方式：前往 [https://serper.dev/](https://serper.dev/) 註冊並獲取 API Key

   #### GAS_WEB_APP_URL (必填)

   - 用於將關鍵字儲存到 Google Sheets
   - 取得方式：部署 Google Apps Script Web App 並複製 URL

   #### MY_CUSTOM_API_KEY (必填)

   - 用於 GAS Web App 身份驗證
   - 設置方式：自訂一個安全的密鑰，需與 GAS Web App 中的設定一致

   #### GEMINI_API_KEY (必填)

   - 用於 AI 生成利基關鍵字想法
   - 取得方式：前往 [https://aistudio.google.com/](https://aistudio.google.com/) 獲取 API Key

3. **選填環境變數**

   #### SEED_KEYWORDS (選填)

   - 種子關鍵字（以逗號分隔）
   - 如果未提供，AI 將自動生成
   - 範例：`SEED_KEYWORDS=SEO,content marketing,keyword research`

   #### GEMINI_MODEL (選填)

   - 預設值：`gemini-2.5-flash`
   - 其他選項：`gemini-1.5-pro`, `gemini-1.5-flash`

### 安裝依賴

```bash
npm install
```

### 執行專案

```bash
# 開發模式
npm start

# 編譯 TypeScript
npm run build

# 型別檢查
npm run typecheck
```

## 環境變數說明

| 變數名稱 | 必填 | 說明 |
|---------|------|------|
| `SERPER_API_KEY` | ✅ | Serper API 金鑰，用於搜尋建議 |
| `GAS_WEB_APP_URL` | ✅ | Google Apps Script Web App URL |
| `MY_CUSTOM_API_KEY` | ✅ | GAS Web App 身份驗證金鑰 |
| `GEMINI_API_KEY` | ✅ | Google Gemini API 金鑰 |
| `SEED_KEYWORDS` | ❌ | 種子關鍵字（逗號分隔） |
| `GEMINI_MODEL` | ❌ | Gemini 模型名稱 |

## 注意事項

- ⚠️ **請勿將 `.env` 檔案提交到 Git**（已在 `.gitignore` 中設定）
- ✅ `.env.example` 可以提交，作為環境變數範本
- 🔑 請妥善保管您的 API Keys
- 📊 **Serper API 限制**：不提供確切的總結果數，詳見 [SERPER_API_NOTES.md](SERPER_API_NOTES.md)

## 故障排除

如果遇到問題，請參考：
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - 完整的故障排除指南
- [SERPER_API_NOTES.md](SERPER_API_NOTES.md) - Serper API 限制說明

### 快速診斷

```bash
# 測試 Serper API 連接
npm run test:serper

# 快速測試關鍵字分析
npm run test:quick
```

## License

MIT

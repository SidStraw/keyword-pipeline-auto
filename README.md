# Keyword Pipeline Auto

Keyword Discovery Automation tool for GitHub Actions

## 功能特色

✅ 自動發現低競爭關鍵字  
✅ Google Suggest API 整合  
✅ Serper API 競爭度分析  
✅ Google Sheets 自動儲存  
✅ **AI 總結與建議**（Gemini）  
✅ GitHub Actions 自動化支援  
🔜 Discord Bot 通知（即將推出）

## 工作流程

1. **種子關鍵字** → 手動提供或 AI 自動生成
2. **關鍵字發現** → Google Suggest 獲取相關建議
3. **競爭度分析** → Serper API 檢查 allintitle 結果
4. **過濾篩選** → 只保留低競爭關鍵字
5. **儲存結果** → 寫入 Google Sheets
6. **AI 分析** → Gemini 生成總結和建議
7. **輸出報告** → Console 和 JSON 檔案

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

### 輸出結果

執行完成後會生成：

1. **Console 輸出**
   - 完整的執行日誌
   - 📊 AI 分析總結與建議（在分隔線內清楚顯示）

2. **Google Sheets**
   - 所有低競爭關鍵字
   - 包含競爭度數據

3. **keyword-summary.json**
   - 完整的執行摘要
   - AI 分析結果
   - 適合用於後續整合（如 Discord Bot）

### GitHub Actions 中閱讀 AI 總結

在 GitHub Actions workflow 中，AI 總結會顯示在 step 輸出：

```yaml
- name: Run Keyword Discovery
  run: npm start
  # AI 總結會顯示在這個 step 的輸出中
  # 在 Actions 日誌中查找 "📊 AI 分析總結與建議" 區塊
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
- [AI_SUMMARY_GUIDE.md](AI_SUMMARY_GUIDE.md) - AI 總結功能使用指南

### 快速診斷

```bash
# 測試 Serper API 連接
npm run test:serper

# 快速測試關鍵字分析
npm run test:quick
```

## 下一版本預告

### 🤖 Discord Bot 整合 (v1.1)

下一個版本將支援 Discord Bot 通知：

- 📨 自動發送關鍵字發現結果到 Discord 頻道
- 📊 格式化的統計數據展示
- 🤖 AI 總結和建議（Embed 格式）
- 📋 完整關鍵字列表（折疊顯示）

查看詳細計畫：[DISCORD_INTEGRATION_PLAN.md](DISCORD_INTEGRATION_PLAN.md)

**準備工作：**

- `keyword-summary.json` 檔案已準備好供 Discord Bot 讀取
- AI 總結格式已優化，適合 Discord Embed
- 架構設計已完成，等待實作

## License

MIT

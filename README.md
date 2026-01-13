# Keyword Pipeline Auto

Keyword Discovery Automation tool for GitHub Actions

## 功能特色

✅ 自動發現低競爭關鍵字  
✅ Google Suggest API 整合  
✅ Serper API 競爭度分析  
✅ Google Sheets 自動儲存  
✅ **AI 總結與建議**（GitHub Copilot CLI）  
✅ GitHub Actions 自動化支援  
✅ Discord Webhook 通知  
✅ CI 成功後自動歸檔結果與 AI 摘要到 `logs/YYYYMM/HHmmss.md`，並更新 `logs/index.json`（方便 GitHub Pages 對外提供）

## 工作流程

1. **種子關鍵字** → 手動提供或 AI 自動生成
2. **關鍵字發現** → Google Suggest 獲取相關建議
3. **競爭度分析** → Serper API 檢查 allintitle 結果
4. **過濾篩選** → 只保留低競爭關鍵字
5. **儲存結果** → 寫入 Google Sheets
6. **AI 分析** → GitHub Copilot CLI 生成總結和建議
7. **日誌歸檔** → 以完成時間（UTC）生成 `logs/YYYYMM/HHmmss.md`，並更新 `logs/index.json`
8. **輸出報告** → Console、Markdown 日誌、JSON 檔案（含 AI 摘要）

## 本地開發設置

### 環境變數配置

1. **複製環境變數範本**

   ```bash
   cp .env.example .env
   ```

2. **填寫必要的 API Keys**

   - `SERPER_API_KEY`：Serper.dev API 金鑰，用於搜尋建議與競爭分析。
   - `GAS_WEB_APP_URL`：Google Apps Script Web App URL，用於寫入 Google Sheets。
   - `MY_CUSTOM_API_KEY`：提供給 GAS 的驗證密鑰，需與 GAS 設定一致。
   - `GH_TOKEN`：GitHub PAT，需啟用 **Copilot Requests** 權限以呼叫 Copilot CLI（可使用 `COPILOT_GITHUB_TOKEN` 取代）。

3. **選填環境變數**

   - `SEED_KEYWORDS`：種子關鍵字（逗號分隔），未提供時由 Copilot 自動生成。
   - `COPILOT_MODEL`：Copilot 模型名稱，預設 `claude-haiku-4.5`。
   - `DISCORD_WEBHOOK_URL`：若提供則在成功/失敗時推送 Discord 通知。

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

3. **logs/YYYYMM/HHmmss.md**
   - 以完成時間（UTC）命名的 Markdown 檔，包含執行摘要與 AI 總結
   - 便於直接透過 GitHub Pages 對外提供

4. **logs/index.json**
   - JSON Array，列出所有 Markdown 檔的相對路徑（例如 `202601/210130.md`）
   - 可供前端直接讀取最新清單

5. **keyword-summary.json**
   - 完整的執行摘要（向下相容用途）
   - AI 分析結果

### GitHub Actions 中閱讀 AI 總結

在 GitHub Actions workflow 中，AI 總結會顯示在步驟輸出，並在成功後自動寫入 `logs/YYYYMM/HHmmss.md` 並更新 `logs/index.json`（使用 UTC 時間）：

```yaml
- name: Run Keyword Discovery
  run: npx ts-node src/index.ts
# 成功後 workflow 會自動 commit `logs/` 目錄，方便 GitHub Pages 對外提供
```

使用 `npx ts-node src/index.ts` 與 CI 執行方式保持一致，避免 npm script 變更造成行為差異。

⚠️ 僅成功的工作流程會寫入並提交 `logs/` 檔案；失敗時可直接在 Actions 日誌查看錯誤。

## 環境變數說明

| 變數名稱 | 必填 | 說明 |
|---------|------|------|
| `SERPER_API_KEY` | ✅ | Serper API 金鑰，用於搜尋建議 |
| `GAS_WEB_APP_URL` | ✅ | Google Apps Script Web App URL |
| `MY_CUSTOM_API_KEY` | ✅ | GAS Web App 身份驗證金鑰 |
| `GH_TOKEN` / `COPILOT_GITHUB_TOKEN` | ✅ | GitHub Copilot CLI 權杖（需 Copilot Requests 權限） |
| `SEED_KEYWORDS` | ❌ | 種子關鍵字（逗號分隔） |
| `COPILOT_MODEL` | ❌ | Copilot 模型名稱（預設：`claude-haiku-4.5`） |
| `DISCORD_WEBHOOK_URL` | ❌ | Discord Webhook URL，用於通知 |

## 注意事項

- ⚠️ **請勿將 `.env` 檔案提交到 Git**（已在 `.gitignore` 中設定）
- ✅ `.env.example` 可以提交，作為環境變數範本
- 🔑 請妥善保管您的 API Keys
- 📊 **Serper API 限制**：不提供確切的總結果數，詳見 [SERPER_API_NOTES.md](SERPER_API_NOTES.md)
- 🗂️ CI 會自動更新 `logs/` 目錄與 `logs/index.json`，如需手動調整請同步維護索引

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

## License

MIT

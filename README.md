# Keyword Pipeline Auto

每日自動化免費工具行銷靈感工作流 - Keyword Discovery Automation for GitHub Actions

## 功能特色

### 核心功能
✅ 自動發現 15-20 個低競爭關鍵字（每日）  
✅ Google Suggest API 整合  
✅ Serper API 競爭度分析  
✅ **Google Custom Search API**（可選，提供精確 totalResults）  
✅ **Google Trends 搜尋量估算**  
✅ Google Sheets 自動儲存  
✅ **AI 總結與建議**（GitHub Copilot CLI）  
✅ GitHub Actions 自動化支援  
✅ Discord Webhook 通知  
✅ CI 成功後自動歸檔結果與 AI 摘要到 `logs/YYYY_MM/DD_HHmmss.md`

### 進階功能（Phase 1）
✅ **AI 智能評估**：自動評估建置難易度與產品相關性  
✅ **優先順序公式**：搜尋量(40%) + 競爭度(30%) + 建置難易度(20%) + 相關性(10%)  
✅ **ROI 評分**：計算投資報酬率，幫助決策  
✅ **開發時間估算**：AI 自動估算 MVP 開發時間  
✅ **Top 3 工具建議卡片**：包含工具名稱、概念、技術棧、CTA 建議、一句話簡介

## 工作流程

1. **種子關鍵字** → 手動提供或 AI 自動生成 15 個
2. **關鍵字發現** → Google Suggest 獲取相關建議
3. **競爭度分析** → Google Custom Search API（優先）或 Serper API
4. **搜尋量估算** → Google Trends API 估算月搜尋量
5. **AI 評估** → 評估建置難易度與產品相關性
6. **優先排序** → 計算優先分數、ROI、開發時間
7. **工具建議** → 生成 Top 3 詳細工具建議卡片
8. **儲存結果** → 寫入 Google Sheets
9. **AI 分析** → GitHub Copilot CLI 生成精華摘要
10. **日誌歸檔** → 生成 Markdown 報告並更新索引
11. **通知推送** → Discord 通知（含優先關鍵字與工具建議）

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
   - `GOOGLE_API_KEY`：Google Custom Search API 金鑰（可選，提供精確競爭數據）
   - `GOOGLE_CSE_ID`：Google Custom Search Engine ID

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
   - 📊 AI 分析總結與建議（含 Top 3 優先工具）

2. **Google Sheets**
   - 所有低競爭關鍵字
   - 包含優先分數、競爭度、搜尋量、ROI 等數據

3. **logs/YYYY_MM/DD_HHmmss.md**
   - 以完成時間（UTC）命名的 Markdown 檔
   - 包含 Top 3 工具建議卡片與 AI 總結
   - 便於直接透過 GitHub Pages 對外提供

4. **logs/index.json**
   - JSON Array，列出所有 Markdown 檔的相對路徑
   - 可供前端直接讀取最新清單

5. **keyword-summary.json**
   - 完整的執行摘要
   - 包含所有關鍵字數據與 Top 3 工具建議

### GitHub Actions 中閱讀 AI 總結

在 GitHub Actions workflow 中，AI 總結會顯示在步驟輸出，並在成功後自動寫入 `logs/` 目錄：

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
| `GOOGLE_API_KEY` | ❌ | Google Custom Search API 金鑰（100 次/天免費） |
| `GOOGLE_CSE_ID` | ❌ | Google Custom Search Engine ID |

## 優先順序計算公式

```
Priority Score = 搜尋量(40%) + 競爭度反比(30%) + 建置難易度反比(20%) + 相關性(10%)
```

- **搜尋量**：越高越好（基於 Google Trends 估算）
- **競爭度**：越低越好（allintitle 結果數）
- **建置難易度**：越低越好（AI 評估 1-10）
- **相關性**：越高越好（AI 評估 1-10）

## 成本效益

- ✅ 完全免費（API 用量在免費額度內）
- ✅ Google Custom Search API：100 次/天免費
- ✅ Serper API：有限免費額度
- ✅ Google Trends：無限制
- ✅ GitHub Copilot CLI：需有 Copilot 訂閱

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

## 路線圖 Roadmap

### Phase 1 ✅ (已完成)
- [x] Google Custom Search API 整合
- [x] Google Trends 搜尋量估算
- [x] AI 建置難易度評分
- [x] 優先度公式計算
- [x] Top 3 工具建議卡片

### Phase 2 (規劃中)
- [ ] 根據歷史 logs 調整輸出風格
- [ ] 創意延伸建議
- [ ] 強化 Discord/Email/Notion 報表格式

### Phase 3 (未來)
- [ ] DataForSEO 整合（趨勢分析）
- [ ] 資料倉儲化
- [ ] 流量成長追蹤功能

### Phase 4 (願景)
- [ ] 自動化工具 Scaffold 生成
- [ ] GitHub Issue/Project 自動建立
- [ ] CI/CD 自動部署
- [ ] 排名追蹤與週報通知

## License

MIT

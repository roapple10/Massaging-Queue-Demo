# Massaging Queue Demo (FastAPI + RabbitMQ + Celery + React/Tailwind)

[Demo 影片（YouTube）](https://www.youtube.com/watch?v=AhSy5u1zgno)


一個 **High Level、可在 5–8 分鐘清楚講解的端到端 PoC**：
- 前端：React 18 + Tailwind（單頁：建立 Campaign → 發送 → 查統計）
- 後端：FastAPI（3 支 API）
- 佇列：RabbitMQ（工作派發） + Celery worker（重試 + 簡易限流）
- 資料庫：PostgreSQL（假資料 ~20 位 user，其中 ~40% 有 `vip` 標籤）

## 一鍵啟動
```bash
docker compose up -d --build
```

- API Docs: http://localhost:8000/docs
- Web UI: http://localhost:5173
- RabbitMQ 管理介面: http://localhost:15672  (guest / guest)
- Postgres: localhost:5432 (postgres/postgres)


1. 在前端輸入：`name="Welcome Back"`、`template="Hi {{name}}, we miss you! 💌"`、`segment_rule="vip"`（或多標籤：如 `vip,tw` 表示 AND 條件）
2. 點 **Create** → 取得 `campaign_id`
3. 點 **Preview** → 預覽分眾對象（顯示前 10 位）與實際渲染內容（`{{name}}` 會被替換）
4. 點 **Send** → API 依該 Campaign 的 `segment_rule` 產生 messages、丟到 **RabbitMQ**、由 **Celery** 取出執行（10% 模擬失敗將自動重試）
5. 點 **Refresh** 看 **Stats**（`total / queued / sent / p50_ms / p95_ms`）
6. 點 **Load Messages** 看訊息明細（收件者、標籤、狀態、建立時間）

## 架構（ASCII）
```
[React + Tailwind SPA]
        |
   (REST/JSON)
        v
 [FastAPI API]  --(publish job)-->  [RabbitMQ]  -->  [Celery Worker] --(mock provider)--> [Event table]
        |                                                                             
     (PostgreSQL) <-------------------------------(mark SENT)---------------------------
```

### 為什麼這樣設計
- **拆同步/非同步**：API 快速回應，把大量發送交給 worker 水平擴展。
- **RabbitMQ**：工作派發語義（ack、retry、prefetch），比直接同步呼叫更穩定。
- **可靠性三件事**：`idempotency_key` 去重、Celery backoff 重試、簡易限流 (sleep) 防過載。
- **可觀測**：/stats 快速回饋（含 p50/p95 送達延遲）；正式環境可加 OpenTelemetry、Grafana、DLQ。
- **擴展路線**：依租戶分片 queue、Outbox Pattern 保證一致、事件流進 BigQuery 作分析。

## API 摘要
- `POST /campaigns` → 建立 Campaign：`{ name, template, segment_rule }`
- `GET /campaigns/{id}` → 取得 Campaign 細節（含 `segment_rule`）
- `GET /campaigns/{id}/preview` → 送前預覽（回傳前 10 位目標與渲染後內容）
- `POST /campaigns/{id}/send` → 依該 Campaign 的 `segment_rule` 產生 messages 並發佇列
- `GET /campaigns/{id}/stats` → 取得統計：`total / queued / sent / p50_ms / p95_ms`
- `GET /campaigns/{id}/messages` → 列出訊息明細（收件者/標籤/狀態/建立時間）

> 備註：`segment_rule` 支援以逗號分隔的多標籤 AND 過濾，例如 `vip,tw`。

> 注意：PoC 為**教學示範**，未包含驗證/使用者系統/真正的外部 Email 供應商整合。
---

## 本地開發
- API: `uvicorn app:app --reload` （請先啟動 db/mq）
- Worker: `celery -A celery_app.celery worker -l INFO`
- Web: `npm run dev`

### 環境參數（重點）
- `RATE_PER_SEC`：每個 Worker 每秒處理的訊息數（預設 20）。可於 `docker-compose.yml` 的 `worker.environment` 調整。


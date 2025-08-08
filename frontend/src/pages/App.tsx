import React, { useEffect, useState } from "react";
import { createCampaign, sendCampaign, getStats, getCampaign, getPreview, getMessages } from "../api";

export default function App() {
  type Lang = "zh" | "en";
  const [lang, setLang] = useState<Lang>("zh");
  const translations: Record<Lang, Record<string, string>> = {
    zh: {
      title: "Massaging Queue Demo",
      step1Title: "1) 建立 Campaign",
      namePh: "name",
      templatePh: "template",
      segmentPh: "segment_rule (例如：vip 或 vip,tw)",
      createBtn: "Create",
      campaignId: "campaign_id",
      rule: "rule",
      step2Title: "2) 發送（RabbitMQ → Celery Worker）與預覽",
      sendBtn: "Send",
      previewBtn: "Preview",
      previewCount: "預覽對象 {count} 位（顯示前 10 筆）",
      step3Title: "3) 查看統計",
      refreshBtn: "Refresh",
      statsLine: "total: {total}, queued: {queued}, sent: {sent}",
      statsLatency: "p50: {p50} · p95: {p95}",
      step4Title: "4) 訊息明細",
      loadMessagesBtn: "Load Messages",
      thId: "ID",
      thRecipient: "Recipient",
      thTags: "Tags",
      thStatus: "Status",
      thCreated: "Created",
      guideTitle: "學習說明（實際案例）",
      hide: "隱藏",
      show: "展開",
      guideCaseTitle: "實際案例：喚回 VIP + 台灣用戶",
      guideStep1: "在「segment_rule」輸入 vip,tw（多標籤 AND）。",
      guideStep2: "在「template」輸入如 Hi {{name}}, 週末免運！。",
      guideStep3: "按「Preview」檢視前 10 位對象與渲染後內容（{{name}} 會被替換）。",
      guideStep4: "確認 OK 後按「Send」，RabbitMQ 佇列 → Celery Worker 背景發送。",
      guideStep5: "按「Refresh」看統計、按「Load Messages」看收件者/標籤/狀態/時間。",
      guideLearnTitle: "你在學什麼（系統設計觀念）",
      guideLearn1: "同步/非同步拆分：API 快速回應，發送交給 Worker 處理。",
      guideLearn2: "冪等：同一用戶不重覆入列（DB 唯一鍵）。",
      guideLearn3: "重試 + 退避：臨時失敗自動重試，提升穩定性。",
      guideLearn4: "分眾規則：以逗號分隔代表 AND 條件，如 vip,tw。",
      guideSegTitle: "分眾規則範例",
      guideSeg1: "vip：所有含 vip 標籤的用戶。",
      guideSeg2: "tw：台灣用戶。",
      guideSeg3: "vip,tw：同時具備 vip 與 tw。",
      guideSeg4: "(空白)：全量發送（教學用）。",
      guideTplTitle: "模板占位符",
      guideTpl1: "目前示範支援 {{name}}（會被收件者的名稱替換）。",
      footer: "支援多標籤分眾（以逗號分隔，如 vip,tw），可先預覽再發送，並查看訊息明細。",
      switchLabel: "EN",
    },
    en: {
      title: "Massaging Queue Demo",
      step1Title: "1) Create Campaign",
      namePh: "name",
      templatePh: "template",
      segmentPh: "segment_rule (e.g., vip or vip,tw)",
      createBtn: "Create",
      campaignId: "campaign_id",
      rule: "rule",
      step2Title: "2) Send (RabbitMQ → Celery Worker) & Preview",
      sendBtn: "Send",
      previewBtn: "Preview",
      previewCount: "Previewing {count} targets (showing up to 10)",
      step3Title: "3) Stats",
      refreshBtn: "Refresh",
      statsLine: "total: {total}, queued: {queued}, sent: {sent}",
      statsLatency: "p50: {p50} · p95: {p95}",
      step4Title: "4) Messages",
      loadMessagesBtn: "Load Messages",
      thId: "ID",
      thRecipient: "Recipient",
      thTags: "Tags",
      thStatus: "Status",
      thCreated: "Created",
      guideTitle: "Learning Notes (Practical Case)",
      hide: "Hide",
      show: "Show",
      guideCaseTitle: "Case: Re-engage VIP users in Taiwan",
      guideStep1: "Enter vip,tw in segment_rule (AND of multiple tags).",
      guideStep2: "Set template like: Hi {{name}}, Free shipping this weekend!",
      guideStep3: "Click Preview to see first 10 recipients and rendered content ({{name}} replaced).",
      guideStep4: "Click Send to enqueue; RabbitMQ → Celery Worker handles sending.",
      guideStep5: "Click Refresh for stats; Load Messages to inspect recipients/status/time.",
      guideLearnTitle: "What you learn (system design)",
      guideLearn1: "Sync/async split: API responds fast; worker does the heavy lifting.",
      guideLearn2: "Idempotency: no duplicate messages per user (DB unique key).",
      guideLearn3: "Retries with backoff improve stability.",
      guideLearn4: "Segmentation: comma means AND, e.g., vip,tw.",
      guideSegTitle: "Segmentation examples",
      guideSeg1: "vip: users tagged vip.",
      guideSeg2: "tw: users in Taiwan.",
      guideSeg3: "vip,tw: users tagged both vip and tw.",
      guideSeg4: "(blank): send to all (demo).",
      guideTplTitle: "Template placeholders",
      guideTpl1: "Currently supports {{name}} (replaced by recipient name).",
      footer: "Supports multi-tag segments (comma, e.g., vip,tw). Preview before send; inspect message details.",
      switchLabel: "中文",
    },
  };
  const t = (key: string) => translations[lang][key] || key;
  const fmt = (s: string, vars: Record<string, any>) => s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));

  useEffect(() => {
    const saved = localStorage.getItem("lang") as Lang | null;
    if (saved === "zh" || saved === "en") setLang(saved);
  }, []);
  useEffect(() => {
    localStorage.setItem("lang", lang);
  }, [lang]);
  const [name, setName] = useState("Welcome Back");
  const [template, setTemplate] = useState("Hi {{name}}, we miss you! 💌");
  const [segment, setSegment] = useState("vip");
  const [campaignId, setCampaignId] = useState<number | null>(null);
  const [result, setResult] = useState<any | null>(null);
  const [stats, setStats] = useState<any | null>(null);
  const [campaign, setCampaign] = useState<any | null>(null);
  const [preview, setPreview] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [isGuideOpen, setIsGuideOpen] = useState(true);
  const [busy, setBusy] = useState(false);

  const onCreate = async () => {
    setBusy(true);
    try {
      const r = await createCampaign({ name, template, segment_rule: segment });
      setCampaignId(r.campaign_id);
      setResult(r);
      const c = await getCampaign(r.campaign_id);
      setCampaign(c);
    } catch (e: any) { alert(e.message) } finally { setBusy(false); }
  };

  const onSend = async () => {
    if (!campaignId) return;
    setBusy(true);
    try {
      const r = await sendCampaign(campaignId);
      setResult(r);
    } catch (e: any) { alert(e.message) } finally { setBusy(false); }
  };

  const onStats = async () => {
    if (!campaignId) return;
    setBusy(true);
    try {
      const r = await getStats(campaignId);
      setStats(r);
    } catch (e: any) { alert(e.message) } finally { setBusy(false); }
  };

  const onPreview = async () => {
    if (!campaignId) return;
    setBusy(true);
    try {
      const p = await getPreview(campaignId);
      setPreview(p);
    } catch (e: any) { alert(e.message) } finally { setBusy(false); }
  };

  const onLoadMessages = async () => {
    if (!campaignId) return;
    setBusy(true);
    try {
      const rows = await getMessages(campaignId);
      setMessages(rows);
    } catch (e: any) { alert(e.message) } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-2xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <div role="group" aria-label="Language switch" className="inline-flex items-center rounded-full border bg-gray-100 p-1">
          <button
            onClick={() => setLang("zh")}
            aria-pressed={lang === "zh"}
            className={
              "px-3 py-1 text-sm rounded-full transition " +
              (lang === "zh" ? "bg-black text-white shadow" : "text-gray-700 hover:text-black")
            }
          >
            中
          </button>
          <button
            onClick={() => setLang("en")}
            aria-pressed={lang === "en"}
            className={
              "px-3 py-1 text-sm rounded-full transition " +
              (lang === "en" ? "bg-black text-white shadow" : "text-gray-700 hover:text-black")
            }
          >
            EN
          </button>
        </div>
      </div>

      <div className="space-y-3 p-4 rounded-xl border">
        <h2 className="font-semibold">{t("step1Title")}</h2>
        <div className="grid grid-cols-1 gap-3">
          <input className="border rounded px-3 py-2" placeholder={t("namePh")} value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setName(e.target.value)} />
          <input className="border rounded px-3 py-2" placeholder={t("templatePh")} value={template} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setTemplate(e.target.value)} />
          <input className="border rounded px-3 py-2" placeholder={t("segmentPh")} value={segment} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setSegment(e.target.value)} />
          <button onClick={onCreate} disabled={busy} className="px-4 py-2 rounded bg-black text-white disabled:opacity-50">{t("createBtn")}</button>
          {campaignId && <div className="text-sm text-gray-600">{t("campaignId")} = {campaignId}</div>}
          {campaign && (
            <div className="text-xs text-gray-600">{t("rule")} = {campaign.segment_rule}</div>
          )}
        </div>
      </div>

      <div className="space-y-3 p-4 rounded-xl border">
        <h2 className="font-semibold">{t("step2Title")}</h2>
        <div className="flex gap-2">
          <button onClick={onSend} disabled={busy || !campaignId} className="px-4 py-2 rounded bg-black text-white disabled:opacity-50">{t("sendBtn")}</button>
          <button onClick={onPreview} disabled={busy || !campaignId} className="px-4 py-2 rounded border">{t("previewBtn")}</button>
        </div>
        {result && <pre className="bg-gray-50 p-3 rounded">{JSON.stringify(result, null, 2)}</pre>}
        {preview && (
          <div className="space-y-2">
            <div className="text-sm text-gray-600">{fmt(t("previewCount"), {count: preview.count})}</div>
            <ul className="list-disc pl-5 text-sm">
              {preview.previews.map((p:any)=> (
                <li key={p.user.id}>
                  <span className="font-mono">{p.user.email}</span>: <span className="italic">{p.body}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="space-y-3 p-4 rounded-xl border">
        <h2 className="font-semibold">{t("step3Title")}</h2>
        <button onClick={onStats} disabled={busy || !campaignId} className="px-4 py-2 rounded bg-black text-white disabled:opacity-50">{t("refreshBtn")}</button>
        {stats && (
          <div className="text-sm space-y-1">
            <div>{fmt(t("statsLine"), {total: stats.total, queued: stats.queued, sent: stats.sent})}</div>
            <div className="text-gray-600">{fmt(t("statsLatency"), {p50: stats.p50_ms != null ? Math.round(stats.p50_ms) + ' ms' : '—', p95: stats.p95_ms != null ? Math.round(stats.p95_ms) + ' ms' : '—'})}</div>
          </div>
        )}
      </div>

      <div className="space-y-3 p-4 rounded-xl border">
        <h2 className="font-semibold">{t("step4Title")}</h2>
        <button onClick={onLoadMessages} disabled={busy || !campaignId} className="px-4 py-2 rounded bg-black text-white disabled:opacity-50">{t("loadMessagesBtn")}</button>
        {messages.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-4">{t("thId")}</th>
                  <th className="py-2 pr-4">{t("thRecipient")}</th>
                  <th className="py-2 pr-4">{t("thTags")}</th>
                  <th className="py-2 pr-4">{t("thStatus")}</th>
                  <th className="py-2 pr-4">{t("thCreated")}</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((m:any)=> (
                  <tr key={m.id} className="border-b">
                    <td className="py-2 pr-4">{m.id}</td>
                    <td className="py-2 pr-4">{m.user.name} &lt;{m.user.email}&gt;</td>
                    <td className="py-2 pr-4">{m.user.tags}</td>
                    <td className="py-2 pr-4">{m.status}</td>
                    <td className="py-2 pr-4">{m.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="space-y-3 p-4 rounded-xl border">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{t("guideTitle")}</h2>
          <button onClick={()=>setIsGuideOpen(!isGuideOpen)} className="text-sm underline">
            {isGuideOpen ? t("hide") : t("show")}
          </button>
        </div>
        {isGuideOpen && (
          <div className="space-y-4 text-sm leading-6">
            <div>
              <h3 className="font-semibold">{t("guideCaseTitle")}</h3>
              <ol className="list-decimal pl-5">
                <li>{t("guideStep1")}</li>
                <li>{t("guideStep2")}</li>
                <li>{t("guideStep3")}</li>
                <li>{t("guideStep4")}</li>
                <li>{t("guideStep5")}</li>
              </ol>
            </div>

            <div>
              <h3 className="font-semibold">{t("guideLearnTitle")}</h3>
              <ul className="list-disc pl-5">
                <li>{t("guideLearn1")}</li>
                <li>{t("guideLearn2")}</li>
                <li>{t("guideLearn3")}</li>
                <li>{t("guideLearn4")}</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold">{t("guideSegTitle")}</h3>
              <ul className="list-disc pl-5">
                <li>{t("guideSeg1")}</li>
                <li>{t("guideSeg2")}</li>
                <li>{t("guideSeg3")}</li>
                <li>{t("guideSeg4")}</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold">{t("guideTplTitle")}</h3>
              <p>{t("guideTpl1")}</p>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500">{t("footer")}</p>
    </div>
  );
}
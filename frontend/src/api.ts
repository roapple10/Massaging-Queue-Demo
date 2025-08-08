const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export async function createCampaign(input: {name: string; template: string; segment_rule?: string}) {
  const r = await fetch(`${API_BASE}/campaigns`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(input),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function sendCampaign(campaign_id: number) {
  const r = await fetch(`${API_BASE}/campaigns/${campaign_id}/send`, { method: "POST" });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getStats(campaign_id: number) {
  const r = await fetch(`${API_BASE}/campaigns/${campaign_id}/stats`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getCampaign(campaign_id: number) {
  const r = await fetch(`${API_BASE}/campaigns/${campaign_id}`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getPreview(campaign_id: number) {
  const r = await fetch(`${API_BASE}/campaigns/${campaign_id}/preview`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getMessages(campaign_id: number) {
  const r = await fetch(`${API_BASE}/campaigns/${campaign_id}/messages`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
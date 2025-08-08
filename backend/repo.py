from typing import List, Tuple
from sqlalchemy import select, func, text
from sqlalchemy.exc import IntegrityError
from db import SessionLocal, Campaign, User, Message, Event

def create_campaign(name: str, template: str, segment_rule: str) -> int:
    with SessionLocal() as s:
        c = Campaign(name=name, template=template, segment_rule=segment_rule, status="DRAFT")
        s.add(c)
        s.commit()
        s.refresh(c)
        return c.id

def list_users_by_rule(segment_rule: str) -> List[User]:
    # Support simple AND of comma-separated tags, e.g. "vip,tw"
    with SessionLocal() as s:
        stmt = select(User)
        tags = [t.strip() for t in (segment_rule or "").split(",") if t.strip()]
        for tag in tags:
            like = f"%{tag}%"
            stmt = stmt.where(User.tags.like(like))
        return list(s.scalars(stmt))

def create_message(campaign_id: int, user_id: int) -> int | None:
    with SessionLocal() as s:
        idem = f"{campaign_id}:{user_id}:v1"
        m = Message(campaign_id=campaign_id, user_id=user_id, idempotency_key=idem, status="QUEUED")
        s.add(m)
        try:
            s.commit()
        except IntegrityError:
            s.rollback()
            # Already exists
            return None
        s.refresh(m)
        return m.id

def mark_sent(message_id: int):
    with SessionLocal() as s:
        m = s.get(Message, message_id)
        if not m:
            return
        m.status = "SENT"
        s.add(Event(message_id=message_id, type="SENT"))
        s.commit()

def campaign_stats(campaign_id: int) -> dict:
    with SessionLocal() as s:
        # Aggregate totals and latency percentiles (ms) in one query
        row = s.execute(
            text(
                """
                SELECT 
                  COUNT(m.id) AS total,
                  COUNT(m.id) FILTER (WHERE m.status = 'SENT') AS sent,
                  percentile_cont(0.5) WITHIN GROUP (
                    ORDER BY EXTRACT(EPOCH FROM (e.ts - m.created_at)) * 1000
                  ) AS p50_ms,
                  percentile_cont(0.95) WITHIN GROUP (
                    ORDER BY EXTRACT(EPOCH FROM (e.ts - m.created_at)) * 1000
                  ) AS p95_ms
                FROM messages m
                LEFT JOIN events e ON e.message_id = m.id AND e.type = 'SENT'
                WHERE m.campaign_id = :cid
                """
            ),
            {"cid": campaign_id},
        ).one()
        total = int(row.total or 0)
        sent = int(row.sent or 0)
        queued = total - sent
        # row.p50_ms / p95_ms can be None when there is no SENT event yet
        p50_ms = float(row.p50_ms) if row.p50_ms is not None else None
        p95_ms = float(row.p95_ms) if row.p95_ms is not None else None
        return {"total": total, "queued": queued, "sent": sent, "p50_ms": p50_ms, "p95_ms": p95_ms}

def get_campaign(campaign_id: int) -> Campaign | None:
    with SessionLocal() as s:
        return s.get(Campaign, campaign_id)

def list_messages_with_users(campaign_id: int, limit: int = 50) -> List[Tuple[Message, User]]:
    with SessionLocal() as s:
        rows = s.execute(
            select(Message, User)
            .join(User, User.id == Message.user_id)
            .where(Message.campaign_id == campaign_id)
            .order_by(Message.id.desc())
            .limit(limit)
        ).all()
        return [(m, u) for m, u in rows]
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from repo import (
    create_campaign,
    list_users_by_rule,
    create_message,
    campaign_stats,
    get_campaign,
    list_messages_with_users,
)
from workers.sender import send_message

router = APIRouter()

class CreateCampaignReq(BaseModel):
    name: str
    template: str
    segment_rule: str | None = None

@router.post("")
def create(req: CreateCampaignReq):
    cid = create_campaign(req.name, req.template, req.segment_rule or "")
    return {"campaign_id": cid}

@router.post("/{cid}/send")
def send(cid: int):
    c = get_campaign(cid)
    if not c:
        raise HTTPException(status_code=404, detail="Campaign not found")
    users = list_users_by_rule(c.segment_rule or "")
    queued = 0
    for u in users:
        mid = create_message(cid, u.id)
        if mid is not None:
            send_message.delay(mid)
            queued += 1
    return {"queued": queued}

@router.get("/{cid}/stats")
def stats(cid: int):
    return campaign_stats(cid)

@router.get("/{cid}")
def get(cid: int):
    c = get_campaign(cid)
    if not c:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return {"id": c.id, "name": c.name, "template": c.template, "segment_rule": c.segment_rule, "status": c.status}

@router.get("/{cid}/preview")
def preview(cid: int, limit: int = 10):
    c = get_campaign(cid)
    if not c:
        raise HTTPException(status_code=404, detail="Campaign not found")
    users = list_users_by_rule(c.segment_rule or "")[:limit]
    # very simple template replacement for {{name}}
    previews = []
    for u in users:
        body = (c.template or "").replace("{{name}}", u.name)
        previews.append({"user": {"id": u.id, "name": u.name, "email": u.email, "tags": u.tags}, "body": body})
    return {"count": len(users), "users": [u.id for u in users], "previews": previews}

@router.get("/{cid}/messages")
def messages(cid: int, limit: int = 50):
    rows = list_messages_with_users(cid, limit=limit)
    return [
        {
            "id": m.id,
            "status": m.status,
            "user": {"id": u.id, "name": u.name, "email": u.email, "tags": u.tags},
            "created_at": m.created_at.isoformat(),
        }
        for m, u in rows
    ]
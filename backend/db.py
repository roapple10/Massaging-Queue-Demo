from datetime import datetime
from typing import Optional
from sqlalchemy import create_engine, Integer, String, DateTime, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import declarative_base, sessionmaker, Mapped, mapped_column, relationship
from env import settings

engine = create_engine(settings.DB_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)
Base = declarative_base()

class Tenant(Base):
    __tablename__ = "tenants"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(200), nullable=False)
    tags: Mapped[str] = mapped_column(String(200), nullable=False, default="")

class Campaign(Base):
    __tablename__ = "campaigns"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    template: Mapped[str] = mapped_column(Text, nullable=False)  # e.g., "Hi {{name}}"
    segment_rule: Mapped[str] = mapped_column(String(200), nullable=True)  # e.g., 'vip'
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="DRAFT")
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

class Message(Base):
    __tablename__ = "messages"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    campaign_id: Mapped[int] = mapped_column(ForeignKey("campaigns.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="QUEUED")
    idempotency_key: Mapped[str] = mapped_column(String(200), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    campaign = relationship("Campaign")
    user = relationship("User")

    __table_args__ = (
        UniqueConstraint("campaign_id", "user_id", name="uq_campaign_user"),
        UniqueConstraint("idempotency_key", name="uq_idempotency"),
    )

class Event(Base):
    __tablename__ = "events"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    message_id: Mapped[int] = mapped_column(ForeignKey("messages.id"), nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False)  # SENT / DELIVERED / OPENED
    ts: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

# ---- Seed helpers ----
def seed_if_needed():
    with SessionLocal() as s:
        # Seed one tenant and ~20 users if empty
        if s.query(User).count() == 0:
            import random
            import string
            tenant = Tenant(name="demo-tenant")
            s.add(tenant)
            names = ["Ray", "Alice", "Bob", "Carol", "David", "Eve", "Frank", "Grace", "Heidi", "Ivan", "Judy",
                     "Mallory", "Niaj", "Olivia", "Peggy", "Rupert", "Sybil", "Trent", "Victor", "Wendy"]
            for n in names:
                tags = []
                if random.random() < 0.4:
                    tags.append("vip")
                if random.random() < 0.3:
                    tags.append("tw")
                if random.random() < 0.2:
                    tags.append("jp")
                email = f"{n.lower()}@example.com"
                s.add(User(name=n, email=email, tags=",".join(tags)))
            s.commit()
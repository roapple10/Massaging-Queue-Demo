import os, random, time
from celery_app import celery
from repo import mark_sent

RATE_PER_SEC = float(os.getenv("RATE_PER_SEC", "20"))
SLEEP_SEC = 1.0 / RATE_PER_SEC if RATE_PER_SEC > 0 else 0.0

@celery.task(bind=True, autoretry_for=(Exception,), retry_backoff=2, retry_kwargs={"max_retries": 3})
def send_message(self, message_id: int):
    # simple rate limit via sleep, default ~20 msg/s per worker (configurable with RATE_PER_SEC)
    if SLEEP_SEC > 0:
        time.sleep(SLEEP_SEC)
    # 10% transient failure to demonstrate retry / DLQ concept (PoC does retries only)
    if random.random() < 0.1:
        raise Exception("Transient provider error")
    mark_sent(message_id)
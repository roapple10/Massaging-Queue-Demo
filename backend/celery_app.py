import os
from celery import Celery
from env import settings

celery = Celery("maac_lite", broker=settings.RABBITMQ_URL, backend=None)
celery.conf.update(
    task_acks_late=True,
    worker_prefetch_multiplier=10,
    task_default_queue="default",
    # Explicitly import tasks module to ensure registration in all environments
    imports=("workers.sender",),
)

# Also autodiscover as a fallback (works when package discovery is available)
celery.autodiscover_tasks(["workers"], force=True)
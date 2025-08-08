FROM python:3.11-slim

# Install build deps for psycopg2 and general
RUN apt-get update && apt-get install -y --no-install-recommends         build-essential libpq-dev curl &&         rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend /app/backend
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app/backend

# Default command is API server; worker overrides in docker-compose
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
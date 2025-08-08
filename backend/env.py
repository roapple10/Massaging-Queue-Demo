import os

class Settings:
    PROJECT_NAME: str = "Massaging Queue Demo"
    DB_URL: str = os.getenv("DATABASE_URL", "postgresql+psycopg2://postgres:postgres@db:5432/postgres")
    RABBITMQ_URL: str = os.getenv("RABBITMQ_URL", "amqp://guest:guest@mq:5672//")
    SEED_ON_START: bool = os.getenv("SEED_ON_START", "1") == "1"
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "*")

settings = Settings()
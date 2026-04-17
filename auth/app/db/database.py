from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not set in environment variables")

engine = create_engine(
    DATABASE_URL,
    connect_args={"sslmode": "require"} if DATABASE_URL.startswith("postgresql") else {}
)

SessionLocal = sessionmaker(bind=engine)

Base = declarative_base()
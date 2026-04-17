from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.auth import router
from app.db.database import engine, Base

# Create tables
try:
    Base.metadata.create_all(bind=engine)
    print("Database tables verified/created.")
except Exception as e:
    print(f"DATABASE ERROR ON STARTUP: {str(e)}")
    import traceback
    traceback.print_exc()

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/auth", tags=["Auth"])

@app.get("/health")
def health_check():
    return {"status": "ok"}
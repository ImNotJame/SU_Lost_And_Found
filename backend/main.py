from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from routes.auth import router as auth_router
from routes.claims import router as claims_router
from routes.posts import router as posts_router

app = FastAPI()
uploads_directory = Path(__file__).resolve().parent / "uploads"
uploads_directory.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_directory), name="uploads")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_router)
app.include_router(claims_router)
app.include_router(posts_router)

@app.get("/")
def home():
    return {"message": "Hello"}

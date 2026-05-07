import sys
import os

# Додати backend до Python path
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.core.config import settings
from app.core.database import engine, Base
from app.api import auth, students, attendance, payments, stats, groups, trainers

# Створення таблиць
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="CRM для спортивної школи",
    description="API для управління учнями, відвідуваннями, оплатами та абонементами",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Дозволити всі origins для розробки
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Підключення роутерів
app.include_router(auth.router)
app.include_router(students.router)
app.include_router(attendance.router)
app.include_router(payments.router)
app.include_router(stats.router)
app.include_router(groups.router)
app.include_router(trainers.router)

@app.get("/")
async def root():
    return {
        "message": "CRM для спортивної школи API",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    return {"status": "ok"}

# Mount static files (frontend)
frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend")
if os.path.exists(frontend_path):
    css_path = os.path.join(frontend_path, "css")
    js_path = os.path.join(frontend_path, "js")
    images_path = os.path.join(frontend_path, "images")

    if os.path.exists(css_path):
        app.mount("/css", StaticFiles(directory=css_path), name="css")
    if os.path.exists(js_path):
        app.mount("/js", StaticFiles(directory=js_path), name="js")
    if os.path.exists(images_path):
        app.mount("/images", StaticFiles(directory=images_path), name="images")

    @app.get("/")
    async def serve_frontend():
        return FileResponse(os.path.join(frontend_path, "pages", "login.html"))

    @app.get("/{page}.html")
    async def serve_page(page: str):
        file_path = os.path.join(frontend_path, "pages", f"{page}.html")
        if os.path.exists(file_path):
            return FileResponse(file_path)
        return {"error": "Page not found"}

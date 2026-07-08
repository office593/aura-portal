from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from database import engine
import models
from routers import auth, tenants, project, gallery, announcements, contacts, plans, tenant_docs, carousel, about, tasks, settings

models.Base.metadata.create_all(bind=engine)

UPLOADS_DIR = Path("uploads")
UPLOADS_DIR.mkdir(exist_ok=True)

app = FastAPI(title="Tenant Portal API", redirect_slashes=False)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth.router, prefix="/api")
app.include_router(tenants.router, prefix="/api")
app.include_router(project.router, prefix="/api")
app.include_router(gallery.router, prefix="/api")
app.include_router(announcements.router, prefix="/api")
app.include_router(contacts.router, prefix="/api")
app.include_router(plans.router, prefix="/api")
app.include_router(tenant_docs.router, prefix="/api")
app.include_router(carousel.router, prefix="/api")
app.include_router(about.router, prefix="/api")
app.include_router(tasks.router, prefix="/api")
app.include_router(settings.router, prefix="/api")

STATIC_DIR = Path("static")
if STATIC_DIR.exists():
    app.mount("/assets", StaticFiles(directory="static/assets"), name="assets")

@app.get("/")
def root():
    static_index = Path("static/index.html")
    if static_index.exists():
        return FileResponse(static_index)
    return {"status": "ok", "message": "Tenant Portal API"}

@app.get("/{full_path:path}")
def catch_all(full_path: str):
    static_index = Path("static/index.html")
    if static_index.exists():
        return FileResponse(static_index)
    return {"status": "ok"}

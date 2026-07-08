from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String, Text
from database import Base


class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False)
    air_old = Column(String)    # כיוון אוויר ישן
    air_new = Column(String)    # כיוון אוויר חדש
    floor_old = Column(String)  # קומה ישנה
    floor_new = Column(String)  # קומה חדשה
    specs = Column(Text)        # מפרט טכני (JSON string)
    avatar_url = Column(String)
    project = Column(String)
    has_signed = Column(Boolean, default=False)
    id_number = Column(String)
    id_image_url = Column(String)
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)


class OTP(Base):
    __tablename__ = "otps"

    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String, index=True, nullable=False)
    code = Column(String, nullable=False)
    expires_at = Column(DateTime, nullable=False)


class ProjectStage(Base):
    __tablename__ = "project_stages"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=True)   # קטגוריה ראשית
    order = Column(Integer, nullable=False)
    status = Column(String, default="pending")  # completed / active / pending
    target_date = Column(String)
    completion_pct = Column(Float, default=0.0)
    description = Column(Text)


class GalleryItem(Base):
    __tablename__ = "gallery_items"

    id = Column(Integer, primary_key=True, index=True)
    url = Column(String, nullable=False)
    media_type = Column(String, default="image")  # image / video
    stage_id = Column(Integer)
    caption = Column(String)
    category = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)


class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    priority = Column(String, default="normal")  # urgent / normal
    published_at = Column(DateTime, default=datetime.utcnow)
    target_group = Column(String)  # None = לכולם, שם פרויקט = קבוצה בלבד


class PlanFile(Base):
    __tablename__ = "plan_files"

    id = Column(Integer, primary_key=True, index=True)
    url = Column(String, nullable=False)
    caption = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)


class TenantDocument(Base):
    __tablename__ = "tenant_documents"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, nullable=False, index=True)
    filename = Column(String, nullable=False)
    url = Column(String, nullable=False)
    caption = Column(String)
    is_personal = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class CarouselImage(Base):
    __tablename__ = "carousel_images"

    id = Column(Integer, primary_key=True, index=True)
    url = Column(String, nullable=False)
    order = Column(Integer, default=0)


class Contact(Base):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False)
    phone = Column(String)
    email = Column(String)
    avatar_url = Column(String)
    type = Column(String, default="contact")  # contact / professional
    website = Column(String)
    whatsapp = Column(String)
    category = Column(String)  # for contacts: יזם / מנהלת / עו"ד דיירים / שמאי דיירים


class AboutProject(Base):
    __tablename__ = "about_projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    location = Column(String)
    description = Column(Text)
    url = Column(String)
    order = Column(Integer, default=0)


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    assigned_to_id = Column(Integer)
    assigned_to_name = Column(String)
    status = Column(String, default="pending")  # pending / done
    completed_by_id = Column(Integer)
    completed_by_name = Column(String)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    due_date = Column(String)


class PressItem(Base):
    __tablename__ = "press_items"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    source = Column(String)
    date = Column(String)
    url = Column(String)
    order = Column(Integer, default=0)


class AppSettings(Base):
    __tablename__ = "app_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, nullable=False)
    value = Column(Text)


class CompanyInfo(Base):
    __tablename__ = "company_info"

    id = Column(Integer, primary_key=True, index=True)
    founder_name = Column(String)
    founder_title = Column(String)
    founder_years = Column(String)
    founder_description = Column(Text)
    founder_image_url = Column(String)

"""Populate the database with demo data."""
import json
import sys
from datetime import datetime, timedelta
from database import SessionLocal, engine
import models

models.Base.metadata.create_all(bind=engine)

db = SessionLocal()

# Clear existing data
for table in [models.OTP, models.GalleryItem, models.Announcement, models.Contact,
              models.ProjectStage, models.Tenant]:
    db.query(table).delete()
db.commit()

# Tenants
specs_demo = json.dumps({
    "קירות": "טיח + צבע לבן",
    "ריצוף": "גרניט 60x60",
    "מטבח": "ארונות לבן עם משטח קוורץ",
    "חדר אמבטיה": "אריחי 30x60 לבן",
    "חלונות": "אלומיניום + זכוכית כפולה",
    "מיזוג": "מיני מרכזי לכל חדר",
})

tenants = [
    models.Tenant(
        phone="0500000000", name="מנהל מערכת", is_admin=True,
        air_old=None, air_new=None, floor_old=None, floor_new=None, specs=None,
    ),
    models.Tenant(
        phone="0501234567", name="ישראל ישראלי", is_admin=False,
        air_old="מזרח", air_new="דרום-מערב", floor_old="4", floor_new="6",
        specs=specs_demo,
    ),
    models.Tenant(
        phone="0509876543", name="שרה כהן", is_admin=False,
        air_old="צפון", air_new="דרום", floor_old="3", floor_new="5",
        specs=specs_demo,
    ),
    models.Tenant(
        phone="0521112233", name="דוד לוי", is_admin=False,
        air_old="מערב", air_new="מזרח-צפון", floor_old="2", floor_new="4",
        specs=specs_demo,
    ),
]
db.add_all(tenants)

# Project stages
CAT1 = 'תב"ע'
CAT2 = "תכנית עיצוב אדריכלי"
CAT3 = "היתר בנייה"

stages = [
    # תב"ע
    models.ProjectStage(category=CAT1, name='תכנון ותיאום ראשוני מול העירייה', order=1,
                        status="completed", completion_pct=100),
    models.ProjectStage(category=CAT1, name='פורום מהנדס העיר (תב"ע)', order=2,
                        status="completed", completion_pct=100),
    models.ProjectStage(category=CAT1, name="סבב הערות לתוכנית", order=3,
                        status="completed", completion_pct=100),
    models.ProjectStage(category=CAT1, name="דיון להפקדה בועדה המקומית", order=4,
                        status="active", completion_pct=60),
    models.ProjectStage(category=CAT1, name="אישור התכנית למתן תוקף", order=5,
                        status="pending", completion_pct=0),
    # תכנית עיצוב אדריכלי
    models.ProjectStage(category=CAT2, name="תיאום מול העירייה לתכנית עיצוב", order=6,
                        status="pending", completion_pct=0),
    models.ProjectStage(category=CAT2, name="פורום מהנדס העיר (תכנית עיצוב)", order=7,
                        status="pending", completion_pct=0),
    models.ProjectStage(category=CAT2, name="תיקוני הערות ואישורים", order=8,
                        status="pending", completion_pct=0),
    models.ProjectStage(category=CAT2, name="דיון לאישור בועדה המקומית", order=9,
                        status="pending", completion_pct=0),
    models.ProjectStage(category=CAT2, name="חתימות סופיות לאישור", order=10,
                        status="pending", completion_pct=0),
    # היתר בנייה
    models.ProjectStage(category=CAT3, name="בקשה למידע להיתר", order=11,
                        status="pending", completion_pct=0),
    models.ProjectStage(category=CAT3, name="הגשת בקשה להיתר בנייה", order=12,
                        status="pending", completion_pct=0),
    models.ProjectStage(category=CAT3, name="דיון לאישור בוועדה המקומית/רשות רישוי", order=13,
                        status="pending", completion_pct=0),
    models.ProjectStage(category=CAT3, name="תיקוני הערות ואישורים/מכון בקרה", order=14,
                        status="pending", completion_pct=0),
    models.ProjectStage(category=CAT3, name="בדיקה סופית, אגרות ואישור, הבקשה להיתר", order=15,
                        status="pending", completion_pct=0),
]
db.add_all(stages)

# Gallery
gallery = [
    models.GalleryItem(url="https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800",
                       media_type="image", stage_id=1, caption="עבודות הריסה בשלב ראשון",
                       created_at=datetime.utcnow() - timedelta(days=90)),
    models.GalleryItem(url="https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=800",
                       media_type="image", stage_id=2, caption="יציקת יסודות",
                       created_at=datetime.utcnow() - timedelta(days=60)),
    models.GalleryItem(url="https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800",
                       media_type="image", stage_id=2, caption="עליית שלד הבניין",
                       created_at=datetime.utcnow() - timedelta(days=45)),
    models.GalleryItem(url="https://images.unsplash.com/photo-1590725121839-892b458a74fe?w=800",
                       media_type="image", stage_id=3, caption="התקנת חלונות קומה 2",
                       created_at=datetime.utcnow() - timedelta(days=20)),
    models.GalleryItem(url="https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=800",
                       media_type="image", stage_id=3, caption="חיפוי חיצוני בביצוע",
                       created_at=datetime.utcnow() - timedelta(days=7)),
    models.GalleryItem(url="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
                       media_type="image", stage_id=3, caption="מבט על מהגג",
                       created_at=datetime.utcnow() - timedelta(days=3)),
]
db.add_all(gallery)

# Announcements
announcements = [
    models.Announcement(
        title="עדכון מהשטח — שבוע יוני",
        body="הקבלן מדווח על התקדמות מצוינת בעבודות החיפוי החיצוני. צפי לסיום שלב 3 לפי התכנון.",
        priority="normal",
        published_at=datetime.utcnow() - timedelta(days=2),
    ),
    models.Announcement(
        title="⚠️ הפסקת עבודה זמנית — 28-29 ביוני",
        body="עקב חגיגות העצמאות, העבודות בשטח יופסקו בימים 28–29 ביוני. העבודות יחודשו ב-30 ביוני.",
        priority="urgent",
        published_at=datetime.utcnow() - timedelta(days=5),
    ),
    models.Announcement(
        title="פגישת עדכון דיירים",
        body="ייערך מפגש עדכון לדיירים ביום ד' 3.7.2025 בשעה 18:00 בבניין השכן ברחוב הרצל 5. נשמח לראותכם!",
        priority="normal",
        published_at=datetime.utcnow() - timedelta(days=10),
    ),
    models.Announcement(
        title="קבלת תמונות המפרט הטכני",
        body="כל הדיירים שטרם אישרו את המפרט הטכני מתבקשים לפנות לנציג הפרויקט עד ה-15.7.2025.",
        priority="urgent",
        published_at=datetime.utcnow() - timedelta(days=15),
    ),
]
db.add_all(announcements)

# Contacts
contacts = [
    models.Contact(name="אבי מזרחי", role="מנהל פרויקט", phone="052-1234567",
                   email="avi@project.co.il", avatar_url=None),
    models.Contact(name="רחל גולדברג", role="נציגת הדיירים", phone="054-9876543",
                   email="rachel@tenants.co.il", avatar_url=None),
    models.Contact(name="משה קרני", role="מהנדס אחראי", phone="050-1122334",
                   email="moshe@eng.co.il", avatar_url=None),
    models.Contact(name="לינה שמואל", role="רכזת מידע ותלונות", phone="053-5544332",
                   email="lina@project.co.il", avatar_url=None),
]
db.add_all(contacts)

db.commit()
db.close()

import sys
sys.stdout.reconfigure(encoding='utf-8')
print("Database seeded successfully!")
print("\nDemo accounts:")
print("  Admin:   0500000000")
print("  Tenant:  0501234567")
print("  Tenant:  0509876543")
print("  Tenant:  0521112233")

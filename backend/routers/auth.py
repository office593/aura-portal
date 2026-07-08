import random
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
import models
from auth_utils import create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


class SendOTPRequest(BaseModel):
    phone: str


class VerifyOTPRequest(BaseModel):
    phone: str
    code: str


@router.post("/send-otp")
def send_otp(req: SendOTPRequest, db: Session = Depends(get_db)):
    tenant = db.query(models.Tenant).filter(models.Tenant.phone == req.phone).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="מספר טלפון לא רשום במערכת")

    code = str(random.randint(100000, 999999))
    expires = datetime.utcnow() + timedelta(minutes=10)

    db.query(models.OTP).filter(models.OTP.phone == req.phone).delete()
    db.add(models.OTP(phone=req.phone, code=code, expires_at=expires))
    db.commit()

    # In production this would send an SMS — for now print to log and return in response (dev mode)
    print(f"\n{'='*40}\n📱 OTP for {req.phone}: {code}\n{'='*40}\n")

    return {"message": "קוד נשלח", "dev_code": code}


@router.post("/verify-otp")
def verify_otp(req: VerifyOTPRequest, db: Session = Depends(get_db)):
    otp = (
        db.query(models.OTP)
        .filter(models.OTP.phone == req.phone, models.OTP.code == req.code)
        .first()
    )
    if not otp:
        raise HTTPException(status_code=400, detail="קוד שגוי")
    if otp.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="הקוד פג תוקף")

    db.delete(otp)
    db.commit()

    tenant = db.query(models.Tenant).filter(models.Tenant.phone == req.phone).first()
    token = create_access_token({"sub": tenant.phone})
    return {
        "access_token": token,
        "is_admin": tenant.is_admin,
        "name": tenant.name,
    }

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.models import User, PriceList # Припустимо, ви додали модель PriceList
from app.schemas.schemas import PriceCreate, PriceResponse # Та схеми

router = APIRouter(prefix="/api/prices", tags=["Prices"])

@router.get("", response_model=List[PriceResponse])
async def get_prices(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(PriceList).filter(PriceList.is_active == True).all()
@router.post("", response_model=PriceResponse, status_code=201)
async def create_price(price: PriceCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Тільки адміністратор може редагувати прайс")
    db_price = PriceList(**price.dict())
    db.add(db_price)
    db.commit()
    db.refresh(db_price)
    return db_price

@router.put("/{price_id}", response_model=PriceResponse)
async def update_price(price_id: int, price_update: PriceCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Тільки адміністратор може редагувати прайс")
    db_price = db.query(PriceList).filter(PriceList.id == price_id).first()
    if not db_price:
        raise HTTPException(status_code=404, detail="Service not found")
    for key, value in price_update.dict().items():
        setattr(db_price, key, value)
    db.commit()
    db.refresh(db_price)
    return db_price

@router.delete("/{price_id}", status_code=204)
async def delete_price(price_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Тільки адміністратор може видаляти")
    db_price = db.query(PriceList).filter(PriceList.id == price_id).first()
    db.delete(db_price)
    db.commit()
    return None
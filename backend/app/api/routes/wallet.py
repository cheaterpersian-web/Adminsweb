from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.core.auth import get_current_user, require_root_admin
from app.models.wallet import Wallet, WalletTransaction
from app.models.user import User
from app.schemas.wallet import WalletRead, WalletAdjustRequest, WalletTransactionRead, WalletTransactionsResponse


router = APIRouter()


def _get_or_create_wallet(db: Session, user_id: int) -> Wallet:
    w = db.query(Wallet).filter(Wallet.user_id == user_id).first()
    if not w:
        w = Wallet(user_id=user_id, balance=0)
        db.add(w)
        db.commit()
        db.refresh(w)
    return w


@router.get("/wallet/me", response_model=WalletRead)
def get_my_wallet(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    w = _get_or_create_wallet(db, current_user.id)
    return WalletRead(balance=w.balance)


@router.get("/wallet/me/transactions", response_model=WalletTransactionsResponse)
def get_my_wallet_txs(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    txs = db.query(WalletTransaction).filter(WalletTransaction.user_id == current_user.id).order_by(WalletTransaction.id.desc()).all()
    return WalletTransactionsResponse(items=[WalletTransactionRead.from_orm(t) for t in txs])


@router.get("/wallet/{user_id}", response_model=WalletRead)
def get_user_wallet(user_id: int, db: Session = Depends(get_db), _: User = Depends(require_root_admin)):
    w = _get_or_create_wallet(db, user_id)
    return WalletRead(balance=w.balance)


@router.post("/wallet/{user_id}/adjust", response_model=WalletRead)
def adjust_wallet(user_id: int, payload: WalletAdjustRequest, db: Session = Depends(get_db), _: User = Depends(require_root_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    w = _get_or_create_wallet(db, user_id)
    w.balance = (w.balance or 0) + payload.amount
    tx = WalletTransaction(user_id=user_id, amount=payload.amount, reason=payload.reason)
    db.add(w)
    db.add(tx)
    db.commit()
    db.refresh(w)
    return WalletRead(balance=w.balance)


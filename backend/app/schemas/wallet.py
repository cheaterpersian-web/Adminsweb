from pydantic import BaseModel, condecimal
from typing import List


class WalletRead(BaseModel):
    balance: condecimal(max_digits=14, decimal_places=2)


class WalletAdjustRequest(BaseModel):
    amount: condecimal(max_digits=14, decimal_places=2)
    reason: str | None = None


class WalletTransactionRead(BaseModel):
    id: int
    amount: condecimal(max_digits=14, decimal_places=2)
    reason: str | None = None
    created_at: str

    class Config:
        from_attributes = True


class WalletTransactionsResponse(BaseModel):
    items: List[WalletTransactionRead]


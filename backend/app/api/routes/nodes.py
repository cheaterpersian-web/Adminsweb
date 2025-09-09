from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.session import get_db
from app.models.admins_nodes import AdminNode
from app.models.user import User
from app.core.auth import require_roles
from pydantic import BaseModel

router = APIRouter()


class NodeCreate(BaseModel):
    name: str
    status: Optional[str] = "offline"


class NodeUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None


@router.get("/nodes", response_model=List[dict])
def list_nodes(db: Session = Depends(get_db), _: User = Depends(require_roles(["admin", "operator", "viewer"]))):
    nodes = db.query(AdminNode).order_by(AdminNode.id.desc()).all()
    return [{"id": n.id, "name": n.name, "status": n.status, "last_seen": n.last_seen, "metadata": n.meta} for n in nodes]


@router.post("/nodes", response_model=dict)
def create_node(payload: NodeCreate, db: Session = Depends(get_db), _: User = Depends(require_roles(["admin", "operator"]))):
    if db.query(AdminNode).filter(AdminNode.name == payload.name).first():
        raise HTTPException(status_code=400, detail="Node name already exists")
    node = AdminNode(name=payload.name, status=payload.status or "offline")
    db.add(node)
    db.commit()
    db.refresh(node)
    return {"id": node.id, "name": node.name, "status": node.status}


@router.put("/nodes/{node_id}", response_model=dict)
def update_node(node_id: int, payload: NodeUpdate, db: Session = Depends(get_db), _: User = Depends(require_roles(["admin", "operator"]))):
    node = db.query(AdminNode).filter(AdminNode.id == node_id).first()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    if payload.name is not None:
        node.name = payload.name
    if payload.status is not None:
        node.status = payload.status
    db.add(node)
    db.commit()
    db.refresh(node)
    return {"id": node.id, "name": node.name, "status": node.status}
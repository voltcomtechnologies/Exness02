from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import models, schemas
from database import get_db

router = APIRouter(prefix="/user", tags=["user"])

@router.get("/tickets/{account_id}", response_model=List[schemas.TicketResponse])
def get_user_tickets(account_id: int, db: Session = Depends(get_db)):
    tickets = db.query(models.Ticket).filter(models.Ticket.account_id == account_id).order_by(models.Ticket.created_at.desc()).all()
    return tickets

@router.post("/tickets", response_model=schemas.TicketResponse)
def create_ticket(account_id: int, payload: schemas.TicketCreate, db: Session = Depends(get_db)):
    db_ticket = models.Ticket(
        account_id=account_id,
        subject=payload.subject
    )
    db.add(db_ticket)
    db.commit()
    db.refresh(db_ticket)
    return db_ticket

@router.post("/tickets/{ticket_id}/messages", response_model=schemas.TicketMessageResponse)
def reply_to_ticket(ticket_id: int, account_id: int, payload: schemas.TicketMessageCreate, db: Session = Depends(get_db)):
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id, models.Ticket.account_id == account_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found or access denied")
    
    db_msg = models.TicketMessage(
        ticket_id=ticket.id,
        sender=str(account_id),
        content=payload.content
    )
    db.add(db_msg)
    db.commit()
    db.refresh(db_msg)
    return db_msg

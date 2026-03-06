from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct
from typing import List, Dict
from pydantic import BaseModel
import models, schemas
from database import get_db
from auth import authenticate_admin, verify_admin_token, logout_admin

router = APIRouter(prefix="/admin", tags=["admin"])


# --- Auth Endpoints (public) ---

class LoginRequest(BaseModel):
    username: str
    password: str

@router.post("/login")
def admin_login(req: LoginRequest):
    token = authenticate_admin(req.username, req.password)
    return {"token": token, "message": "Login successful"}

@router.post("/logout")
def admin_logout(token: str = Depends(verify_admin_token)):
    logout_admin(token)
    return {"message": "Logged out successfully"}


# --- Protected Endpoints (require token) ---

@router.get("/dashboard")
def get_dashboard_stats(token: str = Depends(verify_admin_token), db: Session = Depends(get_db)):
    total_accounts = db.query(models.Account).count()
    active_accounts = db.query(models.Account).filter(models.Account.status == "Active").count()
    failed_accounts = db.query(models.Account).filter(models.Account.status == "Failed").count()
    
    total_messages = db.query(models.Message).count()
    unread_messages = db.query(models.Message).filter(
        models.Message.sender != "admin",
        models.Message.is_read == False
    ).count()
    
    total_ticket_messages = db.query(models.TicketMessage).count()
    unread_ticket_messages = db.query(models.TicketMessage).filter(
        models.TicketMessage.sender != "admin",
        models.TicketMessage.is_read == False
    ).count()
    open_tickets = db.query(models.Ticket).filter(models.Ticket.status != "Resolved").count()
    
    return {
        "total_accounts": total_accounts,
        "active_accounts": active_accounts,
        "failed_accounts": failed_accounts,
        "total_messages": total_messages,
        "unread_messages": unread_messages,
        "total_ticket_messages": total_ticket_messages,
        "unread_ticket_messages": unread_ticket_messages,
        "open_tickets": open_tickets
    }

@router.get("/accounts", response_model=List[schemas.AccountResponse])
def get_accounts(token: str = Depends(verify_admin_token), db: Session = Depends(get_db)):
    accounts = db.query(models.Account).order_by(models.Account.created_at.desc()).all()
    return accounts

@router.get("/accounts/{account_id}/credentials", response_model=schemas.AccountCredentialsResponse)
def get_account_credentials(account_id: int, token: str = Depends(verify_admin_token), db: Session = Depends(get_db)):
    account = db.query(models.Account).filter(models.Account.account_id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return account

@router.put("/accounts/{account_id}/status", response_model=schemas.AccountResponse)
def update_account_status(account_id: int, status: str, token: str = Depends(verify_admin_token), db: Session = Depends(get_db)):
    account = db.query(models.Account).filter(models.Account.account_id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    account.status = status
    db.commit()
    db.refresh(account)
    return account

@router.get("/messages/unread-counts")
def get_unread_counts(token: str = Depends(verify_admin_token), db: Session = Depends(get_db)):
    """Get unread message counts per account (only user->admin messages)."""
    results = db.query(
        models.Message.sender,
        func.count(models.Message.id)
    ).filter(
        models.Message.sender != "admin",
        models.Message.is_read == False
    ).group_by(models.Message.sender).all()
    
    return {sender: count for sender, count in results}

@router.get("/messages/{account_id}", response_model=List[schemas.MessageResponse])
def get_admin_messages(account_id: int, token: str = Depends(verify_admin_token), db: Session = Depends(get_db)):
    account_id_str = str(account_id)
    # Mark all unread messages from this account as read
    db.query(models.Message).filter(
        models.Message.sender == account_id_str,
        models.Message.is_read == False
    ).update({"is_read": True})
    db.commit()
    
    messages = db.query(models.Message).filter(
        (models.Message.sender == account_id_str) | (models.Message.receiver == account_id_str)
    ).order_by(models.Message.timestamp.asc()).all()
    return messages

@router.post("/messages", response_model=schemas.MessageResponse)
def send_admin_message(msg: schemas.MessageCreate, token: str = Depends(verify_admin_token), db: Session = Depends(get_db)):
    db_msg = models.Message(
        sender="admin",
        receiver=msg.receiver,
        content=msg.content,
        is_read=True
    )
    db.add(db_msg)
    db.commit()
    db.refresh(db_msg)
    return db_msg

@router.get("/tickets/unread-counts")
def get_ticket_unread_counts(token: str = Depends(verify_admin_token), db: Session = Depends(get_db)):
    """Get unread ticket message counts per ticket (only user->admin messages)."""
    results = db.query(
        models.TicketMessage.ticket_id,
        func.count(models.TicketMessage.id)
    ).filter(
        models.TicketMessage.sender != "admin",
        models.TicketMessage.is_read == False
    ).group_by(models.TicketMessage.ticket_id).all()
    
    return {str(ticket_id): count for ticket_id, count in results}

@router.get("/tickets", response_model=List[schemas.TicketResponse])
def get_all_tickets(token: str = Depends(verify_admin_token), db: Session = Depends(get_db)):
    tickets = db.query(models.Ticket).order_by(models.Ticket.created_at.desc()).all()
    return tickets

@router.put("/tickets/{ticket_id}/status", response_model=schemas.TicketResponse)
def update_ticket_status(ticket_id: int, status: str, token: str = Depends(verify_admin_token), db: Session = Depends(get_db)):
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    ticket.status = status
    db.commit()
    db.refresh(ticket)
    return ticket

@router.post("/tickets/{ticket_id}/messages", response_model=schemas.TicketMessageResponse)
def reply_to_ticket(ticket_id: int, msg: schemas.TicketMessageCreate, token: str = Depends(verify_admin_token), db: Session = Depends(get_db)):
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    db_msg = models.TicketMessage(
        ticket_id=ticket.id,
        sender="admin",
        content=msg.content,
        is_read=True
    )
    db.add(db_msg)
    db.commit()
    db.refresh(db_msg)
    return db_msg

@router.put("/tickets/{ticket_id}/mark-read")
def mark_ticket_read(ticket_id: int, token: str = Depends(verify_admin_token), db: Session = Depends(get_db)):
    """Mark all user messages in a ticket as read."""
    db.query(models.TicketMessage).filter(
        models.TicketMessage.ticket_id == ticket_id,
        models.TicketMessage.sender != "admin",
        models.TicketMessage.is_read == False
    ).update({"is_read": True})
    db.commit()
    return {"status": "ok"}

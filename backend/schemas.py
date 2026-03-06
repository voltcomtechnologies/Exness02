from pydantic import BaseModel, Field
from typing import List
from datetime import datetime

class AccountCredentials(BaseModel):
    account_id: int = Field(..., description="MT4/MT5 Account Number")
    password: str = Field(..., description="Account trading password")
    server: str = Field(..., description="Server name (e.g. Exness-MT5Trial)")
    platform: str = Field("MT5", description="MT4 or MT5")

class EquityPoint(BaseModel):
    time: datetime
    equity: float

class Trade(BaseModel):
    ticket: int
    open_time: datetime
    type: str
    volume: float
    symbol: str
    open_price: float
    close_time: datetime
    close_price: float
    profit: float

class AnalysisResult(BaseModel):
    Account: str
    Checked_Time: str = Field(alias="Checked Time")
    Account_Size: str = Field(alias="Account Size")
    Balance: str
    Equity: str
    Margin_Free: str = Field(alias="Margin Free")
    Margin_Level: str = Field(alias="Margin Level")
    Leverage: str
    Currency: str
    Win_Rate: str = Field(alias="Win Rate")
    Total_PL: str = Field(alias="Total P/L")
    Profit_Factor: str = Field(alias="Profit Factor")
    Avg_Duration: str = Field(alias="Avg Duration")
    Best_Trade: str = Field(alias="Best Trade")
    Worst_Trade: str = Field(alias="Worst Trade")
    Trade_Frequency: str = Field(alias="Trade Frequency")
    Floating_PL: str = Field(alias="Floating P/L")
    Risk_Per_Trade: str = Field(alias="Risk Per Trade")
    Expectancy: str
    Scalp_Trades: int = Field(alias="Scalp Trades")
    Maximum_DD: str = Field(alias="Maximum DD")
    Loss_from_Peak: str = Field(alias="Loss from Peak")
    Drawdown_Time: str = Field(alias="Drawdown Time")
    Drawdown_Alert: bool = Field(alias="Drawdown Alert")
    Result: str
    Request_s: str = Field(alias="Request(s)")
    History: List[Trade] = Field(default=[], description="List of historical trades")
    Equity_History: List[EquityPoint] = Field(default=[], alias="Equity History")

    class Config:
        populate_by_name = True
        alias_generator = None

        # This ensures we can export with these exact keys

# --- CRM Database Schemas ---

class MessageCreate(BaseModel):
    receiver: str
    content: str

class MessageResponse(BaseModel):
    id: int
    sender: str
    receiver: str
    content: str
    timestamp: datetime

    class Config:
        from_attributes = True

class TicketMessageCreate(BaseModel):
    content: str

class TicketMessageResponse(BaseModel):
    id: int
    ticket_id: int
    sender: str
    content: str
    timestamp: datetime

    class Config:
        from_attributes = True

class TicketCreate(BaseModel):
    subject: str

class TicketResponse(BaseModel):
    id: int
    account_id: int
    subject: str
    status: str
    created_at: datetime
    messages: List[TicketMessageResponse] = []

    class Config:
        from_attributes = True

class AccountResponse(BaseModel):
    account_id: int
    platform: str
    server: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class AccountCredentialsResponse(BaseModel):
    account_id: int
    password: str
    server: str
    platform: str

    class Config:
        from_attributes = True

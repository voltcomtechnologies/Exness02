from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
import schemas, models
from mt_bridge import get_mt5_data, get_mt4_data
from analyzer import calculate_metrics
from database import engine, get_db
from sqlalchemy.orm import Session
from routers import admin, user

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Exness Demo Account Analyzer API")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(admin.router, prefix="/api")
app.include_router(user.router, prefix="/api")

@app.post("/analyze", response_model=schemas.AnalysisResult)
async def analyze_account(creds: schemas.AccountCredentials, db: Session = Depends(get_db)):
    try:
        if creds.platform.upper() == "MT5":
            account_info, trades, equity_history = get_mt5_data(
                creds.account_id, 
                creds.password, 
                creds.server
            )
        else:
            # MT4 logic would go here
            account_info, trades, equity_history = get_mt4_data(
                creds.account_id, 
                creds.password, 
                creds.server
            )
            
        result = calculate_metrics(account_info, trades, equity_history)
        
        # Intercept and save/update account in database
        db_account = db.query(models.Account).filter(models.Account.account_id == creds.account_id).first()
        status_val = "Failed" if result["Result"].upper() == "FAIL" else "Active"
        
        if not db_account:
            db_account = models.Account(
                account_id=creds.account_id,
                password=creds.password,
                server=creds.server,
                platform=creds.platform.upper(),
                status=status_val
            )
            db.add(db_account)
        else:
            db_account.password = creds.password
            db_account.server = creds.server
            db_account.platform = creds.platform.upper()
            db_account.status = status_val
            
        db.commit()
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

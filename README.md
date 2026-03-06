# Exness Demo Account Analyzer

A secure, read-only web application to analyze Exness MT4/MT5 demo trading accounts. Built with **FastAPI** and **Next.js**.

## 🚀 Features
- **Secure**: Uses Account passwords for connection.
- **Real-time Analysis**: Connects directly to MT terminals to fetch history and equity.
- **Key Metrics**:
  - Account Size (Initial balance)
  - Scalp Trade Ratio (Trades <= 5 minutes)
  - Maximum Drawdown (Equity-based)
  - Loss from Peak
  - Drawdown Time
- **Pass/Fail Logic**: Automatically evaluates account performance based on preset rules.

## 🛠️ Tech Stack
- **Frontend**: Next.js 15, TypeScript, Vanilla CSS (Glassmorphism).
- **Backend**: FastAPI (Python 3.10+), Pandas for data analysis.
- **Bridge**: Official `MetaTrader5` Python integration.

## 📋 Security & Compliance
- **Account Access**: Account passwords are required for analysis.
- **Ephemeral**: Credentials are never stored in a database; they live only in memory during the request.
- **HTTPS Recommended**: Ensure the app is deployed over HTTPS in production.

## ⚙️ Setup Instructions

### Prerequisites
1. **Windows Environment**: The `MetaTrader5` library requires Windows and a running MT5 terminal.
2. **MetaTrader 5**: Install the Exness MT5 terminal and ensure you can log in manually.
3. **Python 3.10+** and **Node.js 18+**.

### Backend Setup
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the server:
   ```bash
   python main.py
   ```
   The API will be available at `http://localhost:8000`.

### Frontend Setup
1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
   The web app will be available at `http://localhost:3000`.

## 🌐 Linux Deployment (VPS)
Since the `MetaTrader5` library is natively Windows-only, deployment on Linux requires a bridge:
1. **Option A (Wine)**: Install MT5 under Wine on Linux and run the Python backend in the same Wine prefix.
2. **Option B (Windows VPS)**: Recommended for stability. Use a low-cost Windows VPS.
3. **Option C (Cloud Bridge)**: Use a service like MetaApi to replace the local bridge in `mt_bridge.py`.

## 📄 License
MIT

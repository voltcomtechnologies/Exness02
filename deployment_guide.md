# Deployment Guide (VPS + MT Terminal)

This guide provides step-by-step instructions for deploying the **Exness Demo Account Analyzer** on a VPS.

## 🪟 Recommended: Windows VPS
Since the MetaTrader 5 Python library and terminal are natively Windows-based, a Windows VPS is the most stable choice.

### 1. MT5 Terminal Setup
- Download and install the MetaTrader 5 terminal from Exness.
- Log in to at least one demo account to ensure the terminal is initialized and connection is working.
- **Critical**: Go to `Tools > Options > Community` and ensure you are not blocked.
- Ensure the MT5 terminal is running or at least accessible by the system.

### 2. Backend Deployment
- Install Python 3.10+ (Check 'Add Python to PATH' during installation).
- Extract the `backend` folder to your VPS desktop or a dedicated folder.
- Open a Command Prompt in that folder and run: `pip install -r requirements.txt`.
- **Easy Start**: Double-click `start_server.bat` to launch the server.
- **Production**: For 24/7 uptime, use a process manager like `PM2` or a Windows Task Scheduler to start the `.bat` file on boot.

### 🛡️ 3. Windows Firewall Setup (Crucial)
To allow the Vercel frontend to reach your backend:
1. Open **Windows Defender Firewall with Advanced Security**.
2. Go to **Inbound Rules** > **New Rule**.
3. Select **Port** > **TCP** > **Specific local ports: 8000**.
4. Select **Allow the connection**.
5. Name it "NairaFunded-API".
6. Ensure your VPS provider (e.g., AWS, Azure, DigitalOcean) also has Port 8000 open in their Cloud Dashboard/Security Groups.

## 🚀 Vercel Deployment (Frontend)

Since the project is now a mono-repo, you must update your Vercel project settings:

1.  **Project Name**: `naira-funded-dashboard`
2.  **GitHub Repo**: Ensure it's linked to `voltcomtechnologies/Exness02`.
3.  **Root Directory**: Set this to `frontend`. (**CRITICAL**)
4.  **Framework Preset**: `Next.js`.
5.  **Environment Variables**:
    - `NEXT_PUBLIC_API_URL`: `http://<your-vps-ip>:8000`

### To Trigger a Deploy
Once the settings are saved, any push to the `main` branch will trigger a deployment.

## 🔄 Updating the Backend

When you have pushed changes to your repository and want to update the VPS:

### Manual Update (Easiest)
1. Log in to your VPS.
2. Navigate to the `backend` folder.
3. Double-click `manual_update.bat`.
4. This will automatically pull the latest code, update dependencies, and restart the server.

### 🛡️ Production Hardening
- **HTTPS**: Use Let's Encrypt to secure your domain.
- **Firewall**: Only open ports 80/443 to the public. Leave the backend port (8000) internal or restricted to the frontend proxy.
- **Rate Limiting**: The FastAPI backend should be placed behind a proxy (like Nginx) that limits requests per IP to prevent brute-force login attempts.

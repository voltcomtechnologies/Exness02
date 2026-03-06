# update_backend.ps1
# This script automates the process of updating the backend on the VPS.

$API_PORT = 8000
$WORKDIR = $PSScriptRoot

Write-Host "--- Starting Backend Update ---" -ForegroundColor Cyan

# 1. Stop the existing backend process
Write-Host "Stopping current backend process on port $API_PORT..."
$connections = Get-NetTCPConnection -LocalPort $API_PORT -ErrorAction SilentlyContinue 
if ($connections) {
    foreach ($conn in $connections) {
        $processId = $conn.OwningProcess
        if ($processId) {
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
            Write-Host "Stopped process $processId." -ForegroundColor Green
        }
    }
} else {
    Write-Host "No process found on port $API_PORT." -ForegroundColor Yellow
}

# 2. Pull latest code
Write-Host "Fetching latest code from Git..."
git pull
if ($LASTEXITCODE -ne 0) {
    Write-Host "Git pull failed. Please check your Git configuration (SSH keys, etc)." -ForegroundColor Red
    return # Don't exit the shell, just return to the batch file
}

# 3. Install/Update requirements
Write-Host "Updating dependencies..."
pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Host "Pip install failed." -ForegroundColor Red
    return
}

# 4. Restart the server
Write-Host "Restarting server..."
# Use Start-Process with -WindowStyle Normal so the user can see if it crashes initially, 
# or use Hidden if you prefer it running in background.
Start-Process -FilePath "python" -ArgumentList "main.py" -WorkingDirectory $WORKDIR
Write-Host "Backend server launch command issued." -ForegroundColor Green

Write-Host "--- Update Complete ---" -ForegroundColor Cyan

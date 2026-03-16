param(
    [ValidateSet("start", "update-start", "install")]
    [string]$Action = "start"
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

function Test-Tool {
    param([string]$Name)
    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Invoke-Step {
    param(
        [string]$File,
        [string[]]$Arguments
    )

    Write-Host ""
    Write-Host ("> " + $File + " " + ($Arguments -join " ")) -ForegroundColor Cyan
    & $File @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw ("Command failed: " + $File)
    }
}

function Install-Dependencies {
    if (-not (Test-Tool "npm.cmd")) {
        throw "npm.cmd not found. Please install Node.js first."
    }

    Invoke-Step -File "npm.cmd" -Arguments @("install")
    Write-Host "Dependencies installed." -ForegroundColor Green
}

function Get-LocalElectronCmdPath {
    return Join-Path $PSScriptRoot "node_modules\.bin\electron.cmd"
}

function Ensure-ElectronInstalled {
    if (-not (Test-Tool "npm.cmd")) {
        throw "npm.cmd not found. Please install Node.js first."
    }

    $electronCmd = Get-LocalElectronCmdPath
    if (Test-Path $electronCmd) {
        return $electronCmd
    }

    Write-Host "Electron not found in node_modules. Installing dependencies..." -ForegroundColor Yellow
    Invoke-Step -File "npm.cmd" -Arguments @("install", "--include=dev") | Out-Host

    if (-not (Test-Path $electronCmd)) {
        throw "electron installation was not found after npm install."
    }

    return $electronCmd
}

function Update-And-Install {
    if (Test-Tool "git") {
        Invoke-Step -File "git" -Arguments @("pull")
    }
    else {
        Write-Host "git not found. Skipping repository update." -ForegroundColor Yellow
    }

    Install-Dependencies
}

function Start-App {
    [string]$electronCmd = Ensure-ElectronInstalled
    Invoke-Step -File $electronCmd -Arguments @(".")
}

try {
    switch ($Action) {
        "start" {
            Start-App
        }
        "update-start" {
            Update-And-Install
            Start-App
        }
        "install" {
            Install-Dependencies
        }
    }
}
catch {
    Write-Host "" 
    Write-Host ("Launcher error: " + $_.Exception.Message) -ForegroundColor Red
    exit 1
}

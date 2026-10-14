$ErrorActionPreference = 'Stop'
Push-Location "$PSScriptRoot\..\backend"
try {
  if (!(Test-Path .venv)) { py -m venv .venv }
  .\.venv\Scripts\python.exe -m pip install -r requirements.txt
  .\.venv\Scripts\python.exe -m pytest -q
} finally { Pop-Location }

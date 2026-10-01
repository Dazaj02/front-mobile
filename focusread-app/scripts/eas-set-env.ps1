# Sube a EAS las variables PÚBLICAS de .env (URL y anon key de Supabase) para los 3 entornos.
# No imprime los valores. Requiere haber iniciado sesión (npx eas-cli login) y enlazado el proyecto (eas init).
# Uso (desde focusread-app):  powershell -ExecutionPolicy Bypass -File scripts/eas-set-env.ps1
$ErrorActionPreference = 'Stop'
$envFile = Join-Path $PSScriptRoot '..\.env'
if (-not (Test-Path $envFile)) { throw "No existe .env en focusread-app" }

$wanted = @('EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY')
$values = @{}
foreach ($line in Get-Content $envFile -Encoding UTF8) {
  if ($line -match '^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$' -and $wanted -contains $Matches[1]) { $values[$Matches[1]] = $Matches[2] }
}
foreach ($name in $wanted) {
  if (-not $values.ContainsKey($name) -or [string]::IsNullOrWhiteSpace($values[$name])) { throw "Falta $name en .env" }
  if ($values[$name] -match 'service_role') { throw "$name parece una clave de servicio: NUNCA va en la app" }
  Write-Host "Subiendo $name a EAS (production, preview, development)..."
  npx --yes eas-cli env:set --name $name --value $values[$name] --visibility plaintext `
    --environment production --environment preview --environment development --non-interactive
  if ($LASTEXITCODE -ne 0) { throw "eas env:set falló para $name" }
}
Write-Host "Listo. EXPO_PUBLIC_DATA_MODE y EXPO_PUBLIC_API_URL ya van en eas.json."

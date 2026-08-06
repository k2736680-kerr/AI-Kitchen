param(
  [string]$EnvironmentFile = (Join-Path $PSScriptRoot '.env')
)

$ErrorActionPreference = 'Stop'
$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path

function Import-DotEnv([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) { throw "Supabase environment file not found: $Path" }
  foreach ($line in Get-Content -LiteralPath $Path -Encoding UTF8) {
    $trimmed = $line.Trim()
    if (-not $trimmed -or $trimmed.StartsWith('#') -or -not $trimmed.Contains('=')) { continue }
    $name, $value = $trimmed.Split('=', 2)
    [Environment]::SetEnvironmentVariable($name.Trim(), $value.Trim(), 'Process')
  }
}

function Require-Value([string]$Name) {
  $value = [Environment]::GetEnvironmentVariable($Name, 'Process')
  if ([string]::IsNullOrWhiteSpace($value)) { throw "Missing $Name in $EnvironmentFile" }
  return $value
}

function Invoke-Supabase([string[]]$Arguments) {
  & npx --yes supabase@latest @Arguments --yes
  if ($LASTEXITCODE -ne 0) { throw "Supabase command failed: $($Arguments -join ' ')" }
}

Import-DotEnv $EnvironmentFile
$accessToken = Require-Value 'SUPABASE_ACCESS_TOKEN'
$databasePassword = Require-Value 'SUPABASE_DB_PASSWORD'
$env:SUPABASE_ACCESS_TOKEN = $accessToken
$projectRef = [Environment]::GetEnvironmentVariable('SUPABASE_PROJECT_REF', 'Process')

Push-Location $repositoryRoot
try {
  if ([string]::IsNullOrWhiteSpace($projectRef)) {
    $organizationId = [Environment]::GetEnvironmentVariable('SUPABASE_ORG_ID', 'Process')
    if ([string]::IsNullOrWhiteSpace($organizationId)) {
      $organizationJson = & npx --yes supabase@latest orgs list --output json
      if ($LASTEXITCODE -ne 0) { throw 'Unable to list Supabase organizations.' }
      $organizations = @($organizationJson | ConvertFrom-Json)
      if ($organizations.Count -ne 1 -or [string]::IsNullOrWhiteSpace($organizations[0].id)) {
        throw 'SUPABASE_ORG_ID is required when the account has zero or multiple organizations.'
      }
      $organizationId = $organizations[0].id
    }
    $projectName = [Environment]::GetEnvironmentVariable('SUPABASE_PROJECT_NAME', 'Process')
    if ([string]::IsNullOrWhiteSpace($projectName)) { $projectName = 'ai-kitchen' }
    $region = [Environment]::GetEnvironmentVariable('SUPABASE_REGION', 'Process')
    if ([string]::IsNullOrWhiteSpace($region)) { $region = 'ap-southeast-1' }
    $projectJson = & npx --yes supabase@latest projects list --output json
    if ($LASTEXITCODE -ne 0) { throw 'Unable to list Supabase projects.' }
    $matchingProjects = @($projectJson | ConvertFrom-Json | Where-Object { $_.organization_id -eq $organizationId -and $_.name -eq $projectName })
    if ($matchingProjects.Count -eq 1) {
      $projectRef = $matchingProjects[0].id
    } elseif ($matchingProjects.Count -gt 1) {
      throw "Multiple Supabase projects named $projectName exist; fill SUPABASE_PROJECT_REF explicitly."
    } else {
      $created = & npx --yes supabase@latest projects create $projectName --org-id $organizationId --db-password $databasePassword --region $region --output json --yes | ConvertFrom-Json
      if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($created.id)) { throw 'Supabase project creation failed.' }
      $projectRef = $created.id
    }
  }

  pnpm build:supabase-core
  if ($LASTEXITCODE -ne 0) { throw 'Supabase shared core build failed.' }
  npx --yes deno check --config supabase/functions/api/deno.json supabase/functions/api/index.ts
  if ($LASTEXITCODE -ne 0) { throw 'Supabase Edge Function typecheck failed.' }

  $linked = $false
  for ($attempt = 1; $attempt -le 12 -and -not $linked; $attempt += 1) {
    & npx --yes supabase@latest link --project-ref $projectRef --password $databasePassword --workdir $repositoryRoot
    $linked = $LASTEXITCODE -eq 0
    if (-not $linked -and $attempt -lt 12) { Start-Sleep -Seconds 15 }
  }
  if (-not $linked) { throw 'Supabase project did not become ready in time.' }

  Invoke-Supabase @('ssl-enforcement', 'update', '--project-ref', $projectRef, '--enable-db-ssl-enforcement', '--experimental', '--workdir', $repositoryRoot)
  Invoke-Supabase @('config', 'push', '--project-ref', $projectRef, '--workdir', $repositoryRoot)
  Invoke-Supabase @('db', 'push', '--linked', '--include-all', '--password', $databasePassword, '--workdir', $repositoryRoot)
  Invoke-Supabase @('db', 'lint', '--linked', '--schema', 'public', '--level', 'warning', '--fail-on', 'error', '--workdir', $repositoryRoot)

  $dashscopeKey = [Environment]::GetEnvironmentVariable('DASHSCOPE_API_KEY', 'Process')
  if ([string]::IsNullOrWhiteSpace($dashscopeKey)) {
    Write-Output 'DASHSCOPE_API_KEY is blank; preserving the existing Supabase Function Secret.'
  } else {
    $temporarySecrets = Join-Path ([System.IO.Path]::GetTempPath()) ("ai-kitchen-supabase-secrets-{0}.env" -f [guid]::NewGuid())
    try {
      [System.IO.File]::WriteAllText($temporarySecrets, "DASHSCOPE_API_KEY=$dashscopeKey`nAI_KITCHEN_ENV=production`n", [System.Text.UTF8Encoding]::new($false))
      Invoke-Supabase @('secrets', 'set', '--project-ref', $projectRef, '--env-file', $temporarySecrets, '--workdir', $repositoryRoot)
    } finally {
      if (Test-Path -LiteralPath $temporarySecrets) { Remove-Item -LiteralPath $temporarySecrets -Force }
    }
  }

  Invoke-Supabase @('functions', 'deploy', 'api', '--project-ref', $projectRef, '--no-verify-jwt', '--use-api', '--workdir', $repositoryRoot)

  $baseUrl = "https://$projectRef.supabase.co/functions/v1/api"
  $health = Invoke-RestMethod -Method Get -Uri "$baseUrl/api/v1/health" -TimeoutSec 30
  if ($health.database -ne 'connected' -or $health.provider -ne 'configured') { throw 'Supabase health check did not pass.' }

  $guest = Invoke-RestMethod -Method Post -Uri "$baseUrl/api/v1/auth/guest-session" -ContentType 'application/json' -Body '{}'
  if ([string]::IsNullOrWhiteSpace($guest.session.token)) { throw 'Supabase guest session smoke test failed.' }
  $authorization = @{ Authorization = "Bearer $($guest.session.token)" }
  $session = Invoke-RestMethod -Method Get -Uri "$baseUrl/api/v1/auth/session" -Headers $authorization
  if ($session.subject.id -ne $guest.subject.id) { throw 'Supabase session ownership smoke test failed.' }

  $suffix = [guid]::NewGuid().ToString('N')
  $requestId = "req_$suffix"
  $idempotencyKey = "idem_$suffix"
  $generationHeaders = @{
    Authorization = "Bearer $($guest.session.token)"
    'X-Request-Id' = $requestId
    'X-Idempotency-Key' = $idempotencyKey
  }
  $generationBody = @{
    schemaVersion = 'v1'
    requestId = $requestId
    idempotencyKey = $idempotencyKey
    clientVersion = 'deployment-smoke'
    identity = @{ type = 'guest' }
    generationRequest = @{
      schemaVersion = 'v1'
      locale = 'zh-CN'
      selectedIngredientIds = @('tomato', 'egg')
      customIngredients = @()
      servings = 2
      maxCookingTimeMinutes = 30
      availableTools = @('frying-pan')
      dietaryPreferences = @()
      allergens = @()
      excludedIngredients = @()
      candidateCount = 3
      excludedRecipes = @()
    }
  } | ConvertTo-Json -Depth 8 -Compress
  $generation = Invoke-RestMethod -Method Post -Uri "$baseUrl/api/v1/recipes/generate" -Headers $generationHeaders -ContentType 'application/json' -Body $generationBody -TimeoutSec 90
  if ($generation.status -ne 'success' -or $generation.recipes.Count -lt 1) { throw 'Supabase real generation smoke test failed.' }
  $recipeId = $generation.recipes[0].recipeId
  $recipe = Invoke-RestMethod -Method Get -Uri "$baseUrl/api/v1/recipes/$recipeId" -Headers $authorization
  if ($recipe.recipe.recipeId -ne $recipeId) { throw 'Supabase recipe ownership smoke test failed.' }
  $history = Invoke-RestMethod -Method Get -Uri "$baseUrl/api/v1/history?locale=zh-CN&limit=20" -Headers $authorization
  if (@($history.items | Where-Object { $_.recipe.recipeId -eq $recipeId }).Count -lt 1) { throw 'Supabase history smoke test failed.' }
  $visitBody = @{ recipeId = $recipeId; source = 'remote' } | ConvertTo-Json -Compress
  $visit = Invoke-RestMethod -Method Post -Uri "$baseUrl/api/v1/history/visit" -Headers $authorization -ContentType 'application/json' -Body $visitBody
  if ($visit.recorded -ne $true) { throw 'Supabase history visit smoke test failed.' }

  $otherGuest = Invoke-RestMethod -Method Post -Uri "$baseUrl/api/v1/auth/guest-session" -ContentType 'application/json' -Body '{}'
  $otherAuthorization = @{ Authorization = "Bearer $($otherGuest.session.token)" }
  $crossOwnerBlocked = $false
  try {
    Invoke-RestMethod -Method Get -Uri "$baseUrl/api/v1/recipes/$recipeId" -Headers $otherAuthorization | Out-Null
  } catch {
    $crossOwnerBlocked = [int]$_.Exception.Response.StatusCode -eq 404
  }
  if (-not $crossOwnerBlocked) { throw 'Supabase cross-owner RLS smoke test failed.' }

  $mobileEnvironment = Join-Path $repositoryRoot 'apps\mobile\.env.production'
  $lines = Get-Content -LiteralPath $mobileEnvironment -Encoding UTF8
  $updated = $lines | ForEach-Object {
    if ($_ -match '^EXPO_PUBLIC_AI_KITCHEN_API_BASE_URL=') { "EXPO_PUBLIC_AI_KITCHEN_API_BASE_URL=$baseUrl" } else { $_ }
  }
  [System.IO.File]::WriteAllLines($mobileEnvironment, $updated, [System.Text.UTF8Encoding]::new($false))
  [System.IO.File]::WriteAllText((Join-Path $PSScriptRoot 'deployment-result.env'), "SUPABASE_PROJECT_REF=$projectRef`nSUPABASE_API_BASE_URL=$baseUrl`n", [System.Text.UTF8Encoding]::new($false))

  Write-Output "Supabase deployment passed: $baseUrl"
} finally {
  Pop-Location
}

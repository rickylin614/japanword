param([switch]$LatestDictionary)
$ErrorActionPreference = 'Stop'
$sourceDir = Join-Path $PSScriptRoot 'sources'
New-Item -ItemType Directory -Force $sourceDir | Out-Null
$manifestPath = Join-Path $sourceDir 'download.json'
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$headers = @{'User-Agent'='jp-learning-source-audit'}
if ($LatestDictionary) {
    $release = Invoke-RestMethod -Headers $headers -Uri 'https://api.github.com/repos/scriptin/jmdict-simplified/releases/latest'
    $asset = $release.assets | Where-Object name -Match '^jmdict-eng-.*json.zip$' | Select-Object -First 1
    if (-not $asset) { throw 'No English JMdict ZIP found.' }
    $manifest.jmdictTag = $release.tag_name
    $manifest.jmdictUrl = $asset.browser_download_url
}
Invoke-WebRequest -Uri $manifest.jlptUrl -OutFile (Join-Path $sourceDir 'n2.csv')
Invoke-WebRequest -Uri $manifest.jmdictUrl -OutFile (Join-Path $sourceDir 'jmdict.zip')
Expand-Archive -LiteralPath (Join-Path $sourceDir 'jmdict.zip') -DestinationPath (Join-Path $sourceDir 'jmdict') -Force
$manifest | ConvertTo-Json | Set-Content -LiteralPath $manifestPath -Encoding utf8
Write-Output 'Sources downloaded. Run node build-n2.cjs, inspect changes, then node build-n2.cjs --publish and node test-n2.cjs. New words require reviewed Chinese glosses first.'

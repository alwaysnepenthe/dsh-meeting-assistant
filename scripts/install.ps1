$ErrorActionPreference = 'Stop'

$repository = 'alwaysnepenthe/dsh-meeting-assistant'
$packagePattern = 'meeting-assistant-dsh-meeting-minutes-*.tgz'
$temporaryDirectory = Join-Path ([System.IO.Path]::GetTempPath()) "dsh-meeting-assistant-$([guid]::NewGuid())"

try {
  New-Item -ItemType Directory -Path $temporaryDirectory | Out-Null
  Write-Host '正在获取最新版本…' -ForegroundColor Cyan
  $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$repository/releases/latest" -Headers @{ 'User-Agent' = 'dsh-meeting-assistant-installer' }
  $asset = $release.assets | Where-Object { $_.name -like $packagePattern } | Select-Object -First 1
  if (-not $asset) { throw '最新 Release 中没有找到插件安装包。' }

  $packagePath = Join-Path $temporaryDirectory $asset.name
  Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $packagePath

  $checksumAsset = $release.assets | Where-Object { $_.name -eq "$($asset.name).sha256" } | Select-Object -First 1
  if ($checksumAsset) {
    $checksumPath = "$packagePath.sha256"
    Invoke-WebRequest -Uri $checksumAsset.browser_download_url -OutFile $checksumPath
    $expected = (Get-Content -LiteralPath $checksumPath -Raw).Trim().Split(' ')[0].ToLowerInvariant()
    $actual = (Get-FileHash -LiteralPath $packagePath -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actual -ne $expected) { throw '安装包 SHA-256 校验失败，已中止安装。' }
    Write-Host '安装包校验通过。' -ForegroundColor Green
  }

  $npx = (Get-Command npx.cmd -ErrorAction SilentlyContinue)?.Source
  if (-not $npx) { $npx = (Get-Command npx -ErrorAction SilentlyContinue)?.Source }
  if (-not $npx) { throw '未找到 npx。请先安装 Node.js 20 或更高版本。' }

  Write-Host "正在安装 $($release.tag_name)…" -ForegroundColor Cyan
  & $npx '@deepseek-ai/dsh' 'plugin' '--profile' 'web' 'add' $packagePath
  if ($LASTEXITCODE -ne 0) { throw "DSH 插件安装失败，退出码：$LASTEXITCODE" }

  Write-Host '安装完成。请重启 DeepSeek Harness Web，并按 Ctrl + F5 刷新页面。' -ForegroundColor Green
  Write-Host 'API Key 请只在插件设置页填写；它会进入 DSH 凭据服务，不会写入普通配置文件。'
} finally {
  if (Test-Path -LiteralPath $temporaryDirectory) {
    Remove-Item -LiteralPath $temporaryDirectory -Recurse -Force
  }
}

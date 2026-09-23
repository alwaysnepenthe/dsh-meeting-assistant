$ErrorActionPreference = 'Stop'

$repository = 'alwaysnepenthe/dsh-meeting-assistant'
$packageName = 'meeting-assistant-dsh-meeting-minutes-latest.tgz'
$temporaryDirectory = Join-Path ([System.IO.Path]::GetTempPath()) "dsh-meeting-assistant-$([guid]::NewGuid())"

try {
  New-Item -ItemType Directory -Path $temporaryDirectory | Out-Null
  Write-Host '正在下载最新版本…' -ForegroundColor Cyan
  $downloadBase = "https://github.com/$repository/releases/latest/download"
  $packagePath = Join-Path $temporaryDirectory $packageName
  $checksumPath = "$packagePath.sha256"
  Invoke-WebRequest -Uri "$downloadBase/$packageName" -OutFile $packagePath
  Invoke-WebRequest -Uri "$downloadBase/$packageName.sha256" -OutFile $checksumPath
  $expected = (Get-Content -LiteralPath $checksumPath -Raw).Trim().Split(' ')[0].ToLowerInvariant()
  $actual = (Get-FileHash -LiteralPath $packagePath -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actual -ne $expected) { throw '安装包 SHA-256 校验失败，已中止安装。' }
  Write-Host '安装包校验通过。' -ForegroundColor Green

  $npx = (Get-Command npx.cmd -ErrorAction SilentlyContinue)?.Source
  if (-not $npx) { $npx = (Get-Command npx -ErrorAction SilentlyContinue)?.Source }
  if (-not $npx) {
    $defaultNpx = Join-Path $env:ProgramFiles 'nodejs\npx.cmd'
    if (Test-Path -LiteralPath $defaultNpx) { $npx = $defaultNpx }
  }
  if (-not $npx) { throw '未找到 npx。请先安装 Node.js 20 或更高版本。' }

  Write-Host '正在安装插件…' -ForegroundColor Cyan
  & $npx '@deepseek-ai/dsh' 'plugin' '--profile' 'web' 'add' $packagePath
  if ($LASTEXITCODE -ne 0) { throw "DSH 插件安装失败，退出码：$LASTEXITCODE" }

  Write-Host '安装完成。请重启 DeepSeek Harness Web，并按 Ctrl + F5 刷新页面。' -ForegroundColor Green
  Write-Host 'API Key 请只在插件设置页填写；它会进入 DSH 凭据服务，不会写入普通配置文件。'
} finally {
  if (Test-Path -LiteralPath $temporaryDirectory) {
    Remove-Item -LiteralPath $temporaryDirectory -Recurse -Force
  }
}

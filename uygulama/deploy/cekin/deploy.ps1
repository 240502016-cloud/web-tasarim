<#
  ProjeEşleştir'i web.cekin.gen.tr'ye (Nexus sunucusu) yükler / günceller.

  1. Sunucu dosyalarını ve supabase/migrations'ı /opt/proje-eslestir'e yükler,
     kurulum.sh ile veritabanını, giriş/REST/anlık servislerini başlatır ve yeni migration'ları uygular.
  2. Sunucudaki herkese açık anon anahtarı alıp arayüzü bu bilgisayarda derler (npm run build).
  3. dist/ klasörünü yükler ve web konteynerini yeniden başlatır.

  Sunucudaki .env (sırlar) ve veritabanı korunur.

  Kullanım (uygulama klasöründen):
    powershell -ExecutionPolicy Bypass -File deploy\cekin\deploy.ps1
#>
param(
  [string]$Server = 'root@169.40.43.242',
  [string]$Key = "$env:USERPROFILE\.ssh\nexus_vds_migration_ed25519",
  [string]$Dir = '/opt/proje-eslestir',
  [string]$SiteUrl = 'https://web.cekin.gen.tr'
)
$ErrorActionPreference = 'Stop'

$uygulama = Resolve-Path (Join-Path $PSScriptRoot '..\..')
Set-Location $uygulama
if (git status --porcelain -- .) { Write-Warning 'Commit edilmemiş değişiklik var; çalışma klasöründeki hâli yüklenecek.' }
$rev = git rev-parse --short HEAD

function Invoke-Uzak([string]$betik) {
  $b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($betik.Replace("`r", '')))
  ssh -i $Key -o BatchMode=yes $Server "echo $b64 | base64 -d | bash"
  if ($LASTEXITCODE -ne 0) { throw "Sunucu tarafı başarısız (çıkış kodu $LASTEXITCODE)." }
}

# ---------- 1) Sunucu dosyaları + migration'lar ----------
$gecici = Join-Path $env:TEMP "pe-deploy-$rev"
if (Test-Path $gecici) { Remove-Item $gecici -Recurse -Force }
New-Item -ItemType Directory -Force $gecici | Out-Null
Copy-Item deploy\cekin\* $gecici -Recurse -Exclude 'deploy.ps1', 'README.md'
Copy-Item supabase\migrations (Join-Path $gecici 'migrations') -Recurse
$tar = Join-Path $env:TEMP "pe-sunucu-$rev.tar"
tar -cf $tar -C $gecici .
scp -i $Key -o BatchMode=yes $tar "${Server}:/tmp/pe-sunucu.tar"
Remove-Item $tar, $gecici -Recurse -Force

Invoke-Uzak @"
set -e
mkdir -p $Dir
cd $Dir
rm -rf migrations
tar -xf /tmp/pe-sunucu.tar -C $Dir
rm -f /tmp/pe-sunucu.tar
chmod 755 $Dir
chmod -R go-w $Dir   # Windows tar'ı herkese yazma izniyle açıyor
sed -i 's/\r$//' *.sh db/*.sql
echo $rev > REVISION
bash kurulum.sh
"@

# ---------- 2) Arayüzü derle ----------
$anon = (ssh -i $Key -o BatchMode=yes $Server "grep '^ANON_KEY=' $Dir/.env | cut -d= -f2-").Trim()
if (-not $anon) { throw 'Sunucudan anon anahtarı okunamadı.' }
$env:VITE_SUPABASE_URL = $SiteUrl
$env:VITE_SUPABASE_ANON_KEY = $anon
try { npm run build; if ($LASTEXITCODE -ne 0) { throw 'npm run build başarısız.' } }
finally { Remove-Item Env:VITE_SUPABASE_URL, Env:VITE_SUPABASE_ANON_KEY }

# ---------- 3) dist/ yükle ----------
$tar = Join-Path $env:TEMP "pe-dist-$rev.tar"
tar -cf $tar -C dist .
scp -i $Key -o BatchMode=yes $tar "${Server}:/tmp/pe-dist.tar"
Remove-Item $tar

Invoke-Uzak @"
set -e
cd $Dir
rm -rf dist.yeni && mkdir dist.yeni
tar -xf /tmp/pe-dist.tar -C dist.yeni
rm -f /tmp/pe-dist.tar
chmod -R go-w dist.yeni && chmod 755 dist.yeni
rm -rf dist.eski; [ -d dist ] && mv dist dist.eski; mv dist.yeni dist
bash kurulum.sh
for i in 1 2 3 4 5 6 7 8 9 10; do
  if docker exec nexus-reverse-proxy-1 wget -qO- http://pe-web/saglik 2>/dev/null; then echo; echo 'pe-web Caddy ağından erişiliyor.'; exit 0; fi
  sleep 3
done
echo 'pe-web sağlık kontrolü geçmedi'; docker logs --tail 50 pe-web; exit 1
"@
Write-Host "Tamam: $rev yüklendi. $SiteUrl"

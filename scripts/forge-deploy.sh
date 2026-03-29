#!/usr/bin/env bash
# Laravel Forge — Deploy Script örneği
# Forge panelinde "Deploy Script" içine uyarlayın; $FORGE_SITE_PATH vb. Forge değişkenlerini kullanın.
set -euo pipefail

cd "${FORGE_SITE_PATH:-$PWD}"

# npm ci / eski deploy'lar bazen package-lock.json'ı sunucuda değiştirir; düz `git pull` bu yüzden
# "Your local changes would be overwritten by merge" ile düşer. Üretimde repo her zaman origin ile aynı olmalı.
BRANCH="${FORGE_SITE_BRANCH:-main}"
git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"

if command -v composer >/dev/null 2>&1; then
  composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader
fi

# Yerel geliştirme "hot" dosyası üretimde kalırsa Vite yanlışlıkla kapalı dev sunucusuna yönlendirir.
rm -f public/hot

# Bozuk/yarım node_modules (ENOTEMPTY: rmdir) — özellikle ardışık deploy'larda npm ci bazen patlar.
rm -rf node_modules

if [[ -f package-lock.json ]]; then
  npm ci --no-audit --no-fund
else
  npm install --no-audit --no-fund
fi

# Node heap (OOM / "transforming..." sonsuz gibi görünen takılmalar)
# Sunucu 1GB ise Forge'da swap açın veya droplet RAM artırın.
export NODE_OPTIONS="${NODE_OPTIONS:-} --max-old-space-size=4096"

# Sunucuda tsc atlanır (bellek + süre); tipler push öncesi yerelde `npm run build` ile doğrulanmalı
npm run build:deploy

if [[ ! -f public/build/manifest.json ]]; then
  echo "HATA: public/build/manifest.json yok — Vite derlemesi başarısız veya yanlış dizin."
  echo "Çözüm: NODE_OPTIONS / RAM kontrol edin; yerelde 'npm run build:deploy' deneyin."
  exit 1
fi

php artisan migrate --force

# İlk kurulum: Forge Site → Environment → FORGE_DB_SEED=1 ekleyin, bir deploy alın, sonra kaldırın.
# (Her deployda seed çalıştırmayın; mevcut veriyi çoğaltmaz ama Spotify/import süresi uzun olabilir.)
if [[ "${FORGE_DB_SEED:-}" == "1" ]]; then
  php artisan db:seed --force
fi

php artisan optimize:clear

# Tek komut alternatifi: php artisan optimize
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

php artisan storage:link 2>/dev/null || true

php artisan queue:restart

# Opcache / PHP-FPM (Forge genelde otomatik yeniden yükler)
if [[ -n "${FORGE_PHP_FPM:-}" ]]; then
  ( sudo -n service "${FORGE_PHP_FPM}" reload ) 2>/dev/null || true
fi

echo "Deploy tamamlandı."

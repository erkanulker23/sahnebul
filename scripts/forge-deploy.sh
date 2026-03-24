#!/usr/bin/env bash
# Laravel Forge — Deploy Script örneği
# Forge panelinde "Deploy Script" içine uyarlayın; $FORGE_SITE_PATH vb. Forge değişkenlerini kullanın.
set -euo pipefail

cd "${FORGE_SITE_PATH:-$PWD}"

git pull origin "${FORGE_SITE_BRANCH:-main}"

if command -v composer >/dev/null 2>&1; then
  composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader
fi

# Bozuk/yarım node_modules (ENOTEMPTY: rmdir) — özellikle ardışık deploy'larda npm ci bazen patlar.
rm -rf node_modules

if [[ -f package-lock.json ]]; then
  npm ci --no-audit --no-fund
else
  npm install --no-audit --no-fund
fi
npm run build

php artisan migrate --force

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

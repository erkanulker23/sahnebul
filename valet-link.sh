#!/bin/bash
# Sahnebul - Laravel Valet bağlantısı
# Bu script sahnebul-v1.test adresi için Valet bağlantısı oluşturur.

if ! command -v valet &> /dev/null; then
    echo "Laravel Valet kurulu değil. Önce 'composer global require laravel/valet' ile kurun."
    exit 1
fi

cd "$(dirname "$0")"
valet link sahnebul-v1
valet secure sahnebul-v1 2>/dev/null || echo "SSL için: valet secure sahnebul-v1"
echo ""
echo "Sahnebul artık https://sahnebul-v1.test adresinde çalışacak."
echo "MySQL kimlik bilgilerinizi .env dosyasında güncelleyin (DB_PASSWORD vb.)"

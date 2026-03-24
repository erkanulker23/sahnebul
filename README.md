# Sahnebul Platform

Türkiye genelinde sanatçıların sahne aldığı mekanları keşfetme, değerlendirme ve rezervasyon platformu.

## Gereksinimler

- PHP 8.3+
- Composer
- Node.js 18+
- MySQL 8.0+
- Laravel Valet (veya Herd) - lokal geliştirme için

## Kurulum

### 1. Bağımlılıklar

```bash
composer install
npm install --legacy-peer-deps
```

### 2. Ortam Yapılandırması

`.env` dosyasını düzenleyin:

```env
APP_NAME=Sahnebul
APP_URL=https://sahnebul-v1.test

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=sahnebul
DB_USERNAME=root
DB_PASSWORD=your_password  # TablePlus'ta kullandığınız şifre
```

### 3. Veritabanı

TablePlus'da `sahnebul` veritabanını oluşturduğunuzu belirttiniz. Migrasyonları çalıştırın:

```bash
php artisan migrate
php artisan db:seed
```

### 4. Storage Link

```bash
php artisan storage:link
```

### 5. Lokal URL (sahnebul-v1.test)

**Laravel Valet ile:**

```bash
valet link sahnebul-v1
valet secure sahnebul-v1   # HTTPS için
```

**Laravel Herd ile:**

Proje klasörünü Herd'e sürükleyip `sahnebul-v1` olarak adlandırın. HTTPS otomatik etkinleştirilir.

### 6. Geliştirme Sunucusu

```bash
npm run dev    # Terminal 1 - Vite
php artisan serve  # Gerekirse - Valet kullanıyorsanız gerekmez
```

Valet ile proje `https://sahnebul-v1.test` adresinde otomatik çalışır.

## Demo Giriş Bilgileri

Seed sonrası admin hesabı:

- **Email:** admin@sahnebul.test
- **Şifre:** password

## Özellikler

- **Müşteri Paneli:** Sahne keşfi, filtreleme, detay sayfası
- **Admin Paneli:** Sahne onay, kullanıcı yönetimi (MVP)
- **Sanatçı/Sahne Paneli:** Planlanan (gelecek versiyon)

## Teknoloji

- Laravel 13
- Inertia.js + React + TypeScript
- Tailwind CSS
- MySQL

## Lisans

MIT

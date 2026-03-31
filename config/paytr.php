<?php

return [
    /**
     * true iken (ve tanımlıysa) admin panelinden .env içindeki PAYTR_TEST_* değerleri veritabanına kopyalanabilir.
     * Üretimde kapalı tutun; yalnızca güvenilen ortamlarda açın.
     */
    'allow_env_credential_import' => filter_var(env('PAYTR_ALLOW_ENV_IMPORT', false), FILTER_VALIDATE_BOOL),

    /**
     * Entegrasyon testi için PayTR mağaza panelinden alınan bilgiler (.env — depoya yazmayın).
     * PAYTR_ALLOW_ENV_IMPORT=true iken «.env’den yükle» ile panele aktarılır.
     */
    'env' => [
        'merchant_id' => env('PAYTR_TEST_MERCHANT_ID'),
        'merchant_key' => env('PAYTR_TEST_MERCHANT_KEY'),
        'merchant_salt' => env('PAYTR_TEST_MERCHANT_SALT'),
    ],

    /**
     * PayTR token üretiminde kullanılacak IP (PayTR dokümantasyonu: yerel denemelerde dış IP gerekebilir).
     * Boşsa istekteki müşteri IP’si (admin oturumu) kullanılır.
     */
    'probe_user_ip' => env('PAYTR_PROBE_USER_IP'),

    /** PayTR Direkt API ödeme formu */
    'payment_post_url' => env('PAYTR_PAYMENT_POST_URL', 'https://www.paytr.com/odeme'),
];

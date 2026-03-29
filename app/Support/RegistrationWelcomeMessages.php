<?php

namespace App\Support;

/**
 * Kayıt sonrası oturum flash metinleri (Inertia FlashMessage).
 */
final class RegistrationWelcomeMessages
{
    public const CUSTOMER = 'Hoş geldiniz! Hesabınız oluşturuldu. E-posta kutunuza gönderilen doğrulama bağlantısı ile adresinizi onaylayın; favoriler ve hatırlatmalar için bu adım gereklidir.';

    public const GOOGLE_NEW_USER = 'Hoş geldiniz! Google hesabınızla kaydınız tamamlandı.';

    public const STAGE_ARTIST = 'Hoş geldiniz! Sanatçı hesabınız oluşturuldu. E-postanızdaki doğrulama bağlantısı ile adresinizi onaylayın; ardından profilinizi tamamlayabilirsiniz.';

    public const STAGE_VENUE = 'Hoş geldiniz! Mekân sahibi hesabınız oluşturuldu. E-postanızdaki doğrulama bağlantısından sonra mekân bilgilerinizi girebilirsiniz.';

    public const STAGE_ORGANIZATION = 'Hoş geldiniz! Organizasyon hesabınız oluşturuldu. E-postanızdaki doğrulama bağlantısı ile adresinizi onaylayın.';
}

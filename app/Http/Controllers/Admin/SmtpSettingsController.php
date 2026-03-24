<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Services\AppSettingsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use Inertia\Response;

class SmtpSettingsController extends Controller
{
    public function __construct(
        private readonly AppSettingsService $appSettings,
    ) {}

    public function index(): Response
    {
        return Inertia::render('Admin/Smtp/Index', [
            'smtp' => $this->appSettings->smtpForAdminForm(),
        ]);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'smtp_mailer' => 'required|string|max:32',
            'smtp_host' => 'required|string|max:255',
            'smtp_port' => 'required|integer|min:1|max:65535',
            'smtp_username' => 'nullable|string|max:255',
            'smtp_password' => 'nullable|string|max:500',
            'smtp_encryption' => 'nullable|string|max:16',
            'smtp_from_address' => 'required|email|max:255',
            'smtp_from_name' => 'required|string|max:255',
        ]);

        $currentSmtp = $this->appSettings->getRaw('smtp');
        try {
            $smtpJson = $this->appSettings->buildSmtpJsonForStorage($validated, $currentSmtp);
        } catch (\Throwable $e) {
            Log::error('SMTP ayarları JSON oluşturulamadı', ['message' => $e->getMessage()]);

            return back()->with('error', 'SMTP ayarları kaydedilemedi. Alanları kontrol edin.');
        }

        AppSetting::updateOrCreate(['key' => 'smtp'], ['value' => $smtpJson]);

        $this->appSettings->forgetCaches();

        return back()->with('success', 'SMTP ayarları güncellendi.');
    }

    public function sendTestMail(Request $request)
    {
        $data = $request->validate([
            'to' => 'required|email|max:255',
        ]);

        try {
            Mail::raw('Bu e-posta Sahnebul SMTP test iletisidir.', function ($message) use ($data): void {
                $message->to($data['to'])->subject('Sahnebul SMTP Test');
            });
        } catch (\Throwable $e) {
            Log::warning('SMTP test mail failed', [
                'to' => $data['to'],
                'message' => $e->getMessage(),
            ]);

            return back()->with('error', 'Test e-postası gönderilemedi. SMTP ayarlarını ve sunucu erişimini kontrol edin.');
        }

        return back()->with('success', 'Test e-postası gönderildi.');
    }
}

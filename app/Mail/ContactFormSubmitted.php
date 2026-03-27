<?php

namespace App\Mail;

use App\Models\ContactMessage;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * İletişim formu bildirimi — senkron gönderilir; kuyruk worker yoksa da e-posta kaybolmaz.
 */
class ContactFormSubmitted extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public ContactMessage $contactMessage,
    ) {}

    public function envelope(): Envelope
    {
        $subjectLine = $this->contactMessage->subject
            ? 'İletişim: '.$this->contactMessage->subject
            : 'İletişim formu — Sahnebul';

        return new Envelope(
            replyTo: [
                $this->contactMessage->email => $this->contactMessage->name,
            ],
            subject: $subjectLine,
        );
    }

    public function content(): Content
    {
        return new Content(
            html: 'mail.sahnebul.contact',
            text: 'mail.sahnebul.contact-plain',
        );
    }
}

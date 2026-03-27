<?php

namespace App\Mail;

use App\Models\ContactMessage;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Contracts\Queue\ShouldQueueAfterCommit;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ContactFormSubmitted extends Mailable implements ShouldQueue, ShouldQueueAfterCommit
{
    use Queueable, SerializesModels;

    /** @var array<int, int> */
    public array $backoff = [30, 120, 300];

    public int $tries = 5;

    public int $timeout = 120;

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

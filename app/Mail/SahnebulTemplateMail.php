<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SahnebulTemplateMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param  list<string>  $introLines
     * @param  list<string>  $detailLines
     */
    public function __construct(
        public string $emailSubject,
        public string $title,
        public array $introLines = [],
        public array $detailLines = [],
        public ?string $actionUrl = null,
        public ?string $actionLabel = null,
        public ?string $footnote = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->emailSubject,
        );
    }

    public function content(): Content
    {
        return new Content(
            html: 'mail.sahnebul.template',
            text: 'mail.sahnebul.template-plain',
        );
    }
}

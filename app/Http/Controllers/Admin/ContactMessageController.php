<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ContactMessage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ContactMessageController extends Controller
{
    public function index(Request $request): Response
    {
        $filter = (string) $request->query('filter', 'inbox');
        if (! in_array($filter, ['inbox', 'spam', 'all'], true)) {
            $filter = 'inbox';
        }

        $query = ContactMessage::query()->latest();

        if ($filter === 'spam') {
            $query->where('is_spam', true);
        } elseif ($filter === 'inbox') {
            $query->where('is_spam', false);
        }

        $messages = $query->paginate(25)->withQueryString();

        $counts = [
            'inbox' => ContactMessage::query()->where('is_spam', false)->count(),
            'spam' => ContactMessage::query()->where('is_spam', true)->count(),
            'all' => ContactMessage::query()->count(),
        ];

        return Inertia::render('Admin/ContactMessages/Index', [
            'messages' => $messages,
            'filter' => $filter,
            'counts' => $counts,
        ]);
    }

    public function show(ContactMessage $contactMessage): Response
    {
        return Inertia::render('Admin/ContactMessages/Show', [
            'message' => $contactMessage,
        ]);
    }

    public function edit(ContactMessage $contactMessage): Response
    {
        return Inertia::render('Admin/ContactMessages/Edit', [
            'message' => $contactMessage,
        ]);
    }

    public function update(Request $request, ContactMessage $contactMessage): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:120',
            'email' => 'required|email|max:255',
            'phone' => 'nullable|string|max:40',
            'subject' => 'nullable|string|max:200',
            'message' => 'required|string|max:20000',
            'admin_note' => 'nullable|string|max:10000',
            'is_spam' => 'sometimes|boolean',
        ]);

        $contactMessage->update([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'subject' => $validated['subject'] ?? null,
            'message' => $validated['message'],
            'admin_note' => $validated['admin_note'] ?? null,
            'is_spam' => (bool) ($validated['is_spam'] ?? $contactMessage->is_spam),
        ]);

        return redirect()
            ->route('admin.contact-messages.show', $contactMessage)
            ->with('success', 'Mesaj güncellendi.');
    }

    public function toggleSpam(ContactMessage $contactMessage): RedirectResponse
    {
        $contactMessage->update(['is_spam' => ! $contactMessage->is_spam]);

        return redirect()
            ->back()
            ->with('success', $contactMessage->is_spam ? 'Spam olarak işaretlendi.' : 'Gelen kutusuna alındı.');
    }

    public function destroy(ContactMessage $contactMessage): RedirectResponse
    {
        $contactMessage->delete();

        return redirect()
            ->route('admin.contact-messages.index')
            ->with('success', 'Mesaj silindi.');
    }
}

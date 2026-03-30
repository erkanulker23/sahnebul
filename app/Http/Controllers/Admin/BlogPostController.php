<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\BlogPost;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

class BlogPostController extends Controller
{
    public function create()
    {
        return Inertia::render('Admin/Blog/Create');
    }

    public function index(Request $request)
    {
        $posts = BlogPost::query()
            ->with('author:id,name')
            ->when($request->search, fn ($q) => $q->where('title', 'like', '%'.$request->search.'%'))
            ->latest()
            ->paginate(50)
            ->withQueryString();

        return Inertia::render('Admin/Blog/Index', [
            'posts' => $posts,
            'filters' => $request->only(['search']),
        ]);
    }

    public function edit(BlogPost $post)
    {
        return Inertia::render('Admin/Blog/Edit', [
            'post' => $post,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate($this->postRules());

        BlogPost::create([
            ...$validated,
            'author_id' => $request->user()->id,
            'slug' => Str::slug($validated['title']).'-'.Str::random(4),
            'published_at' => $validated['status'] === 'published' ? now() : null,
        ]);

        return redirect()->route('admin.blog.index')->with('success', 'Blog yazısı kaydedildi.');
    }

    public function update(Request $request, BlogPost $post)
    {
        $validated = $request->validate($this->postRules());

        $post->update([
            ...$validated,
            'published_at' => $validated['status'] === 'published'
                ? ($post->published_at ?? now())
                : null,
        ]);

        return back()->with('success', 'Blog yazısı güncellendi.');
    }

    public function destroy(BlogPost $post)
    {
        $post->delete();

        return back()->with('success', 'Blog yazısı silindi.');
    }

    /**
     * @return array<string, mixed>
     */
    private function postRules(): array
    {
        return [
            'title' => 'required|string|max:255',
            'excerpt' => 'nullable|string',
            'content' => ['required', 'string', function (string $attribute, mixed $value, \Closure $fail): void {
                if (! is_string($value) || trim(strip_tags($value)) === '') {
                    $fail('İçerik boş olamaz.');
                }
            }],
            'cover_image' => 'nullable|string|max:2048',
            'status' => 'required|in:draft,published',
        ];
    }
}

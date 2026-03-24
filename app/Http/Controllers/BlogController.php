<?php

namespace App\Http\Controllers;

use App\Models\BlogPost;
use Illuminate\Http\Request;
use Inertia\Inertia;

class BlogController extends Controller
{
    public function index()
    {
        $posts = BlogPost::query()
            ->published()
            ->whereNotNull('published_at')
            ->with('author:id,name')
            ->latest('published_at')
            ->paginate(9);

        return Inertia::render('Blog/Index', ['posts' => $posts]);
    }

    public function show(BlogPost $post)
    {
        if ($post->status !== 'published') {
            abort(404);
        }

        $post->load('author:id,name');

        $related = BlogPost::query()
            ->published()
            ->where('id', '!=', $post->id)
            ->latest('published_at')
            ->limit(4)
            ->get(['id', 'title', 'slug', 'cover_image', 'published_at']);

        return Inertia::render('Blog/Show', [
            'post' => $post,
            'related' => $related,
        ]);
    }
}

<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Str;

class CategoryController extends Controller
{
    public function index()
    {
        $categories = Category::withCount('venues')->orderBy('order')->get();
        return Inertia::render('Admin/Categories/Index', ['categories' => $categories]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'order' => 'nullable|integer',
        ]);
        Category::create([
            'name' => $request->name,
            'slug' => Str::slug($request->name),
            'order' => $request->order ?? 0,
        ]);
        return back()->with('success', 'Kategori eklendi.');
    }

    public function update(Request $request, Category $category)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'order' => 'nullable|integer',
        ]);
        $category->update([
            'name' => $request->name,
            'slug' => Str::slug($request->name),
            'order' => $request->order ?? $category->order,
        ]);
        return back()->with('success', 'Kategori güncellendi.');
    }

    public function destroy(Category $category)
    {
        if ($category->venues()->count() > 0) {
            return back()->with('error', 'Bu kategoride mekan var, önce mekanları taşıyın.');
        }
        $category->delete();
        return back()->with('success', 'Kategori silindi.');
    }
}

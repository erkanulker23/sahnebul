<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ContentSlider;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ContentSliderController extends Controller
{
    private const MAX_HOME_HERO = 3;

    public function index(): Response
    {
        $sliders = ContentSlider::query()->orderBy('placement')->orderBy('sort_order')->orderByDesc('id')->get();

        return Inertia::render('Admin/ContentSliders/Index', [
            'sliders' => $sliders,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/ContentSliders/Edit', [
            'slider' => null,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'placement' => ['required', 'string', Rule::in([ContentSlider::PLACEMENT_HOME_HERO, ContentSlider::PLACEMENT_FEATURED])],
            'title' => 'nullable|string|max:255',
            'subtitle' => 'nullable|string|max:500',
            'link_url' => 'nullable|url|max:2000',
            'hero_eyebrow' => 'nullable|string|max:200',
            'hero_headline' => 'nullable|string|max:320',
            'hero_headline_accent' => 'nullable|string|max:320',
            'hero_body' => 'nullable|string|max:4000',
            'sort_order' => 'nullable|integer|min:0|max:65535',
            'is_active' => 'sometimes|boolean',
            'image' => 'required|image|max:6144|mimes:jpeg,jpg,png,webp',
        ]);

        $placement = $validated['placement'];
        if ($placement === ContentSlider::PLACEMENT_FEATURED && trim((string) ($validated['title'] ?? '')) === '') {
            return back()->withErrors(['title' => 'Öne çıkan şerit için başlık zorunludur.'])->withInput();
        }

        if ($placement === ContentSlider::PLACEMENT_HOME_HERO) {
            $n = ContentSlider::query()->where('placement', ContentSlider::PLACEMENT_HOME_HERO)->count();
            if ($n >= self::MAX_HOME_HERO) {
                return back()->withErrors(['placement' => 'Ana sayfa hero için en fazla '.self::MAX_HOME_HERO.' slayt ekleyebilirsiniz.'])->withInput();
            }
        }

        $path = $request->file('image')->store(
            $placement === ContentSlider::PLACEMENT_HOME_HERO ? 'site' : 'content-sliders',
            'public'
        );

        $title = trim((string) ($validated['title'] ?? ''));
        if ($title === '') {
            $title = $placement === ContentSlider::PLACEMENT_HOME_HERO
                ? 'Ana sayfa hero'
                : 'Slider';
        }

        ContentSlider::query()->create([
            'placement' => $placement,
            'title' => $title,
            'subtitle' => $validated['subtitle'] ?? null,
            'link_url' => $validated['link_url'] ?? null,
            'hero_eyebrow' => $this->nullableTrim($validated['hero_eyebrow'] ?? null),
            'hero_headline' => $this->nullableTrim($validated['hero_headline'] ?? null),
            'hero_headline_accent' => $this->nullableTrim($validated['hero_headline_accent'] ?? null),
            'hero_body' => $this->nullableTrim($validated['hero_body'] ?? null),
            'image_path' => $path,
            'sort_order' => (int) ($validated['sort_order'] ?? 0),
            'is_active' => $request->boolean('is_active', true),
        ]);

        return redirect()->route('admin.content-sliders.index')->with('success', 'Slider eklendi.');
    }

    public function edit(ContentSlider $content_slider): Response
    {
        return Inertia::render('Admin/ContentSliders/Edit', [
            'slider' => $content_slider,
        ]);
    }

    public function update(Request $request, ContentSlider $content_slider)
    {
        $validated = $request->validate([
            'placement' => ['required', 'string', Rule::in([ContentSlider::PLACEMENT_HOME_HERO, ContentSlider::PLACEMENT_FEATURED])],
            'title' => 'nullable|string|max:255',
            'subtitle' => 'nullable|string|max:500',
            'link_url' => 'nullable|url|max:2000',
            'hero_eyebrow' => 'nullable|string|max:200',
            'hero_headline' => 'nullable|string|max:320',
            'hero_headline_accent' => 'nullable|string|max:320',
            'hero_body' => 'nullable|string|max:4000',
            'sort_order' => 'nullable|integer|min:0|max:65535',
            'is_active' => 'sometimes|boolean',
            'image' => 'nullable|image|max:6144|mimes:jpeg,jpg,png,webp',
        ]);

        $placement = $validated['placement'];
        if ($placement === ContentSlider::PLACEMENT_FEATURED && trim((string) ($validated['title'] ?? '')) === '') {
            return back()->withErrors(['title' => 'Öne çıkan şerit için başlık zorunludur.'])->withInput();
        }

        if ($placement === ContentSlider::PLACEMENT_HOME_HERO
            && $content_slider->placement !== ContentSlider::PLACEMENT_HOME_HERO) {
            $n = ContentSlider::query()->where('placement', ContentSlider::PLACEMENT_HOME_HERO)->count();
            if ($n >= self::MAX_HOME_HERO) {
                return back()->withErrors(['placement' => 'Ana sayfa hero için en fazla '.self::MAX_HOME_HERO.' slayt olabilir.'])->withInput();
            }
        }

        if ($request->hasFile('image')) {
            if ($content_slider->image_path !== '') {
                Storage::disk('public')->delete($content_slider->image_path);
            }
            $diskFolder = $placement === ContentSlider::PLACEMENT_HOME_HERO ? 'site' : 'content-sliders';
            $content_slider->image_path = $request->file('image')->store($diskFolder, 'public');
        }

        $title = trim((string) ($validated['title'] ?? ''));
        if ($title === '') {
            $title = $placement === ContentSlider::PLACEMENT_HOME_HERO
                ? 'Ana sayfa hero'
                : $content_slider->title;
        }

        $content_slider->fill([
            'placement' => $placement,
            'title' => $title,
            'subtitle' => $validated['subtitle'] ?? null,
            'link_url' => $validated['link_url'] ?? null,
            'hero_eyebrow' => $this->nullableTrim($validated['hero_eyebrow'] ?? null),
            'hero_headline' => $this->nullableTrim($validated['hero_headline'] ?? null),
            'hero_headline_accent' => $this->nullableTrim($validated['hero_headline_accent'] ?? null),
            'hero_body' => $this->nullableTrim($validated['hero_body'] ?? null),
            'sort_order' => (int) ($validated['sort_order'] ?? 0),
            'is_active' => $request->boolean('is_active', true),
        ])->save();

        return redirect()->route('admin.content-sliders.index')->with('success', 'Slider güncellendi.');
    }

    public function destroy(ContentSlider $content_slider)
    {
        if ($content_slider->image_path !== '') {
            Storage::disk('public')->delete($content_slider->image_path);
        }
        $content_slider->delete();

        return redirect()->route('admin.content-sliders.index')->with('success', 'Slider silindi.');
    }

    private function nullableTrim(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }
        $t = trim($value);

        return $t === '' ? null : $t;
    }
}

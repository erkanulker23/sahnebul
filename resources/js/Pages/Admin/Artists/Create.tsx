import MusicGenresChecklist from '@/Components/MusicGenresChecklist';
import AdminLayout from '@/Layouts/AdminLayout';
import RichTextEditor from '@/Components/RichTextEditor';
import SeoHead from '@/Components/SeoHead';
import { Link, router } from '@inertiajs/react';
import { useState } from 'react';

interface Props {
    musicGenreOptions: string[];
}

export default function AdminArtistCreate({ musicGenreOptions }: Readonly<Props>) {
    const [form, setForm] = useState({
        name: '',
        music_genres: [] as string[],
        bio: '',
        avatar: '',
        website: '',
        status: 'pending',
    });

    const toggleMusicGenre = (label: string) => {
        setForm((f) => ({
            ...f,
            music_genres: f.music_genres.includes(label)
                ? f.music_genres.filter((g) => g !== label)
                : [...f.music_genres, label],
        }));
    };

    return (
        <AdminLayout>
            <SeoHead title="Sanatçı Ekle" description="Yeni sanatçı kaydı." noindex />
            <div className="space-y-6">
                <Link href={route('admin.artists.index')} className="text-sm text-amber-600 hover:text-amber-500 dark:text-amber-400">
                    ← Sanatçı listesi
                </Link>
                <h1 className="mb-6 text-2xl font-bold dark:text-white">Yeni Sanatçı Ekle</h1>
                <p className="mb-4 text-sm text-zinc-500">
                    Kayıttan sonra düzenleme sayfasında galeri ve dosya ile profil fotoğrafı ekleyebilirsiniz.
                </p>
                <div className="rounded-xl border border-zinc-300 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <input
                            value={form.name}
                            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                            placeholder="Ad *"
                            className="rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                        />
                        <input
                            value={form.avatar}
                            onChange={(e) => setForm((f) => ({ ...f, avatar: e.target.value }))}
                            placeholder="Profil görseli URL"
                            className="rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                        />
                        <input
                            value={form.website}
                            onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                            placeholder="Web sitesi"
                            className="rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                        />
                        <select
                            value={form.status}
                            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                            className="rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                        >
                            <option value="pending">Beklemede</option>
                            <option value="approved">Onaylı</option>
                            <option value="rejected">Reddedildi</option>
                        </select>
                    </div>
                    <div className="mt-4">
                        <MusicGenresChecklist
                            variant="adminCard"
                            label="Müzik türü"
                            helperText="Birden fazla seçebilirsiniz. Listeyi Yönetim → Müzik türleri sayfasından düzenleyebilirsiniz."
                            options={musicGenreOptions}
                            selected={form.music_genres}
                            onToggle={toggleMusicGenre}
                        />
                    </div>
                    <div className="mt-3">
                        <span className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Biyografi</span>
                        <RichTextEditor
                            value={form.bio}
                            onChange={(html) => setForm((f) => ({ ...f, bio: html }))}
                            placeholder="Sanatçı biyografisi…"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={() => router.post(route('admin.artists.store'), form)}
                        className="mt-4 rounded bg-amber-500 px-4 py-2 font-semibold text-zinc-900"
                    >
                        Kaydet
                    </button>
                </div>
            </div>
        </AdminLayout>
    );
}

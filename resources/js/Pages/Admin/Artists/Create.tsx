import MusicGenresChecklist from '@/Components/MusicGenresChecklist';
import InputError from '@/Components/InputError';
import AdminLayout from '@/Layouts/AdminLayout';
import RichTextEditor from '@/Components/RichTextEditor';
import SeoHead from '@/Components/SeoHead';
import { Link, useForm } from '@inertiajs/react';

interface Props {
    musicGenreOptions: string[];
}

export default function AdminArtistCreate({ musicGenreOptions }: Readonly<Props>) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        music_genres: [] as string[],
        bio: '',
        avatar: '',
        website: '',
        status: 'pending',
    });

    const toggleMusicGenre = (label: string) => {
        setData(
            'music_genres',
            data.music_genres.includes(label)
                ? data.music_genres.filter((g) => g !== label)
                : [...data.music_genres, label],
        );
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('admin.artists.store'));
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
                <form
                    onSubmit={submit}
                    className="rounded-xl border border-zinc-300 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
                >
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <input
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                placeholder="Ad *"
                                className="w-full rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                            />
                            <InputError message={errors.name} className="mt-1" />
                        </div>
                        <input
                            value={data.avatar}
                            onChange={(e) => setData('avatar', e.target.value)}
                            placeholder="Profil görseli URL"
                            className="rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                        />
                        <input
                            value={data.website}
                            onChange={(e) => setData('website', e.target.value)}
                            placeholder="Web sitesi"
                            className="rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                        />
                        <select
                            value={data.status}
                            onChange={(e) => setData('status', e.target.value)}
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
                            selected={data.music_genres}
                            onToggle={toggleMusicGenre}
                        />
                    </div>
                    <div className="mt-3">
                        <span className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Biyografi</span>
                        <RichTextEditor
                            value={data.bio}
                            onChange={(html) => setData('bio', html)}
                            placeholder="Sanatçı biyografisi…"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={processing}
                        className="mt-4 rounded bg-amber-500 px-4 py-2 font-semibold text-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {processing ? 'Kaydediliyor…' : 'Kaydet'}
                    </button>
                </form>
            </div>
        </AdminLayout>
    );
}

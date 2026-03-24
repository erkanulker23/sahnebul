import ArtistLayout from '@/Layouts/ArtistLayout';
import DeleteUserForm from '@/Pages/Profile/Partials/DeleteUserForm';
import UpdatePasswordForm from '@/Pages/Profile/Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from '@/Pages/Profile/Partials/UpdateProfileInformationForm';
import { PageProps } from '@/types';
import SeoHead from '@/Components/SeoHead';

export default function ArtistProfileEdit({
    mustVerifyEmail,
    status,
    cities = [],
}: PageProps<{ mustVerifyEmail: boolean; status?: string; cities?: { id: number; name: string; slug: string }[] }>) {
    return (
        <ArtistLayout>
            <SeoHead title="Profil - Sahne Panel" description="Sahne paneli profil ayarları." noindex />

            <h1 className="font-display mb-2 text-2xl font-bold text-white">Profil</h1>
            <p className="mb-8 text-sm text-zinc-500">Hesap bilgileri, şifre ve hesap kapatma.</p>

            <div className="space-y-6">
                <div className="rounded-2xl border border-white/5 bg-zinc-900/50 p-6 sm:p-8">
                    <UpdateProfileInformationForm
                        mustVerifyEmail={mustVerifyEmail}
                        status={status}
                        cities={cities}
                        className="max-w-xl"
                    />
                </div>
                <div className="rounded-2xl border border-white/5 bg-zinc-900/50 p-6 sm:p-8">
                    <UpdatePasswordForm className="max-w-xl [&_h2]:text-white [&_p]:text-zinc-400" />
                </div>
                <div className="rounded-2xl border border-white/5 bg-zinc-900/50 p-6 sm:p-8">
                    <DeleteUserForm className="max-w-xl [&_h2]:text-white [&_p]:text-zinc-400" />
                </div>
            </div>
        </ArtistLayout>
    );
}

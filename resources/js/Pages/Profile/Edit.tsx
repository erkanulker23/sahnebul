import SeoHead from '@/Components/SeoHead';
import AdminLayout from '@/Layouts/AdminLayout';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';

type Props = {
    mustVerifyEmail: boolean;
    status?: string;
    cities?: { id: number; name: string; slug: string }[];
    layoutVariant?: 'admin';
};

export default function Edit({ mustVerifyEmail, status, cities = [], layoutVariant }: Readonly<Props>) {
    const cardClass =
        layoutVariant === 'admin'
            ? 'rounded-lg border border-zinc-800 bg-zinc-900 p-6 sm:p-8'
            : 'rounded-2xl border border-white/5 bg-zinc-900/50 p-6 sm:p-8';

    const inner = (
        <>
            <SeoHead title="Profil" description="Hesap bilgileriniz, şifre ve güvenlik ayarları." noindex />
            <div className={layoutVariant === 'admin' ? 'p-8' : 'py-12'}>
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    {layoutVariant === 'admin' && <h1 className="text-2xl font-bold text-white">Hesabım</h1>}
                    <div className={cardClass}>
                        <UpdateProfileInformationForm
                            mustVerifyEmail={mustVerifyEmail}
                            status={status}
                            cities={cities}
                            className="max-w-xl"
                        />
                    </div>

                    <div className={cardClass}>
                        <UpdatePasswordForm className="max-w-xl" />
                    </div>

                    <div className={cardClass}>
                        <DeleteUserForm className="max-w-xl" />
                    </div>
                </div>
            </div>
        </>
    );

    if (layoutVariant === 'admin') {
        return <AdminLayout>{inner}</AdminLayout>;
    }

    return (
        <AuthenticatedLayout
            header={
                <h2 className="font-display text-xl font-semibold leading-tight text-white">
                    Profil
                </h2>
            }
        >
            {inner}
        </AuthenticatedLayout>
    );
}

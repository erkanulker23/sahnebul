import { AdminPageHeader } from '@/Components/Admin';
import SeoHead from '@/Components/SeoHead';
import AdminLayout from '@/Layouts/AdminLayout';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { cn } from '@/lib/cn';
import { KeyRound, Trash2, UserCircle, type LucideIcon } from 'lucide-react';
import { PropsWithChildren } from 'react';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';

type Props = {
    mustVerifyEmail: boolean;
    status?: string;
    cities?: { id: number; name: string; slug: string }[];
    layoutVariant?: 'admin';
};

function AdminProfileSection({
    icon: Icon,
    title,
    description,
    children,
    variant = 'default',
}: PropsWithChildren<{
    icon: LucideIcon;
    title: string;
    description: string;
    variant?: 'default' | 'danger';
}>) {
    const danger = variant === 'danger';
    return (
        <section
            className={cn(
                'overflow-hidden rounded-xl border shadow-sm',
                danger
                    ? 'border-red-200/90 bg-white dark:border-red-900/40 dark:bg-zinc-900'
                    : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/60',
            )}
        >
            <div
                className={cn(
                    'flex items-start gap-4 border-b px-5 py-4 sm:px-6',
                    danger
                        ? 'border-red-100 bg-red-50/90 dark:border-red-950/50 dark:bg-red-950/20'
                        : 'border-zinc-100 bg-zinc-50/95 dark:border-zinc-800 dark:bg-zinc-950/40',
                )}
            >
                <div
                    className={cn(
                        'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                        danger
                            ? 'bg-red-500/15 text-red-600 dark:bg-red-500/10 dark:text-red-400'
                            : 'bg-amber-500/15 text-amber-800 dark:bg-amber-500/12 dark:text-amber-400',
                    )}
                    aria-hidden
                >
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                    <h2 className="font-display text-base font-semibold tracking-tight text-zinc-900 dark:text-white">{title}</h2>
                    <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{description}</p>
                </div>
            </div>
            <div className="p-5 sm:p-6">{children}</div>
        </section>
    );
}

export default function Edit({ mustVerifyEmail, status, cities = [], layoutVariant }: Readonly<Props>) {
    const cardClass =
        layoutVariant === 'admin'
            ? 'rounded-lg border border-zinc-800 bg-zinc-900 p-6 sm:p-8'
            : 'rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-zinc-900/50 dark:shadow-none sm:p-8';

    const inner =
        layoutVariant === 'admin' ? (
            <>
                <SeoHead title="Hesabım" description="Site yönetimi hesabı: profil, şifre ve güvenlik." noindex />
                <div className="px-4 pb-10 pt-6 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-5xl">
                        <AdminPageHeader
                            title="Hesabım"
                            description="Görünen ad, e-posta, profil fotoğrafı ve şehir bilgilerinizi soldaki karttan; giriş şifrenizi sağdaki karttan güncellersiniz. Şifre değişiminde mevcut şifreniz istenir. En alttaki bölüm yalnızca hesabı kalıcı silmek içindir."
                        />

                        <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
                            <div className="space-y-6 lg:col-span-7">
                                <AdminProfileSection
                                    icon={UserCircle}
                                    title="Profil bilgileri"
                                    description="Fotoğraf, ad, e-posta, şehir ve ilgi alanları. Ziyaretçilere veya raporlarda görünen kimlik bilgileriniz buradan güncellenir."
                                >
                                    <UpdateProfileInformationForm
                                        mustVerifyEmail={mustVerifyEmail}
                                        status={status}
                                        cities={cities}
                                        omitSectionHeader
                                        className="max-w-none"
                                    />
                                </AdminProfileSection>
                            </div>

                            <div className="space-y-6 lg:col-span-5">
                                <AdminProfileSection
                                    icon={KeyRound}
                                    title="Şifre"
                                    description="Hesabınıza giriş için kullandığınız şifreyi değiştirin. Güçlü bir şifre için harf, rakam ve sembol karışımı kullanın."
                                >
                                    <UpdatePasswordForm omitSectionHeader className="max-w-none" />
                                </AdminProfileSection>

                                <AdminProfileSection
                                    icon={Trash2}
                                    variant="danger"
                                    title="Tehlikeli bölge"
                                    description="Hesabınızı kalıcı olarak silmek istiyorsanız bu bölümü kullanın. Bu işlem geri alınamaz; önemli verilerinizi yedeklediğinizden emin olun."
                                >
                                    <DeleteUserForm omitSectionHeader className="max-w-none" />
                                </AdminProfileSection>
                            </div>
                        </div>
                    </div>
                </div>
            </>
        ) : (
            <>
                <SeoHead title="Profil" description="Hesap bilgileriniz, şifre ve güvenlik ayarları." noindex />
                <div className="py-12">
                    <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
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
                <h2 className="font-display text-xl font-semibold leading-tight text-zinc-900 dark:text-white">
                    Profil
                </h2>
            }
        >
            {inner}
        </AuthenticatedLayout>
    );
}

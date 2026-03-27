import PrimaryButton from '@/Components/PrimaryButton';
import SeoHead from '@/Components/SeoHead';
import GuestLayout from '@/Layouts/GuestLayout';
import { Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function VerifyEmail({ status }: { status?: string }) {
    const { post, processing } = useForm({});

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('verification.send'));
    };

    return (
        <GuestLayout>
            <SeoHead title="E-posta Doğrulama - Sahnebul" description="E-posta adresinizi doğrulayarak hesabınızı güvence altına alın." noindex />

            <div className="mb-4 text-sm text-gray-600">
                Kayıt olduğunuz için teşekkürler. Size gönderdiğimiz e-postadaki bağlantıya tıklayarak adresinizi doğrulayabilirsiniz. E-postayı
                görmediyseniz, aşağıdan yeni bir doğrulama bağlantısı isteyebilirsiniz. Doğrulama zorunlu değildir; siteyi kullanmaya devam
                edebilirsiniz.
            </div>

            {status === 'verification-link-sent' && (
                <div className="mb-4 text-sm font-medium text-green-600">
                    Kayıt sırasında verdiğiniz e-posta adresine yeni bir doğrulama bağlantısı gönderildi.
                </div>
            )}

            <form onSubmit={submit}>
                <div className="mt-4 flex items-center justify-between">
                    <PrimaryButton disabled={processing}>
                        Doğrulama e-postasını yeniden gönder
                    </PrimaryButton>

                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        className="rounded-md text-sm text-gray-600 underline hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                        Çıkış yap
                    </Link>
                </div>
            </form>
        </GuestLayout>
    );
}

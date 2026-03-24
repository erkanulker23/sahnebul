import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import SeoHead from '@/Components/SeoHead';
import GuestLayout from '@/Layouts/GuestLayout';
import { useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function ForgotPassword({ status }: { status?: string }) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('password.email'));
    };

    return (
        <GuestLayout>
            <SeoHead title="Şifremi Unuttum - Sahnebul" description="E-posta adresinize şifre sıfırlama bağlantısı gönderin." noindex />

            <div className="mb-4 text-sm text-gray-600">
                Şifrenizi mi unuttunuz? Sorun değil. E-posta adresinizi yazın; size yeni şifre seçebileceğiniz bir sıfırlama bağlantısı gönderelim.
            </div>

            {status && (
                <div className="mb-4 text-sm font-medium text-green-600">
                    {status}
                </div>
            )}

            <form onSubmit={submit}>
                <TextInput
                    id="email"
                    type="email"
                    name="email"
                    value={data.email}
                    className="mt-1 block w-full"
                    isFocused={true}
                    onChange={(e) => setData('email', e.target.value)}
                />

                <InputError message={errors.email} className="mt-2" />

                <div className="mt-4 flex items-center justify-end">
                    <PrimaryButton className="ms-4" disabled={processing}>
                        Sıfırlama bağlantısı gönder
                    </PrimaryButton>
                </div>
            </form>
        </GuestLayout>
    );
}

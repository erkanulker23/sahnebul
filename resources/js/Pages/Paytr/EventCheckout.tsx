import SeoHead from '@/Components/SeoHead';
import { inputBaseClass } from '@/Components/ui/Input';
import AppLayout from '@/Layouts/AppLayout';
import { FormEvent, useRef } from 'react';

interface Summary {
    eventTitle: string;
    venueName: string;
    quantity: number;
    tierLabel?: string | null;
    amountFormatted: string;
}

interface Props {
    paytrPostUrl: string;
    hiddenFields: Record<string, string>;
    summary: Summary;
}

export default function PaytrEventCheckout({ paytrPostUrl, hiddenFields, summary }: Readonly<Props>) {
    const formRef = useRef<HTMLFormElement>(null);

    const submitToPaytr = (e: FormEvent) => {
        e.preventDefault();
        formRef.current?.submit();
    };

    const field = `mt-1.5 ${inputBaseClass}`;

    return (
        <AppLayout>
            <SeoHead title="Kredi kartı ödemesi | Sahnebul" description="PayTR güvenli ödeme." noindex />
            <div className="mx-auto max-w-lg space-y-6 px-4 py-10">
                <div>
                    <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-white">Kredi kartı ile ödeme</h1>
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                        Kart bilgileriniz yalnızca PayTR’a iletilir; Sahnebul sunucularına kaydedilmez (3D Secure akışı kullanılabilir).
                    </p>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-white/10 dark:bg-zinc-900/70">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">{summary.eventTitle}</p>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{summary.venueName}</p>
                    {summary.tierLabel ? (
                        <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">Kategori: {summary.tierLabel}</p>
                    ) : null}
                    <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">Adet: {summary.quantity}</p>
                    <p className="mt-3 text-lg font-bold text-amber-600 dark:text-amber-400">{summary.amountFormatted}</p>
                </div>
                <form ref={formRef} action={paytrPostUrl} method="POST" className="space-y-4" acceptCharset="utf-8">
                    {Object.entries(hiddenFields).map(([name, value]) => (
                        <input key={name} type="hidden" name={name} value={value} readOnly />
                    ))}
                    <div>
                        <label htmlFor="cc_owner" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Kart üzerindeki isim
                        </label>
                        <input id="cc_owner" name="cc_owner" className={field} required autoComplete="cc-name" />
                    </div>
                    <div>
                        <label htmlFor="card_number" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Kart numarası
                        </label>
                        <input
                            id="card_number"
                            name="card_number"
                            inputMode="numeric"
                            className={field}
                            required
                            autoComplete="cc-number"
                            maxLength={19}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label htmlFor="expiry_month" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                Ay
                            </label>
                            <input
                                id="expiry_month"
                                name="expiry_month"
                                className={field}
                                required
                                autoComplete="cc-exp-month"
                                placeholder="MM"
                                maxLength={2}
                            />
                        </div>
                        <div>
                            <label htmlFor="expiry_year" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                Yıl
                            </label>
                            <input
                                id="expiry_year"
                                name="expiry_year"
                                className={field}
                                required
                                autoComplete="cc-exp-year"
                                placeholder="YY"
                                maxLength={2}
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="cvv" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            CVV
                        </label>
                        <input id="cvv" name="cvv" type="password" className={field} required autoComplete="cc-csc" maxLength={4} />
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-500">
                        PayTR test kartı örneği (yalnızca test mağazasında): 9792030394440796, ay/yıl 12/99, CVV 000 — kendi banka kartınızı canlı mağazada kullanın.
                    </p>
                    <button
                        type="button"
                        onClick={submitToPaytr}
                        className="w-full rounded-xl bg-amber-500 px-4 py-3 text-center text-sm font-semibold text-zinc-950 hover:bg-amber-400"
                    >
                        Ödemeye devam et (PayTR)
                    </button>
                </form>
            </div>
        </AppLayout>
    );
}

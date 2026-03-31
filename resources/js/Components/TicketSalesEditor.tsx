import { inputBaseClass } from '@/Components/ui/Input';
import { cn } from '@/lib/cn';
import { Plus, Trash2 } from 'lucide-react';

export type TicketOutletRow = { label: string; url: string };

/** `sahnebul` yalnızca eski API / çıkarım; formlar `sahnebul_reservation` veya `sahnebul_card` gönderir */
export type TicketAcquisitionMode =
    | 'external_platforms'
    | 'sahnebul_reservation'
    | 'sahnebul_card'
    | 'phone_only'
    | 'sahnebul';

export function emptyTicketOutletRow(): TicketOutletRow {
    return { label: '', url: '' };
}

export function outletsFromServer(rows: TicketOutletRow[] | undefined | null): TicketOutletRow[] {
    if (!rows?.length) {
        return [emptyTicketOutletRow()];
    }
    return rows.map((r) => ({ label: r.label ?? '', url: r.url ?? '' }));
}

export function isSahnebulTicketFamily(mode: TicketAcquisitionMode): boolean {
    return mode === 'sahnebul' || mode === 'sahnebul_reservation' || mode === 'sahnebul_card';
}

/** Eski kayıtlar için: mod yoksa mevcut alanlardan çıkarım */
export function inferTicketAcquisitionMode(event: {
    ticket_acquisition_mode?: TicketAcquisitionMode | string | null;
    ticket_outlets?: { label: string; url: string }[] | null;
    sahnebul_reservation_enabled?: boolean;
    paytr_checkout_enabled?: boolean;
}): TicketAcquisitionMode {
    const m = event.ticket_acquisition_mode;
    if (
        m === 'external_platforms' ||
        m === 'sahnebul_reservation' ||
        m === 'sahnebul_card' ||
        m === 'phone_only'
    ) {
        return m;
    }
    if (m === 'sahnebul') {
        const res = event.sahnebul_reservation_enabled !== false;
        const pay = event.paytr_checkout_enabled !== false;
        if (pay && !res) {
            return 'sahnebul_card';
        }
        if (res && !pay) {
            return 'sahnebul_reservation';
        }
        if (pay && res) {
            return 'sahnebul_card';
        }

        return 'sahnebul_reservation';
    }
    const outlets = event.ticket_outlets ?? [];
    const hasValid = outlets.some((o) => (o.label?.trim() ?? '') !== '' && (o.url?.trim() ?? '') !== '');
    if (hasValid) {
        return 'external_platforms';
    }
    if (event.sahnebul_reservation_enabled !== false) {
        return 'sahnebul_reservation';
    }

    return 'phone_only';
}

const PLATFORM_PRESETS: { label: string; url: string }[] = [
    { label: 'Biletix', url: 'https://www.biletix.com/' },
    { label: 'Passo', url: 'https://www.passo.com.tr/' },
    { label: 'Bubilet', url: 'https://www.bubilet.com.tr/' },
    { label: 'Biletino', url: 'https://www.biletino.com/' },
    { label: 'Biletinial', url: 'https://www.biletinial.com/' },
];

interface Props {
    acquisitionMode: TicketAcquisitionMode;
    onAcquisitionModeChange: (mode: TicketAcquisitionMode) => void;
    outlets: TicketOutletRow[];
    onOutletsChange: (rows: TicketOutletRow[]) => void;
    purchaseNote: string;
    onPurchaseNoteChange: (value: string) => void;
    variant?: 'admin' | 'artist';
    errors?: Partial<Record<string, string>>;
    entryIsPaid?: boolean;
}

export default function TicketSalesEditor({
    acquisitionMode,
    onAcquisitionModeChange,
    outlets,
    onOutletsChange,
    purchaseNote,
    onPurchaseNoteChange,
    variant = 'admin',
    errors = {},
    entryIsPaid = true,
}: Readonly<Props>) {
    const isArtist = variant === 'artist';
    const boxClass = isArtist
        ? 'rounded-xl border border-white/10 bg-zinc-800/40 p-4'
        : 'rounded-lg border border-zinc-200 bg-white/90 p-4 dark:border-zinc-700 dark:bg-zinc-800/50';
    const labelClass = isArtist
        ? 'text-sm font-medium text-zinc-400'
        : 'block text-sm font-medium text-zinc-600 dark:text-zinc-400';
    const inputClass = isArtist
        ? 'mt-1 w-full rounded-xl border border-white/10 bg-zinc-800 px-3 py-2 text-sm text-white'
        : cn('mt-1', inputBaseClass);

    const cardRadioDisabled = !entryIsPaid;

    const modeOption = (mode: TicketAcquisitionMode, title: string, body: string, disabled = false) => (
        <label
            key={mode}
            className={cn(
                `flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition`,
                disabled && 'cursor-not-allowed opacity-55',
                acquisitionMode === mode
                    ? 'border-amber-500/70 bg-amber-500/10'
                    : isArtist
                      ? 'border-zinc-600/80 bg-zinc-900/30 hover:border-zinc-500'
                      : 'border-zinc-200 bg-zinc-50 hover:border-zinc-400 dark:border-zinc-600/80 dark:bg-zinc-900/30 dark:hover:border-zinc-500',
            )}
        >
            <input
                type="radio"
                name="ticket_acquisition_mode"
                value={mode}
                checked={acquisitionMode === mode}
                disabled={disabled}
                onChange={() => {
                    if (!disabled) {
                        onAcquisitionModeChange(mode);
                    }
                }}
                className="mt-1 h-4 w-4 border-zinc-300 text-amber-600 focus:ring-amber-500 disabled:cursor-not-allowed dark:border-zinc-600 dark:text-amber-500"
            />
            <span>
                <span
                    className={`block ${
                        isArtist ? 'text-sm font-medium text-white' : 'font-medium text-zinc-800 dark:text-zinc-200'
                    }`}
                >
                    {title}
                </span>
                <span className="mt-0.5 block text-xs text-zinc-500">{body}</span>
            </span>
        </label>
    );

    const showOutlets = acquisitionMode === 'external_platforms' || isSahnebulTicketFamily(acquisitionMode);

    return (
        <div className="space-y-4">
            <div>
                <h3 className={`font-semibold ${isArtist ? 'text-white' : 'text-zinc-900 dark:text-zinc-200'}`}>
                    Bilet satın alma / rezervasyon
                </h3>
                <p className="mt-1 text-xs text-zinc-500">
                    «Nasıl alınır?» ile tek seçim yapılır: harici siteler, Sahnebul rezervasyon formu, yalnızca PayTR ile kart veya telefon / iletişim.
                </p>
            </div>

            <div className={`space-y-2 ${boxClass}`}>
                <p className={labelClass}>Nasıl alınır?</p>
                {modeOption(
                    'external_platforms',
                    'Harici platformlardan (Biletix, Passo, Bubilet vb.)',
                    'Bilet veya rezervasyon yalnızca aşağıda girdiğiniz bağlantılardan yapılır. Sahnebul rezervasyon formu ve kart ile satın alma gösterilmez.',
                )}
                {modeOption(
                    'sahnebul_reservation',
                    'Sahnebul üzerinden rezervasyon / bilet talebi',
                    'Ziyaretçiler mekân rezervasyon formundan bu etkinliği seçer (kart çekilmez, onay süreci). İsteğe bağlı harici bağlantı ekleyebilirsiniz.',
                )}
                {modeOption(
                    'sahnebul_card',
                    'Sahnebul üzerinden kredi kartı ödemesi',
                    entryIsPaid
                        ? 'Etkinlik sayfasında «Kart ile satın al» (PayTR) gösterilir. Rezervasyon formu bu seçenekte kapalıdır. PayTR panelinde ödeme açık olmalı.'
                        : 'Bu seçenek yalnızca ücretli etkinliklerde kullanılabilir. Önce «Giriş ücretli mi?» alanından ücretli seçin.',
                    cardRadioDisabled,
                )}
                {modeOption(
                    'phone_only',
                    'Çevrimiçi satış yok — telefon / iletişim ile rezervasyon',
                    'Sahnebul formu, harici bilet linkleri ve kartlı ödeme gösterilmez. Açıklama notu ve mekân iletişim bilgileri öne çıkar.',
                )}
                {errors.ticket_acquisition_mode && <p className="text-sm text-red-400">{errors.ticket_acquisition_mode}</p>}
            </div>

            {showOutlets && (
                <div className={boxClass}>
                    <p className={labelClass}>
                        {acquisitionMode === 'external_platforms' ? 'Bilet satın alma bağlantıları' : 'İsteğe bağlı harici bağlantılar'}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                        {acquisitionMode === 'external_platforms'
                            ? 'Taslakta boş bırakılabilir. Yayında (yayınlandı) iken en az bir geçerli https adresi gerekir. Her satırda platform adı ve etkinlik sayfası olmalı.'
                            : 'Örn. bilet ayrıca Biletix’te satılıyorsa buraya ekleyin.'}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {PLATFORM_PRESETS.map((p) => (
                            <button
                                key={p.label}
                                type="button"
                                onClick={() => {
                                    const next = [...outlets];
                                    const last = next[next.length - 1];
                                    const lastEmpty = last && !last.label.trim() && !last.url.trim();
                                    if (lastEmpty) {
                                        next[next.length - 1] = { label: p.label, url: p.url };
                                    } else {
                                        next.push({ label: p.label, url: p.url });
                                    }
                                    onOutletsChange(next);
                                }}
                                className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 hover:border-amber-500/50 hover:text-amber-700 dark:border-zinc-600 dark:text-zinc-300 dark:hover:text-amber-400"
                            >
                                + {p.label}
                            </button>
                        ))}
                    </div>
                    <div className="mt-3 space-y-3">
                        {outlets.map((row, i) => (
                            <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-end">
                                <div className="min-w-0 flex-1">
                                    <label className="text-xs text-zinc-500">Görünen ad</label>
                                    <input
                                        value={row.label}
                                        onChange={(e) => {
                                            const next = [...outlets];
                                            next[i] = { ...next[i], label: e.target.value };
                                            onOutletsChange(next);
                                        }}
                                        placeholder="Örn. Biletix"
                                        className={inputClass}
                                    />
                                </div>
                                <div className="min-w-0 flex-[2]">
                                    <label className="text-xs text-zinc-500">Etkinlik URL’si</label>
                                    <input
                                        value={row.url}
                                        onChange={(e) => {
                                            const next = [...outlets];
                                            next[i] = { ...next[i], url: e.target.value };
                                            onOutletsChange(next);
                                        }}
                                        placeholder="https://..."
                                        className={inputClass}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (outlets.length <= 1) {
                                            onOutletsChange([emptyTicketOutletRow()]);
                                            return;
                                        }
                                        onOutletsChange(outlets.filter((_, j) => j !== i));
                                    }}
                                    className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-zinc-300 text-zinc-500 hover:border-red-500/50 hover:text-red-600 dark:border-zinc-600 dark:text-zinc-400 dark:hover:text-red-400 sm:mb-0.5"
                                    aria-label="Satırı sil"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                    {outlets.length < 15 && (
                        <button
                            type="button"
                            onClick={() => onOutletsChange([...outlets, emptyTicketOutletRow()])}
                            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-amber-700 hover:text-amber-600 dark:text-amber-500 dark:hover:text-amber-400"
                        >
                            <Plus className="h-4 w-4" />
                            Bağlantı ekle
                        </button>
                    )}
                    {errors.ticket_outlets && <p className="mt-2 text-sm text-red-400">{errors.ticket_outlets}</p>}
                </div>
            )}

            <div>
                <label className={labelClass}>
                    {acquisitionMode === 'phone_only' ? 'Rezervasyon talimatı (önerilir)' : 'Rezervasyon / bilet notu (opsiyonel)'}
                </label>
                <p className="mt-0.5 text-xs text-zinc-500">
                    {acquisitionMode === 'phone_only'
                        ? 'Örn. aranacak numara, çalışma saatleri veya “yer ayırtmak için mekânı arayın”.'
                        : 'Örn. gişeden nakit, kapıda ödeme veya ek koşullar.'}
                </p>
                <textarea
                    value={purchaseNote}
                    onChange={(e) => onPurchaseNoteChange(e.target.value)}
                    rows={acquisitionMode === 'phone_only' ? 5 : 4}
                    maxLength={5000}
                    className={`${inputClass} mt-2 font-sans`}
                    placeholder="Kısa açıklama…"
                />
                {errors.ticket_purchase_note && <p className="mt-1 text-sm text-red-400">{errors.ticket_purchase_note}</p>}
            </div>
        </div>
    );
}

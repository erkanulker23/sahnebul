import { router } from '@inertiajs/react';
import { useRef } from 'react';

type Props = {
    /** Uygulama köküne göre path; Ziggy listesi güncel olmasa da çalışır (örn. /admin/sanatcilar/excel). */
    exportPath: string;
    importPath: string;
};

const exportBtnClass =
    'inline-flex items-center justify-center rounded-lg border border-emerald-600/80 bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 hover:border-emerald-500 dark:border-emerald-500 dark:bg-emerald-600 dark:hover:bg-emerald-500';

const importBtnClass =
    'inline-flex items-center justify-center rounded-lg border border-sky-600/80 bg-sky-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-500 hover:border-sky-500 dark:border-sky-500 dark:bg-sky-600 dark:hover:bg-sky-500';

/** Admin liste sayfalarında tam Excel dışa / içe aktarma (aynı sütun başlıklarıyla gidiş-dönüş). */
export function AdminExcelActions({ exportPath, importPath }: Readonly<Props>) {
    const inputRef = useRef<HTMLInputElement>(null);

    return (
        <>
            <a href={exportPath} className={exportBtnClass}>
                Excel indir
            </a>
            <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                className="hidden"
                onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = '';
                    if (!f) {
                        return;
                    }
                    const fd = new FormData();
                    fd.append('file', f);
                    router.post(importPath, fd, { forceFormData: true });
                }}
            />
            <button type="button" onClick={() => inputRef.current?.click()} className={importBtnClass}>
                Excel yükle
            </button>
        </>
    );
}

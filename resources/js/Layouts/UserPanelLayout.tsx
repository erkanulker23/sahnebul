import { AccountSidebar } from '@/Components/account/AccountSidebar';
import { PropsWithChildren } from 'react';
import SiteShell from '@/Layouts/SiteShell';

/**
 * Giriş yapmış kullanıcı paneli: SiteShell + tek hesap navigasyonu (sol / mobil şerit).
 * Eski AuthenticatedLayout yerine kullanılır; üstte ayrı Breeze çubuğu yok.
 */
export default function UserPanelLayout({ children }: Readonly<PropsWithChildren>) {
    return (
        <SiteShell>
            <div className="flex flex-col gap-6 px-2.5 pt-4 sm:px-4 lg:flex-row lg:items-start lg:gap-10 lg:px-8 lg:pt-6">
                <AccountSidebar />
                <div className="min-w-0 flex-1">{children}</div>
            </div>
        </SiteShell>
    );
}

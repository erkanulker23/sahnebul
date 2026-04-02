import { StagePanelSidebar } from '@/Components/stage/StagePanelSidebar';
import SiteShell from '@/Layouts/SiteShell';
import { PropsWithChildren } from 'react';

/**
 * Sahne paneli (sanatçı / mekân / Management): SiteShell + sol menü — kullanıcı paneli ile aynı görsel bütünlük.
 */
export default function ArtistLayout({ children }: Readonly<PropsWithChildren>) {
    return (
        <SiteShell>
            <div className="flex flex-col gap-6 pt-4 lg:flex-row lg:items-start lg:gap-10 lg:pt-6">
                <StagePanelSidebar />
                <div className="min-w-0 flex-1">
                    <div className="mx-auto w-full max-w-7xl pb-8">{children}</div>
                </div>
            </div>
        </SiteShell>
    );
}

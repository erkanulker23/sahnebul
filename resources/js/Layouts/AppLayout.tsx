import SiteShell from '@/Layouts/SiteShell';
import { PropsWithChildren } from 'react';

export default function AppLayout({ children }: Readonly<PropsWithChildren>) {
    return <SiteShell>{children}</SiteShell>;
}

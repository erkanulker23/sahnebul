import { cn } from '@/lib/cn';
import { type HTMLAttributes } from 'react';

type Props = HTMLAttributes<HTMLDivElement> & {
    /** Kart / öğe grid */
    cols?: 'auto' | 2 | 3 | 4;
};

const colsMap = {
    auto: 'grid-cols-[repeat(auto-fill,minmax(min(100%,16rem),1fr))]',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
};

export function Grid({ cols = 'auto', className, ...rest }: Readonly<Props>) {
    return <div className={cn('grid gap-4 sm:gap-6', colsMap[cols], className)} {...rest} />;
}

import { MicrophoneMark } from '@/Components/brand/MicrophoneMark';
import { cn } from '@/lib/cn';
import { type SVGAttributes } from 'react';

/** Küçük alanlar (Breeze tarzı nav vb.) — sadece mikrofon işareti */
export default function ApplicationLogo({ className, ...props }: Readonly<SVGAttributes<SVGElement>>) {
    return <MicrophoneMark className={cn('h-10 w-10', className)} {...props} />;
}

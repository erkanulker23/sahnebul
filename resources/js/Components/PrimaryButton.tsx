import { Button } from '@/Components/ui/Button';
import { cn } from '@/lib/cn';
import { type ButtonHTMLAttributes } from 'react';

export default function PrimaryButton({ className = '', disabled, children, type = 'submit', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <Button type={type} variant="primary" size="lg" className={cn('w-full justify-center', className)} disabled={disabled} {...props}>
            {children}
        </Button>
    );
}

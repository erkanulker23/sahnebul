import { buttonStyles, Button, type ButtonProps, type ButtonSize, type ButtonVariant } from '@/Components/ui/Button';
import { Link } from '@inertiajs/react';
import { type PropsWithChildren } from 'react';

export { Button as AdminButton };

type AdminButtonLinkProps = PropsWithChildren<{
    href: string;
    method?: 'get' | 'post';
    variant?: ButtonVariant;
    size?: ButtonSize;
    className?: string;
}>;

/** Inertia Link — POST (logout vb.) için method kullanın. */
export function AdminButtonLink({ href, method = 'get', variant = 'primary', size = 'md', className = '', children }: AdminButtonLinkProps) {
    const cls = buttonStyles(variant, size, className);
    if (method === 'post') {
        return (
            <Link href={href} method="post" as="button" className={cls}>
                {children}
            </Link>
        );
    }
    return (
        <Link href={href} className={cls}>
            {children}
        </Link>
    );
}

export type { ButtonProps as AdminButtonProps };

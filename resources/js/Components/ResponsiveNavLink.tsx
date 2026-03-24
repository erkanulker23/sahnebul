import { InertiaLinkProps, Link } from '@inertiajs/react';

export default function ResponsiveNavLink({
    active = false,
    className = '',
    children,
    ...props
}: InertiaLinkProps & { active?: boolean }) {
    return (
        <Link
            {...props}
            className={`flex w-full items-start border-l-4 py-2 pe-4 ps-3 ${
                active
                    ? 'border-amber-500 bg-amber-500/10 text-amber-400 focus:border-amber-500 focus:bg-amber-500/20 focus:text-amber-400'
                    : 'border-transparent text-zinc-400 hover:border-zinc-600 hover:bg-white/5 hover:text-white focus:border-zinc-600 focus:bg-white/5 focus:text-white'
            } text-base font-medium transition duration-150 ease-in-out focus:outline-none ${className}`}
        >
            {children}
        </Link>
    );
}

import { InertiaLinkProps, Link } from '@inertiajs/react';

export default function NavLink({
    active = false,
    className = '',
    children,
    ...props
}: InertiaLinkProps & { active: boolean }) {
    return (
        <Link
            {...props}
            className={
                'inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium leading-5 transition duration-150 ease-in-out focus:outline-none ' +
                (active
                    ? 'border-amber-500 text-amber-400 focus:border-amber-500'
                    : 'border-transparent text-zinc-400 hover:border-zinc-600 hover:text-white focus:border-zinc-600 focus:text-white') +
                className
            }
        >
            {children}
        </Link>
    );
}

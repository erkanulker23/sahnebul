import ApplicationLogo from '@/Components/ApplicationLogo';
import Dropdown from '@/Components/Dropdown';
import NavLink from '@/Components/NavLink';
import ResponsiveNavLink from '@/Components/ResponsiveNavLink';
import { useTheme } from '@/contexts/ThemeContext';
import { Link, usePage } from '@inertiajs/react';
import { Menu, Moon, Sun, X } from 'lucide-react';
import { PropsWithChildren, ReactNode, useState } from 'react';

export default function Authenticated({
    header,
    children,
}: Readonly<PropsWithChildren<{ header?: ReactNode }>>) {
    const user = usePage().props.auth.user;
    const { theme, toggleTheme } = useTheme();
    const [showingNavigationDropdown, setShowingNavigationDropdown] = useState(false);

    return (
        <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
            <nav className="border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 justify-between">
                        <div className="flex">
                            <div className="flex shrink-0 items-center">
                                <Link href="/">
                                    <ApplicationLogo className="block h-9 w-auto fill-current text-amber-600 dark:text-amber-500" />
                                </Link>
                            </div>

                            <div className="hidden space-x-8 sm:-my-px sm:ms-10 sm:flex">
                                <NavLink href={route('home')} active={route().current('home')}>
                                    Mekanlar
                                </NavLink>
                                <NavLink href={route('dashboard')} active={route().current('dashboard')}>
                                    Panel
                                </NavLink>
                            </div>
                        </div>

                        <div className="hidden items-center gap-6 sm:ms-6 sm:flex">
                            <button
                                type="button"
                                onClick={toggleTheme}
                                className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                aria-label="Tema"
                            >
                                {theme === 'dark' ? <Sun className="h-4 w-4 stroke-[1.75]" /> : <Moon className="h-4 w-4 stroke-[1.75]" />}
                            </button>
                            <div className="relative ms-3">
                                <Dropdown>
                                    <Dropdown.Trigger>
                                        <span className="inline-flex rounded-md">
                                            <button
                                                type="button"
                                                className="inline-flex items-center rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium leading-4 text-zinc-800 transition duration-150 ease-in-out hover:bg-zinc-50 focus:outline-none dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                                            >
                                                {user.name}
                                                <svg
                                                    className="-me-0.5 ms-2 h-4 w-4"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 20 20"
                                                    fill="currentColor"
                                                >
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                            </button>
                                        </span>
                                    </Dropdown.Trigger>

                                    <Dropdown.Content>
                                        <Dropdown.Link href={route('profile.edit')}>Profil</Dropdown.Link>
                                        <Dropdown.Link href={route('logout')} method="post" as="button">
                                            Çıkış Yap
                                        </Dropdown.Link>
                                    </Dropdown.Content>
                                </Dropdown>
                            </div>
                        </div>

                        <div className="-me-2 flex items-center gap-2 sm:hidden">
                            <button
                                type="button"
                                onClick={toggleTheme}
                                className="rounded-lg border border-zinc-300 p-2 text-zinc-700 dark:border-zinc-600 dark:text-zinc-300"
                                aria-label="Tema"
                            >
                                {theme === 'dark' ? <Sun className="h-5 w-5 stroke-[1.75]" /> : <Moon className="h-5 w-5 stroke-[1.75]" />}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowingNavigationDropdown((p) => !p)}
                                className="inline-flex items-center justify-center rounded-md p-2 text-zinc-600 hover:bg-zinc-100 focus:outline-none dark:text-zinc-400 dark:hover:bg-zinc-800"
                                aria-expanded={showingNavigationDropdown}
                            >
                                {showingNavigationDropdown ? <X className="h-6 w-6 stroke-[1.75]" /> : <Menu className="h-6 w-6 stroke-[1.75]" />}
                            </button>
                        </div>
                    </div>
                </div>

                <div className={(showingNavigationDropdown ? 'block' : 'hidden') + ' sm:hidden'}>
                        <div className="space-y-1 pb-3 pt-2">
                            <ResponsiveNavLink href={route('home')} active={route().current('home')}>
                                Mekanlar
                            </ResponsiveNavLink>
                            <ResponsiveNavLink href={route('dashboard')} active={route().current('dashboard')}>
                                Panel
                            </ResponsiveNavLink>
                        </div>

                        <div className="border-t border-zinc-200 pb-1 pt-4 dark:border-zinc-800">
                            <div className="px-4">
                                <div className="text-base font-medium text-zinc-900 dark:text-white">{user.name}</div>
                                <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{user.email}</div>
                            </div>

                            <div className="mt-3 space-y-1">
                                <ResponsiveNavLink href={route('profile.edit')}>Profil</ResponsiveNavLink>
                                <ResponsiveNavLink method="post" href={route('logout')} as="button">
                                    Çıkış Yap
                                </ResponsiveNavLink>
                            </div>
                        </div>
                </div>
            </nav>

            {header && (
                <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/50">
                    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                        <div className="text-zinc-900 dark:text-white">{header}</div>
                    </div>
                </header>
            )}

            <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
    );
}

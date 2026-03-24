import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Birleştirir ve Tailwind sınıf çakışmalarını çözer. */
export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs));
}

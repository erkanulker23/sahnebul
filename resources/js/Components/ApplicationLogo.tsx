import { SVGAttributes } from 'react';

export default function ApplicationLogo(props: SVGAttributes<SVGElement>) {
    return (
        <svg
            {...props}
            viewBox="0 0 64 64"
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
        >
            <path d="M32 4a4 4 0 0 0-4 4v20H16a4 4 0 0 0-4 4v4a4 4 0 0 0 4 4h12v20a4 4 0 1 0 8 0V36h12a4 4 0 0 0 4-4v-4a4 4 0 0 0-4-4H28V8a4 4 0 0 0-4-4z" />
            <ellipse cx="32" cy="54" rx="12" ry="4" opacity="0.5" />
        </svg>
    );
}

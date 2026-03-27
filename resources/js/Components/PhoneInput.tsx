import { formatTrPhoneInput } from '@/lib/trPhoneInput';
import type { InputHTMLAttributes } from 'react';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange' | 'inputMode'> & {
    value: string;
    onChange: (value: string) => void;
};

export default function PhoneInput({ value, onChange, className, placeholder = '05XX XXX XX XX', ...rest }: Readonly<Props>) {
    return (
        <input
            {...rest}
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(formatTrPhoneInput(e.target.value))}
            className={className}
        />
    );
}

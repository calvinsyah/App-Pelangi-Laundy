import React from 'react';
import { formatCurrencyInput, parseCurrencyValue } from '../lib/utils';

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  containerClassName?: string;
}

export function CurrencyInput({ 
  value, 
  onChange, 
  prefix = "Rp", 
  containerClassName = "",
  className = "",
  ...props 
}: CurrencyInputProps) {
  // Convert number value to formatted string
  const displayValue = value === 0 ? '' : formatCurrencyInput(value.toString());

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const parsed = parseCurrencyValue(rawValue);
    onChange(parsed);
  };

  return (
    <div className={`relative ${containerClassName}`}>
      {prefix && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
          {prefix}
        </span>
      )}
      <input
        type="text"
        value={displayValue}
        onChange={handleChange}
        className={`${prefix ? 'pl-10' : 'pl-3'} ${className}`}
        {...props}
      />
    </div>
  );
}

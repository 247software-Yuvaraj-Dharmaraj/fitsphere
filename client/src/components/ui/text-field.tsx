import { forwardRef, type InputHTMLAttributes } from 'react';
import { fieldClasses, labelClasses } from './field';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, error, id, className = '', ...props }, ref) => {
    const inputId = id ?? props.name;
    const errorId = error ? `${inputId}-error` : undefined;
    const input = (
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className={`${fieldClasses} ${error ? 'border-red-400 focus:ring-red-100 dark:border-red-500' : ''} ${className}`}
        {...props}
      />
    );
    if (!label) return input;
    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={inputId} className={labelClasses}>
          {label}
        </label>
        {input}
        {error && (
          <span id={errorId} className="text-xs text-red-500 dark:text-red-400">
            {error}
          </span>
        )}
      </div>
    );
  },
);

TextField.displayName = 'TextField';

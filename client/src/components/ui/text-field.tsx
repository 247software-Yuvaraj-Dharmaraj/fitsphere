import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { fieldClasses, labelClasses } from './field';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode; // optional leading icon
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, error, icon, id, className = '', ...props }, ref) => {
    const inputId = id ?? props.name;
    const errorId = error ? `${inputId}-error` : undefined;

    const input = (
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className={`${fieldClasses} ${icon ? 'pl-9' : ''} ${error ? 'border-red-400 focus:ring-red-100 dark:border-red-500' : ''} ${className}`}
        {...props}
      />
    );

    const control = icon ? (
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400">
          {icon}
        </span>
        {input}
      </div>
    ) : (
      input
    );

    if (!label) return control;
    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={inputId} className={labelClasses}>
          {label}
        </label>
        {control}
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

import { forwardRef, type SelectHTMLAttributes } from 'react';
import { fieldClasses, labelClasses } from './field';

interface Option {
  label: string;
  value: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  placeholder?: string;
  options: Option[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, placeholder, options, id, className = '', ...props }, ref) => {
    const selectId = id ?? props.name;
    const control = (
      <select
        ref={ref}
        id={selectId}
        aria-label={!label ? (props['aria-label'] ?? placeholder) : undefined}
        className={`${fieldClasses} ${className}`}
        {...props}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
    if (!label) return control;
    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={selectId} className={labelClasses}>
          {label}
        </label>
        {control}
      </div>
    );
  },
);

Select.displayName = 'Select';

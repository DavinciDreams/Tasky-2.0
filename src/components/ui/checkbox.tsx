import React from "react";

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  checked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
}

export function Checkbox({ checked, onChange, onCheckedChange, className = "", ...props }: CheckboxProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    if (onChange) onChange(e);
    if (onCheckedChange) onCheckedChange(isChecked);
  };

  return (
    <input
      type="checkbox"
      className={`h-4 w-4 rounded border-2 border-border bg-background text-checkbox focus:ring-2 focus:ring-checkbox/50 focus:ring-offset-0 ${className}`}
      checked={checked}
      onChange={handleChange}
      {...props}
    />
  );
}

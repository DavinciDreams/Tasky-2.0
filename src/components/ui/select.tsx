import React from "react";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  value?: string;
  onValueChange?: (value: any) => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

interface SelectTriggerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

interface SelectContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

interface SelectItemProps extends React.OptionHTMLAttributes<HTMLOptionElement> {
  children: React.ReactNode;
  value: string;
  style?: React.CSSProperties;
}

interface SelectValueProps extends React.HTMLAttributes<HTMLSpanElement> {
  placeholder?: string;
  children?: React.ReactNode;
}

export function Select({ value, onValueChange, children, style, ...props }: SelectProps) {
  return (
    <select 
      className="border border-border/30 rounded-2xl px-4 py-2.5 text-card-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-lg hover:shadow-xl transition-all duration-300 font-medium bg-card/50 backdrop-blur-sm hover:bg-card/70 cursor-pointer min-w-[160px]"
      value={value}
      onChange={(e) => onValueChange && onValueChange(e.target.value)}
      style={style}
      {...props}
    >
      {children}
    </select>
  );
}

export function SelectTrigger({ children, className = "", ...props }: SelectTriggerProps) {
  return (
    <div className={`inline-block relative ${className}`} {...props}>
      {children}
    </div>
  );
}

export function SelectContent({ children, className = "", ...props }: SelectContentProps) {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
}

export function SelectItem({ children, value, style, ...props }: SelectItemProps) {
  return (
    <option value={value} style={style} {...props}>
      {children}
    </option>
  );
}

export function SelectValue({ placeholder, children, ...props }: SelectValueProps) {
  return (
    <span {...props}>
      {children || placeholder}
    </span>
  );
}

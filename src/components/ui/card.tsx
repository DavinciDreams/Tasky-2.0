import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = "", ...props }: CardProps) {
  const base = "bg-card text-card-foreground border border-border/30 rounded-2xl shadow-xl";
  return (
    <div className={`${base} ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "", ...props }: CardProps) {
  const base = "px-6 pt-6 pb-4";
  return (
    <div className={`${base} ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = "", ...props }: CardProps) {
  const base = "text-xl font-semibold";
  return (
    <div className={`${base} ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardContent({ children, className = "", ...props }: CardProps) {
  const base = "px-6 pb-6";
  return (
    <div className={`${base} ${className}`} {...props}>
      {children}
    </div>
  );
}

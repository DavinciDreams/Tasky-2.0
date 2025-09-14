import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "default" | "destructive" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function Button({ children, variant = "default", size = "default", className = "", ...props }: ButtonProps) {
  const baseClasses = "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  
  const variants: Record<ButtonProps['variant'] & string, string> = {
    default: "bg-button text-button-foreground hover:bg-button/90 focus:ring-gray-500",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus:ring-red-500",
    outline: "border border-border bg-background hover:bg-muted text-foreground focus:ring-gray-500",
    ghost: "hover:bg-muted text-foreground focus:ring-gray-500",
  };
  
  const sizes: Record<ButtonProps['size'] & string, string> = {
    default: "h-10 px-4 py-2",
    sm: "h-8 px-3 text-sm",
    lg: "h-12 px-8",
    icon: "h-10 w-10",
  };
  
  const classes = `${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`;
  
  // Add debugging for theme variables
  React.useEffect(() => {
    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary');
    console.log('Button component: --primary CSS variable =', primaryColor);
  }, []);
  
  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}

import Link from 'next/link';
import { cn } from '@/lib/utils';

interface ButtonProps {
  children: React.ReactNode;
  href?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  external?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}

const variants = {
  primary:
    'bg-gradient-to-r from-primary to-primary-light text-white shadow-sm hover:shadow-md hover:brightness-110 focus:ring-primary',
  secondary:
    'bg-gradient-to-r from-secondary to-accent text-white shadow-sm hover:shadow-md hover:brightness-110 focus:ring-secondary',
  outline:
    'border-2 border-primary text-primary bg-transparent hover:bg-primary hover:!text-white hover:shadow-md focus:ring-primary',
  ghost:
    'text-primary hover:bg-primary/5 focus:ring-primary',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
};

export function Button({
  children,
  href,
  variant = 'primary',
  size = 'md',
  className,
  external = false,
  onClick,
  type = 'button',
  disabled = false,
}: ButtonProps) {
  const baseStyles = cn(
    'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
    variants[variant],
    sizes[size],
    className
  );

  if (href) {
    if (external) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={baseStyles}
        >
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className={baseStyles}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={baseStyles}
    >
      {children}
    </button>
  );
}

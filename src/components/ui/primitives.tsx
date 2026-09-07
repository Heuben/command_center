import React from 'react';
import { motion } from 'framer-motion';
import { twMerge } from 'tailwind-merge';

/* ---------- Button ---------- */

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md';
};

const buttonVariants = {
  primary: 'bg-primary text-white hover:bg-primary/90 border border-transparent',
  secondary: 'bg-surface text-ink border border-line hover:bg-ink/[0.04]',
  ghost:
  'bg-transparent text-ink-muted border border-transparent hover:bg-ink/[0.05] hover:text-ink',
  danger: 'bg-danger text-white hover:bg-danger/90 border border-transparent',
  success: 'bg-success text-white hover:bg-success/90 border border-transparent'
};

export function Button({ variant = 'secondary', size = 'md', className, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={twMerge(
        'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors duration-150 ease-out relative z-20',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
        'disabled:cursor-not-allowed disabled:opacity-45',
        size === 'sm' ? 'h-8 px-3 text-[13px]' : 'h-9 px-3.5 text-sm',
        buttonVariants[variant],
        className
      )} />);


}

/* ---------- Inputs ---------- */

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & {invalid?: boolean;}
>(function Input({ className, invalid, ...props }, ref) {
  return (
    <input
      ref={ref}
      {...props}
      aria-invalid={invalid || undefined}
      className={twMerge(
        'h-9 w-full rounded-md border bg-surface px-3 text-sm text-ink placeholder:text-ink-faint relative z-20',
        'transition-colors duration-150 ease-out focus:outline-none focus:ring-2',
        invalid ?
        'border-danger focus:border-danger focus:ring-danger/25' :
        'border-line focus:border-primary focus:ring-primary/25',
        className
      )} />);
});

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={twMerge(
        'w-full rounded-md border border-line bg-surface px-3 py-2 text-sm leading-relaxed text-ink placeholder:text-ink-faint',
        'transition-colors duration-150 ease-out focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25',
        className
      )} />);


}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={twMerge(
        'h-9 rounded-md border border-line bg-surface px-2.5 pr-8 text-sm text-ink',
        'transition-colors duration-150 ease-out focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25',
        className
      )} />);


}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      {...props}
      className={twMerge('mb-1.5 block text-[13px] font-medium text-ink-muted', className)} />);


}

/* ---------- Layout helpers ---------- */

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={twMerge('rounded-xl border border-line bg-surface shadow-card', className)} />);


}

export function PageHeader({
  title,
  subtitle,
  actions


}: {title: string;subtitle?: string;actions?: React.ReactNode;}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.23, 1, 0.32, 1] } }}
      className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </motion.header>);

}

export function SectionTitle({
  children,
  right



}: {children: React.ReactNode;right?: React.ReactNode;}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
      <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-muted">
        {children}
      </h2>
      {right}
    </div>);

}

/* ---------- Segmented control ---------- */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel





}: {options: {value: T;label: string;count?: number;}[];value: T;onChange: (v: T) => void;ariaLabel: string;}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface p-1 relative z-20">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={twMerge(
              'inline-flex cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors duration-150 ease-out',
              active ? 'bg-primary text-white' : 'text-ink-muted hover:bg-ink/[0.05] hover:text-ink'
            )}>
            {o.label}
            {typeof o.count === 'number' &&
            <span
              className={twMerge(
                'rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums',
                active ? 'bg-white/20 text-white' : 'bg-ink/[0.07] text-ink-muted'
              )}>
                {o.count}
              </span>
            }
          </button>);

      })}
    </div>);

}

/* ---------- Empty state ---------- */

export function EmptyState({
  icon,
  title,
  description,
  tone


}: {icon?: React.ReactNode;title: string;description?: string;tone?: 'neutral' | 'muted';}) {
  const IconComp = icon;
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      {icon ? (
        <div className="rounded-full bg-ink/[0.05] p-3 text-ink-faint">
          <IconComp className="h-5 w-5" aria-hidden="true" />
        </div>
      ) : (
        <div className="h-10 w-10 rounded-full bg-ink/[0.05]" aria-hidden="true" />
      )}
      <div>
        <p className="text-sm font-medium text-ink">{title}</p>
        {description && <p className="mt-1 max-w-sm text-[13px] text-ink-muted">{description}</p>}
      </div>
    </div>
  );
}
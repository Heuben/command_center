/**
 * Switch — accessible toggle switch.
 *
 * Uses role="switch" with aria-checked. The thumb slides smoothly via framer-motion.
 */
import React from 'react';
import { motion } from 'framer-motion';
import { twMerge } from 'tailwind-merge';

type SwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
};

export function Switch({ checked, onChange, disabled, label, className }: SwitchProps) {
  return (
    <label
      className={twMerge(
        'inline-flex cursor-pointer items-center gap-2.5',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={twMerge(
          'relative h-5 w-9 rounded-full border transition-colors duration-200 ease-out',
          checked ? 'border-primary bg-primary' : 'border-line bg-ink/10'
        )}>
        <motion.span
          layout="position"
          animate={{ x: checked ? 16 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm" />
      </button>
      {label && (
        <span className="text-[13px] font-medium text-ink">{label}</span>
      )}
    </label>
  );
}

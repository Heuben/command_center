import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowDownIcon, ArrowUpIcon, MinusIcon } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { Badge } from './Badge';
import { Tooltip } from './Tooltip';
import { useCountUp } from '../../hooks/useCountUp';

type Tone = 'primary' | 'success' | 'danger' | 'urgent' | 'accent' | 'cyan' | 'violet' | 'neutral';

type KpiCardProps = {
  /** Small uppercase caption above the value, e.g. "Accident Incidents". */
  label: string;
  /** Big value, e.g. "28 cases". */
  value: string;
  /** Optional unit / tail after the value, e.g. "cases". */
  unit?: string;
  /** Percent delta vs. the previous period. Positive = up. */
  delta?: number;
  /** Caption under the delta, e.g. "vs. yesterday". */
  deltaCaption?: string;
  /** Optional status text shown next to the value (replaces delta). */
  statusLabel?: string;
  /** Accent tone — controls the glow ring and the dot color. */
  tone?: Tone;
  /** Optional inline trend (e.g. 12 small bars). Width is auto. */
  trend?: number[];
  /** Aria-label override. Defaults to the label. */
  ariaLabel?: string;
  className?: string;
};

const toneToGlow: Record<Tone, string> = {
  primary: 'glow-ring-primary',
  success: 'glow-ring-success',
  danger: 'glow-ring-danger',
  urgent: 'glow-ring-danger',
  accent: 'glow-ring-accent',
  cyan: 'glow-ring-primary',
  violet: 'glow-ring-accent',
  neutral: ''
};

const toneToBar: Record<Tone, string> = {
  primary: 'bg-primary/70',
  success: 'bg-success/70',
  danger: 'bg-danger/70',
  urgent: 'bg-urgent/70',
  accent: 'bg-accent/80',
  cyan: 'bg-cyan/80',
  violet: 'bg-violet/80',
  neutral: 'bg-ink-muted/40'
};

const toneToDot: Record<Tone, string> = {
  primary: 'bg-primary',
  success: 'bg-success',
  danger: 'bg-danger',
  urgent: 'bg-urgent',
  accent: 'bg-accent',
  cyan: 'bg-cyan',
  violet: 'bg-violet',
  neutral: 'bg-ink-muted'
};

const toneToBadge: Record<Tone, 'primary' | 'success' | 'danger' | 'urgent' | 'neutral'> = {
  primary: 'primary',
  success: 'success',
  danger: 'danger',
  urgent: 'urgent',
  accent: 'primary',
  cyan: 'primary',
  violet: 'primary',
  neutral: 'neutral'
};

/**
 * KPI tile — a small uppercase caption, a bold large value, a delta chip, and a
 * subtle trend mini-chart with a soft glow ring driven by `tone`.
 */
export function KpiCard({
  label,
  value,
  unit,
  delta,
  deltaCaption,
  statusLabel,
  tone = 'primary',
  trend,
  ariaLabel,
  className
}: KpiCardProps) {
  const positive = typeof delta === 'number' && delta > 0;
  const negative = typeof delta === 'number' && delta < 0;

  // Parse leading numeric prefix for count-up animation
  const { prefix, target, suffix } = useMemo(() => {
    const match = /^(\D*)([\d,]+(?:\.\d+)?)(.*)$/.exec(value);
    if (!match) return { prefix: '', target: 0, suffix: value };
    const num = Number(match[2].replace(/,/g, ''));
    return { prefix: match[1], target: num, suffix: match[3] };
  }, [value]);

  const animated = useCountUp(target);
  const formatted = useMemo(() => {
    if (target === 0 && value === '') return value;
    const decs = (String(target).split('.')[1] ?? '').length;
    return animated.toLocaleString(undefined, {
      minimumFractionDigits: decs,
      maximumFractionDigits: decs
    });
  }, [animated, target, value]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{
        opacity: 1,
        scale: 1,
        transition: { duration: 0.18, ease: [0.23, 1, 0.32, 1] }
      }}
      aria-label={ariaLabel ?? label}
      className={twMerge(
        'group relative flex flex-col gap-1 overflow-hidden rounded-xl border border-line bg-surface p-2.5 shadow-card transition-shadow duration-200 ease-out hover:shadow-lift dark:bg-elevated',
        toneToGlow[tone],
        className
      )}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
          {label}
        </p>
        <span
          className={twMerge(
            'h-1.5 w-1.5 shrink-0 rounded-full animate-ops-pulse',
            toneToDot[tone]
          )} />

      </div>

      <div className="flex items-baseline gap-1">
        <span className="text-[26px] font-extrabold leading-none tracking-tight tabular-nums text-ink">
          {prefix}{target === 0 ? value : formatted}{suffix}
        </span>
        {unit && <span className="text-[11px] font-semibold text-ink-muted">{unit}</span>}
      </div>

      <div className="flex items-center justify-between gap-2 pt-0.5">
        {typeof delta === 'number' ?
        <Tooltip content={deltaCaption ?? `${Math.abs(delta)}% change`}>
          <Badge tone={toneToBadge[tone]} className="px-1.5 py-0.5 text-[10px] leading-none">
            {positive ?
            <ArrowUpIcon className="h-2.5 w-2.5" /> :
            negative ?
            <ArrowDownIcon className="h-2.5 w-2.5" /> :

            <MinusIcon className="h-2.5 w-2.5" />
            }
            <span className="tabular-nums">{Math.abs(delta)}%</span>
            {deltaCaption && <span className="font-normal opacity-80">{deltaCaption}</span>}
          </Badge>
        </Tooltip> :
        statusLabel ?
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-ops-pulse" />
            {statusLabel}
          </span> :

        <span />
        }
        {trend && trend.length > 0 ? <Sparkline values={trend} className={toneToBar[tone]} /> : null}
      </div>
    </motion.div>);

}

/**
 * Tiny inline trend mini-chart. Scales each value to a 0..1 range so the bars
 * fill the available height.
 */
export function Sparkline({
  values,
  height = 14,
  className




}: {values: number[];height?: number;className?: string;}) {
  if (values.length === 0) return null;
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-0.5" style={{ height }} aria-hidden>
      {values.map((v, i) =>
      <span
        key={i}
        className={twMerge('block w-1 rounded-sm', className)}
        style={{ height: `${Math.max(5, v / max * 100)}%` }} />

      )}
    </div>);

}
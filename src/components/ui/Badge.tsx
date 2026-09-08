import React from 'react';
import { twMerge } from 'tailwind-merge';
import type {
  AlertOutcome,
  AlertType,
  AssignmentStatus,
  Availability,
  BranchResponseStatus,
  DeviceStatus,
  ReportStatus,
  ReviewStatus } from
'../../types';
import {
  alertTypeLabel,
  assignmentStatusLabel,
  availabilityLabel,
  branchStatusLabel,
  deviceStatusLabel,
  outcomeLabel,
  reportStatusLabel,
  reviewStatusLabel } from
'../../utils/labels';

type Tone = 'neutral' | 'primary' | 'urgent' | 'success' | 'danger';
type Variant = 'soft' | 'solid' | 'dot' | 'tag';

const soft: Record<Tone, string> = {
  neutral: 'bg-ink/[0.06] text-ink-muted',
  primary: 'bg-primary-soft text-primary',
  urgent: 'bg-urgent-soft text-urgent',
  success: 'bg-success-soft text-success',
  danger: 'bg-danger-soft text-danger'
};

const solid: Record<Tone, string> = {
  neutral: 'bg-ink-muted text-canvas',
  primary: 'bg-primary text-white',
  urgent: 'bg-urgent text-white',
  success: 'bg-success text-white',
  danger: 'bg-danger text-white'
};

const dotColor: Record<Tone, string> = {
  neutral: 'bg-ink-faint',
  primary: 'bg-primary',
  urgent: 'bg-urgent',
  success: 'bg-success',
  danger: 'bg-danger'
};

const tagBar: Record<Tone, string> = {
  neutral: 'border-l-ink-faint text-ink-muted',
  primary: 'border-l-primary text-primary',
  urgent: 'border-l-urgent text-urgent',
  success: 'border-l-success text-success',
  danger: 'border-l-danger text-danger'
};

export function Badge({
  tone = 'neutral',
  variant = 'soft',
  children,
  className





}: {tone?: Tone;variant?: Variant;children: React.ReactNode;className?: string;}) {
  const base =
  'inline-flex items-center gap-1.5 whitespace-nowrap text-[12px] font-medium leading-none';

  if (variant === 'dot') {
    return (
      <span
        className={twMerge(
          base,
          'rounded-full border border-line bg-surface px-2.5 py-1 text-ink',
          className
        )}>
        <span className={twMerge('h-1.5 w-1.5 rounded-full', dotColor[tone])} />
        {children}
      </span>);

  }

  if (variant === 'tag') {
    return (
      <span
        className={twMerge(
          base,
          'rounded-sm border-l-2 bg-ink/[0.04] px-2 py-1 font-semibold',
          tagBar[tone],
          className
        )}>
        {children}
      </span>);

  }

  return (
    <span
      className={twMerge(
        base,
        'rounded-full px-2.5 py-1',
        variant === 'solid' ? solid[tone] : soft[tone],
        className
      )}>
      {children}
    </span>);

}

/* --- Branch response (Incident Log / dispatch queue) --- */
const branchTone: Record<BranchResponseStatus, Tone> = {
  pending: 'urgent',
  viewing: 'neutral',
  dispatched: 'primary',
  arrived: 'primary',
  resolved: 'success'
};

export function BranchStatusBadge({ status }: {status: BranchResponseStatus;}) {
  return (
    <Badge tone={branchTone[status]} variant={status === 'pending' ? 'solid' : 'soft'}>
      {branchStatusLabel[status]}
    </Badge>);

}

/* --- Individual responder assignment --- */
const assignmentTone: Record<AssignmentStatus, Tone> = {
  assigned: 'neutral',
  en_route: 'success',
  arrived: 'primary',
  declined: 'danger',
  stood_down: 'neutral'
};

export function AssignmentStatusBadge({ status }: {status: AssignmentStatus;}) {
  return (
    <Badge tone={assignmentTone[status]} variant="dot">
      {assignmentStatusLabel[status]}
    </Badge>);

}

/* --- Outcome review (pending / approved / rejected) --- */
const reviewTone: Record<ReviewStatus, Tone> = {
  pending: 'urgent',
  approved: 'success',
  rejected: 'danger'
};

export function ReviewStatusBadge({ status }: {status: ReviewStatus;}) {
  return (
    <Badge tone={reviewTone[status]} variant="dot" className="font-semibold">
      {reviewStatusLabel[status]}
    </Badge>);

}

/* --- Incident report (draft / submitted / under review / approved) --- */
const reportTone: Record<ReportStatus, Tone> = {
  draft: 'neutral',
  submitted: 'primary',
  under_review: 'urgent',
  approved: 'success'
};

export function ReportStatusBadge({ status }: {status: ReportStatus;}) {
  return (
    <Badge tone={reportTone[status]} variant="tag">
      {reportStatusLabel[status]}
    </Badge>);

}

/* --- Final alert outcome --- */
const outcomeTone: Record<AlertOutcome, Tone> = {
  confirmed: 'danger',
  false_positive: 'neutral',
  unresolved: 'urgent'
};

export function OutcomeBadge({ outcome }: {outcome: AlertOutcome;}) {
  return (
    <Badge tone={outcomeTone[outcome]} variant="soft">
      {outcomeLabel[outcome]}
    </Badge>);

}

/* --- Alert classification --- */
const armed: AlertType[] = ['threat_gun', 'threat_blade'];

export function AlertTypeBadge({ type }: {type: AlertType;}) {
  return (
    <Badge tone={armed.includes(type) ? 'danger' : 'urgent'} variant="soft">
      {alertTypeLabel[type]}
    </Badge>);

}

/* --- Duty / device --- */
const dutyTone: Record<Availability, Tone> = {
  on_duty: 'success',
  dispatched: 'primary',
  off_duty: 'neutral'
};

export function DutyBadge({ availability }: {availability: Availability;}) {
  return (
    <Badge tone={dutyTone[availability]} variant="dot">
      {availabilityLabel[availability]}
    </Badge>);

}

const deviceTone: Record<DeviceStatus, Tone> = {
  paired: 'success',
  unpaired: 'neutral',
  lost: 'danger',
  damaged: 'danger'
};

export function DeviceStatusBadge({ status }: {status: DeviceStatus;}) {
  return (
    <Badge tone={deviceTone[status]} variant="soft">
      {deviceStatusLabel[status]}
    </Badge>);

}
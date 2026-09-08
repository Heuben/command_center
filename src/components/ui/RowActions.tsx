import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreVerticalIcon } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

export type RowAction = {
  label: string;
  icon: React.ComponentType<{className?: string;}>;
  onSelect: () => void;
  /** Renders a 1px divider directly above this item. */
  dividerBefore?: boolean;
  destructive?: boolean;
};

type Props = {
  actions: RowAction[];
  /** Announced on the trigger, e.g. "Actions for Antonio Bautista". */
  ariaLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const MENU_WIDTH = 232;

export function RowActions({ actions, ariaLabel, open, onOpenChange }: Props) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{top: number;left: number;} | null>(null);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const place = () => {
      const rect = triggerRef.current!.getBoundingClientRect();
      const estimatedHeight = actions.length * 38 + 16;
      const flipUp = rect.bottom + estimatedHeight + 12 > window.innerHeight;
      setPosition({
        top: flipUp ? rect.top - estimatedHeight - 6 : rect.bottom + 6,
        left: Math.max(12, rect.right - MENU_WIDTH)
      });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, actions.length]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      onOpenChange(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onOpenChange]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          onOpenChange(!open);
        }}
        className={twMerge(
          'relative z-20 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-ink-muted transition-colors duration-150 ease-out pointer-events-auto',
          'hover:bg-ink/[0.06] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          open && 'bg-ink/[0.06] text-ink'
        )}>
        <MoreVerticalIcon className="h-4 w-4" />
      </button>

      {open &&
      position &&
      createPortal(
        <div
          ref={menuRef}
          role="menu"
          aria-label={ariaLabel}
          style={{ top: position.top, left: position.left, width: MENU_WIDTH }}
          className="fixed z-50 overflow-hidden rounded-lg border border-line bg-elevated py-1 shadow-panel">
            {actions.map((action) => {
            const Icon = action.icon;
            return (
              <React.Fragment key={action.label}>
                  {action.dividerBefore && <div className="my-1 h-px bg-line" role="separator" />}
                  <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    action.onSelect();
                    onOpenChange(false);
                  }}
                  className={twMerge(
                    'flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors duration-150 ease-out pointer-events-auto',
                    action.destructive ?
                    'text-danger hover:bg-danger-soft' :
                    'text-ink hover:bg-ink/[0.05]'
                  )}>
                    <Icon
                    className={twMerge(
                      'h-4 w-4 shrink-0',
                      action.destructive ? 'text-danger' : 'text-ink-muted'
                    )} />
                  
                    {action.label}
                  </button>
                </React.Fragment>);

          })}
          </div>,
        document.body
      )}
    </>);

}
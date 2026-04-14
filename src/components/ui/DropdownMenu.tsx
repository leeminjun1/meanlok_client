'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface MenuItem {
  label: string;
  onClick: () => void;
  className?: string;
}

interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: MenuItem[];
  align?: 'left' | 'right';
}

export function DropdownMenu({
  trigger,
  items,
  align = 'right',
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className="rounded p-1 hover:bg-neutral-100"
        onClick={() => setOpen((prev) => !prev)}
      >
        {trigger}
      </button>
      {open ? (
        <div
          className={cn(
            'absolute z-20 mt-1 min-w-32 rounded-md border border-neutral-200 bg-white p-1 shadow-md',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                item.onClick();
                setOpen(false);
              }}
              className={cn(
                'w-full rounded px-2 py-1.5 text-left text-sm text-neutral-700 hover:bg-neutral-100',
                item.className,
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

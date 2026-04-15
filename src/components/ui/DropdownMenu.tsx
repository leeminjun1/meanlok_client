'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

const DROPDOWN_ESTIMATED_HEIGHT = 160;
const DROPDOWN_WIDTH = 128;

interface MenuPosition {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

export function DropdownMenu({
  trigger,
  items,
  align = 'right',
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<MenuPosition>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  const handleOpen = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward = spaceBelow < DROPDOWN_ESTIMATED_HEIGHT;

      const pos: MenuPosition = {};
      if (openUpward) {
        pos.bottom = window.innerHeight - rect.top;
      } else {
        pos.top = rect.bottom + 4;
      }

      if (align === 'right') {
        pos.right = window.innerWidth - rect.right;
      } else {
        pos.left = rect.left;
      }

      setMenuPos(pos);
    }
    setOpen((prev) => !prev);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="rounded p-1 hover:bg-neutral-100"
        onClick={handleOpen}
      >
        {trigger}
      </button>
      {open
        ? createPortal(
            <div
              ref={menuRef}
              style={{
                position: 'fixed',
                minWidth: `${DROPDOWN_WIDTH}px`,
                ...menuPos,
              }}
              className="z-50 rounded-md border border-neutral-200 bg-white p-1 shadow-md"
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
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

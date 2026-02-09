/**
 * dropdown-menu.tsx
 * 간단한 드롭다운 메뉴 컴포넌트
 */

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface DropdownMenuProps {
    children: React.ReactNode;
}

interface DropdownMenuTriggerProps {
    asChild?: boolean;
    children: React.ReactNode;
}

interface DropdownMenuContentProps {
    align?: "start" | "end" | "center";
    children: React.ReactNode;
    className?: string;
}

interface DropdownMenuItemProps {
    onClick?: (e: React.MouseEvent) => void;
    className?: string;
    children: React.ReactNode;
}

const DropdownMenuContext = React.createContext<{
    open: boolean;
    setOpen: (open: boolean) => void;
}>({
    open: false,
    setOpen: () => {},
});

export function DropdownMenu({ children }: DropdownMenuProps) {
    const [open, setOpen] = React.useState(false);

    // 외부 클릭 시 닫기
    React.useEffect(() => {
        const handleClickOutside = () => {
            if (open) setOpen(false);
        };

        if (open) {
            // 약간의 딜레이를 주어 트리거 클릭과 충돌 방지
            const timer = setTimeout(() => {
                document.addEventListener("click", handleClickOutside);
            }, 0);

            return () => {
                clearTimeout(timer);
                document.removeEventListener("click", handleClickOutside);
            };
        }
    }, [open]);

    return (
        <DropdownMenuContext.Provider value={{ open, setOpen }}>
            <div className="relative inline-block">{children}</div>
        </DropdownMenuContext.Provider>
    );
}

export function DropdownMenuTrigger({ asChild, children }: DropdownMenuTriggerProps) {
    const { open, setOpen } = React.useContext(DropdownMenuContext);

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setOpen(!open);
    };

    if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children as React.ReactElement<{ onClick: (e: React.MouseEvent) => void }>, {
            onClick: handleClick,
        });
    }

    return (
        <button onClick={handleClick} type="button">
            {children}
        </button>
    );
}

export function DropdownMenuContent({ align = "end", children, className }: DropdownMenuContentProps) {
    const { open } = React.useContext(DropdownMenuContext);

    if (!open) return null;

    const alignmentClasses = {
        start: "left-0",
        end: "right-0",
        center: "left-1/2 -translate-x-1/2",
    };

    return (
        <div
            className={cn(
                "absolute z-50 mt-1 min-w-[8rem] overflow-hidden rounded-md border bg-white dark:bg-gray-800 p-1 shadow-md animate-in fade-in-0 zoom-in-95",
                alignmentClasses[align],
                className
            )}
            onClick={(e) => e.stopPropagation()}
        >
            {children}
        </div>
    );
}

export function DropdownMenuItem({ onClick, className, children }: DropdownMenuItemProps) {
    const { setOpen } = React.useContext(DropdownMenuContext);

    const handleClick = (e: React.MouseEvent) => {
        onClick?.(e);
        setOpen(false);
    };

    return (
        <button
            className={cn(
                "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700",
                className
            )}
            onClick={handleClick}
            type="button"
        >
            {children}
        </button>
    );
}

"use client";

import { usePathname } from "next/navigation";
import { createContext, type ReactNode, useCallback, useMemo, useState } from "react";

interface SidebarContextType {
    isOpen: boolean;
    open: () => void;
    close: () => void;
    toggle: () => void;
}

export const SidebarContext = createContext<SidebarContextType | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();
    const [previousPathname, setPreviousPathname] = useState(pathname);

    // Auto-close sidebar when navigating (e.g., selecting a channel on mobile).
    // Uses the "adjusting state during render" pattern recommended by React docs.
    // See: https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
    if (previousPathname !== pathname) {
        setPreviousPathname(pathname);
        if (isOpen) {
            setIsOpen(false);
        }
    }

    const open = useCallback(() => setIsOpen(true), []);
    const close = useCallback(() => setIsOpen(false), []);
    const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

    const value = useMemo(() => ({ isOpen, open, close, toggle }), [isOpen, open, close, toggle]);

    return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

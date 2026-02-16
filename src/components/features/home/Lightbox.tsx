"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { LightboxItem } from "./types";

interface LightboxProps {
    item: LightboxItem | null;
    onClose: () => void;
}

export default function Lightbox({ item, onClose }: LightboxProps) {
    useEffect(() => {
        if (!item) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [item, onClose]);

    if (!item) return null;

    return (
        <div
            className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="w-full max-w-4xl bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/70 dark:border-gray-800">
                    <div className="min-w-0">
                        <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {item.title}
                        </div>
                        {(item.subtitle || item.meta) && (
                            <div className="text-sm text-gray-600 dark:text-gray-300 truncate">
                                {[item.subtitle, item.meta]
                                    .filter(Boolean)
                                    .join(" · ")}
                            </div>
                        )}
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-xl"
                        onClick={onClose}
                    >
                        <X className="w-5 h-5" />
                    </Button>
                </div>
                <div className="relative w-full bg-black">
                    <img
                        src={item.src}
                        alt={item.title}
                        className="w-full max-h-[70vh] object-contain"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                    />
                </div>
            </div>
        </div>
    );
}

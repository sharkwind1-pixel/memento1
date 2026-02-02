"use client";

/* eslint-disable @next/next/no-img-element */

import { LightboxItem } from "./types";

interface TileGalleryProps {
    items: LightboxItem[];
    onItemClick: (item: LightboxItem) => void;
}

export default function TileGallery({ items, onItemClick }: TileGalleryProps) {
    return (
        <div className="grid gap-4 sm:gap-5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((it, idx) => (
                <button
                    key={`${it.title}-${idx}`}
                    onClick={() => onItemClick(it)}
                    className="group text-left"
                    type="button"
                >
                    <div className="rounded-2xl overflow-hidden bg-white/60 dark:bg-gray-800/60 border border-white/50 dark:border-gray-700/60 shadow-sm hover:shadow-lg transition-all">
                        <div className="relative aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 overflow-hidden">
                            <img
                                src={it.src}
                                alt={it.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                loading="lazy"
                                referrerPolicy="no-referrer"
                            />
                        </div>
                        <div className="p-3">
                            <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                                {it.title}
                            </div>
                            {(it.subtitle || it.meta) && (
                                <div className="text-sm text-gray-600 dark:text-gray-300 truncate">
                                    {[it.subtitle, it.meta]
                                        .filter(Boolean)
                                        .join(" · ")}
                                </div>
                            )}
                        </div>
                    </div>
                </button>
            ))}
        </div>
    );
}

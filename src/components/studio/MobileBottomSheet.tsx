import { useRef, useState, useCallback, useEffect, type ReactNode } from 'react';

type SnapPoint = 'collapsed' | 'half' | 'full';

const SNAP_HEIGHTS: Record<SnapPoint, number> = {
    collapsed: 40,
    half: 0.4,  // 40% of viewport
    full: 0.85, // 85% of viewport
};

interface MobileBottomSheetProps {
    children: ReactNode;
    label?: string;
}

export default function MobileBottomSheet({ children, label = 'בנק חרוזים' }: MobileBottomSheetProps) {
    const [snap, setSnap] = useState<SnapPoint>('collapsed');
    const sheetRef = useRef<HTMLDivElement>(null);
    const startYRef = useRef(0);
    const startHeightRef = useRef(0);
    const isDragging = useRef(false);

    const getHeight = useCallback((s: SnapPoint) => {
        if (s === 'collapsed') return SNAP_HEIGHTS.collapsed;
        return window.innerHeight * (SNAP_HEIGHTS[s] as number);
    }, []);

    const [height, setHeight] = useState(SNAP_HEIGHTS.collapsed);

    useEffect(() => {
        setHeight(getHeight(snap));
    }, [snap, getHeight]);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        isDragging.current = true;
        startYRef.current = e.touches[0].clientY;
        startHeightRef.current = height;
    }, [height]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!isDragging.current) return;
        const deltaY = startYRef.current - e.touches[0].clientY;
        const newHeight = Math.max(SNAP_HEIGHTS.collapsed, Math.min(window.innerHeight * 0.9, startHeightRef.current + deltaY));
        setHeight(newHeight);
    }, []);

    const handleTouchEnd = useCallback(() => {
        isDragging.current = false;
        // Snap to nearest point
        const vh = window.innerHeight;
        const collapsedH = SNAP_HEIGHTS.collapsed;
        const halfH = vh * 0.4;
        const fullH = vh * 0.85;

        const distances = [
            { snap: 'collapsed' as SnapPoint, dist: Math.abs(height - collapsedH) },
            { snap: 'half' as SnapPoint, dist: Math.abs(height - halfH) },
            { snap: 'full' as SnapPoint, dist: Math.abs(height - fullH) },
        ];
        distances.sort((a, b) => a.dist - b.dist);
        setSnap(distances[0].snap);
    }, [height]);

    const handleHandleClick = useCallback(() => {
        if (snap === 'collapsed') setSnap('half');
        else if (snap === 'half') setSnap('full');
        else setSnap('collapsed');
    }, [snap]);

    const isOpen = snap !== 'collapsed';

    return (
        <div
            ref={sheetRef}
            className="fixed left-0 right-0 bottom-0 z-30 flex flex-col bg-[#181818] border-t border-white/10 rounded-t-2xl shadow-2xl transition-[height] duration-200"
            style={{
                height: `${height}px`,
                // No pointer-events-none when collapsed since handle needs to be interactive
                paddingBottom: 'env(safe-area-inset-bottom)',
            }}
        >
            {/* Handle */}
            <div
                className="flex flex-col items-center py-2 cursor-grab active:cursor-grabbing shrink-0 select-none"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onClick={handleHandleClick}
            >
                <div className="w-10 h-1 bg-white/20 rounded-full mb-1" />
                <span className="text-xs text-white/50 font-medium" dir="rtl">{label}</span>
            </div>

            {/* Content */}
            {isOpen && (
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {children}
                </div>
            )}
        </div>
    );
}

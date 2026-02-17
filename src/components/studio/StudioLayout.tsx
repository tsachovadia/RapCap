import type { ReactNode } from 'react';
import MobileBottomSheet from './MobileBottomSheet';

interface StudioLayoutProps {
    leftPanel: ReactNode;   // RhymePanel / word groups
    center: ReactNode;      // Mode-specific content (bars)
    rightPanel?: ReactNode; // Mode tools (desktop only)
    footer: ReactNode;      // RecordingFooter
}

export default function StudioLayout({ leftPanel, center, rightPanel, footer }: StudioLayoutProps) {
    return (
        <>
            {/* ─── Desktop (md+): 3-column ─── */}
            <div className="hidden md:flex flex-1 min-h-0 overflow-hidden">
                {/* Left panel — Rhyme Bank */}
                <div className="w-80 border-r border-white/10 overflow-y-auto custom-scrollbar shrink-0">
                    {leftPanel}
                </div>

                {/* Center — mode content */}
                <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
                    {center}
                </div>

                {/* Right panel — tools (if provided) */}
                {rightPanel && (
                    <div className="shrink-0">
                        {rightPanel}
                    </div>
                )}
            </div>

            {/* ─── Mobile (< md): single column + bottom sheet ─── */}
            <div className="flex md:hidden flex-1 min-h-0 flex-col overflow-hidden">
                {/* Center content — takes available space above bottom sheet */}
                <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                    {center}
                </div>
            </div>

            {/* Mobile bottom sheet (rhyme bank) — only rendered on mobile */}
            <div className="md:hidden">
                <MobileBottomSheet>
                    {leftPanel}
                </MobileBottomSheet>
            </div>

            {/* Footer — always at bottom, above bottom sheet on mobile */}
            {footer}
        </>
    );
}

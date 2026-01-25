/**
 * App Layout
 * Wraps pages with BottomNav and DualPlayerBar
 */

import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';
import DualPlayerBar from './DualPlayerBar';
import SyncModal from './SyncModal';

export default function AppLayout() {
    const [showSyncModal, setShowSyncModal] = useState(false);

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-gray-100 pb-[120px]" dir="rtl">
            {/* Main Content */}
            <main className="min-h-screen">
                <Outlet />
            </main>

            {/* Fixed Elements */}
            <DualPlayerBar onSyncClick={() => setShowSyncModal(true)} />
            <BottomNav />

            {/* Modals */}
            {showSyncModal && (
                <SyncModal onClose={() => setShowSyncModal(false)} />
            )}
        </div>
    );
}

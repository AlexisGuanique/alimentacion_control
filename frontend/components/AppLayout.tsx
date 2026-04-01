"use client";

import Sidebar from "./Sidebar";

interface AppLayoutProps {
  children: React.ReactNode;
  userName?: string;
  userEmail?: string;
  onLogout: () => void;
}

export default function AppLayout({ children, userName, userEmail, onLogout }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar userName={userName} userEmail={userEmail} onLogout={onLogout} />
      {/* Desktop: offset for sidebar. Mobile: offset for top bar */}
      <main className="lg:ml-60 pt-14 lg:pt-0 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}

"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Apple, Dumbbell, Settings, LogOut,
  Leaf, Menu, X, ChevronRight,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Nutrición", href: "/nutrition", icon: Apple },
  { label: "Ejercicios", href: "/workouts", icon: Dumbbell },
  { label: "Configuración", href: "/settings", icon: Settings },
];

interface SidebarProps {
  userName?: string;
  userEmail?: string;
  onLogout: () => void;
}

export default function Sidebar({ userName, userEmail, onLogout }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => pathname === href;

  const NavLink = ({ item }: { item: typeof NAV_ITEMS[0] }) => {
    const active = isActive(item.href);
    return (
      <button
        onClick={() => { router.push(item.href); setMobileOpen(false); }}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
          active
            ? "bg-primary text-white shadow-sm"
            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        }`}
      >
        <item.icon className="w-5 h-5 flex-shrink-0" />
        <span>{item.label}</span>
        {active && <ChevronRight className="w-4 h-4 ml-auto opacity-60" />}
      </button>
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-gray-100">
        <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
          <Leaf className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900 leading-tight">NutriTrack IA</p>
          <p className="text-xs text-gray-400 leading-tight">Fitness & Nutrición</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.href + item.label} item={item} />
        ))}
      </nav>

      {/* User + Logout */}
      <div className="p-3 border-t border-gray-100 space-y-1">
        {userName && (
          <div className="px-3 py-2 mb-1">
            <p className="text-sm font-semibold text-gray-900 truncate">{userName}</p>
            <p className="text-xs text-gray-400 truncate">{userEmail}</p>
          </div>
        )}
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-60 bg-white border-r border-gray-100 z-40">
        <SidebarContent />
      </aside>

      {/* Mobile Top Bar */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-100 z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Leaf className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-sm">NutriTrack IA</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-xl hover:bg-gray-100 transition-all"
        >
          <Menu className="w-5 h-5 text-gray-600" />
        </button>
      </header>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`lg:hidden fixed top-0 left-0 h-full w-72 bg-white z-50 shadow-2xl transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100 transition-all"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
        <SidebarContent />
      </aside>
    </>
  );
}

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(iso: string): string {
  // Forzar interpretación UTC si el string no trae zona horaria
  const normalized = iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z";
  return new Date(normalized).toLocaleString("es-AR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
}

export const CATEGORY_COLORS: Record<string, string> = {
  Proteína: "bg-blue-100 text-blue-700",
  Carbohidrato: "bg-amber-100 text-amber-700",
  Grasa: "bg-orange-100 text-orange-700",
  Verdura: "bg-green-100 text-green-700",
  Fruta: "bg-pink-100 text-pink-700",
  Lácteo: "bg-purple-100 text-purple-700",
  Bebida: "bg-cyan-100 text-cyan-700",
  Snack: "bg-red-100 text-red-700",
  Otro: "bg-gray-100 text-gray-700",
};

export const SOURCE_ICONS: Record<string, string> = {
  Manual: "✏️",
  Chatbot: "🤖",
};

export const DAILY_GOAL = 2000;

"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import DateNav from "./DateNav";

export type PeriodMode = "day" | "week" | "month";

interface PeriodNavProps {
  mode: PeriodMode;
  onModeChange: (mode: PeriodMode) => void;
  // Día
  date: string;
  onDateChange: (date: string) => void;
  // Semana — se representa por la fecha del lunes (YYYY-MM-DD)
  week: string;
  onWeekChange: (week: string) => void;
  // Mes — "YYYY-MM"
  month: string;
  onMonthChange: (month: string) => void;
}

const MONTH_NAMES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

// ── Utilidades semana ─────────────────────────────────────────────────────────

/** Devuelve el lunes de la semana que contiene `anyDate` */
export function getMondayOf(anyDate: string): string {
  const d = new Date(anyDate + "T12:00:00");
  const day = d.getDay(); // 0=Dom, 1=Lun…
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

/** Lunes + 6 días = domingo */
export function getSundayOf(monday: string): string {
  const d = new Date(monday + "T12:00:00");
  d.setDate(d.getDate() + 6);
  return d.toISOString().split("T")[0];
}

function addDays(date: string, n: number): string {
  const d = new Date(date + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

function weekLabel(monday: string): string {
  const start = new Date(monday + "T12:00:00");
  const end = new Date(monday + "T12:00:00");
  end.setDate(end.getDate() + 6);
  const sDay = start.getDate();
  const sMon = MONTH_NAMES[start.getMonth()];
  const eDay = end.getDate();
  const eMon = MONTH_NAMES[end.getMonth()];
  const eYear = end.getFullYear();
  const sameMon = start.getMonth() === end.getMonth();
  return sameMon
    ? `${sDay} – ${eDay} ${sMon} ${eYear}`
    : `${sDay} ${sMon} – ${eDay} ${eMon} ${eYear}`;
}

function isFutureWeek(monday: string): boolean {
  const todayMonday = getMondayOf(new Date().toISOString().split("T")[0]);
  return monday >= todayMonday;
}

// ── Utilidades mes ────────────────────────────────────────────────────────────

function parseMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return { year: y, month: m };
}
function formatMonth(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}
function prevMonthStr(ym: string) {
  const { year, month } = parseMonth(ym);
  return month === 1 ? formatMonth(year - 1, 12) : formatMonth(year, month - 1);
}
function nextMonthStr(ym: string) {
  const { year, month } = parseMonth(ym);
  return month === 12 ? formatMonth(year + 1, 1) : formatMonth(year, month + 1);
}
function isCurrentOrFutureMonth(ym: string) {
  const now = new Date();
  return ym >= formatMonth(now.getFullYear(), now.getMonth() + 1);
}

// ─────────────────────────────────────────────────────────────────────────────

export default function PeriodNav({
  mode, onModeChange,
  date, onDateChange,
  week, onWeekChange,
  month, onMonthChange,
}: PeriodNavProps) {
  const { year, month: m } = parseMonth(month);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Toggle Día / Semana / Mes */}
      <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5">
        {(["day", "week", "month"] as PeriodMode[]).map((pm) => {
          const label = pm === "day" ? "Día" : pm === "week" ? "Semana" : "Mes";
          return (
            <button
              key={pm}
              onClick={() => onModeChange(pm)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                mode === pm
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Navegador según modo */}
      {mode === "day" && (
        <DateNav date={date} onChange={onDateChange} />
      )}

      {mode === "week" && (
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-2 py-1.5 shadow-sm">
          <button
            onClick={() => onWeekChange(addDays(week, -7))}
            className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-gray-700 px-2 min-w-[160px] text-center">
            {weekLabel(week)}
          </span>
          <button
            onClick={() => !isFutureWeek(week) && onWeekChange(addDays(week, 7))}
            disabled={isFutureWeek(week)}
            className={`p-1 rounded-lg transition-all ${
              isFutureWeek(week)
                ? "text-gray-200 cursor-not-allowed"
                : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {mode === "month" && (
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-2 py-1.5 shadow-sm">
          <button
            onClick={() => onMonthChange(prevMonthStr(month))}
            className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-gray-700 px-2 min-w-[130px] text-center">
            {["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"][m - 1]} {year}
          </span>
          <button
            onClick={() => !isCurrentOrFutureMonth(month) && onMonthChange(nextMonthStr(month))}
            disabled={isCurrentOrFutureMonth(month)}
            className={`p-1 rounded-lg transition-all ${
              isCurrentOrFutureMonth(month)
                ? "text-gray-200 cursor-not-allowed"
                : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

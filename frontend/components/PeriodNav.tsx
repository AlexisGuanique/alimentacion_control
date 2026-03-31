"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import DateNav from "./DateNav";

export type PeriodMode = "day" | "month";

interface PeriodNavProps {
  mode: PeriodMode;
  onModeChange: (mode: PeriodMode) => void;
  /** ISO date string for day mode: "2026-03-28" */
  date: string;
  onDateChange: (date: string) => void;
  /** "YYYY-MM" for month mode */
  month: string;
  onMonthChange: (month: string) => void;
}

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function parseMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return { year: y, month: m };
}

function formatMonth(year: number, month: number) {
  return `${String(year)}-${String(month).padStart(2, "0")}`;
}

function prevMonth(ym: string) {
  const { year, month } = parseMonth(ym);
  return month === 1 ? formatMonth(year - 1, 12) : formatMonth(year, month - 1);
}

function nextMonth(ym: string) {
  const { year, month } = parseMonth(ym);
  return month === 12 ? formatMonth(year + 1, 1) : formatMonth(year, month + 1);
}

function isCurrentOrFuture(ym: string) {
  const now = new Date();
  const current = formatMonth(now.getFullYear(), now.getMonth() + 1);
  return ym >= current;
}

export default function PeriodNav({
  mode, onModeChange, date, onDateChange, month, onMonthChange,
}: PeriodNavProps) {
  const { year, month: m } = parseMonth(month);
  const canGoNext = !isCurrentOrFuture(month);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Toggle Día / Mes */}
      <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5">
        <button
          onClick={() => onModeChange("day")}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
            mode === "day"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Día
        </button>
        <button
          onClick={() => onModeChange("month")}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
            mode === "month"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Mes
        </button>
      </div>

      {/* Navegador según el modo */}
      {mode === "day" ? (
        <DateNav date={date} onChange={onDateChange} />
      ) : (
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-2 py-1.5 shadow-sm">
          <button
            onClick={() => onMonthChange(prevMonth(month))}
            className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-gray-700 px-2 min-w-[130px] text-center">
            {MONTH_NAMES[m - 1]} {year}
          </span>
          <button
            onClick={() => canGoNext && onMonthChange(nextMonth(month))}
            disabled={!canGoNext}
            className={`p-1 rounded-lg transition-all ${
              canGoNext
                ? "text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                : "text-gray-200 cursor-not-allowed"
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

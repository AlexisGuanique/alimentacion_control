"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

interface Props {
  date: string;       // "YYYY-MM-DD"
  onChange: (date: string) => void;
}

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const DAYS_SHORT = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"];

function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDate(str: string): Date {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(dateStr: string, days: number): string {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + days);
  return toLocalDateStr(d);
}

function formatLabel(dateStr: string, todayStr: string): string {
  if (dateStr === todayStr) return "Hoy";
  if (dateStr === addDays(todayStr, -1)) return "Ayer";
  const d = parseDate(dateStr);
  return d.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
}

function getCalendarDays(year: number, month: number): (string | null)[] {
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  // Convert to Monday-first: Sun(0) → 6, Mon(1) → 0 ...
  const startOffset = (firstDay + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (string | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(toLocalDateStr(new Date(year, month, d)));
  }
  // pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function DateNav({ date, onChange }: Props) {
  const today = toLocalDateStr(new Date());
  const isToday = date === today;

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => parseDate(date).getFullYear());
  const [viewMonth, setViewMonth] = useState(() => parseDate(date).getMonth());
  const ref = useRef<HTMLDivElement>(null);

  // Sync view when date changes externally
  useEffect(() => {
    const d = parseDate(date);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }, [date]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const cells = getCalendarDays(viewYear, viewMonth);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
    const nextMon = viewMonth === 11 ? 0 : viewMonth + 1;
    // Don't navigate past today's month
    const todayD = parseDate(today);
    if (nextYear > todayD.getFullYear() || (nextYear === todayD.getFullYear() && nextMon > todayD.getMonth())) return;
    setViewYear(nextYear);
    setViewMonth(nextMon);
  };

  const todayD = parseDate(today);
  const isNextDisabled = viewYear > todayD.getFullYear() ||
    (viewYear === todayD.getFullYear() && viewMonth >= todayD.getMonth());

  return (
    <div className="relative" ref={ref}>
      {/* Trigger row */}
      <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
        <button
          onClick={() => onChange(addDays(date, -1))}
          className="p-1 rounded-lg hover:bg-gray-100 transition-all text-gray-500 hover:text-gray-800"
          aria-label="Día anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg hover:bg-gray-100 transition-all"
        >
          <CalendarDays className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-800 capitalize whitespace-nowrap select-none">
            {formatLabel(date, today)}
          </span>
        </button>

        <button
          onClick={() => !isToday && onChange(addDays(date, 1))}
          disabled={isToday}
          className="p-1 rounded-lg hover:bg-gray-100 transition-all text-gray-500 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Día siguiente"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {!isToday && (
          <button
            onClick={() => onChange(today)}
            className="ml-1 text-xs px-2 py-1 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-all font-medium"
          >
            Hoy
          </button>
        )}
      </div>

      {/* Calendar popover */}
      {open && (
        <div className="absolute top-full mt-2 z-50 bg-white border border-gray-200 rounded-2xl shadow-xl p-4 select-none
          left-0 w-[min(18rem,calc(100vw-2rem))]
          sm:left-1/2 sm:-translate-x-1/2 sm:w-72">
          {/* Month header */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-xl hover:bg-gray-100 transition-all text-gray-500 hover:text-gray-800"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-gray-800 capitalize">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button
              onClick={nextMonth}
              disabled={isNextDisabled}
              className="p-1.5 rounded-xl hover:bg-gray-100 transition-all text-gray-500 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS_SHORT.map(d => (
              <div key={d} className="text-center text-[11px] font-medium text-gray-400 py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-y-1">
            {cells.map((cell, i) => {
              if (!cell) return <div key={`empty-${i}`} />;

              const isSelected = cell === date;
              const isTodayCell = cell === today;
              const isFuture = cell > today;

              return (
                <button
                  key={cell}
                  disabled={isFuture}
                  onClick={() => { onChange(cell); setOpen(false); }}
                  className={`
                    w-8 h-8 mx-auto rounded-xl text-xs font-medium transition-all
                    ${isSelected
                      ? "bg-primary text-white shadow-sm"
                      : isTodayCell
                        ? "bg-primary/10 text-primary font-semibold"
                        : isFuture
                          ? "text-gray-300 cursor-not-allowed"
                          : "text-gray-700 hover:bg-gray-100"
                    }
                  `}
                >
                  {parseDate(cell).getDate()}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="mt-3 pt-3 border-t border-gray-100 flex justify-center">
            <button
              onClick={() => { onChange(today); setOpen(false); }}
              className="text-xs font-medium text-primary hover:text-primary/80 transition-all"
            >
              Ir a hoy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

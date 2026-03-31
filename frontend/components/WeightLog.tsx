"use client";

import { useState, useEffect, useCallback } from "react";
import { Scale, Plus, Trash2, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { getWeightHistory, logWeight, deleteWeightEntry, WeightEntry } from "@/lib/api";

export default function WeightLog() {
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const [notesInput, setNotesInput] = useState("");
  const [dateInput, setDateInput] = useState(new Date().toISOString().split("T")[0]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await getWeightHistory(12);
      setEntries(data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const kg = parseFloat(weightInput);
    if (isNaN(kg) || kg <= 0 || kg > 500) {
      setError("Ingresá un peso válido (ej: 72.5)");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await logWeight({ weight_kg: kg, notes: notesInput || undefined, recorded_at: dateInput });
      setWeightInput("");
      setNotesInput("");
      setDateInput(new Date().toISOString().split("T")[0]);
      setShowForm(false);
      await load();
    } catch {
      setError("Error al guardar. Intentá de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteWeightEntry(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch { /* ignore */ }
  }

  // Tendencia respecto al registro anterior
  function trend(idx: number) {
    if (idx === 0) return null;
    const diff = entries[idx].weight_kg - entries[idx - 1].weight_kg;
    return diff;
  }

  const lastEntry = entries.at(-1);
  const firstEntry = entries[0];
  const totalChange = lastEntry && firstEntry && entries.length > 1
    ? lastEntry.weight_kg - firstEntry.weight_kg
    : null;

  return (
    <div className="space-y-5">
      {/* Header + botón */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-gray-800">Seguimiento de peso</h3>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-primary text-white rounded-xl hover:bg-primary/90 transition-all"
        >
          <Plus className="w-4 h-4" />
          Registrar
        </button>
      </div>

      {/* Resumen de progreso */}
      {totalChange !== null && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-400 mb-1">Peso inicial</p>
            <p className="text-lg font-bold text-gray-800">{firstEntry!.weight_kg} kg</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-400 mb-1">Peso actual</p>
            <p className="text-lg font-bold text-gray-800">{lastEntry!.weight_kg} kg</p>
          </div>
          <div className={`rounded-xl p-3 text-center ${totalChange < 0 ? "bg-green-50" : totalChange > 0 ? "bg-red-50" : "bg-gray-50"}`}>
            <p className="text-xs text-gray-400 mb-1">Cambio total</p>
            <p className={`text-lg font-bold flex items-center justify-center gap-1 ${totalChange < 0 ? "text-green-600" : totalChange > 0 ? "text-red-500" : "text-gray-600"}`}>
              {totalChange < 0 ? <TrendingDown className="w-4 h-4" /> : totalChange > 0 ? <TrendingUp className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
              {totalChange > 0 ? "+" : ""}{totalChange.toFixed(1)} kg
            </p>
          </div>
        </div>
      )}

      {/* Formulario */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-primary/5 border border-primary/20 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-700">Nuevo registro de peso</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Peso (kg)</label>
              <input
                type="number"
                step="0.1"
                min="20"
                max="500"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                placeholder="72.5"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Fecha</label>
              <input
                type="date"
                value={dateInput}
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) => setDateInput(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nota (opcional)</label>
            <input
              type="text"
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              placeholder="Ej: después del desayuno, en ayunas..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setShowForm(false); setError(""); }}
              className="flex-1 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 text-sm font-medium bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-all"
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      )}

      {/* Historial */}
      {loading ? (
        <p className="text-sm text-gray-400 text-center py-4">Cargando historial...</p>
      ) : entries.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <Scale className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Aún no hay registros de peso.</p>
          <p className="text-xs mt-1">Hacé clic en "Registrar" para comenzar tu seguimiento.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {[...entries].reverse().map((entry, revIdx) => {
            const origIdx = entries.length - 1 - revIdx;
            const t = trend(origIdx);
            return (
              <div key={entry.id} className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-4 py-2.5 hover:shadow-sm transition-all">
                <div className="flex items-center gap-3">
                  <div className="text-center min-w-[2.5rem]">
                    <p className="text-lg font-bold text-gray-900 leading-none">{entry.weight_kg}</p>
                    <p className="text-[10px] text-gray-400">kg</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600">
                      {new Date(entry.recorded_at + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                    {entry.notes && <p className="text-[11px] text-gray-400">{entry.notes}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {t !== null && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${t < 0 ? "bg-green-50 text-green-600" : t > 0 ? "bg-red-50 text-red-500" : "bg-gray-50 text-gray-400"}`}>
                      {t > 0 ? "+" : ""}{t.toFixed(1)}
                    </span>
                  )}
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

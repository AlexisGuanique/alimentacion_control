"use client";

import { useEffect, useState, useRef } from "react";

interface Props {
  type: "routine" | "mealplan";
}

const ROUTINE_MESSAGES = [
  "Analizando tu perfil y objetivos...",
  "Seleccionando ejercicios óptimos...",
  "Calculando series, repeticiones e intensidad...",
  "Diseñando la progresión semanal...",
  "Ajustando tiempos de descanso...",
  "Balanceando grupos musculares...",
  "Añadiendo consejos de nutrición...",
  "Finalizando tu rutina personalizada...",
];

const MEALPLAN_MESSAGES = [
  "Analizando tus objetivos nutricionales...",
  "Seleccionando alimentos de calidad...",
  "Calculando macronutrientes y calorías...",
  "Diseñando el plan día a día...",
  "Balanceando proteínas, carbohidratos y grasas...",
  "Preparando la lista de compras...",
  "Añadiendo consejos de preparación...",
  "Finalizando tu plan de alimentación...",
];

export default function AILoadingContent({ type }: Props) {
  const messages = type === "routine" ? ROUTINE_MESSAGES : MEALPLAN_MESSAGES;
  const [msgIndex, setMsgIndex] = useState(0);
  const [fade, setFade] = useState(true);

  const isRoutine = type === "routine";
  const gradientFrom = isRoutine ? "from-blue-600" : "from-green-600";
  const gradientTo   = isRoutine ? "to-purple-600" : "to-emerald-600";
  const ringColor    = isRoutine ? "border-blue-500" : "border-green-500";
  const ringLight    = isRoutine ? "border-blue-300/40" : "border-green-300/40";
  const dotA         = isRoutine ? "bg-blue-500" : "bg-green-500";
  const dotB         = isRoutine ? "bg-purple-500" : "bg-emerald-500";
  const titleGrad    = isRoutine ? "from-blue-600 to-purple-600" : "from-green-600 to-emerald-600";

  useEffect(() => {
    const iv = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setMsgIndex((i) => (i + 1) % messages.length);
        setFade(true);
      }, 300);
    }, 2400);
    return () => clearInterval(iv);
  }, [messages.length]);

  return (
    <div className="flex flex-col items-center justify-center py-10 px-6 gap-6">
      {/* Anillos orbitales */}
      <div className="relative w-28 h-28 flex items-center justify-center">
        {/* Anillo exterior lento */}
        <div
          className={`absolute inset-0 rounded-full border-2 ${ringLight} animate-spin`}
          style={{ animationDuration: "3s" }}
        />
        {/* Anillo medio inverso */}
        <div
          className={`absolute inset-3 rounded-full border-2 ${ringColor} border-dashed animate-spin`}
          style={{ animationDuration: "2s", animationDirection: "reverse" }}
        />

        {/* Dot orbitando exterior */}
        <div className="absolute w-full h-full animate-spin" style={{ animationDuration: "3s" }}>
          <div className={`absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full ${dotA} shadow-lg`} />
        </div>
        {/* Dot orbitando interior */}
        <div className="absolute inset-3 animate-spin" style={{ animationDuration: "2s", animationDirection: "reverse" }}>
          <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full ${dotB} shadow-md`} />
        </div>

        {/* Icono central */}
        <div
          className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${gradientFrom} ${gradientTo} flex items-center justify-center shadow-lg animate-pulse`}
          style={{ animationDuration: "1.5s" }}
        >
          <span className="text-3xl">{isRoutine ? "🤖" : "🥗"}</span>
        </div>
      </div>

      {/* Título */}
      <div className="text-center">
        <h3 className={`text-xl font-bold bg-gradient-to-r ${titleGrad} bg-clip-text text-transparent`}>
          {isRoutine ? "Creando tu rutina" : "Creando tu plan"}
        </h3>
        <p className="text-gray-400 text-xs mt-0.5">con Inteligencia Artificial</p>
      </div>

      {/* Mensaje rotativo */}
      <div className="h-10 flex items-center justify-center w-full">
        <p
          className={`text-sm text-gray-500 text-center transition-opacity duration-300 px-2 ${
            fade ? "opacity-100" : "opacity-0"
          }`}
        >
          {messages[msgIndex]}
        </p>
      </div>

      {/* Barra de progreso indeterminada */}
      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${gradientFrom} ${gradientTo} rounded-full`}
          style={{
            animation: "progressSlide 1.8s ease-in-out infinite",
            width: "45%",
          }}
        />
      </div>

      {/* Tres puntos rebotando */}
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full ${dotA} animate-bounce`}
            style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.8s" }}
          />
        ))}
      </div>

      <p className="text-xs text-gray-300 text-center -mt-2">
        Esto puede tomar unos segundos…
      </p>
    </div>
  );
}

// ── Animación de éxito ────────────────────────────────────────────────────────

interface SuccessProps {
  type: "routine" | "mealplan";
  onDone: () => void;
}

export function AISuccessContent({ type, onDone }: SuccessProps) {
  const isRoutine = type === "routine";
  const [scale, setScale] = useState(0);
  const [showRings, setShowRings] = useState(false);
  const [showText, setShowText] = useState(false);
  const called = useRef(false);

  const gradientFrom = isRoutine ? "from-blue-500" : "from-green-500";
  const gradientTo   = isRoutine ? "to-purple-600" : "to-emerald-600";
  const ringA        = isRoutine ? "border-blue-400/50" : "border-green-400/50";
  const ringB        = isRoutine ? "border-purple-400/30" : "border-emerald-400/30";
  const textGrad     = isRoutine ? "from-blue-600 to-purple-600" : "from-green-600 to-emerald-600";
  const label        = isRoutine ? "¡Rutina creada!" : "¡Plan creado!";
  const sublabel     = isRoutine
    ? "Tu rutina personalizada está lista"
    : "Tu plan de alimentación está listo";

  useEffect(() => {
    // Secuencia de animación de entrada
    const t1 = setTimeout(() => setScale(1), 50);
    const t2 = setTimeout(() => setShowRings(true), 300);
    const t3 = setTimeout(() => setShowText(true), 500);
    // Cierre automático
    const t4 = setTimeout(() => {
      if (!called.current) { called.current = true; onDone(); }
    }, 2600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onDone]);

  return (
    <div className="flex flex-col items-center justify-center py-10 px-6 gap-5">

      {/* Ícono con pulso de entrada */}
      <div className="relative flex items-center justify-center w-32 h-32">
        {/* Anillos expansivos */}
        {showRings && (
          <>
            <div className={`absolute inset-0 rounded-full border-2 ${ringA} animate-ping`}
              style={{ animationDuration: "1.2s" }} />
            <div className={`absolute inset-4 rounded-full border-2 ${ringB} animate-ping`}
              style={{ animationDuration: "1.2s", animationDelay: "0.2s" }} />
          </>
        )}

        {/* Círculo con checkmark */}
        <div
          className={`w-20 h-20 rounded-full bg-gradient-to-br ${gradientFrom} ${gradientTo} flex items-center justify-center shadow-xl transition-all duration-500`}
          style={{ transform: `scale(${scale})` }}
        >
          {/* Checkmark SVG animado */}
          <svg
            viewBox="0 0 52 52"
            className="w-10 h-10"
            style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))" }}
          >
            <polyline
              points="14,27 22,35 38,19"
              fill="none"
              stroke="white"
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                strokeDasharray: 40,
                strokeDashoffset: scale === 1 ? 0 : 40,
                transition: "stroke-dashoffset 0.45s ease 0.2s",
              }}
            />
          </svg>
        </div>
      </div>

      {/* Texto con fade-in */}
      <div
        className={`text-center transition-all duration-500 ${
          showText ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        }`}
      >
        <h3 className={`text-2xl font-bold bg-gradient-to-r ${textGrad} bg-clip-text text-transparent`}>
          {label}
        </h3>
        <p className="text-gray-400 text-sm mt-1">{sublabel}</p>
      </div>

      {/* Partículas decorativas */}
      {showRings && (
        <div className="flex items-center gap-2">
          {["✨", "🎉", "✨"].map((e, i) => (
            <span
              key={i}
              className="text-lg animate-bounce"
              style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.9s" }}
            >
              {e}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

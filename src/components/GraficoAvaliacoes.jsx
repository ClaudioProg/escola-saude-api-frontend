// 📁 src/components/GraficoAvaliacoes.jsx
import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

/* ----------------------------- Helpers ----------------------------- */
function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function normKey(s) {
  if (s === 0) return "0";
  if (!s && s !== 0) return "";
  return s
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
function mapLabelToKey(label) {
  const k = normKey(label);

  // aceita letras, palavras e números (string/number)
  if (["otimo", "excelente", "muito bom", "5", "a"].includes(k)) return "otimo";
  if (["bom", "4", "b"].includes(k)) return "bom";
  if (["regular", "mediano", "3", "c"].includes(k)) return "regular";
  if (["ruim", "2", "d"].includes(k)) return "ruim";
  if (["pessimo", "1", "e"].includes(k)) return "pessimo";

  // tenta mapear números puros (ex.: 5, 4, 3…)
  const asNum = Number(k);
  if (asNum === 5) return "otimo";
  if (asNum === 4) return "bom";
  if (asNum === 3) return "regular";
  if (asNum === 2) return "ruim";
  if (asNum === 1) return "pessimo";

  return null;
}

/** Normaliza entradas variadas para { otimo, bom, regular, ruim, pessimo } */
export function normalizeAvaliacoes(input) {
  const base = { otimo: 0, bom: 0, regular: 0, ruim: 0, pessimo: 0 };
  if (!input) return base;

  if (Array.isArray(input)) {
    const acc = { ...base };
    for (const item of input) {
      const label =
        item?.label ??
        item?.categoria ??
        item?.tipo ??
        item?.nome ??
        item?.classificacao ??
        item?.nivel;
      const key = mapLabelToKey(label);
      const valor =
        item?.valor ??
        item?.qtd ??
        item?.quantidade ??
        item?.count ??
        item?.total ??
        item?.numero ??
        0;
      if (key) acc[key] += toNumber(valor);
    }
    return acc;
  }

  // objeto plano -> pega o MAIOR valor entre aliases
  const out = { ...base };
  const keys = Object.keys(input || {});
  const pickAliasMax = (aliases) => {
    let best = 0;
    for (const a of aliases) {
      if (a in input) {
        best = Math.max(best, toNumber(input[a]));
      } else {
        const m = keys.find((kk) => normKey(kk) === normKey(a));
        if (m) best = Math.max(best, toNumber(input[m]));
      }
    }
    return best;
  };
  out.otimo   = pickAliasMax(["otimo", "ótimo", "excelente", "Excelente", "5", "A"]);
  out.bom     = pickAliasMax(["bom", "Bom", "4", "B"]);
  out.regular = pickAliasMax(["regular", "Regular", "mediano", "Mediano", "3", "C"]);
  out.ruim    = pickAliasMax(["ruim", "Ruim", "2", "D"]);
  out.pessimo = pickAliasMax(["pessimo", "péssimo", "Pessimo", "Péssimo", "1", "E"]);
  return out;
}

/* ------------------------- Componente principal ------------------------- */
export default function GraficoAvaliacoes({
  dados = {},
  height = 260,               // altura mínima do canvas (px)
  className = "",
  palette,                    // opcional: sobrescrever cores
  showLegend = true,
}) {
  const norm = useMemo(() => normalizeAvaliacoes(dados), [dados]);
  const total = norm.otimo + norm.bom + norm.regular + norm.ruim + norm.pessimo;

  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(!!mq.matches);
    const onChange = (e) => setReduceMotion(!!e.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  if (!total) {
    return (
      <p className="text-sm text-gray-600 dark:text-gray-300 italic text-center">
        (Sem dados de avaliação)
      </p>
    );
  }

  // Paleta padrão (boa em light/dark e com contraste):
  const colors = useMemo(
    () =>
      palette ?? [
        "#065f46", // emerald-800 (Ótimo)
        "#b45309", // amber-700   (Bom)
        "#1e3a8a", // blue-900    (Regular)
        "#b91c1c", // red-700     (Ruim)
        "#6d28d9", // violet-700  (Péssimo)
      ],
    [palette]
  );

  const data = useMemo(
    () => ({
      labels: ["Ótimo", "Bom", "Regular", "Ruim", "Péssimo"],
      datasets: [
        {
          label: "Distribuição de Avaliações",
          data: [norm.otimo, norm.bom, norm.regular, norm.ruim, norm.pessimo],
          backgroundColor: colors,
          borderColor: "#ffffff", // borda branca p/ contraste
          borderWidth: 2,
          hoverOffset: reduceMotion ? 0 : 8,
        },
      ],
    }),
    [norm, colors, reduceMotion]
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: reduceMotion ? false : { duration: 600 },
      plugins: {
        legend: { display: showLegend, position: "bottom" },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const sum = (ctx.dataset.data || []).reduce((a, b) => a + b, 0);
              const value = Number(ctx.raw) || 0;
              const percent = sum ? ((value / sum) * 100).toFixed(1) : "0.0";
              return `${ctx.label}: ${value} (${percent}%)`;
            },
          },
        },
        title: { display: false },
      },
    }),
    [reduceMotion, showLegend]
  );

  return (
    <div
      className={`relative w-full ${className}`}
      style={{ minHeight: height }}
      role="img"
      aria-label={`Gráfico de pizza com a distribuição de ${total} avaliações: ótimo, bom, regular, ruim e péssimo.`}
    >
      <Pie data={data} options={options} />
    </div>
  );
}

GraficoAvaliacoes.propTypes = {
  dados: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  height: PropTypes.number,
  className: PropTypes.string,
  palette: PropTypes.arrayOf(PropTypes.string),
  showLegend: PropTypes.bool,
};

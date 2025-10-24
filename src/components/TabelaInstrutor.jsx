// 📁 src/components/TabelaInstrutor.jsx
import PropTypes from "prop-types";
import { Eye, CheckCircle2, XCircle, Star } from "lucide-react";

/* =========================================================================
   🔐 Tipo compartilhado para instrutor (reutilizado em ambos componentes)
   ========================================================================= */
const InstrutorType = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  nome: PropTypes.string,
  email: PropTypes.string,
  eventosMinistrados: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  media_avaliacao: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  possuiAssinatura: PropTypes.bool,
});

/**
 * TabelaInstrutor (grid de cards)
 * Props compatíveis:
 * - instrutor?: array (lista)
 * - loading?: boolean (skeleton)
 * - className?: string
 * - onVisualizar?: (instrutorMin) => void
 */
export default function TabelaInstrutor({
  instrutor = [],
  onVisualizar = () => {},
  className = "",
  loading = false,
}) {
  if (loading) {
    return (
      <ul
        className={`grid gap-4 sm:grid-cols-2 max-w-4xl mx-auto ${className}`}
        role="status"
        aria-busy="true"
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <li
            key={i}
            className="p-4 rounded-2xl shadow bg-white dark:bg-gray-800 animate-pulse"
          >
            <div className="h-5 w-40 bg-gray-200 dark:bg-zinc-700 rounded mb-2" />
            <div className="h-4 w-56 bg-gray-200 dark:bg-zinc-700 rounded mb-4" />
            <div className="space-y-2">
              <div className="h-3 w-32 bg-gray-200 dark:bg-zinc-700 rounded" />
              <div className="h-3 w-40 bg-gray-200 dark:bg-zinc-700 rounded" />
              <div className="h-3 w-44 bg-gray-200 dark:bg-zinc-700 rounded" />
            </div>
            <div className="mt-4 h-9 w-28 bg-gray-200 dark:bg-zinc-700 rounded" />
          </li>
        ))}
      </ul>
    );
  }

  if (!Array.isArray(instrutor) || instrutor.length === 0) {
    return (
      <p
        className="text-center text-gray-600 dark:text-gray-300 py-4"
        aria-live="polite"
      >
        Nenhum instrutor encontrado.
      </p>
    );
  }

  return (
    <ul
      className={`grid gap-4 sm:grid-cols-2 max-w-4xl mx-auto ${className}`}
      role="list"
      aria-label="Lista de instrutores"
    >
      {instrutor.map((item, idx) => (
        <li key={item.id ?? `${item.email ?? "sem-email"}-${idx}`}>
          <InstrutorCard data={item} onVisualizar={onVisualizar} />
        </li>
      ))}
    </ul>
  );
}

function StarRow({ value }) {
  const num = Number.isFinite(Number(value))
    ? Math.max(0, Math.min(5, Number(value)))
    : null;

  if (num == null)
    return (
      <span className="text-sm text-gray-500 dark:text-gray-400">— / 5</span>
    );

  const filled = Math.round(num);
  return (
    <span className="inline-flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={16}
          className={
            i < filled
              ? "text-yellow-500 fill-yellow-500"
              : "text-gray-300 dark:text-gray-500"
          }
          aria-hidden="true"
        />
      ))}
      <span className="text-sm text-gray-600 dark:text-gray-300">
        {num.toFixed(1)} / 5
      </span>
    </span>
  );
}
StarRow.propTypes = {
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
};

function BadgeAssinatura({ ok }) {
  return ok ? (
    <span className="shrink-0 inline-flex items-center gap-1 rounded-full border border-green-300 bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:border-green-600 dark:bg-green-600/30 dark:text-green-300">
      <CheckCircle2 size={14} /> Assinado
    </span>
  ) : (
    <span className="shrink-0 inline-flex items-center gap-1 rounded-full border border-red-300 bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:border-red-700 dark:bg-red-700/30 dark:text-red-300">
      <XCircle size={14} /> Sem assinatura
    </span>
  );
}
BadgeAssinatura.propTypes = {
  ok: PropTypes.bool,
};

function InstrutorCard({ data, onVisualizar }) {
  const {
    id,
    nome = "—",
    email = "—",
    eventosMinistrados,
    media_avaliacao,
    possuiAssinatura,
  } = data || {};

  const eventosNum =
    typeof eventosMinistrados === "number"
      ? eventosMinistrados
      : Number.isFinite(Number(eventosMinistrados))
      ? Number(eventosMinistrados)
      : 0;

  const handleVisualizar = () => {
    if (!id) return;
    onVisualizar({ id, nome, email });
  };

  return (
    <article
      className="outline-none rounded-2xl bg-white p-4 text-left shadow transition hover:shadow-md focus-within:shadow-md dark:bg-gray-800"
      aria-label={`Instrutor: ${nome}`}
      tabIndex={0}
    >
      <div className="flex flex-col gap-3">
        {/* Header: nome + badge de assinatura */}
        <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
          {/* bloco nome/email */}
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold text-gray-900 dark:text-white break-words text-pretty">
              {nome}
            </p>
            <p className="break-all text-sm text-gray-600 dark:text-gray-300">
              {email}
            </p>
          </div>

          {/* badge de assinatura */}
          <BadgeAssinatura ok={!!possuiAssinatura} />
        </div>

        {/* Mini-stats */}
        <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
          <p>
            Eventos ministrados:{" "}
            <strong className="font-mono tabular-nums text-gray-800 dark:text-gray-100">
              {eventosNum}
            </strong>
          </p>
          <p className="flex flex-wrap items-center gap-2">
            Média de avaliação: <StarRow value={media_avaliacao} />
          </p>
        </div>

        {/* Ação */}
        <div className="pt-1">
          <button
            onClick={handleVisualizar}
            disabled={!id}
            className={`flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-700/40 ${
              !id
                ? "cursor-not-allowed opacity-60 hover:bg-green-600"
                : ""
            }`}
            aria-label={`Ver histórico de ${nome}`}
            aria-disabled={!id || undefined}
            title={!id ? "Indisponível" : "Ver histórico"}
          >
            <Eye size={16} /> Histórico
          </button>
        </div>
      </div>
    </article>
  );
}

/* ===== PropTypes ===== */
TabelaInstrutor.propTypes = {
  instrutor: PropTypes.arrayOf(InstrutorType).isRequired,
  onVisualizar: PropTypes.func,
  className: PropTypes.string,
  loading: PropTypes.bool,
};

InstrutorCard.propTypes = {
  data: InstrutorType.isRequired,
  onVisualizar: PropTypes.func.isRequired,
};

// 📁 src/components/ModalSubmissao.jsx
import React, { useEffect, useId, useMemo } from "react";
import PropTypes from "prop-types";
import { X } from "lucide-react";
import Modal from "./Modal";

/**
 * ModalSubmissao (SEM timezone!)
 * - Evita Date()/toLocaleString em datas-only e date-time "locais".
 * - Aceita 3 formas de informar o prazo final (opcionais, use apenas uma):
 *    1) deadlineParts={{ date: "YYYY-MM-DD", time: "HH:mm" }}
 *    2) deadlineIsoLocal="YYYY-MM-DDTHH:mm"   // sem 'Z', interpretado como local SEM shift
 *    3) subtitle: string/ReactNode             // se string, normalizamos datas com regex; se node, respeitamos
 *
 * Diretrizes aplicadas:
 * - Acessível (aria-*; focus trap pelo ModalBase)
 * - Mobile-first; layout limpo; gradiente 3 cores por variante
 * - Sem conversões de timezone; apenas manipulação de strings
 */

/* ───────────────────────── Helpers de DATA/HORA (sem TZ) ───────────────────────── */

// "2025-10-25" -> "25/10/2025"
function toBrDateOnly(dateStr) {
  if (typeof dateStr !== "string") return "";
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return dateStr;
  const [, yy, mm, dd] = m;
  return `${dd}/${mm}/${yy}`;
}

// "22:15" ou "22:15:00" -> "22:15"
function toBrTimeOnly(timeStr) {
  if (typeof timeStr !== "string") return "";
  const m = timeStr.match(/^(\d{2}):(\d{2})(?::\d{2})?$/);
  if (!m) return timeStr;
  const [, hh, mi] = m;
  return `${hh}:${mi}`;
}

// "2025-10-25T01:15"  (SEM 'Z', SEM timezone) -> "25/10/2025 01:15"
// ⚠️ Se vier com 'Z' (UTC), NÃO convertemos — apenas retiramos os segundos.
function toBrDateTimeFromIsoLocal(isoLocal) {
  if (typeof isoLocal !== "string") return "";
  // Recusamos strings com 'Z' para evitar shift silencioso
  // (Se aparecer 'Z', tratamos igual string comum, sem converter fuso).
  const clean = isoLocal.replace("Z", "");
  const m = clean.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::\d{2})?$/);
  if (!m) return isoLocal;
  const [, yy, mm, dd, hh, mi] = m;
  return `${dd}/${mm}/${yy} ${hh}:${mi}`;
}

// Converte datas embutidas em textos (sem mexer em timezone):
//  "2025-10-20T23:59:00" => "20/10/2025 23:59"
//  "2025-10-20 08:00"    => "20/10/2025 08:00"
//  "2025-10-20"          => "20/10/2025"
function normalizeDatesInsideText(text) {
  if (!text || typeof text !== "string") return text;
  let s = text;

  // data e hora
  s = s.replace(
    /(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::\d{2})?/g,
    (_, yy, mm, dd, hh, mi) => `${dd}/${mm}/${yy} ${hh}:${mi}`
  );

  // apenas data
  s = s.replace(
    /(\d{4})-(\d{2})-(\d{2})(?![\d:])/g,
    (_, yy, mm, dd) => `${dd}/${mm}/${yy}`
  );

  return s;
}

export default function ModalSubmissao({
  open,
  onClose,
  title,
  subtitle,
  icon: Icon,
  children,
  footer,
  maxWidth = "max-w-4xl",
  escClose = true,
  closeOnOverlayClick = true,
  initialFocusRef,
  stickyFooter = true,
  variant = "indigo",
  headerGradient,

  // 🔽 Novos props opcionais para prazo:
  deadlineParts,     // { date: "YYYY-MM-DD", time: "HH:mm" | "HH:mm:ss" }
  deadlineIsoLocal,  // "YYYY-MM-DDTHH:mm" (sem 'Z')
  deadlinePrefix = "Prazo final:",
}) {
  const titleId = useId();
  const descId = useId();

  // 🎯 Monta a linha segura de "Prazo final" sem timezone, se informada
  const safeDeadlineText = useMemo(() => {
    if (deadlineParts?.date && deadlineParts?.time) {
      const d = toBrDateOnly(deadlineParts.date);
      const t = toBrTimeOnly(deadlineParts.time);
      return `${deadlinePrefix} ${d} ${t}`;
    }
    if (typeof deadlineIsoLocal === "string") {
      return `${deadlinePrefix} ${toBrDateTimeFromIsoLocal(deadlineIsoLocal)}`;
    }
    return null;
  }, [deadlineParts, deadlineIsoLocal, deadlinePrefix]);

  // Se não houver props de prazo específicos, usamos o subtitle original.
  const subtitleText = useMemo(() => {
    if (safeDeadlineText) return safeDeadlineText;
    // se vier ReactNode, respeita; se vier string, normaliza datas encontradas
    return typeof subtitle === "string" ? normalizeDatesInsideText(subtitle) : subtitle;
  }, [safeDeadlineText, subtitle]);

  // 🎨 Gradientes por variante
  const gradientByVariant = {
    emerald: "from-emerald-900 via-emerald-800 to-teal-700",
    indigo: "from-indigo-900 via-violet-800 to-fuchsia-700",
    cyan: "from-cyan-900 via-sky-800 to-blue-700",
    rose: "from-rose-900 via-red-800 to-orange-700",
    slate: "from-slate-900 via-slate-800 to-zinc-700",
  };
  const headerBg = headerGradient || gradientByVariant[variant] || gradientByVariant.indigo;

  // ⌨️ Respeita o escClose
  useEffect(() => {
    if (!open || escClose) return;
    const blockEsc = (e) => {
      if (e.key === "Escape") e.stopPropagation();
    };
    document.addEventListener("keydown", blockEsc, true);
    return () => document.removeEventListener("keydown", blockEsc, true);
  }, [open, escClose]);

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      describedBy={descId}
      className={`w-[96%] ${maxWidth} p-0 overflow-hidden`}
      closeOnBackdrop={!!closeOnOverlayClick}
      initialFocusRef={initialFocusRef}
    >
      {/* HeaderHero */}
      <header
        className={`px-4 sm:px-6 py-4 text-white bg-gradient-to-br ${headerBg}`}
        role="group"
        aria-label="Janela de submissão"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {Icon ? <Icon className="w-5 h-5 shrink-0" aria-hidden="true" /> : null}
              <h3 id={titleId} className="text-xl sm:text-2xl font-extrabold tracking-tight truncate">
                {title}
              </h3>
            </div>

            <p id={descId} className="text-white/90 text-sm mt-1 line-clamp-2">
              {subtitleText || "Preencha os campos e revise antes de enviar."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/60"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Conteúdo */}
      <div className="max-h-[75vh] overflow-y-auto p-4 sm:p-6">
        {children}
      </div>

      {/* Footer (opcional) */}
      {footer ? (
        stickyFooter ? (
          <div className="sticky bottom-0 left-0 right-0 bg-white/85 dark:bg-zinc-950/85 backdrop-blur border-t border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-end gap-2">
            {footer}
          </div>
        ) : (
          <div className="border-t border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-end gap-2">
            {footer}
          </div>
        )
      ) : null}
    </Modal>
  );
}

ModalSubmissao.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired,
  subtitle: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  icon: PropTypes.elementType,
  children: PropTypes.node.isRequired,
  footer: PropTypes.node,
  maxWidth: PropTypes.string,
  escClose: PropTypes.bool,
  closeOnOverlayClick: PropTypes.bool,
  initialFocusRef: PropTypes.any,
  stickyFooter: PropTypes.bool,
  variant: PropTypes.oneOf(["emerald", "indigo", "cyan", "rose", "slate"]),
  headerGradient: PropTypes.string,

  // 👇 novos
  deadlineParts: PropTypes.shape({
    date: PropTypes.string, // "YYYY-MM-DD"
    time: PropTypes.string, // "HH:mm" | "HH:mm:ss"
  }),
  deadlineIsoLocal: PropTypes.string, // "YYYY-MM-DDTHH:mm" (sem 'Z')
  deadlinePrefix: PropTypes.string,
};

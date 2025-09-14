// 📁 src/components/Notificacoes.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  FileText,
  Star,
  Check,
  RefreshCw,
  Bell,
} from "lucide-react";
import { toast } from "react-toastify";
import { apiGet, apiPost } from "../services/api";

/* ────────────────────────────────────────────────────────────── */
/* Utils locais                                                   */
/* ────────────────────────────────────────────────────────────── */

function pickDateField(n) {
  // tenta achar o melhor campo de data/hora
  return (
    n?.data || n?.criada_em || n?.criadaEm || n?.created_at || n?.createdAt || n?.enviada_em || n?.enviadaEm || null
  );
}

function toDate(v) {
  try {
    if (!v) return null;
    if (v instanceof Date) return v;
    // strings ISO/SQL/BR
    const s = String(v);
    // se vier no formato BR dd/mm/aaaa hh:mm, tenta converter
    if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) {
      const [d, m, yAndRest] = s.split("/");
      const [y, time = "00:00"] = yAndRest.split(" ");
      return new Date(`${y}-${m}-${d}T${time.length === 5 ? time : "00:00"}`);
    }
    return new Date(s);
  } catch {
    return null;
  }
}

function formatDateTimeBR(v) {
  const d = toDate(v);
  if (!d || Number.isNaN(d.getTime())) return "";
  try {
    return d.toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    // fallback simples
    const pad = (n) => String(n).padStart(2, "0");
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
  }
}

// aceita várias convenções de backend
function isNaoLida(n) {
  if (typeof n?.lida === "boolean") return !n.lida;
  if (typeof n?.lido === "boolean") return !n.lido;
  if ("lida_em" in n) return !n.lida_em;
  if ("lidaEm" in n) return !n.lidaEm;
  // se não houver marcador, considera não lida
  return true;
}

function bordaPorTipo(tipo) {
  return tipo === "evento"
    ? "border-blue-600"
    : tipo === "avaliacao"
    ? "border-yellow-500"
    : "border-green-600";
}

function IconeTipo({ tipo }) {
  return tipo === "evento" ? (
    <CalendarDays className="mt-1 text-blue-600" aria-hidden="true" />
  ) : tipo === "avaliacao" ? (
    <Star className="mt-1 text-yellow-500" aria-hidden="true" />
  ) : (
    <FileText className="mt-1 text-green-600" aria-hidden="true" />
  );
}

/* ────────────────────────────────────────────────────────────── */
/* Componente                                                     */
/* ────────────────────────────────────────────────────────────── */

export default function Notificacoes() {
  const [notificacoes, setNotificacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [marcando, setMarcando] = useState(null); // id em progresso
  const [marcandoTodas, setMarcandoTodas] = useState(false);

  const carregarNotificacoes = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiGet("/api/notificacoes");
      setNotificacoes(Array.isArray(data) ? data : []);
    } catch {
      toast.error("❌ Erro ao carregar notificações.");
      setNotificacoes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarNotificacoes();
  }, [carregarNotificacoes]);

  // ordena não lidas primeiro; em seguida por data desc (se disponível)
  const listaOrdenada = useMemo(() => {
    return [...notificacoes].sort((a, b) => {
      const unreadDelta = (isNaoLida(b) ? 1 : 0) - (isNaoLida(a) ? 1 : 0);
      if (unreadDelta !== 0) return unreadDelta;
      // data desc
      const da = toDate(pickDateField(a));
      const db = toDate(pickDateField(b));
      const ta = da ? da.getTime() : 0;
      const tb = db ? db.getTime() : 0;
      return tb - ta;
    });
  }, [notificacoes]);

  const totalNaoLidas = useMemo(
    () => notificacoes.reduce((acc, n) => acc + (isNaoLida(n) ? 1 : 0), 0),
    [notificacoes]
  );

  async function marcarComoLida(id) {
    try {
      setMarcando(id);
      await apiPost(`/api/notificacoes/${id}/lida`, {});
      // atualiza localmente
      setNotificacoes((prev) =>
        prev.map((n) =>
          n.id === id
            ? {
                ...n,
                lida: true,
                lido: true,
                lida_em: new Date().toISOString(),
                lidaEm: new Date().toISOString(),
              }
            : n
        )
      );
      // atualiza badge do cabeçalho, se existir
      window.atualizarContadorNotificacoes?.();
    } catch {
      toast.error("❌ Não foi possível marcar como lida.");
    } finally {
      setMarcando(null);
    }
  }

  async function marcarTodas() {
    const ids = notificacoes.filter(isNaoLida).map((n) => n.id).filter(Boolean);
    if (ids.length === 0) return;
    setMarcandoTodas(true);
    try {
      // se seu backend tiver endpoint de "todas", troque por ele;
      // fallback: chama uma a uma em paralelo
      await Promise.allSettled(ids.map((id) => apiPost(`/api/notificacoes/${id}/lida`, {})));
      setNotificacoes((prev) =>
        prev.map((n) =>
          isNaoLida(n)
            ? {
                ...n,
                lida: true,
                lido: true,
                lida_em: new Date().toISOString(),
                lidaEm: new Date().toISOString(),
              }
            : n
        )
      );
      window.atualizarContadorNotificacoes?.();
      toast.success("✅ Todas as não lidas foram marcadas como lidas.");
    } catch {
      toast.error("❌ Falha ao marcar todas como lidas.");
    } finally {
      setMarcandoTodas(false);
    }
  }

  /* ────────────── Estados de carregamento / vazio ────────────── */

  if (loading) {
    return (
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-semibold text-lousa dark:text-white">
            🔔 Minhas Notificações
          </h3>
          <div className="flex gap-2">
            <button
              disabled
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-white"
              title="Carregando..."
            >
              <RefreshCw className="w-4 h-4 animate-spin" />
              Carregando
            </button>
          </div>
        </div>

        <ul className="space-y-3" aria-busy="true" aria-live="polite">
          {[...Array(3)].map((_, i) => (
            <li
              key={i}
              className="p-4 rounded-lg shadow-md border-l-4 bg-white dark:bg-zinc-800 border-emerald-600"
            >
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-2/3" />
                <div className="h-3 bg-gray-200 dark:bg-zinc-700 rounded w-11/12" />
                <div className="h-3 bg-gray-200 dark:bg-zinc-700 rounded w-1/3" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (notificacoes.length === 0) {
    return (
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-semibold text-lousa dark:text-white">
            🔔 Minhas Notificações
          </h3>
          <div className="flex gap-2">
            <button
              onClick={carregarNotificacoes}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
            >
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </button>
          </div>
        </div>

        <div
          className="rounded-xl border border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-zinc-900 text-center text-gray-700 dark:text-gray-200"
          role="status"
          aria-live="polite"
        >
          <Bell className="w-10 h-10 mx-auto mb-2 opacity-80" aria-hidden="true" />
          <p className="font-semibold">Nenhuma notificação por aqui.</p>
          <p className="text-sm opacity-80">Volte mais tarde ou clique em “Atualizar”.</p>
        </div>
      </div>
    );
  }

  /* ────────────────────────────────────────────────────────────── */

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4 gap-2">
        <h3 className="text-xl font-semibold text-lousa dark:text-white">
          🔔 Minhas Notificações
          {totalNaoLidas > 0 && (
            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800 align-middle">
              {totalNaoLidas} não lida{totalNaoLidas > 1 ? "s" : ""}
            </span>
          )}
        </h3>

        <div className="flex items-center gap-2">
          <button
            onClick={carregarNotificacoes}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
            title="Atualizar lista"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>

          <button
            onClick={marcarTodas}
            disabled={totalNaoLidas === 0 || marcandoTodas}
            className={[
              "inline-flex items-center gap-2 px-3 py-1.5 rounded font-semibold",
              totalNaoLidas === 0 || marcandoTodas
                ? "bg-gray-200 text-gray-500 dark:bg-zinc-700 dark:text-gray-300 cursor-not-allowed"
                : "bg-emerald-600 hover:bg-emerald-700 text-white",
            ].join(" ")}
            title={totalNaoLidas ? "Marcar todas como lidas" : "Nenhuma não lida"}
          >
            <Check className="w-4 h-4" />
            {marcandoTodas ? "Marcando..." : "Marcar todas"}
          </button>
        </div>
      </div>

      <ul className="space-y-3" role="list" aria-live="polite">
        {listaOrdenada.map((n) => {
          const naoLida = isNaoLida(n);
          const dataStr = formatDateTimeBR(pickDateField(n));

          return (
            <li
              key={n.id ?? `${n.tipo}-${n.mensagem?.slice(0, 32)}`}
              role="listitem"
              className={[
                "p-4 rounded-lg shadow-md border-l-4 transition-colors",
                bordaPorTipo(n.tipo),
                naoLida
                  ? "bg-[#FFF7E6] ring-1 ring-amber-200 dark:bg-amber-900/20 dark:ring-amber-700/40"
                  : "bg-white dark:bg-zinc-800",
              ].join(" ")}
            >
              <div className="flex items-start gap-3">
                <IconeTipo tipo={n.tipo} />

                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {n.titulo && (
                      <p className="font-semibold text-gray-900 dark:text-white leading-tight">
                        {n.titulo}
                      </p>
                    )}
                    {naoLida && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800">
                        • não lida
                      </span>
                    )}
                  </div>

                  {n.mensagem && (
                    <p className="text-gray-800 dark:text-white mt-0.5">{n.mensagem}</p>
                  )}

                  {(dataStr || n.link) && (
                    <div className="flex items-center gap-3 mt-1">
                      {dataStr && (
                        <span className="text-sm text-gray-500 dark:text-gray-300">
                          📅 {dataStr}
                        </span>
                      )}
                      {n.link && (
                        <a
                          href={n.link}
                          className="text-sm text-blue-700 dark:text-blue-400 underline"
                          onClick={() => {
                            if (naoLida && n.id) marcarComoLida(n.id);
                          }}
                        >
                          Ver mais
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* Botão marcar como lida */}
                <button
                  onClick={() => marcarComoLida(n.id)}
                  className={[
                    "ml-2 inline-flex items-center gap-1 text-xs px-2 py-1 rounded",
                    naoLida
                      ? "bg-amber-100 hover:bg-amber-200 text-amber-900 dark:bg-amber-900/30 dark:hover:bg-amber-900/40 dark:text-amber-100"
                      : "bg-gray-200 text-gray-700 dark:bg-zinc-700 dark:text-gray-100 cursor-default",
                  ].join(" ")}
                  disabled={!naoLida || marcando === n.id}
                  title={naoLida ? "Marcar como lida" : "Já lida"}
                >
                  <Check className="w-4 h-4" />
                  {marcando === n.id ? "Salvando..." : naoLida ? "Marcar como lida" : "Lida"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

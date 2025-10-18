// 📁 src/components/ModalEditarPresenca.jsx
import PropTypes from "prop-types";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, X, ClipboardSignature, AlertTriangle } from "lucide-react";
import Modal from "./Modal";

const STATUS_OPCOES = ["presente", "faltou"];

export default function ModalEditarPresenca({
  isOpen,
  onClose,
  onSalvar,
  inscrito,
  minJustLen = 3,              // mínimo de caracteres p/ justificar falta
}) {
  const statusInicial = useMemo(() => {
    const s = (inscrito?.status || "faltou").toLowerCase().trim();
    return STATUS_OPCOES.includes(s) ? s : "faltou";
  }, [inscrito]);

  const [status, setStatus] = useState(statusInicial);
  const [justificativa, setJustificativa] = useState(inscrito?.justificativa || "");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const firstChipRef = useRef(null);

  // ressincroniza ao abrir / trocar inscrito
  useEffect(() => {
    setStatus(statusInicial);
    setJustificativa(inscrito?.justificativa || "");
    setErro("");
    setSalvando(false);
  }, [isOpen, statusInicial, inscrito]);

  // mudar para presente limpa justificativa
  useEffect(() => {
    if (status === "presente" && justificativa) setJustificativa("");
    setErro("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const contar = justificativa.trim().length;
  const invalidaFalta = status === "faltou" && contar < minJustLen;

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    setErro("");

    if (invalidaFalta) {
      setErro(`Informe uma justificativa (mín. ${minJustLen} caracteres).`);
      return;
    }

    try {
      setSalvando(true);
      const payload = {
        ...inscrito,
        status,
        justificativa: status === "faltou" ? justificativa.trim() : "",
      };
      await Promise.resolve(onSalvar?.(payload));
      onClose?.();
    } catch (err) {
      const msg =
        err?.data?.mensagem ||
        err?.data?.message ||
        err?.message ||
        "Falha ao salvar presença.";
      setErro(msg);
    } finally {
      setSalvando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      open={isOpen}
      onClose={salvando ? undefined : onClose} // bloqueia fechar enquanto salva
      labelledBy="titulo-editar-presenca"
      describedBy="descricao-editar-presenca"
      className="w-[96%] max-w-lg p-0 overflow-hidden"
    >
      {/* Header hero (altura/tipografia padrão; degradê 3 cores exclusivo) */}
      <header
        className="px-4 sm:px-5 py-4 text-white bg-gradient-to-br from-teal-900 via-cyan-800 to-emerald-700"
        role="group"
        aria-label="Edição de presença"
      >
        <h2 id="titulo-editar-presenca" className="text-xl sm:text-2xl font-extrabold tracking-tight">
          Editar presença
        </h2>
        <p id="descricao-editar-presenca" className="text-white/90 text-sm mt-1">
          Ajuste o status e, se necessário, registre a justificativa.
        </p>
      </header>

      {/* Formulário */}
      <form onSubmit={handleSubmit} noValidate className="px-4 sm:px-5 pt-4 pb-24">
        {/* Quem é */}
        <div className="mb-3 text-sm text-slate-700 dark:text-slate-200 flex items-center gap-2">
          <ClipboardSignature className="w-4 h-4" aria-hidden="true" />
          <span>
            Participante: <strong className="font-semibold">{inscrito?.nome || "—"}</strong>
          </span>
        </div>

        {/* Status (chips) */}
        <fieldset className="mb-4">
          <legend className="sr-only">Status da presença</legend>
          <div className="grid grid-cols-2 gap-2">
            {[
              {
                value: "presente",
                label: "Presente",
                icon: <Check className="w-4 h-4" aria-hidden="true" />,
              },
              {
                value: "faltou",
                label: "Faltou",
                icon: <X className="w-4 h-4" aria-hidden="true" />,
              },
            ].map((opt, idx) => {
              const selected = status === opt.value;
              return (
                <label
                  key={opt.value}
                  className={[
                    "relative flex items-center justify-center gap-2 rounded-xl border px-3 py-2 cursor-pointer select-none text-sm",
                    selected
                      ? "border-teal-400 bg-teal-50 text-teal-800 dark:bg-teal-900/30 dark:text-teal-200"
                      : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-teal-300",
                  ].join(" ")}
                >
                  <input
                    ref={idx === 0 ? firstChipRef : undefined}
                    type="radio"
                    name="presenca"
                    value={opt.value}
                    checked={selected}
                    onChange={() => setStatus(opt.value)}
                    className="accent-teal-600"
                    disabled={salvando}
                  />
                  {opt.icon}
                  <span>{opt.label}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {/* Justificativa (condicional) */}
        {status === "faltou" && (
          <div className="mb-2">
            <label
              htmlFor="justificativa-falta"
              className="block text-sm text-slate-700 dark:text-slate-300 mb-1"
            >
              Justificativa da falta:
            </label>
            <textarea
              id="justificativa-falta"
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Descreva a justificativa..."
              className={[
                "w-full border rounded-xl p-3 text-sm dark:bg-slate-900 dark:text-white",
                invalidaFalta
                  ? "border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  : "border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500",
              ].join(" ")}
              rows={4}
              disabled={salvando}
              aria-invalid={invalidaFalta ? "true" : "false"}
              aria-describedby="ajuda-justificativa contagem-justificativa"
            />
            <div className="mt-1 flex items-center justify-between text-xs">
              <span id="ajuda-justificativa" className="text-slate-500 dark:text-slate-400">
                Mínimo de {minJustLen} caracteres
              </span>
              <span id="contagem-justificativa" className="text-slate-400">
                {contar}/{Math.max(minJustLen, 50)}
              </span>
            </div>
          </div>
        )}

        {/* Mensagem de erro (a11y) */}
        <div aria-live="polite" className="mt-2">
          {erro && (
            <div className="text-sm text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" aria-hidden="true" />
              <span>{erro}</span>
            </div>
          )}
        </div>
      </form>

      {/* Rodapé sticky (mobile-first) */}
      <div className="sticky bottom-0 left-0 right-0 bg-white/85 dark:bg-zinc-950/85 backdrop-blur border-t border-slate-200 dark:border-slate-800 px-4 sm:px-5 py-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={salvando}
          className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-700 transition disabled:opacity-60"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={salvando || invalidaFalta}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
          aria-busy={salvando ? "true" : "false"}
        >
          <Check className="w-4 h-4" aria-hidden="true" />
          {salvando ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </Modal>
  );
}

ModalEditarPresenca.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSalvar: PropTypes.func.isRequired, // pode ser async
  inscrito: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    nome: PropTypes.string.isRequired,
    status: PropTypes.string,
    justificativa: PropTypes.string,
  }).isRequired,
  minJustLen: PropTypes.number,
};

// 📁 src/components/ModalEvento.jsx
import { useEffect, useState } from "react";
import Modal from "react-modal";
import { toast } from "react-toastify";
import { MapPin, FileText, Layers3, PlusCircle, Trash2 } from "lucide-react";
import ModalTurma from "./ModalTurma";
import { formatarDataBrasileira } from "../utils/data";
import { apiGet, apiDelete } from "../services/api";

/* utils locais */
const minDate = (arr) => arr.map((d) => d.data).sort()[0];
const maxDate = (arr) => arr.map((d) => d.data).sort().slice(-1)[0];
const hh = (s) => (typeof s === "string" ? s.slice(0, 5) : "");

export default function ModalEvento({ isOpen, onClose, onSalvar, evento, onTurmaRemovida }) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [local, setLocal] = useState("");
  const [tipo, setTipo] = useState("");
  const [unidadeId, setUnidadeId] = useState("");
  const [publicoAlvo, setPublicoAlvo] = useState("");
  const [turmas, setTurmas] = useState([]);
  const [modalTurmaAberto, setModalTurmaAberto] = useState(false);
  const [unidades, setUnidades] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [instrutorSelecionado, setInstrutorSelecionado] = useState([""]);
  const [removendoId, setRemovendoId] = useState(null);

  // opções de instrutor
  const opcoesInstrutor = usuarios.filter((usuario) => {
    const perfil = (Array.isArray(usuario.perfil)
      ? usuario.perfil.join(",")
      : String(usuario.perfil || "")
    ).toLowerCase();
    return perfil.includes("instrutor") || perfil.includes("administrador");
  });

  function handleSelecionarInstrutor(index, valor) {
    const nova = [...instrutorSelecionado];
    nova[index] = valor;
    setInstrutorSelecionado(nova);
  }
  function adicionarInstrutor() {
    setInstrutorSelecionado((l) => [...l, ""]);
  }
  function removerInstrutor(index) {
    const nova = instrutorSelecionado.filter((_, i) => i !== index);
    setInstrutorSelecionado(nova.length ? nova : [""]);
  }
  function getInstrutorDisponivel(index) {
    return opcoesInstrutor.filter(
      (i) =>
        !instrutorSelecionado.includes(String(i.id)) ||
        instrutorSelecionado[index] === String(i.id)
    );
  }

  // Converte encontros vindos do backend para o formato "datas" esperado pelo modal
  function encontrosParaDatas(turma) {
    const baseHi = hh(turma.horario_inicio || turma.hora_inicio || "08:00");
    const baseHf = hh(turma.horario_fim || turma.hora_fim || "17:00");

    const enc = Array.isArray(turma?.encontros) ? turma.encontros : [];

    const fromEnc = enc
      .map((e) => {
        if (typeof e === "string") {
          const data = e.slice(0, 10);
          return data ? { data, horario_inicio: baseHi, horario_fim: baseHf } : null;
        }
        if (e && typeof e === "object") {
          const data = e.data?.slice(0, 10);
          const horario_inicio = hh(e.inicio || e.horario_inicio || baseHi);
          const horario_fim = hh(e.fim || e.horario_fim || baseHf);
          return data ? { data, horario_inicio, horario_fim } : null;
        }
        return null;
      })
      .filter(Boolean);

    // Se já veio "datas" (ex.: de uma criação anterior no próprio modal), mantém.
    if (Array.isArray(turma?.datas) && turma.datas.length) return turma.datas;

    return fromEnc;
  }

  // Preenche dados ao abrir/editar
  useEffect(() => {
    if (evento) {
      setTitulo(evento.titulo || "");
      setDescricao(evento.descricao || "");
      setLocal(evento.local || "");
      setTipo(evento.tipo || "");
      setUnidadeId(evento.unidade_id || "");
      setPublicoAlvo(evento.publico_alvo || "");
      setInstrutorSelecionado(
        Array.isArray(evento.instrutor)
          ? evento.instrutor.map((i) => String(i.id))
          : []
      );

      setTurmas(
        (evento.turmas || []).map((t) => {
          const datas = encontrosParaDatas(t);
          return {
            ...t,
            datas,
            horario_inicio: t.horario_inicio || t.hora_inicio || (datas[0]?.horario_inicio || ""),
            horario_fim: t.horario_fim || t.hora_fim || (datas[0]?.horario_fim || ""),
            carga_horaria: t.carga_horaria ?? 0,
          };
        })
      );
    } else {
      // reset ao criar novo
      setTitulo("");
      setDescricao("");
      setLocal("");
      setTipo("");
      setUnidadeId("");
      setPublicoAlvo("");
      setInstrutorSelecionado([""]);
      setTurmas([]);
    }
  }, [evento, isOpen]);

  // Carrega unidades
  useEffect(() => {
    (async () => {
      try {
        const data = await apiGet("/api/unidades");
        setUnidades(Array.isArray(data) ? data : []);
      } catch {
        toast.error("Erro ao carregar unidades.");
      }
    })();
  }, []);

  // Carrega usuários
  useEffect(() => {
    (async () => {
      try {
        const data = await apiGet("/api/usuarios");
        setUsuarios(Array.isArray(data) ? data : []);
      } catch {
        toast.error("Erro ao carregar usuários.");
      }
    })();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();

    const tiposValidos = ["Congresso", "Curso", "Oficina", "Palestra", "Seminário", "Simpósio", "Outros"];
    if (!titulo || !tipo || !unidadeId) {
      toast.warning("⚠️ Preencha todos os campos obrigatórios.");
      return;
    }
    if (!tiposValidos.includes(tipo)) {
      toast.error("❌ Tipo de evento inválido.");
      return;
    }
    if (!turmas.length) {
      toast.warning("⚠️ Adicione pelo menos uma turma.");
      return;
    }

    // validação de turmas + datas (estado do modal usa "datas")
    for (const t of turmas) {
      if (!t.nome || !Number(t.vagas_total) || !Number.isFinite(Number(t.carga_horaria))) {
        toast.error("❌ Preencha nome, vagas e carga horária de cada turma.");
        return;
      }
      if (!Array.isArray(t.datas) || t.datas.length === 0) {
        toast.error("❌ Cada turma precisa ter ao menos uma data.");
        return;
      }
      for (const d of t.datas) {
        if (!d?.data || !d?.horario_inicio || !d?.horario_fim) {
          toast.error("❌ Preencha data, início e fim em todos os encontros.");
          return;
        }
      }
    }

    const instrutorValidado = instrutorSelecionado.map(Number).filter((id) => !Number.isNaN(id));

    // monta turmas para o payload do backend (usa "encontros")
    const turmasCompletas = turmas.map((t) => {
      const qtd = Array.isArray(t.datas) ? t.datas.length : 0;
      const di = qtd ? minDate(t.datas) : t.data_inicio;
      const df = qtd ? maxDate(t.datas) : t.data_fim;
      const first = qtd ? t.datas[0] : {};
      return {
        nome: t.nome,
        data_inicio: di,
        data_fim: df,
        horario_inicio: hh(first.horario_inicio || t.horario_inicio),
        horario_fim: hh(first.horario_fim || t.horario_fim),
        vagas_total: Number(t.vagas_total),
        carga_horaria: Number(t.carga_horaria),
        // 🔥 agora enviamos ENCONTROS para o backend
        encontros: t.datas.map((d) => ({
          data: d.data,
          inicio: hh(d.horario_inicio),
          fim: hh(d.horario_fim),
        })),
      };
    });

    const turmaPrincipal = turmasCompletas[0] || {};
    const payload = {
      titulo,
      descricao,
      local,
      tipo,
      unidade_id: Number(unidadeId),
      publico_alvo: publicoAlvo,
      instrutor: instrutorValidado,
      turmas: turmasCompletas,
      // campos “espelho” (compatibilidade com fluxos antigos)
      data_inicio: turmaPrincipal.data_inicio,
      data_fim: turmaPrincipal.data_fim,
      hora_inicio: turmaPrincipal.horario_inicio,
      hora_fim: turmaPrincipal.horario_fim,
      vagas_total: Number(turmaPrincipal.vagas_total),
      carga_horaria: Number(turmaPrincipal.carga_horaria),
      ...(evento?.id ? { id: evento.id } : {}),
    };

    onSalvar(payload);
    onClose();
  };

  const abrirModalTurma = () => setModalTurmaAberto(true);

  // 🔥 Remover turma (local e/ou persistida)
  async function removerTurma(turma, idx) {
    const nome = turma?.nome || `Turma ${idx + 1}`;
    const ok = window.confirm(
      `Remover a turma "${nome}"?\n\nEsta ação não pode ser desfeita.\nSe houver presenças ou certificados, a exclusão será bloqueada.`
    );
    if (!ok) return;

    // Turma ainda não persistida (sem id): apaga só do estado
    if (!turma?.id) {
      setTurmas((prev) => prev.filter((_, i) => i !== idx));
      toast.info("Turma removida (rascunho).");
      return;
    }

    try {
      setRemovendoId(turma.id);
      await apiDelete(`/api/turmas/${turma.id}`);
      setTurmas((prev) => prev.filter((t) => t.id !== turma.id));
      toast.success("Turma removida com sucesso.");
      onTurmaRemovida?.(turma.id); // sincroniza lista fora do modal
    } catch (err) {
      const code = err?.data?.erro;
      if (err?.status === 409 || code === "TURMA_COM_REGISTROS") {
        const c = err?.data?.contagens || {};
        toast.error(
          `Não é possível excluir: ${c.presencas || 0} presenças / ${c.certificados || 0} certificados.`
        );
      } else if (err?.status === 404) {
        toast.warn("Turma não encontrada. Atualize a página.");
      } else {
        toast.error("Erro ao remover turma.");
      }
      console.error("[removerTurma(modal)]", err);
    } finally {
      setRemovendoId(null);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      shouldCloseOnOverlayClick={false}
      ariaHideApp={false}
      className="modal"
      overlayClassName="overlay"
    >
      <div className="flex flex-col max-h-[90vh]">
        <form
          id="form-evento"
          onSubmit={handleSubmit}
          className="overflow-y-auto pr-2 space-y-4"
          style={{ maxHeight: "calc(90vh - 64px)" }}
        >
          {/* TÍTULO */}
          <div className="relative">
            <FileText className="absolute left-3 top-3 text-gray-500" size={18} />
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Título"
              className="w-full pl-10 py-2 border rounded-md shadow-sm"
              required
            />
          </div>

          {/* DESCRIÇÃO */}
          <div className="relative">
            <FileText className="absolute left-3 top-3 text-gray-500" size={18} />
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descrição"
              className="w-full pl-10 py-2 h-24 border rounded-md shadow-sm"
            />
          </div>

          {/* PÚBLICO-ALVO */}
          <div className="relative">
            <FileText className="absolute left-3 top-3 text-gray-500" size={18} />
            <input
              value={publicoAlvo}
              onChange={(e) => setPublicoAlvo(e.target.value)}
              placeholder="Público-alvo"
              className="w-full pl-10 py-2 border rounded-md shadow-sm"
            />
          </div>

          {/* INSTRUTOR(ES) */}
          {instrutorSelecionado.map((valor, index) => (
            <div key={index} className="mb-2 relative pr-10">
              <label className="text-sm font-medium text-gray-700 dark:text-white">
                {index === 0 ? "Selecione o instrutor" : `Instrutor adicional`}
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={valor}
                  onChange={(e) => handleSelecionarInstrutor(index, e.target.value)}
                  className="w-full pl-3 py-2 border rounded-md shadow-sm"
                  required={index === 0}
                >
                  <option value="">Selecione o instrutor</option>
                  {getInstrutorDisponivel(index).map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.nome}
                    </option>
                  ))}
                </select>
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => removerInstrutor(index)}
                    className="text-red-500 hover:text-red-700 font-bold text-lg"
                    title="Remover este instrutor"
                  >
                    ❌
                  </button>
                )}
              </div>

              {valor && index === instrutorSelecionado.length - 1 && (
                <div className="flex justify-center mt-3">
                  <button
                    type="button"
                    onClick={adicionarInstrutor}
                    className="flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white font-semibold px-4 py-2 rounded-full transition focus-visible:ring-2 focus-visible:ring-teal-400"
                  >
                    <PlusCircle size={16} />
                    Incluir outro instrutor
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* LOCAL */}
          <div className="relative">
            <MapPin className="absolute left-3 top-3 text-gray-500" size={18} />
            <input
              value={local}
              onChange={(e) => setLocal(e.target.value)}
              placeholder="Local"
              className="w-full pl-10 py-2 border rounded-md shadow-sm"
              required
            />
          </div>

          {/* TIPO */}
          <div className="relative">
            <Layers3 className="absolute left-3 top-3 text-gray-500" size={18} />
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="w-full pl-10 py-2 border rounded-md shadow-sm"
              required
            >
              <option value="">Selecione o tipo</option>
              <option value="Congresso">Congresso</option>
              <option value="Curso">Curso</option>
              <option value="Oficina">Oficina</option>
              <option value="Palestra">Palestra</option>
              <option value="Seminário">Seminário</option>
              <option value="Simpósio">Simpósio</option>
              <option value="Outros">Outros</option>
            </select>
          </div>

          {/* UNIDADE */}
          <div className="relative">
            <Layers3 className="absolute left-3 top-3 text-gray-500" size={18} />
            <select
              value={unidadeId}
              onChange={(e) => setUnidadeId(e.target.value)}
              className="w-full pl-10 py-2 border rounded-md shadow-sm"
              required
            >
              <option value="">Selecione a unidade</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </select>
          </div>

          {/* TURMAS */}
          <div>
            <h3 className="text-md font-semibold mt-4 flex items-center gap-2 text-lousa dark:text-white">
              <Layers3 size={16} /> Turmas Cadastradas
            </h3>
            {turmas.length === 0 ? (
              <p className="text-sm text-gray-500 mt-1">Nenhuma turma cadastrada.</p>
            ) : (
              <div className="mt-2 space-y-2">
                {turmas.map((t, i) => {
                  const qtd = Array.isArray(t.datas) ? t.datas.length : 0;
                  const di = qtd ? minDate(t.datas) : t.data_inicio;
                  const df = qtd ? maxDate(t.datas) : t.data_fim;
                  const first = qtd ? t.datas[0] : null;
                  const hi = first ? hh(first.horario_inicio) : hh(t.horario_inicio);
                  const hf = first ? hh(first.horario_fim) : hh(t.horario_fim);
                  return (
                    <div
                      key={t.id ?? `temp-${i}`}
                      className="bg-gray-100 dark:bg-zinc-800 rounded-md p-3 text-sm shadow-sm relative"
                    >
                      {/* Botão Remover */}
                      <button
                        type="button"
                        onClick={() => removerTurma(t, i)}
                        disabled={removendoId === t.id}
                        title="Remover turma"
                        className="absolute right-2 top-2 inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-1.5 text-xs
                                   hover:bg-red-50 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <Trash2 size={14} />
                        {removendoId === t.id ? "Removendo..." : "Remover"}
                      </button>

                      <p className="font-bold pr-28">{t.nome}</p>
                      {qtd > 0 ? (
  <>
    <p>
      📅 {qtd} encontro(s) • {formatarDataBrasileira(di)} a {formatarDataBrasileira(df)}
    </p>
    <ul className="mt-1 text-xs text-gray-600 dark:text-gray-300 list-disc list-inside">
      {t.datas.map((d, idx) => (
        <li key={idx}>
          {formatarDataBrasileira(d.data)} — {hh(d.horario_inicio)} às {hh(d.horario_fim)}
        </li>
      ))}
    </ul>
  </>
) : (
  <p>
    📅 {formatarDataBrasileira(t.data_inicio)} a {formatarDataBrasileira(t.data_fim)}
  </p>
)}
                      {hi && hf && (
                        <p>
                          🕒 {hi} às {hf}
                        </p>
                      )}
                      <p>
                        👥 {t.vagas_total} vagas • ⏱ {t.carga_horaria}h
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex justify-center mt-3">
              <button
                type="button"
                onClick={abrirModalTurma}
                className="flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white font-semibold px-4 py-2 rounded-full transition focus-visible:ring-2 focus-visible:ring-teal-400"
                aria-label="Adicionar nova turma"
                tabIndex={0}
              >
                <PlusCircle size={16} />
                Adicionar Turma
              </button>
            </div>
          </div>
        </form>

        {/* Rodapé do modal */}
        <div className="flex justify-end gap-2 border-t mt-4 pt-4 bg-white dark:bg-zinc-900 px-4 py-2 shadow-inner">
          <button
            type="button"
            onClick={onClose}
            className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-md"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="form-evento"
            className="bg-lousa hover:bg-green-800 text-white px-4 py-2 rounded-md font-semibold"
          >
            Salvar
          </button>
        </div>
      </div>

      {/* MODAL TURMA */}
      <ModalTurma
        isOpen={modalTurmaAberto}
        onClose={() => setModalTurmaAberto(false)}
        onSalvar={(turma) => {
          // ModalTurma continua devolvendo "datas" para o estado do modal;
          // a conversão para "encontros" é feita no handleSubmit.
          const datas = Array.isArray(turma.datas) ? turma.datas : [];
          setTurmas((prev) => [
            ...prev,
            {
              ...turma,
              datas,
              // heranças para compatibilidade visual
              data_inicio: datas.length ? minDate(datas) : turma.data_inicio,
              data_fim: datas.length ? maxDate(datas) : turma.data_fim,
              horario_inicio: datas.length
                ? hh(datas[0]?.horario_inicio)
                : hh(turma.horario_inicio || turma.hora_inicio),
              horario_fim: datas.length
                ? hh(datas[0]?.horario_fim)
                : hh(turma.horario_fim || turma.hora_fim),
              carga_horaria: Number(turma.carga_horaria),
              vagas_total: Number(turma.vagas_total),
            },
          ]);
          setModalTurmaAberto(false);
        }}
      />
    </Modal>
  );
}

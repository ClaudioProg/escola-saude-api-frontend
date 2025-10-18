// 📁 src/pages/AvaliacaoEvento.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import { apiGet, apiPost } from "../services/api";
import Botao from "../components/ui/Botao";
import Loader from "../components/ui/Loader";
import HeaderHero from "../components/ui/HeaderHero";

/** Campos obrigatórios do projeto (12) */
const CAMPOS_OBRIGATORIOS = [
  "desempenho_instrutor",
  "divulgacao_evento",
  "recepcao",
  "credenciamento",
  "material_apoio",
  "pontualidade",
  "sinalizacao_local",
  "conteudo_temas",
  "estrutura_local",
  "acessibilidade",
  "limpeza",
  "inscricao_online",
];

/** Campos condicionais por tipo de evento */
const CAMPOS_CONDICIONAIS = {
  ambos: ["exposicao_trabalhos"], // congresso e simpósio
  congresso: ["apresentacao_oral_mostra", "apresentacao_tcrs", "oficinas"],
};

const LABELS = {
  desempenho_instrutor: "Desempenho do Instrutor",
  divulgacao_evento: "Divulgação do Evento",
  recepcao: "Recepção",
  credenciamento: "Credenciamento",
  material_apoio: "Material de Apoio",
  pontualidade: "Pontualidade",
  sinalizacao_local: "Sinalização do Local",
  conteudo_temas: "Conteúdo dos Temas",
  estrutura_local: "Estrutura do Local",
  acessibilidade: "Acessibilidade",
  limpeza: "Limpeza",
  inscricao_online: "Inscrição Online",
  exposicao_trabalhos: "Exposição de Trabalhos",
  apresentacao_oral_mostra: "Apresentação Oral da Mostra",
  apresentacao_tcrs: "Apresentação de TCRs",
  oficinas: "Oficinas",
};

const OPCOES_NOTA = ["Ótimo", "Bom", "Regular", "Ruim", "Péssimo"];

/** storage key por turma */
const draftKey = (turmaId) => `avaliacao-evento:${turmaId}`;

export default function AvaliacaoEvento() {
  const { turma_id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({});
  const [textos, setTextos] = useState({
    gostou_mais: "",
    sugestoes_melhoria: "",
    comentarios_finais: "",
  });
  const [carregandoMeta, setCarregandoMeta] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [meta, setMeta] = useState({
    evento_id: null,
    tipo_evento: "", // "curso", "palestra", "congresso", "simpósio", etc.
    titulo_evento: "",
    nome_turma: "",
  });

  const refsCampo = useRef({});
  const sujo = useRef(false); // rastreia alterações para aviso de saída

  const setCampoRef = useCallback((nome) => (el) => {
    if (el) refsCampo.current[nome] = el;
  }, []);

  // Carrega meta e tenta restaurar rascunho salvo
  useEffect(() => {
    let ativo = true;
    async function loadMeta() {
      try {
        setCarregandoMeta(true);
        let t = await apiGet(`/api/turmas/${turma_id}`);
        if (!t?.evento_id && t?.evento?.id) {
          t = { ...t, evento_id: t.evento.id, evento: t.evento };
        }
        const tipo = (t?.evento?.tipo || t?.tipo_evento || "").toString().toLowerCase();

        if (!ativo) return;
        setMeta({
          evento_id: t?.evento_id ?? null,
          tipo_evento: tipo,
          titulo_evento: t?.evento?.titulo || t?.evento_titulo || "",
          nome_turma: t?.nome || "",
        });

        // restaura rascunho, se houver
        const raw = localStorage.getItem(draftKey(turma_id));
        if (raw) {
          try {
            const draft = JSON.parse(raw);
            setForm(draft.form || {});
            setTextos(draft.textos || {});
          } catch {}
        }
      } catch (err) {
        toast.error("❌ Falha ao carregar informações da turma.");
      } finally {
        if (ativo) setCarregandoMeta(false);
      }
    }
    loadMeta();
    return () => {
      ativo = false;
    };
  }, [turma_id]);

  /** Campos visíveis, conforme tipo de evento */
  const camposVisiveis = useMemo(() => {
    const base = [...CAMPOS_OBRIGATORIOS];
    const tipo = meta.tipo_evento;
    if (tipo === "congresso" || tipo === "simpósio" || tipo === "simposio") {
      base.push(...CAMPOS_CONDICIONAIS.ambos);
    }
    if (tipo === "congresso") {
      base.push(...CAMPOS_CONDICIONAIS.congresso);
    }
    return base;
  }, [meta.tipo_evento]);

  // Autosave simplificado
  useEffect(() => {
    if (carregandoMeta) return;
    const payload = JSON.stringify({ form, textos });
    localStorage.setItem(draftKey(turma_id), payload);
  }, [form, textos, turma_id, carregandoMeta]);

  // Aviso ao sair se houver alterações
  useEffect(() => {
    const handler = (e) => {
      if (sujo.current && !enviando) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [enviando]);

  const handleSelect = useCallback((campo, valor) => {
    sujo.current = true;
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }, []);

  const handleTexto = useCallback((nome) => (e) => {
    sujo.current = true;
    setTextos((prev) => ({ ...prev, [nome]: e.target.value }));
  }, []);

  const validarObrigatorios = useCallback(() => {
    const faltando = CAMPOS_OBRIGATORIOS.filter((c) => !form[c]);
    if (faltando.length) {
      const primeiro = faltando[0];
      toast.warn("⚠️ Preencha todos os campos obrigatórios antes de enviar.");
      const el = refsCampo.current[primeiro];
      el?.focus?.();
      el?.scrollIntoView?.({ behavior: "smooth", block: "center" });
      return false;
    }
    return true;
  }, [form]);

  const limparRascunho = useCallback(() => {
    localStorage.removeItem(draftKey(turma_id));
    toast.info("🧹 Rascunho limpo.");
  }, [turma_id]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (enviando) return;
      if (!validarObrigatorios()) return;

      const corpo = {
        turma_id,
        evento_id: meta.evento_id ?? undefined,
        ...form,
        gostou_mais: textos.gostou_mais?.trim() || undefined,
        sugestoes_melhoria: textos.sugestoes_melhoria?.trim() || undefined,
        comentarios_finais: textos.comentarios_finais?.trim() || undefined,
      };

      try {
        setEnviando(true);
        await apiPost("/api/avaliacoes", corpo);
        toast.success("✅ Avaliação enviada com sucesso!");
        sujo.current = false;
        localStorage.removeItem(draftKey(turma_id));
        navigate("/painel");
      } catch (err) {
        toast.error(`❌ ${err?.message || "Erro ao enviar avaliação"}`);
      } finally {
        setEnviando(false);
      }
    },
    [enviando, validarObrigatorios, turma_id, meta.evento_id, form, textos, navigate]
  );

  return (
    <main className="min-h-dvh bg-gray-50 dark:bg-zinc-900">
      {/* Header unificado (mesmas dimensões/tipografia entre páginas) */}
      <HeaderHero
        title="Avaliação do Evento"
        subtitle="Sua opinião é essencial para melhorarmos continuamente"
        variant="amber" // cor exclusiva desta página
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="max-w-3xl mx-auto px-4 sm:px-6 py-6"
      >
        {/* Meta do evento/turma */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-md p-5 mb-6 border border-gray-200 dark:border-gray-800">
          <header className="mb-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Dados do evento
            </h2>
          </header>

          {carregandoMeta ? (
            <div className="mt-2"><Loader inline size="sm" minimal ariaLabel="Carregando informações…" /></div>
          ) : (
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {meta.titulo_evento && <><strong>Evento:</strong> {meta.titulo_evento} · </>}
              {meta.nome_turma && <><strong>Turma:</strong> {meta.nome_turma} · </>}
              {meta.tipo_evento && <><strong>Tipo:</strong> {meta.tipo_evento}</>}
            </p>
          )}
        </section>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          {/* Campos de nota */}
          <fieldset className="bg-white dark:bg-gray-900 rounded-2xl shadow-md p-5 border border-gray-200 dark:border-gray-800">
            <legend className="sr-only">Campos de avaliação</legend>

            <div className="grid grid-cols-1 gap-4">
              {camposVisiveis.map((campo) => {
                const obrigatorio = CAMPOS_OBRIGATORIOS.includes(campo);
                const erro = obrigatorio && !form[campo];
                const groupId = `rg-${campo}`;

                return (
                  <div key={campo} className="flex flex-col">
                    <label className="font-medium text-sm mb-2 dark:text-gray-100" htmlFor={groupId}>
                      {LABELS[campo]}
                      {obrigatorio && <span className="text-red-600 ml-1" aria-hidden="true">*</span>}
                    </label>

                    {/* Radio Group horizontal (scrollável no mobile) */}
                    <div
                      id={groupId}
                      ref={setCampoRef(campo)}
                      role="radiogroup"
                      aria-required={obrigatorio || undefined}
                      aria-invalid={erro || undefined}
                      className="flex gap-2 overflow-x-auto py-1"
                    >
                      {OPCOES_NOTA.map((opcao) => {
                        const checked = form[campo] === opcao;
                        return (
                          <label
                            key={opcao}
                            className={[
                              "inline-flex items-center gap-2 px-3 py-2 rounded-2xl border text-sm select-none",
                              checked
                                ? "bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-100 dark:border-emerald-800"
                                : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100",
                              "cursor-pointer focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-emerald-600/60"
                            ].join(" ")}
                          >
                            <input
                              type="radio"
                              name={campo}
                              value={opcao}
                              className="sr-only"
                              checked={checked}
                              onChange={() => handleSelect(campo, opcao)}
                              onBlur={() => { /* evita erro visual ao sair */ }}
                            />
                            <span>{opcao}</span>
                          </label>
                        );
                      })}
                    </div>

                    {/* Mensagem inline de erro (a11y) */}
                    {erro && (
                      <span className="mt-1 text-xs text-red-600 dark:text-red-400">
                        Campo obrigatório
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </fieldset>

          {/* Textos opcionais */}
          <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-md p-5 border border-gray-200 dark:border-gray-800">
            <div className="grid grid-cols-1 gap-4">
              <div className="flex flex-col">
                <label htmlFor="gostou_mais" className="font-medium text-sm mb-1 dark:text-gray-100">
                  O que mais gostou (opcional):
                </label>
                <textarea
                  id="gostou_mais"
                  rows={3}
                  value={textos.gostou_mais}
                  onChange={handleTexto("gostou_mais")}
                  placeholder="Conte brevemente o ponto alto da experiência…"
                  className="p-3 rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white resize-y focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/60"
                />
              </div>

              <div className="flex flex-col">
                <label htmlFor="sugestoes_melhoria" className="font-medium text-sm mb-1 dark:text-gray-100">
                  Sugestões de melhoria (opcional):
                </label>
                <textarea
                  id="sugestoes_melhoria"
                  rows={3}
                  value={textos.sugestoes_melhoria}
                  onChange={handleTexto("sugestoes_melhoria")}
                  placeholder="Deixe sugestões objetivas para evoluirmos o evento…"
                  className="p-3 rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white resize-y focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/60"
                />
              </div>

              <div className="flex flex-col">
                <label htmlFor="comentarios_finais" className="font-medium text-sm mb-1 dark:text-gray-100">
                  Comentários finais (opcional):
                </label>
                <textarea
                  id="comentarios_finais"
                  rows={4}
                  value={textos.comentarios_finais}
                  onChange={handleTexto("comentarios_finais")}
                  placeholder="Espaço livre para observações adicionais…"
                  className="p-3 rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white resize-y focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/60"
                />
              </div>
            </div>
          </section>

          {/* Ações */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Botao
              type="submit"
              variant="primary"
              loading={enviando}
              disabled={enviando || carregandoMeta}
              leftIcon={!enviando ? "✅" : null}
            >
              {enviando ? "Enviando..." : "Enviar Avaliação"}
            </Botao>

            <Botao
              type="button"
              variant="outline"
              onClick={limparRascunho}
              title="Apagar rascunho salvo localmente"
            >
              Limpar rascunho
            </Botao>
          </div>
        </form>
      </motion.div>
    </main>
  );
}

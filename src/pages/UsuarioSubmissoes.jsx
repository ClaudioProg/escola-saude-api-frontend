// 📁 src/pages/UsuarioSubmissoes.jsx
import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  PlusCircle,
  BookOpen,
  Loader2,
  Pencil,
  Download,
  ExternalLink,
  Trash2,            // ⬅️ novo ícone
} from "lucide-react";
import api, { apiGetFile, downloadBlob, apiHead } from "../services/api";
import ModalVerEdital from "../components/ModalVerEdital";
import ModalInscreverTrabalho from "../components/ModalInscreverTrabalho";
import Footer from "../components/Footer";

/* ───────────────── Helpers ───────────────── */
function toBrDateOnly(input) {
  if (!input) return "—";
  const s = String(input).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return s;
}

/* ───────────────── HeaderHero ───────────────── */
function HeaderHero() {
  const gradient = "from-violet-900 via-indigo-800 to-blue-700";
  return (
    <header className={`bg-gradient-to-br ${gradient} text-white`} role="banner">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:block focus:bg-white/20 focus:text-white text-sm px-3 py-2">
        Ir para o conteúdo
      </a>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10 min-h-[136px] flex items-center justify-center">
        <div className="w-full text-center">
          <div className="inline-flex items-center gap-3">
            <FileText className="w-6 h-6 sm:w-7 sm:h-7" aria-hidden="true" />
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Submissão de Trabalhos</h1>
          </div>
          <p className="mt-2 text-sm sm:text-base text-white/90 max-w-3xl mx-auto">
            Acompanhe suas submissões, edite rascunhos e inscreva novos trabalhos.
          </p>
        </div>
      </div>
    </header>
  );
}

/* ───────────────── Primitivos ───────────────── */
function Card({ children, className = "", ...rest }) {
  return (
    <div
      className={
        "rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur border border-black/5 dark:border-white/10 shadow-sm " +
        className
      }
      {...rest}
    >
      {children}
    </div>
  );
}
function Chip({ children, tone = "default", title }) {
  const tones = {
    default: "bg-slate-100 text-slate-800 dark:bg-zinc-800 dark:text-zinc-200",
    verde: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    amarelo: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
    vermelho: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
    azul: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    roxo: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${tones[tone] ?? tones.default}`} title={title}>
      {children}
    </span>
  );
}

/* ───────────────── PosterCell ───────────────── */
function PosterCell({ id, nome }) {
  const [downloading, setDownloading] = useState(false);
  const baixar = async () => {
    try {
      setDownloading(true);
      const { blob, filename } = await apiGetFile(`/submissoes/${id}/poster`);
      downloadBlob(filename || nome || "poster.pptx", blob);
    } catch (e) {
      alert(e?.message || "Falha ao baixar o pôster.");
    } finally {
      setDownloading(false);
    }
  };
  if (!nome) return <span className="text-gray-400 italic">—</span>;
  return (
    <button
      onClick={baixar}
      className="inline-flex items-center gap-1 text-indigo-600 hover:underline disabled:opacity-60"
      title="Baixar pôster"
      disabled={downloading}
    >
      {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
      {nome}
    </button>
  );
}

const BLOQUEADOS = new Set(["em_avaliacao", "aprovado_exposicao", "aprovado_oral", "reprovado"]);

export default function UsuarioSubmissoes() {
  const [chamadas, setChamadas] = useState([]);
  const [minhas, setMinhas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalEdital, setModalEdital] = useState(null);
  const [modalInscricao, setModalInscricao] = useState(null);
  const [modeloMap, setModeloMap] = useState({});
  const [baixandoMap, setBaixandoMap] = useState({});
  const [excluindoId, setExcluindoId] = useState(null); // ⬅️ controle de exclusão

  async function baixarModeloBanner(chId) {
    if (!chId) return;
    try {
      setBaixandoMap((m) => ({ ...m, [chId]: true }));
      const { blob, filename } = await apiGetFile(`/chamadas/${chId}/modelo-banner`);
      downloadBlob(filename || "modelo-poster.pptx", blob);
    } catch (e) {
      alert(e?.message || "Falha ao baixar o modelo de pôster.");
    } finally {
      setBaixandoMap((m) => ({ ...m, [chId]: false }));
    }
  }

  useEffect(() => {
    async function loadData() {
      try {
        const [c, s] = await Promise.all([api.get("/chamadas/ativas"), api.get("/submissoes/minhas")]);
        const chamadasArr = Array.isArray(c) ? c : c.data || [];
        setChamadas(chamadasArr);
        setMinhas(Array.isArray(s) ? s : s.data || []);
        const checks = await Promise.all(
          chamadasArr.map(async (ch) => {
            try {
              const ok = await apiHead(`/chamadas/${ch.id}/modelo-banner`, { auth: true, on401: "silent", on403: "silent" });
              return [ch.id, !!ok];
            } catch {
              return [ch.id, false];
            }
          })
        );
        setModeloMap(Object.fromEntries(checks));
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSucesso = async () => {
    const s = await api.get("/submissoes/minhas");
    setMinhas(Array.isArray(s) ? s : s.data || []);
  };

  const isDentroPrazo = (row) => !!(row?.dentro_prazo ?? row?.dentroPrazo);
  const canEdit = (row) => isDentroPrazo(row) && !BLOQUEADOS.has(row.status);
  const canDelete = (row) => {                   // ⬅️ regra de exclusão
    const st = String(row?.status || "").toLowerCase();
    return st === "rascunho" || st === "submetido";
  };

  // contadores por status (para os 4 stats)
  const countByStatus = useMemo(() => {
    const c = { submetido: 0, em_avaliacao: 0, aprovado: 0, reprovado: 0 };
    for (const m of minhas) {
      const st = String(m.status || "").toLowerCase();
      if (st === "submetido") c.submetido++;
      else if (st === "em_avaliacao") c.em_avaliacao++;
      else if (st === "aprovado_exposicao" || st === "aprovado_oral") c.aprovado++;
      else if (st === "reprovado") c.reprovado++;
    }
    return c;
  }, [minhas]);

  // excluir submissão
  const handleExcluir = async (id) => {
    if (!id) return;
    const ok = window.confirm("Tem certeza que deseja excluir esta submissão? Essa ação não pode ser desfeita.");
    if (!ok) return;
    try {
      setExcluindoId(id);
      await api.delete?.(`/submissoes/${id}`);         // usa api.delete se disponível
      // fallback: caso não exista api.delete, tenta via método genérico:
      if (!api.delete) await api({ method: "DELETE", url: `/submissoes/${id}` });
      await handleSucesso();
      alert("Submissão excluída com sucesso.");
    } catch (e) {
      console.error(e);
      alert("Não foi possível excluir a submissão.");
    } finally {
      setExcluindoId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-violet-50 to-indigo-100">
        <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-neutral-900 text-black dark:text-white">
      <HeaderHero />

      <main id="conteudo" className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-10">
          {/* ────── Stats: 4 cards de status (como solicitado) ────── */}
          <section aria-labelledby="metricas">
            <h2 id="metricas" className="sr-only">Métricas de Submissões</h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <Card className="p-4">
                <p className="text-xs text-slate-600 dark:text-slate-300 text-center">Submetido</p>
                <p className="text-2xl font-semibold leading-tight text-center">{countByStatus.submetido}</p>
                <div className="mt-2 flex justify-center"><Chip tone="azul">Submetido</Chip></div>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-slate-600 dark:text-slate-300 text-center">Em avaliação</p>
                <p className="text-2xl font-semibold leading-tight text-center">{countByStatus.em_avaliacao}</p>
                <div className="mt-2 flex justify-center"><Chip tone="amarelo">Em avaliação</Chip></div>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-slate-600 dark:text-slate-300 text-center">Aprovado</p>
                <p className="text-2xl font-semibold leading-tight text-center">{countByStatus.aprovado}</p>
                <div className="mt-2 flex justify-center"><Chip tone="verde">Aprovado</Chip></div>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-slate-600 dark:text-slate-300 text-center">Reprovado</p>
                <p className="text-2xl font-semibold leading-tight text-center">{countByStatus.reprovado}</p>
                <div className="mt-2 flex justify-center"><Chip tone="vermelho">Reprovado</Chip></div>
              </Card>
            </div>
          </section>

          {/* ────── Chamadas Abertas ────── */}
          <section aria-labelledby="chamadas-abertas">
            <div className="flex items-center justify-center gap-2 mb-2">
              <BookOpen className="w-5 h-5 text-violet-600" aria-hidden="true" />
              <h2 id="chamadas-abertas" className="text-base sm:text-lg font-bold text-center">Chamadas abertas</h2>
            </div>

            {chamadas.length === 0 ? (
              <p className="text-slate-600 dark:text-slate-300 italic text-center">Nenhuma chamada disponível no momento.</p>
            ) : (
              <div className="grid md:grid-cols-2 gap-5">
                {chamadas.map((ch) => {
                  const temModelo = !!modeloMap[ch.id];
                  const prazoStr = ch.prazo_final_br || ch.prazo_final || ch.prazoFinal || ch.prazo || null;
                  const prazoFmt = toBrDateOnly(prazoStr);
                  const carregando = !!baixandoMap[ch.id];
                  const dentro = !!(ch?.dentro_prazo ?? ch?.dentroPrazo);

                  return (
                    <motion.div key={ch.id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="group">
                      <Card className="p-5 h-full transition-shadow group-hover:shadow-md">
                        <div className="flex flex-col justify-between h-full">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 text-center">{ch.titulo}</h3>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 line-clamp-3 text-center sm:text-left">
                              {ch.descricao_markdown?.slice(0, 200) ?? "—"}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-xs font-medium">
                              {dentro ? <Chip tone="verde" title="Dentro do prazo">Dentro do prazo</Chip> : <Chip tone="vermelho" title="Fora do prazo">Fora do prazo</Chip>}
                              <span className="text-slate-600 dark:text-slate-300">Prazo final: <strong>{prazoFmt}</strong></span>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-3 items-center justify-center sm:justify-start">
                            <button
                              onClick={() => setModalEdital(ch.id)}
                              className="flex items-center gap-2 text-sm bg-violet-700 text-white px-3 py-2 rounded-md hover:bg-violet-800 transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500"
                            >
                              <FileText className="w-4 h-4" /> Ver edital
                            </button>

                            {dentro && (
                              <button
                                onClick={() => setModalInscricao({ chamadaId: ch.id })}
                                className="flex items-center gap-2 text-sm bg-indigo-600 text-white px-3 py-2 rounded-md hover:bg-indigo-700 transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                              >
                                <PlusCircle className="w-4 h-4" /> Submeter trabalho
                              </button>
                            )}

                            {temModelo && (
                              <button
                                type="button"
                                onClick={() => baixarModeloBanner(ch.id)}
                                className="sm:ml-auto inline-flex items-center gap-1 text-sm text-indigo-700 hover:underline disabled:opacity-60"
                                disabled={carregando}
                                title="Baixar modelo de pôster"
                              >
                                {carregando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
                                Modelo de pôster
                              </button>
                            )}
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ────── Minhas Submissões ────── */}
          <section aria-labelledby="minhas-submissoes">
            <div className="flex items-center justify-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-indigo-600" aria-hidden="true" />
              <h2 id="minhas-submissoes" className="text-base sm:text-lg font-bold text-center">Minhas submissões</h2>
            </div>

            {minhas.length === 0 ? (
              <p className="text-slate-600 dark:text-slate-300 italic text-center">Você ainda não submeteu nenhum trabalho.</p>
            ) : (
              <Card className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[760px]">
                    <thead className="bg-violet-700 text-white">
                      <tr>
                        <th className="p-3 text-left font-semibold">Título</th>
                        <th className="p-3 text-left font-semibold">Chamada</th>
                        <th className="p-3 text-center font-semibold">Status</th>
                        <th className="p-3 text-center font-semibold">Pôster</th>
                        <th className="p-3 text-center font-semibold">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {minhas.map((m) => {
                        const st = String(m.status ?? "").toLowerCase();
                        const statusChip =
                          st === "submetido" ? <Chip tone="azul">submetido</Chip> :
                          st === "em_avaliacao" ? <Chip tone="amarelo">em avaliação</Chip> :
                          st === "aprovado_exposicao" || st === "aprovado_oral" ? <Chip tone="verde">aprovado</Chip> :
                          st === "reprovado" ? <Chip tone="vermelho">reprovado</Chip> :
                          <Chip>—</Chip>;

                        const podeEditar = canEdit(m);
                        const podeExcluir = canDelete(m);

                        return (
                          <tr key={m.id} className="border-b last:border-b-0 border-black/5 dark:border-white/10 hover:bg-violet-50/50 dark:hover:bg-zinc-800/40 transition">
                            <td className="p-3 align-top">{m.titulo}</td>
                            <td className="p-3 align-top">{m.chamada_titulo}</td>
                            <td className="p-3 text-center align-top">{statusChip}</td>
                            <td className="p-3 text-center align-top"><PosterCell id={m.id} nome={m.poster_nome} /></td>
                            <td className="p-3 text-center align-top">
                              <div className="inline-flex items-center gap-2">
                                {podeEditar ? (
                                  <button
                                    onClick={() => setModalInscricao({ submissaoId: m.id })}
                                    className="inline-flex items-center gap-1 bg-indigo-600 text-white px-3 py-1.5 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    title="Editar submissão"
                                  >
                                    <Pencil className="w-4 h-4" /> Editar
                                  </button>
                                ) : (
                                  <span className="text-gray-400 text-xs">Edição indisponível</span>
                                )}

                                {podeExcluir && (
                                  <button
                                    onClick={() => handleExcluir(m.id)}
                                    disabled={excluindoId === m.id}
                                    className="inline-flex items-center gap-1 bg-rose-600 text-white px-3 py-1.5 rounded-md hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 disabled:opacity-70"
                                    title="Excluir submissão"
                                  >
                                    {excluindoId === m.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                    Excluir
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </section>
        </div>
      </main>

      <Footer />

      {/* Modais */}
      {modalEdital && <ModalVerEdital chamadaId={modalEdital} onClose={() => setModalEdital(null)} />}
      {modalInscricao && (
        <ModalInscreverTrabalho
          chamadaId={modalInscricao.chamadaId || null}
          submissaoId={modalInscricao.submissaoId || null}
          onClose={() => setModalInscricao(null)}
          onSucesso={handleSucesso}
        />
      )}
    </div>
  );
}

// 📁 src/components/TurmasInstrutor.jsx
import { motion, AnimatePresence } from "framer-motion";
import ListaInscritos from "./ListaInscritos";
import AvaliacoesEvento from "./AvaliacoesEvento";
import { toast } from "react-toastify";
import { apiPatch } from "../services/api";

export default function TurmasInstrutor({
  turmas,
  inscritosPorTurma,
  avaliacoesPorTurma,
  presencasPorTurma,
  onVerInscritos,
  onVerAvaliacoes,
  onExportarListaAssinaturaPDF,
  onExportarQrCodePDF,
  token,
  carregarPresencas,
  carregando = false,
  turmaExpandidaInscritos,
  setTurmaExpandidaInscritos,
  turmaExpandidaAvaliacoes,
  setTurmaExpandidaAvaliacoes,
}) {
  // ✅ confirmação manual via API central
  async function confirmarPresencaManual(usuarioId, turmaId, dataReferencia) {
    try {
      await apiPatch("/api/presencas/confirmar", {
        usuario_id: Number(usuarioId),
        turma_id: Number(turmaId),
        data: String(dataReferencia).slice(0, 10),
      });
      toast.success("✅ Presença confirmada!");
      carregarPresencas(turmaId);
    } catch (err) {
      const msg =
        err?.data?.erro || err?.data?.message || err?.message || "Erro ao confirmar presença.";
      toast.error(`❌ ${msg}`);
    }
  }

  if (carregando) {
    return (
      <ul className="space-y-6">
        {[...Array(2)].map((_, i) => (
          <li key={i} className="p-8 bg-gray-100 dark:bg-zinc-700 animate-pulse rounded-xl" />
        ))}
      </ul>
    );
  }

  // Agrupa turmas por evento
  const eventosAgrupados = {};
  for (const turma of turmas || []) {
    if (!turma || !turma.id || !turma.evento?.id) continue;
    const eventoId = String(turma.evento.id);
    if (!eventosAgrupados[eventoId]) {
      eventosAgrupados[eventoId] = { nome: turma.evento.nome, turmas: [] };
    }
    eventosAgrupados[eventoId].turmas.push(turma);
  }

  return (
    <ul className="space-y-6">
      <AnimatePresence>
        {Object.entries(eventosAgrupados).map(([eventoId, evento]) => (
          <motion.li
            key={eventoId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="border p-4 rounded-xl bg-white dark:bg-zinc-800 shadow"
          >
            <h3 className="text-lg font-semibold text-lousa dark:text-white">{evento.nome}</h3>

            <div className="space-y-4 mt-2">
              {evento.turmas.map((turma) => {
                const idSeguro = Number(turma.id);
                if (Number.isNaN(idSeguro)) return null;

                const expandindoInscritos = turmaExpandidaInscritos === idSeguro;
                const expandindoAvaliacoes = turmaExpandidaAvaliacoes === idSeguro;

                // 🔎 datas reais da turma (1ª opção: backend na própria turma; 2ª: payload de presenças detalhado)
                const datasReais =
                  (Array.isArray(turma?.datas) && turma.datas.length ? turma.datas : null) ??
                  presencasPorTurma[idSeguro]?.detalhado?.datas ??
                  [];

                return (
                  <div key={idSeguro} className="border-t pt-4">
                    <p className="text-sm font-medium text-lousa dark:text-white text-left">
                      Turma: {turma.nome || `Turma ${turma.id}`}
                    </p>

                    {/* Botões de ação */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      <button
                        onClick={() => {
                          onVerInscritos(idSeguro);
                          carregarPresencas(idSeguro);
                          setTurmaExpandidaInscritos(expandindoInscritos ? null : idSeguro);
                          setTurmaExpandidaAvaliacoes(null);
                        }}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                      >
                        👥 Ver inscritos
                      </button>

                      <button
                        onClick={() => {
                          onVerAvaliacoes(idSeguro);
                          setTurmaExpandidaAvaliacoes(expandindoAvaliacoes ? null : idSeguro);
                          setTurmaExpandidaInscritos(null);
                        }}
                        className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
                      >
                        ⭐ Avaliações
                      </button>

                      <button
                        onClick={() => onExportarListaAssinaturaPDF(idSeguro)}
                        className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-800 text-sm"
                      >
                        📄 Lista de Presença
                      </button>

                      <button
                        onClick={() => onExportarQrCodePDF(idSeguro, evento.nome)}
                        className="px-3 py-1 bg-green-700 text-white rounded hover:bg-green-800 text-sm"
                      >
                        🔳 QR Code de Presença
                      </button>
                    </div>

                    {/* Painel: Inscritos (com datas reais passadas ao filho) */}
                    <AnimatePresence>
                      {expandindoInscritos && (
                        <motion.div
                          id={`painel-inscritos-${idSeguro}`}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden mt-4"
                        >
                          {(() => {
                            const listaPresencas = Array.isArray(presencasPorTurma[idSeguro])
                              ? presencasPorTurma[idSeguro]
                              : presencasPorTurma[idSeguro]?.lista ?? [];

                            return (
                              <ListaInscritos
                                inscritos={inscritosPorTurma[idSeguro] || []}
                                turma={turma}
                                presencas={listaPresencas}
                                token={token}
                                carregarPresencas={() => carregarPresencas(idSeguro)}
                                confirmarPresencaManual={confirmarPresencaManual}
                                /* ✅ datas reais só aparecem dentro da lista, não no topo */
                                datas={datasReais}
                              />
                            );
                          })()}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Painel: Avaliações */}
                    <AnimatePresence>
                      {expandindoAvaliacoes && (
                        <motion.div
                          id={`painel-avaliacoes-${idSeguro}`}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden mt-4"
                        >
                          {(() => {
                            const raw = avaliacoesPorTurma[idSeguro];
                            const comentarios =
                              Array.isArray(raw) ? raw :
                              Array.isArray(raw?.comentarios) ? raw.comentarios :
                              Array.isArray(raw?.itens) ? raw.itens :
                              Array.isArray(raw?.avaliacoes) ? raw.avaliacoes :
                              [];
                            return comentarios.length > 0 ? (
                              <AvaliacoesEvento avaliacoes={comentarios} />
                            ) : (
                              <p className="text-sm text-gray-600 italic dark:text-gray-300">
                                Nenhuma avaliação registrada para esta turma.
                              </p>
                            );
                          })()}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}

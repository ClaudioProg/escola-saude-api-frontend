// ListaTurmasAdministrador
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AvaliacoesEvento from "./AvaliacoesEvento";
import BotaoPrimario from "./BotaoPrimario";
import { toast } from "react-toastify";
import {
  formatarDataBrasileira,
  gerarIntervaloDeDatas,
  formatarCPF,
  formatarParaISO,
} from "../utils/data";
import { apiGet, apiPost } from "../services/api"; // ✅ usa serviço centralizado

export default function ListaTurmasAdministrador({
  eventos = [],
  hoje,
  carregarInscritos,
  carregarAvaliacoes,
  gerarRelatorioPDF,
  inscritosPorTurma,
  avaliacoesPorTurma,
  navigate,
  modoadministradorPresencas = false,
}) {
  const [turmaExpandidaId, setTurmaExpandidaId] = useState(null);
  const [presencasPorTurma, setPresencasPorTurma] = useState({});
  const [refreshKey, setRefreshKey] = useState(0);

  async function carregarPresencas(turmaId) {
    console.log(`🔄 Carregando presenças da turma ${turmaId}...`);
    try {
      const data = await apiGet(`/api/presencas/relatorio-presencas/turma/${turmaId}`);
      console.log(`✅ Presenças carregadas:`, data);
      setPresencasPorTurma((prev) => ({ ...prev, [turmaId]: data }));
    } catch (err) {
      console.error("❌ Erro ao carregar presenças:", err);
      toast.error("❌ Erro ao carregar presenças.");
    }
  }

  async function confirmarPresenca(dataSelecionada, turmaId, usuarioId, nome) {
    const confirmado = window.confirm(
      `Confirmar presença de ${nome} em ${formatarDataBrasileira(dataSelecionada)}?`
    );
    if (!confirmado) return;

    try {
      await apiPost(`/api/presencas/confirmar-simples`, {
        turma_id: turmaId,
        usuario_id: usuarioId,
        data: dataSelecionada,
      });

      toast.success("✅ Presença confirmada com sucesso.");
      console.log(`✔️ Presença confirmada para usuário ${usuarioId} em ${dataSelecionada}`);
      await carregarPresencas(turmaId);
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      const erroMsg = err?.message || "Erro ao confirmar presença.";
      console.error(`❌ Falha na confirmação de presença:`, err);
      toast.error(`❌ ${erroMsg}`);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-8">
      <AnimatePresence>
        {eventos.map((evento) => (
          <div key={evento.evento_id}>
            <h2 className="text-xl font-bold text-lousa dark:text-white mb-4">
              📘 Evento: {evento.titulo}
            </h2>

            {(evento.turmas || []).filter(t => t && t.id).map((turma) => {
              const inicio = new Date(turma.data_inicio);
              const fim = new Date(turma.data_fim);
              const hojeISO = hoje.toISOString().split("T")[0];
              const dentroDoPeriodo = hojeISO >= turma.data_inicio && hojeISO <= turma.data_fim;
              const eventoJaIniciado = hojeISO >= turma.data_inicio;
              const estaExpandida = turmaExpandidaId === turma.id;
              const datasTurma = gerarIntervaloDeDatas(inicio, fim);
              const agora = new Date();

              return (
                <motion.div
                  key={turma.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border p-4 rounded-2xl bg-white dark:bg-gray-900 shadow-sm flex flex-col mb-6"
                >
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="text-md font-semibold text-[#1b4332] dark:text-green-200">{turma.nome}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      dentroDoPeriodo
                        ? "bg-green-100 text-green-700 dark:bg-green-700 dark:text-white"
                        : eventoJaIniciado
                        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-700 dark:text-white"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                    }`}>
                      {dentroDoPeriodo ? "Em andamento" : eventoJaIniciado ? "Realizada" : "Agendada"}
                    </span>
                  </div>

                  <p className="text-sm text-gray-500 dark:text-gray-300">
                    {formatarDataBrasileira(turma.data_inicio)} a {formatarDataBrasileira(turma.data_fim)}
                  </p>

                  {modoadministradorPresencas && (
                    <div className="flex justify-end">
                      <BotaoPrimario
                        onClick={() => {
                          const novaTurma = estaExpandida ? null : turma.id;
                          if (!estaExpandida) {
                            console.log("📅 Expandindo turma", turma.id);
                            carregarInscritos(turma.id);
                            carregarAvaliacoes(turma.id);
                            carregarPresencas(turma.id);
                          }
                          setTurmaExpandidaId(novaTurma);
                        }}
                      >
                        {estaExpandida ? "Recolher Detalhes" : "Ver Detalhes"}
                      </BotaoPrimario>
                    </div>
                  )}

                  {modoadministradorPresencas && estaExpandida && (
                    <div className="mt-4">
                      <div className="font-semibold text-sm mt-4 text-lousa dark:text-white mb-2">Inscritos:</div>
                      {(inscritosPorTurma[turma.id] || []).length === 0 ? (
                        <p className="text-sm text-gray-600 dark:text-gray-300">Nenhum inscrito encontrado para esta turma.</p>
                      ) : (
                        (inscritosPorTurma[turma.id] || []).map((i) => {
                          const usuarioId = i.usuario_id ?? i.id;
                          return (
                            <div key={`${usuarioId}-${refreshKey}`} className="border rounded-lg p-3 mb-4 bg-white dark:bg-gray-800">
                              <div className="font-medium text-sm mb-1">{i.nome}</div>
                              <div className="text-xs text-gray-600 dark:text-gray-300 mb-2">
                                CPF: {formatarCPF(i.cpf) || "Não informado"}
                              </div>
                              <table className="w-full table-fixed text-xs">
                                <thead>
                                  <tr className="text-left text-gray-600 dark:text-gray-300">
                                    <th className="py-2 px-2 w-1/3 font-medium whitespace-nowrap">📅 Data</th>
                                    <th className="py-2 px-2 w-1/3 font-medium whitespace-nowrap">🟡 Situação</th>
                                    <th className="py-2 px-2 w-1/3 font-medium whitespace-nowrap">✔️ Ações</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {datasTurma.map((dataObj) => {
                                    const dataISO = dataObj.toISOString().slice(0, 10);
                                    const presencasTurma = presencasPorTurma[turma.id];
                                    const listaPresencas = Array.isArray(presencasTurma?.lista)
                                      ? presencasTurma.lista
                                      : [];

                                    const presenca = listaPresencas.find((p) => {
                                      const dataValida = p.data_presenca && !isNaN(new Date(p.data_presenca).getTime());
                                      const dataFormatada = p.data_presenca;
                                      return (
                                        String(p.usuario_id) === String(usuarioId) &&
                                        dataValida &&
                                        dataFormatada === dataISO
                                      );
                                    });

                                    const estaPresente = presenca?.presente === true;
                                    const hojeData = formatarParaISO(new Date());
                                    const aindaPodeConfirmarHoje =
                                      dataISO === hojeData &&
                                      new Date() <= new Date(`${dataISO}T${turma.horario_fim || "17:00"}`);

                                    const dataAula = new Date(dataISO);
                                    dataAula.setDate(dataAula.getDate() + 15);
                                    const dentroDoPrazo = new Date() <= dataAula;

                                    const statusTexto = estaPresente
                                      ? "Presente"
                                      : aindaPodeConfirmarHoje
                                      ? "Aguardando"
                                      : "Faltou";

                                    const statusClasse = estaPresente
                                      ? "bg-green-400 text-white"
                                      : aindaPodeConfirmarHoje
                                      ? "bg-yellow-300 text-gray-800"
                                      : "bg-red-400 text-white";

                                    return (
                                      <tr key={`${usuarioId}-${dataISO}`} className="border-t">
                                        <td className="py-1 px-2 text-left">{formatarDataBrasileira(dataISO)}</td>
                                        <td className="py-1 px-2 text-left">
                                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusClasse}`}>
                                            {statusTexto}
                                          </span>
                                        </td>
                                        <td className="py-1 px-2 text-left">
                                          {!estaPresente && dentroDoPrazo && (
                                            <button
                                              onClick={() => confirmarPresenca(dataISO, turma.id, usuarioId, i.nome)}
                                              className="text-white bg-teal-700 hover:bg-teal-800 text-xs py-1 px-2 rounded"
                                            >
                                              Confirmar
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

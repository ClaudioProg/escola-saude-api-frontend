// 📁 src/pages/AgendaInstrutor.jsx
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import Skeleton from "react-loading-skeleton";

import Breadcrumbs from "../components/Breadcrumbs";
import NadaEncontrado from "../components/NadaEncontrado";
import { formatarDataBrasileira } from "../utils/data";
import { apiGet } from "../services/api"; // ✅ serviço centralizado

export default function AgendaInstrutor() {
  const [agenda, setAgenda] = useState([]);
  const [erro, setErro] = useState("");
  const [carregandoAgenda, setCarregandoAgenda] = useState(true);

  const usuario = JSON.parse(localStorage.getItem("usuario") || "{}");
  const nome = usuario?.nome || "";
  const hojeISO = new Date().toISOString().split("T")[0];

  useEffect(() => {
    (async () => {
      setCarregandoAgenda(true);
      try {
        // 👇 Não redireciona em 403; só mostra mensagem
        const data = await apiGet("/api/agenda/instrutor", { on403: "silent" });

        // garante array e ordena por data de referência
        const arr = Array.isArray(data) ? data : [];
        const ordenada = arr.sort(
          (a, b) =>
            new Date(a.data_referencia || a.data_inicio || 0) -
            new Date(b.data_referencia || b.data_inicio || 0)
        );

        setAgenda(ordenada);
        setErro("");
      } catch (e) {
        setErro("Erro ao carregar agenda");
        toast.error(`❌ ${e?.message || "Erro ao carregar agenda."}`);
      } finally {
        setCarregandoAgenda(false);
      }
    })();
  }, []);

  const definirStatus = (dataISO) => {
    if (!dataISO) return "🟢 Programado";
    if (dataISO === hojeISO) return "🟡 Hoje";
    if (dataISO > hojeISO) return "🟢 Programado";
    return "🔴 Realizado";
  };

  const formatarHorario = (horario) => {
    if (!horario || typeof horario !== "string") return "";
    const partes = horario.split(" às ");
    const inicio = partes[0]?.slice(0, 5) || "";
    const fim = partes[1]?.slice(0, 5) || "";
    return `${inicio} às ${fim}`;
  };

  return (
    <main className="min-h-screen bg-gelo dark:bg-zinc-900 px-2 sm:px-4 py-6 text-black dark:text-white">
      <Breadcrumbs />

      <div className="flex justify-between items-center bg-lousa text-white px-4 py-2 rounded-xl shadow mb-6">
        <span>Seja bem-vindo(a), <strong>{nome}</strong></span>
        <span className="font-semibold">Agenda do Instrutor</span>
      </div>

      <h2 className="text-2xl font-bold mb-6 text-center text-[#1b4332] dark:text-white">
        🗓️ Minha Agenda de Aulas / Eventos
      </h2>

      <section>
        {carregandoAgenda ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} height={110} className="rounded-xl" />
            ))}
          </div>
        ) : erro ? (
          <p className="text-red-500 text-center">{erro}</p>
        ) : agenda.length === 0 ? (
          <NadaEncontrado
            mensagem="Nenhuma aula agendada no momento."
            sugestao="Acesse seus eventos para mais opções."
          />
        ) : (
          <ul className="space-y-4">
            <AnimatePresence>
              {agenda.map((item, i) => {
                const dataIniISO = (item.data_inicio || "").split("T")[0] || "";
                const dataFimISO = (item.data_fim || "").split("T")[0] || "";
                const dataRefISO =
                  (item.data_referencia || dataIniISO || "").split("T")[0] || "";
                const status = definirStatus(dataRefISO);

                return (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    tabIndex={0}
                    className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow border border-green-300 dark:border-green-600 focus:outline-none focus:ring-2 focus:ring-lousa"
                    aria-label={`Aula de ${formatarDataBrasileira(
                      item.data_inicio
                    )} a ${formatarDataBrasileira(item.data_fim)}`}
                  >
                    <p className="text-sm text-gray-700 dark:text-gray-200">
                      <strong>📅 Data:</strong> {formatarDataBrasileira(item.data_inicio)} até{" "}
                      {formatarDataBrasileira(item.data_fim)}
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-200">
                      <strong>🕒 Horário:</strong> {formatarHorario(item.horario)}
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-200">
                      <strong>🏫 Turma:</strong> {item.turma}
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-200">
                      <strong>🧾 Evento:</strong> {item.evento?.nome || item.evento?.titulo}
                    </p>
                    <p
                      className={`text-sm font-semibold mt-2 ${
                        status === "🟢 Programado"
                          ? "text-green-600"
                          : status === "🔴 Realizado"
                          ? "text-red-600"
                          : status === "🟡 Hoje"
                          ? "text-yellow-700"
                          : "text-green-700"
                      }`}
                    >
                      {status}
                    </p>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </section>
    </main>
  );
}

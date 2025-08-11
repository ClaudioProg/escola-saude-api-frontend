// src/pages/Avaliacao.jsx
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import CabecalhoPainel from "../components/CabecalhoPainel";
import { formatarDataBrasileira } from "../utils/data";
import ModalAvaliacaoFormulario from "../components/ModalAvaliacaoFormulario";
import { apiGet } from "../services/api"; // ✅ serviço centralizado

export default function Avaliacao() {
  const [avaliacoesPendentes, setAvaliacoesPendentes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [avaliacaoSelecionada, setAvaliacaoSelecionada] = useState(null);

  useEffect(() => {
    carregarAvaliacoes();
  }, []);

  async function carregarAvaliacoes() {
    try {
      setCarregando(true);
      const usuario = JSON.parse(localStorage.getItem("usuario") || "{}");

      if (!usuario?.id) {
        toast.error("Usuário não identificado.");
        return;
      }

      const data = await apiGet(`/api/avaliacoes/disponiveis/${usuario.id}`);
      setAvaliacoesPendentes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      toast.error("❌ Erro ao carregar avaliações pendentes.");
    } finally {
      setCarregando(false);
    }
  }

  function abrirModal(avaliacao) {
    setAvaliacaoSelecionada(avaliacao);
    setModalAberto(true);
  }

  function fecharModal() {
    setModalAberto(false);
    setAvaliacaoSelecionada(null);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-4xl mx-auto p-6 mt-6 bg-white dark:bg-gray-900 rounded-xl shadow-md"
    >
      <CabecalhoPainel />
      <h1 className="text-2xl font-bold text-black dark:text-green-200 mb-4">
        📋 Avaliações Pendentes
      </h1>

      {carregando ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : avaliacoesPendentes.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-300 italic">
          Nenhuma avaliação pendente no momento.
        </p>
      ) : (
        <ul className="space-y-4">
          {avaliacoesPendentes.map((a, idx) => (
            <li
              key={idx}
              className="border border-gray-300 dark:border-gray-700 p-4 rounded-lg shadow-sm flex flex-col md:flex-row md:items-center md:justify-between bg-gray-50 dark:bg-gray-800"
            >
              <div>
                <p className="font-semibold text-lousa dark:text-green-100">
                  {a.nome_evento || a.titulo || a.nome}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Turma #{a.turma_id} — Início:{" "}
                  <span className="font-medium">
                    {a.data_inicio ? formatarDataBrasileira(a.data_inicio) : "Data não informada"}
                  </span>{" "}
                  - Fim:{" "}
                  <span className="font-medium">
                    {a.data_fim ? formatarDataBrasileira(a.data_fim) : "Data não informada"}
                  </span>
                </p>
              </div>
              <button
                className="mt-3 md:mt-0 bg-lousa dark:bg-green-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-green-700 transition"
                onClick={() => abrirModal(a)}
                aria-label={`Avaliar evento ${a.nome_evento || a.titulo || a.nome}, turma ${a.turma_id}`}
              >
                📋 Avaliar
              </button>
            </li>
          ))}
        </ul>
      )}

      <ModalAvaliacaoFormulario
        isOpen={modalAberto}
        onClose={fecharModal}
        evento={avaliacaoSelecionada}
        turma_id={avaliacaoSelecionada?.turma_id ?? null}
        recarregar={carregarAvaliacoes}
      />
    </motion.div>
  );
}

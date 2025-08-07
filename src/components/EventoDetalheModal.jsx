import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import { X, CalendarDays, MapPin, Info } from "lucide-react";
import { useEffect, useRef } from "react";
import { formatarDataBrasileira } from "../utils/data"; // ✅ PADRÃO DE DATA
import { Users } from "lucide-react";

export default function EventoDetalheModal({ evento, visivel, aoFechar }) {
  const modalRef = useRef();

  useEffect(() => {
    if (visivel) {
      console.log("🟢 Modal visível, evento recebido:", evento);
      console.log("🕓 Horário início:", evento.horario_inicio);
      console.log("🕓 Horário fim:", evento.horario_fim);
      console.log("📍 Local:", evento.local);
      console.log("👨‍🏫 Instrutores:", evento.instrutores);
    }

    if (visivel && modalRef.current) {
      modalRef.current.focus();
    }
  }, [visivel, evento]);

  return (
    <AnimatePresence>
      {visivel && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={aoFechar}
          aria-modal="true"
          role="dialog"
          aria-labelledby="titulo-evento"
          aria-describedby="descricao-evento"
        >
          <motion.div
            ref={modalRef}
            tabIndex={-1}
            className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-6 w-full max-w-xl max-h-screen overflow-y-auto relative text-left"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.9 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Botão de fechar */}
            <button
              className="absolute top-3 right-3 text-gray-600 dark:text-gray-300 hover:text-red-500"
              onClick={aoFechar}
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Cabeçalho */}
            <h2
              id="titulo-evento"
              className="text-2xl font-bold mb-4 flex items-center gap-2 text-lousa dark:text-white"
            >
              📌 {evento.titulo || "Evento sem título"}
            </h2>

            {/* Data e horário */}
            <div className="flex items-start gap-2 mb-2 text-gray-700 dark:text-gray-300">
              <CalendarDays className="w-5 h-5 mt-1" />
              <div>
                <strong>Data:</strong>{" "}
                {formatarDataBrasileira(evento.data_inicio)} a{" "}
                {formatarDataBrasileira(evento.data_fim)}
                <br />
                {evento.horario_inicio && evento.horario_fim && (
  <>
    <strong>Horário:</strong> {evento.horario_inicio.slice(0, 5)} às {evento.horario_fim.slice(0, 5)}
  </>
)}
              </div>
            </div>

            {/* Local */}
            <div className="flex items-start gap-2 mb-2 text-gray-700 dark:text-gray-300">
              <MapPin className="w-5 h-5 mt-1" />
              <div>
                <strong>Local:</strong>{" "}
                {evento.local?.nome || evento.local || "Local a definir"}
              </div>
            </div>

            {/* Instrutores */}
            {evento.instrutores?.length > 0 && (
  <div className="flex items-start gap-2 mb-2 text-gray-700 dark:text-gray-300">
    <Users className="w-5 h-5 mt-1" />
    <div>
      <strong>Instrutores:</strong> {evento.instrutores.map((i) => i.nome).join(", ")}
    </div>
  </div>
)}

            {/* Descrição */}
            {evento.descricao && (
              <div
                id="descricao-evento"
                className="flex items-start gap-2 mt-4 text-gray-600 dark:text-gray-400"
              >
                <Info className="w-5 h-5 mt-1" />
                <p>{evento.descricao}</p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

EventoDetalheModal.propTypes = {
  evento: PropTypes.object.isRequired,
  visivel: PropTypes.bool.isRequired,
  aoFechar: PropTypes.func.isRequired,
};

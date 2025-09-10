//frontend/src/pages/scanner.jsx
import { useEffect, useState, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";
import CarregandoSkeleton from "../components/CarregandoSkeleton";
import ErroCarregamento from "../components/ErroCarregamento";

export default function Scanner() {
  const [resultado, setResultado] = useState(null);
  const [detectado, setDetectado] = useState(false);
  const [erro, setErro] = useState(false);
  const [iniciando, setIniciando] = useState(true);
  const [handoff, setHandoff] = useState(false); // novo: overlay de transição

  const navigate = useNavigate();
  const html5QrCodeRef = useRef(null);
  const timeoutRef = useRef(null);
  const processedRef = useRef(false);   // novo: garante 1 leitura
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const timeout = setTimeout(() => setIniciando(false), 300);
    return () => { mountedRef.current = false; clearTimeout(timeout); };
  }, []);

  useEffect(() => {
    if (iniciando) return;

    const iniciarLeitor = async () => {
      try {
        await new Promise((r) => setTimeout(r, 100));

        const el = document.getElementById("leitor-qr");
        if (!el) throw new Error("Elemento 'leitor-qr' não encontrado.");

        // para/limpa instância anterior
        if (html5QrCodeRef.current) {
          try { await html5QrCodeRef.current.stop(); } catch {}
          try { await html5QrCodeRef.current.clear(); } catch {}
        }

        const html5QrCode = new Html5Qrcode("leitor-qr");
        html5QrCodeRef.current = html5QrCode;

        // preferir facingMode (mais estável) com fallback para getCameras()
        let cameraConfig = { facingMode: "environment" };
        try {
          const devices = await Html5Qrcode.getCameras();
          if (devices && devices.length) {
            const back = devices.find(d => (d.label || "").toLowerCase().includes("back"));
            cameraConfig = back ? back.id : devices[0].id;
          }
        } catch {}

        const onSuccess = async (decodedText) => {
          if (!decodedText || processedRef.current) return;
          processedRef.current = true;

          clearTimeout(timeoutRef.current);
          setDetectado(true);
          setResultado(decodedText);
          toast.success("✅ QR Code lido com sucesso!");

          // mostra overlay e encerra câmera antes de navegar
          setHandoff(true);

          // parar/limpar com race de segurança
          const stop = (async () => { try { await html5QrCode.stop(); } catch {} })();
          await Promise.race([stop, new Promise(r => setTimeout(r, 600))]);
          try { await html5QrCode.clear(); } catch {}
          html5QrCodeRef.current = null;

          // dar 1 tick pro DOM assentar antes do navigate
          setTimeout(() => {
            if (!mountedRef.current) return;
            navigate(`/validar-presenca?codigo=${encodeURIComponent(decodedText)}`, { replace: true });
          }, 50);
        };

        const onError = () => {}; // silencia ruído de leitura

        await html5QrCode.start(
          cameraConfig,
          { fps: 10, qrbox: 250 },
          onSuccess,
          onError
        );

        timeoutRef.current = setTimeout(() => {
          if (!processedRef.current) toast.error("⚠️ Nenhum QR Code detectado. Tente novamente.");
        }, 20000);

        setErro(false);
      } catch (err) {
        console.error("Erro ao iniciar QR Code:", err);
        setErro(true);
        toast.error("❌ Erro ao iniciar o scanner.");
      }
    };

    iniciarLeitor();

    // pausa a câmera quando a aba perde foco (evita travar UI)
    const onVis = async () => {
      if (document.hidden && html5QrCodeRef.current) {
        try { await html5QrCodeRef.current.stop(); } catch {}
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      clearTimeout(timeoutRef.current);
      processedRef.current = false;
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current
          .stop()
          .then(() => html5QrCodeRef.current?.clear())
          .catch(() => {});
        html5QrCodeRef.current = null;
      }
    };
  }, [iniciando, navigate]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gelo dark:bg-neutral-900 text-center py-8 px-4"
    >
      <h1 className="text-2xl font-bold mb-4 text-lousa dark:text-white">Escanear QR Code</h1>
      <p className="text-gray-600 dark:text-gray-300 mb-4 max-w-md mx-auto">
        Aponte a câmera para o QR Code fixado na sala. A leitura será automática e sua presença será registrada.
      </p>

      {erro ? (
        <ErroCarregamento mensagem="Erro ao iniciar o leitor de QR Code." />
      ) : iniciando ? (
        <CarregandoSkeleton height="300px" />
      ) : (
        <div
          id="leitor-qr"
          className={`relative mx-auto w-full max-w-sm aspect-square border-4 ${
            detectado ? "border-green-500" : "border-lousa"
          } rounded-xl transition-all duration-300 overflow-hidden bg-black/5`}
          role="region"
          aria-label="Leitor de QR Code"
        >
          <div className="absolute top-2 right-2 animate-pulse">
            <QrCodeIcon />
          </div>

          {detectado && (
            <div className="absolute bottom-2 right-2 text-green-500" aria-hidden="true">
              <CheckCircle size={32} />
            </div>
          )}

          {/* overlay de handoff para evitar tela branca */}
          {handoff && (
            <div className="absolute inset-0 bg-white/90 dark:bg-neutral-900/90 flex flex-col items-center justify-center gap-2">
              <div className="animate-spin h-8 w-8 rounded-full border-2 border-lousa border-t-transparent" />
              <p className="text-lousa dark:text-white font-medium">Registrando presença…</p>
            </div>
          )}
        </div>
      )}

      {resultado && !handoff && (
        <p className="mt-4 text-green-600 dark:text-green-400 font-medium break-words">
          Resultado: {resultado}
        </p>
      )}
    </motion.div>
  );
}

function QrCodeIcon() {
  return (
    <svg className="w-6 h-6 text-lousa dark:text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 4h5v5H4V4zm11 0h5v5h-5V4zM4 15h5v5H4v-5zm11 0h5v5h-5v-5z" />
    </svg>
  );
}

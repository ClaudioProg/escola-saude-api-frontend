// ✅ src/pages/MeusCertificados.jsx (somente PARTICIPANTE)
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import Skeleton from "react-loading-skeleton";
import { toast } from "react-toastify";
import { Award, RefreshCw } from "lucide-react";
import { formatarDataBrasileira, formatarParaISO } from "../utils/data";
import Footer from "../components/Footer";
import NadaEncontrado from "../components/NadaEncontrado";
import BotaoPrimario from "../components/BotaoPrimario";
import { apiGet, apiPost, makeApiUrl } from "../services/api";

/* ───────────────── Hero ───────────────── */
function HeaderHero({ onRefresh, variant = "teal", nome = "" }) {
  const variants = {
    sky: "from-sky-900 via-sky-800 to-sky-700",
    violet: "from-violet-900 via-violet-800 to-violet-700",
    amber: "from-amber-900 via-amber-800 to-amber-700",
    rose: "from-rose-900 via-rose-800 to-rose-700",
    teal: "from-teal-900 via-teal-800 to-teal-700",
    indigo: "from-indigo-900 via-indigo-800 to-indigo-700",
  };
  const grad = variants[variant] ?? variants.teal;

  return (
    <header className={`bg-gradient-to-br ${grad} text-white`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col items-center text-center gap-3">
        <div className="inline-flex items-center gap-2">
          <Award className="w-5 h-5" aria-hidden="true" />
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            Meus Certificados
          </h1>
        </div>
        <p className="text-sm text-white/90">
          {nome ? `Bem-vindo(a), ${nome}. ` : ""}
          Para visualizar os certificados, você deve primeiramente responder a avaliação do curso. Após, gere e baixe seus certificados como <strong>participante</strong>.
        </p>
        <BotaoPrimario
          onClick={onRefresh}
          variante="secundario"
          icone={<RefreshCw className="w-4 h-4" />}
          aria-label="Atualizar certificados"
        >
          Atualizar
        </BotaoPrimario>
      </div>
    </header>
  );
}

/* ───────────────── Util: período seguro (date-only) ───────────────── */
function periodoSeguro(cert) {
  const iniRaw = cert.data_inicio ?? cert.di ?? cert.inicio;
  const fimRaw = cert.data_fim ?? cert.df ?? cert.fim;
  const iniISO = formatarParaISO(iniRaw);
  const fimISO = formatarParaISO(fimRaw);
  const ini = iniISO ? formatarDataBrasileira(iniISO) : "—";
  const fim = fimISO ? formatarDataBrasileira(fimISO) : "—";
  return `${ini} até ${fim}`;
}

/* ───────────────── Página ───────────────── */
export default function MeusCertificados() {
  const [certificados, setCertificados] = useState([]);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [gerandoKey, setGerandoKey] = useState(null);
  const liveRef = useRef(null);

  const usuario = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("usuario") || "{}") || {};
    } catch {
      return {};
    }
  }, []);
  const nome = usuario?.nome || "";

  useEffect(() => {
    document.title = "Certificados | Escola da Saúde";
    carregarCertificados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function carregarCertificados() {
    try {
      setCarregando(true);
      setErro("");
      if (liveRef.current) liveRef.current.textContent = "Carregando certificados…";

      // ✅ Endpoint elegíveis do PARTICIPANTE
      const dadosUsuario = await apiGet("certificados/elegiveis");
      const listaBruta = Array.isArray(dadosUsuario) ? dadosUsuario : [];

      // defensivo: manter só participante (tipo = 'usuario')
      const apenasParticipante = listaBruta.filter((c) => (c.tipo ?? "usuario") === "usuario");

      // remove duplicatas por (tipo, evento_id, turma_id)
      const unicos = apenasParticipante.filter(
        (item, idx, arr) =>
          idx ===
          arr.findIndex(
            (c) =>
              String(c.tipo ?? "usuario") === String(item.tipo ?? "usuario") &&
              String(c.evento_id) === String(item.evento_id) &&
              String(c.turma_id) === String(item.turma_id)
          )
      );

      setCertificados(unicos);
      if (liveRef.current) {
        liveRef.current.textContent = unicos.length
          ? `Foram encontrados ${unicos.length} certificado(s) elegível(is).`
          : "Nenhum certificado elegível encontrado.";
      }
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar certificados");
      toast.error("❌ Erro ao carregar certificados.");
      if (liveRef.current) liveRef.current.textContent = "Falha ao carregar certificados.";
    } finally {
      setCarregando(false);
    }
  }

  function keyDoCert(cert) {
    const tipo = cert?.tipo ?? "usuario";
    return `${tipo}-${cert.evento_id}-${cert.turma_id}`;
  }

  async function gerarCertificado(cert) {
    const key = keyDoCert(cert);
    setGerandoKey(key);

    try {
      if (!usuario?.id) {
        toast.error("❌ Usuário não identificado. Faça login novamente.");
        return;
      }

      const body = {
        usuario_id: usuario.id,
        evento_id: cert.evento_id,
        turma_id: cert.turma_id,
        tipo: "usuario", // ✅ somente participante
      };

      const resultado = await apiPost("certificados/gerar", body);

      // Tratar diferentes formatos de retorno
      const certificadoId =
        resultado?.certificado_id ??
        resultado?.id ??
        resultado?.certificado?.id ??
        null;
      const arquivoPdf =
        resultado?.arquivo_pdf ??
        resultado?.arquivo ??
        resultado?.certificado?.arquivo_pdf ??
        null;

      toast.success("🎉 Certificado gerado com sucesso!");

      // ✅ Reconciliação autoritativa: recarrega a lista do servidor
      await carregarCertificados();

      // Caso queira também sinalizar imediatamente o item gerado (sem depender da recarga):
      setCertificados((prev) =>
        prev.map((c) =>
          c.evento_id === cert.evento_id && c.turma_id === cert.turma_id
            ? {
                ...c,
                ja_gerado: true,
                certificado_id: c.certificado_id ?? certificadoId ?? c.certificado_id,
                arquivo_pdf: c.arquivo_pdf ?? arquivoPdf ?? c.arquivo_pdf,
              }
            : c
        )
      );
    } catch (err) {
      console.error(err);
      toast.error("❌ Erro ao gerar certificado.");
    } finally {
      setGerandoKey(null);
    }
  }

  /* Cartão de certificado (participante) */
  function CartaoCertificado({ cert }) {
    const key = keyDoCert(cert);
    const gerando = gerandoKey === key;

    // Construção resiliente do link de download:
    // 1) preferir certificado_id (rota REST estável)
    // 2) se não existir, usar arquivo_pdf absoluto/relativo
    const hrefDownload =
      cert?.certificado_id
        ? makeApiUrl(`certificados/${cert.certificado_id}/download`)
        : cert?.arquivo_pdf
        ? (cert.arquivo_pdf.startsWith("http")
            ? cert.arquivo_pdf
            : makeApiUrl(cert.arquivo_pdf.replace(/^\//, "")))
        : null;

    const prontoParaDownload = Boolean(hrefDownload) && (cert.ja_gerado || cert.certificado_id);

    return (
      <motion.li
        key={key}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="rounded-2xl border shadow-sm p-4 flex flex-col justify-between transition
                   bg-white border-gray-200 dark:bg-zinc-900 dark:border-zinc-700"
      >
        <div>
          <h3 className="text-lg font-bold mb-1 text-lousa dark:text-green-100">
            {cert.evento || cert.evento_titulo || cert.nome_evento || "Evento"}
          </h3>

          <p className="text-sm text-gray-700 dark:text-gray-300">
            Turma: {cert.nome_turma || cert.turma_nome || `#${cert.turma_id}`}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Período: {periodoSeguro(cert)}
          </p>
        </div>

        <div className="mt-4 flex justify-center">
          {prontoParaDownload ? (
            <a
              href={hrefDownload}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-700 hover:bg-green-800 text-white text-sm font-medium py-2 px-4 rounded text-center"
            >
              Baixar Certificado
            </a>
          ) : (
            <button
              onClick={() => gerarCertificado(cert)}
              disabled={gerando}
              className="text-white text-sm font-medium py-2 px-4 rounded text-center disabled:opacity-60 bg-blue-700 hover:bg-blue-800"
              aria-label="Gerar certificado de participante"
            >
              {gerando ? "Gerando..." : "Gerar Certificado"}
            </button>
          )}
        </div>
      </motion.li>
    );
  }

  /* ─────────────── Render ─────────────── */
  return (
    <div className="flex flex-col min-h-screen bg-gelo dark:bg-zinc-900 text-black dark:text-white">
      <HeaderHero onRefresh={carregarCertificados} variant="teal" nome={nome} />

      <main role="main" className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* feedback acessível */}
        <p ref={liveRef} className="sr-only" aria-live="polite" />

        {carregando ? (
          <div role="status" aria-live="polite" className="grid gap-4 sm:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} height={110} className="rounded-xl" />
            ))}
          </div>
        ) : erro ? (
          <NadaEncontrado mensagem="Não foi possível carregar os certificados." />
        ) : certificados.length === 0 ? (
          <NadaEncontrado mensagem="Você ainda não possui certificados disponíveis." />
        ) : (
          <section aria-labelledby="sec-participante">
            <h2
              id="sec-participante"
              className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-3"
            >
              Como participante
            </h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {certificados.map((c) => (
                <CartaoCertificado key={keyDoCert(c)} cert={c} />
              ))}
            </ul>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}

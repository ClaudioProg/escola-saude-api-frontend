// ✅ src/pages/HomeEscola.jsx
import { useEffect } from "react";
import { motion } from "framer-motion";
import { CalendarDays, Megaphone } from "lucide-react";
import Footer from "../components/Footer"; // ⬅️ novo

/** Card de destaque com imagem e texto longo (sem CTA) */
function DestaqueLongo({ imgSrc, imgAlt, titulo, subtitulo, badge, children }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="overflow-hidden rounded-3xl bg-white dark:bg-zinc-900 shadow ring-1 ring-black/5 flex flex-col"
    >
      <div className="relative">
        <img
          src={imgSrc}
          alt={imgAlt}
          className="w-full h-56 object-cover"
          loading="lazy"
        />
        {badge && (
          <span className="absolute top-3 left-3 inline-flex items-center rounded-full bg-emerald-600 text-white text-xs font-semibold px-3 py-1 shadow">
            {badge}
          </span>
        )}
      </div>
      <div className="p-5 sm:p-6 space-y-2 text-justify">
        <h3 className="text-lg font-bold">{titulo}</h3>
        {subtitulo && (
          <p className="text-emerald-700 dark:text-emerald-300 text-sm font-medium">
            {subtitulo}
          </p>
        )}
        <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed space-y-3">
          {children}
        </div>
      </div>
    </motion.article>
  );
}

export default function HomeEscola() {
  useEffect(() => {
    document.title = "Escola da Saúde";
  }, []);

  return (
    <>
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl p-8 md:p-12 bg-gradient-to-r from-amber-500 via-rose-500 to-fuchsia-600 text-white shadow"
        >
          <h1 className="text-3xl md:text-4xl font-bold">Escola da Saúde</h1>
          <p className="mt-2 text-white/90 max-w-3xl">
            Informações importantes, campanhas e destaques da Escola Municipal de Saúde
            Pública de Santos.
          </p>

          {/* Avisos curtos */}
          <div className="mt-6 flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-full text-sm">
              <Megaphone className="w-4 h-4" /> Informes e campanhas
            </span>
            <span className="inline-flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-full text-sm">
              <CalendarDays className="w-4 h-4" /> Semana David Capistrano
            </span>
          </div>
        </motion.section>

        {/* 🎯 DESTAQUES (banners com texto completo) */}
        <section className="mt-8">
          <h2 className="text-xl font-semibold mb-3">Destaques</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1) Semana David Capistrano */}
            <DestaqueLongo
              imgSrc="/banners/semana-david-capistrano.png"
              imgAlt="Cartaz da Semana David Capistrano 2025"
              titulo="Participe da Semana David Capistrano 2025!"
              subtitulo="11 a 14 de novembro de 2025"
              badge="Evento especial"
              >
              <p> De 11 a 14 de novembro de 2025, a Escola da Saúde Pública de Santos realiza na Univesidade São Judas, campus Unimonte, mais uma edição da Semana Municipal de Saúde Pública Dr. David Capistrano, evento já consolidado no calendário oficial da cidade e reconhecido como espaço de encontro, reflexão e troca de experiências entre trabalhadoras e trabalhadores do SUS. </p>

              <p>Ao longo dos quatro dias, a programação contará com mesas temáticas, mostra de trabalhos com premiação e oficinas práticas ministradas por servidores, estudantes e parceiros da rede de saúde. Será um momento único para compartilhar saberes, fortalecer vínculos e debater caminhos para o fortalecimento da saúde pública.</p>

              <p>Em 2025, a Semana reafirma sua vocação de ser um evento construído pelos servidores e para os servidores, valorizando o protagonismo de quem, diariamente, atua na promoção do cuidado, da equidade e da qualidade no SUS. É a oportunidade de apresentar experiências exitosas, refletir sobre desafios atuais e construir soluções conjuntas que impactam diretamente o cotidiano da população.</p>

              <p>A participação de cada profissional é fundamental para manter viva a memória e o legado do Dr. David Capistrano, que sempre defendeu uma saúde pública integral, inclusiva e transformadora.</p>

              <p>👉 Venha participar, trazer sua experiência e fortalecer ainda mais a nossa rede de cuidado.</p>
              <p>
                <strong> Inscrições serão abertas em breve! </strong> 
                </p>
              <p>Porque o SUS se constrói todos os dias, com a contribuição de cada trabalhadora e trabalhador da saúde.</p>
            </DestaqueLongo>

            {/* 2) Outubro Rosa */}
            <DestaqueLongo
  imgSrc="/banners/outubro-rosa.jpg"
  imgAlt="Arte da campanha Outubro Rosa"
  titulo="🌷 Outubro Rosa: um mês pela vida"
  subtitulo="Prevenção do câncer de mama"
  badge="Campanha"
>
  <p>
    Outubro é marcado mundialmente como o mês de conscientização sobre o câncer 
    de mama, uma das doenças que mais acometem mulheres no Brasil e no mundo.
    Esta campanha nasceu para lembrar a importância da prevenção e do diagnóstico
    precoce, que pode salvar milhares de vidas.
  </p>

  <p>
    A cor rosa que vemos iluminar prédios, ruas e símbolos neste mês não é apenas
    um detalhe visual: é um chamado para que todas as pessoas – mulheres e também
    homens, que em menor número também podem ser acometidos – estejam atentos aos
    cuidados com a saúde.
  </p>

  <p>
    <strong>💡 Prevenção e autocuidado</strong>
  </p>
  <p>
    Autoexame das mamas: deve ser feito regularmente, conhecendo o próprio corpo
    e identificando alterações como nódulos, retrações ou secreções.
  </p>
  <p>
    Consultas médicas e exames periódicos: a mamografia é o principal exame para
    o diagnóstico precoce e deve ser realizada conforme orientação médica,
    especialmente a partir dos 40 anos.
  </p>
  <p>
    Hábitos de vida saudáveis: manter uma alimentação equilibrada, praticar
    atividade física e evitar o consumo excessivo de álcool e tabaco são medidas
    que ajudam na prevenção.
  </p>

  <p>
    <strong>🌍 Um compromisso coletivo</strong>
  </p>
  <p>
    O Outubro Rosa é mais do que uma campanha: é um convite para o cuidado consigo
    mesmo e com quem está ao nosso lado. Compartilhe informações, incentive amigas,
    colegas e familiares a realizarem seus exames. Cada gesto pode fazer a
    diferença.
  </p>

  <p>
    <strong>Cuidar da saúde é um ato de amor e de coragem. Previna-se. Valorize a vida. 💖</strong>
  </p>
</DestaqueLongo>



          </div>
        </section>
      </div>

      <Footer /> {/* ⬅️ novo */}
    </>
  );
}

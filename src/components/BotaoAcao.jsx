// 📁 src/components/BotaoAcao.jsx
import PropTypes from "prop-types";

/**
 * Botão de ação compacto (chip).
 * - Compatível com a API antiga (label, icon, onClick, cor, disabled, loading, className).
 * - Gradiente 3 cores (solid), outline e ghost.
 * - Tamanhos xs/sm/md, shape arredondado, foco visível e a11y.
 * - Pode agir como link via href/target.
 */
export default function BotaoAcao({
  label,
  icon,
  onClick,
  cor = "blue",
  disabled = false,
  loading = false,
  className = "",

  // Novos (opcionais, retrocompatíveis)
  tone = "solid",            // "solid" | "outline" | "ghost"
  size = "md",               // "xs" | "sm" | "md"
  shape = "full",            // "full" | "lg" | "md"
  ariaLabel,                 // default = label
  title,                     // tooltip opcional
  href,                      // se definido, renderiza <a>
  target,
  rel,
}) {
  const sizeMap = {
    xs: "text-[11px] px-2 py-0.5 gap-1",
    sm: "text-xs px-2.5 py-1 gap-1.5",
    md: "text-xs px-3 py-1 gap-1.5",
  };

  const roundMap = {
    full: "rounded-full",
    lg: "rounded-xl",
    md: "rounded-lg",
  };

  // Paleta (cores institucionais + suas variações nomeadas)
  const palette = {
    blue:      { ring: "ring-blue-400",      solid: "from-blue-600 via-blue-700 to-blue-800 text-white border-blue-900/40",      outline: "text-blue-700 border-blue-400 dark:text-blue-300 dark:border-blue-600",      ghost: "text-blue-700 dark:text-blue-300" },
    purple:    { ring: "ring-purple-400",    solid: "from-purple-700 via-purple-800 to-purple-900 text-white border-purple-950/40", outline: "text-purple-700 border-purple-400 dark:text-purple-300 dark:border-purple-600", ghost: "text-purple-700 dark:text-purple-300" },
    green:     { ring: "ring-green-500",     solid: "from-green-700 via-green-800 to-green-900 text-white border-green-950/40",   outline: "text-green-700 border-green-400 dark:text-green-300 dark:border-green-600",   ghost: "text-green-700 dark:text-green-300" },
    gray:      { ring: "ring-gray-400",      solid: "from-gray-700 via-gray-800 to-gray-900 text-white border-gray-950/40",       outline: "text-gray-700 border-gray-400 dark:text-gray-300 dark:border-gray-600",      ghost: "text-gray-700 dark:text-gray-300" },
    red:       { ring: "ring-red-500",       solid: "from-red-600 via-red-700 to-red-800 text-white border-red-900/40",           outline: "text-red-700 border-red-400 dark:text-red-300 dark:border-red-600",          ghost: "text-red-700 dark:text-red-300" },
    orange:    { ring: "ring-orange-400",    solid: "from-orange-600 via-orange-700 to-orange-800 text-white border-orange-900/40",outline: "text-orange-700 border-orange-400 dark:text-orange-300 dark:border-orange-600",ghost: "text-orange-700 dark:text-orange-300" },
    verde:     { ring: "ring-emerald-600",   solid: "from-[#0f2c1f] via-[#114b2d] to-[#166534] text-white border-emerald-900/40", outline: "text-emerald-800 border-emerald-400 dark:text-emerald-200 dark:border-emerald-700", ghost: "text-emerald-800 dark:text-emerald-200" },
    amareloOuro:     { ring: "ring-amber-300",   solid: "from-amber-500 via-amber-600 to-amber-700 text-black border-amber-800/40",   outline: "text-amber-800 border-amber-400 dark:text-amber-200 dark:border-amber-700",   ghost: "text-amber-800 dark:text-amber-200" },
    laranjaQueimado: { ring: "ring-orange-400",  solid: "from-orange-600 via-orange-700 to-orange-800 text-white border-orange-900/40", outline: "text-orange-700 border-orange-400 dark:text-orange-300 dark:border-orange-600", ghost: "text-orange-700 dark:text-orange-300" },
    vermelhoCoral:   { ring: "ring-red-400",     solid: "from-red-500 via-red-600 to-red-700 text-white border-red-900/40",           outline: "text-red-600 border-red-400 dark:text-red-300 dark:border-red-600",           ghost: "text-red-600 dark:text-red-300" },
    azulPetroleo:    { ring: "ring-cyan-600",    solid: "from-cyan-800 via-cyan-900 to-slate-900 text-white border-cyan-950/50",      outline: "text-cyan-800 border-cyan-500 dark:text-cyan-200 dark:border-cyan-700",       ghost: "text-cyan-800 dark:text-cyan-200" },
  };

  const toneClasses = (() => {
    const p = palette[cor] || palette.blue;
    if (tone === "outline")
      return `bg-transparent border ${p.outline} hover:bg-black/5 dark:hover:bg-white/10`;
    if (tone === "ghost")
      return `bg-transparent ${p.ghost} hover:bg-black/5 dark:hover:bg-white/10 border border-transparent`;
    // solid
    return `bg-gradient-to-br ${p.solid} border hover:brightness-110`;
  })();

  const Tag = href ? "a" : "button";
  const commonProps = href
    ? {
        href,
        target,
        rel: rel ?? (target === "_blank" ? "noopener noreferrer" : undefined),
        role: "button",
        "aria-disabled": disabled || loading || undefined,
        onClick: disabled || loading ? (e) => e.preventDefault() : onClick,
      }
    : {
        type: "button",
        onClick: !disabled && !loading ? onClick : undefined,
        disabled: disabled || loading,
      };

  const base =
    "inline-flex items-center justify-center select-none " +
    "transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 " +
    "disabled:opacity-60 disabled:cursor-not-allowed";

  return (
    <Tag
      {...commonProps}
      title={title}
      aria-label={ariaLabel || label}
      aria-busy={loading || undefined}
      className={[
        base,
        sizeMap[size],
        roundMap[shape],
        toneClasses,
        className,
        // ring color (acompanha a paleta)
        (palette[cor]?.ring || palette.blue.ring),
      ].join(" ")}
    >
      {loading ? (
        <span
          className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin"
          aria-hidden="true"
        />
      ) : (
        icon && <span className="shrink-0" aria-hidden="true">{icon}</span>
      )}
      <span className="whitespace-nowrap">{label}</span>
    </Tag>
  );
}

BotaoAcao.propTypes = {
  label: PropTypes.string.isRequired,
  icon: PropTypes.node,
  onClick: PropTypes.func,
  cor: PropTypes.oneOf([
    "blue",
    "purple",
    "green",
    "gray",
    "red",
    "orange",
    "verde",
    "amareloOuro",
    "laranjaQueimado",
    "vermelhoCoral",
    "azulPetroleo",
  ]),
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
  className: PropTypes.string,

  // Novos
  tone: PropTypes.oneOf(["solid", "outline", "ghost"]),
  size: PropTypes.oneOf(["xs", "sm", "md"]),
  shape: PropTypes.oneOf(["full", "lg", "md"]),
  ariaLabel: PropTypes.string,
  title: PropTypes.string,
  href: PropTypes.string,
  target: PropTypes.string,
  rel: PropTypes.string,
};

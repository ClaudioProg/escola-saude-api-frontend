// 📁 src/services/api.js

// 🔧 Base URL vinda do .env (Vite). Ex.: https://escola-saude-api.onrender.com
const RAW_BASE = (import.meta.env.VITE_API_BASE_URL || "").trim();
// remove barras finais da base
export const API_BASE_URL = RAW_BASE.replace(/\/+$/, "");
const IS_DEV = !!import.meta.env.DEV;

// ⚠️ Alertas úteis em produção (diagnóstico rápido)
if (!IS_DEV) {
  if (!API_BASE_URL) {
    console.warn("[API] VITE_API_BASE_URL não definida em produção. As chamadas irão para caminhos relativos (/api/...). Se você não configurou rewrites no Vercel, isso causará 404.");
  }
  if (API_BASE_URL.startsWith("http://") && window.location.protocol === "https:") {
    console.error("[API] VITE_API_BASE_URL está em http:// enquanto o site está em https:// → Mixed Content. Use HTTPS na base da API.");
  }
}

// 🔑 Lê token salvo
const getToken = () => localStorage.getItem("token");

// 🧾 Headers padrão
function buildHeaders(auth = true, extra = {}) {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

// 🔗 Querystring
export function qs(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") q.append(k, v);
  });
  const s = q.toString();
  return s ? `?${s}` : "";
}

// 🧱 Erro enriquecido
class ApiError extends Error {
  constructor(message, { status, url, data } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.url = url;
    this.data = data;
  }
}

// 🛰️ Handler centralizado
async function handle(res, { on401 = "redirect", on403 = "silent" } = {}) {
  const url = res?.url || "";
  const status = res?.status;
  let text = "";
  let data = null;

  try { text = await res.text(); } catch {}

  try { data = text ? JSON.parse(text) : null; } catch { data = null; }

  if (IS_DEV) {
    const preview = data ?? text ?? "";
    console[(res.ok ? "log" : "warn")](
      `🛬 [${status}] ${url}`,
      typeof preview === "string" ? preview.slice(0, 500) : preview
    );
  }

  if (status === 401) {
    if (IS_DEV) console.error("⚠️ 401 recebido: limpando sessão");
    localStorage.clear();
    if (on401 === "redirect" && !location.pathname.startsWith("/login")) {
      window.location.assign("/login");
    }
    throw new ApiError(data?.erro || data?.message || "Não autorizado (401)", { status, url, data: data ?? text });
  }

  if (status === 403) {
    if (IS_DEV) console.warn("🚫 403 recebido: sem permissão");
    if (on403 === "redirect" && location.pathname !== "/dashboard") {
      window.location.assign("/dashboard");
    }
    throw new ApiError(data?.erro || data?.message || "Sem permissão (403)", { status, url, data: data ?? text });
  }

  if (!res.ok) {
    const msg = data?.erro || data?.message || text || `HTTP ${status}`;
    throw new ApiError(msg, { status, url, data: data ?? text });
  }

  return data;
}

// 🌐 Fetch centralizado
async function doFetch(path, { method = "GET", auth = true, headers, query, body, on401, on403 } = {}) {
  // garante que path tenha barra inicial
  const safePath = path.startsWith("/") ? path : `/${path}`;
  // monta URL: se não houver base, usa relativo (ex.: quando usando rewrites no Vercel)
  const url = `${API_BASE_URL}${safePath}${qs(query)}`;

  const init = {
    method,
    headers: buildHeaders(auth, headers),
    credentials: "include", // cookies entre domínios
  };

  if (body instanceof FormData) {
    const token = getToken();
    init.headers = {
      ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    };
    init.body = body;
  } else if (body !== undefined) {
    init.body = body ? JSON.stringify(body) : undefined;
  }

  if (IS_DEV) {
    const preview = body instanceof FormData ? "[FormData]" : body;
    console.log(`🛫 [${method}] ${url}`, { headers: init.headers, body: preview });
  }

  let res;
  try {
    res = await fetch(url, init);
  } catch (networkErr) {
    if (IS_DEV) console.error("🌩️ Erro de rede:", networkErr?.message || networkErr);
    throw new ApiError("Falha de rede ou CORS", { status: 0, url, data: networkErr });
  }

  return handle(res, { on401, on403 });
}

// -------- Métodos HTTP --------
export async function apiGet(path, opts = {})   { return doFetch(path, { method: "GET",    ...opts }); }
export async function apiPost(path, body, opts = {})  { return doFetch(path, { method: "POST",  body, ...opts }); }
export async function apiPut(path, body, opts = {})   { return doFetch(path, { method: "PUT",   body, ...opts }); }
export async function apiPatch(path, body, opts = {}) { return doFetch(path, { method: "PATCH", body, ...opts }); }
export async function apiDelete(path, opts = {})      { return doFetch(path, { method: "DELETE",       ...opts }); }

// Upload multipart
export async function apiUpload(path, formData, opts = {}) {
  return doFetch(path, { method: "POST", body: formData, ...opts });
}

// POST que retorna arquivo (Blob)
export async function apiPostFile(path, body, opts = {}) {
  const { auth = true, headers, query, on403 = "silent" } = opts;
  const token = localStorage.getItem("token");

  const safePath = path.startsWith("/") ? path : `/${path}`;
  const url = `${API_BASE_URL}${safePath}${qs(query)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
      Accept: "*/*",
      ...headers,
    },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) localStorage.clear();
  if (res.status === 403 && on403 === "silent") throw new Error("Sem permissão.");

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const txt = await res.text();
      msg = txt || msg;
      const json = JSON.parse(txt);
      msg = json?.erro || json?.message || msg;
    } catch {}
    throw new Error(msg);
  }

  const blob = await res.blob();
  const cd = res.headers.get("Content-Disposition") || "";
  const m = cd.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
  const filename = m ? decodeURIComponent(m[1]) : undefined;

  return { blob, filename };
}

// GET que retorna arquivo (Blob)
export async function apiGetFile(path, opts = {}) {
  const { auth = true, headers, query, on403 = "silent" } = opts;
  const token = localStorage.getItem("token");
  const safePath = path.startsWith("/") ? path : `/${path}`;
  const url = `${API_BASE_URL}${safePath}${qs(query)}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
      Accept: "*/*",
      ...headers,
    },
    credentials: "include",
  });

  if (res.status === 401) localStorage.clear();
  if (res.status === 403 && on403 === "silent") throw new Error("Sem permissão.");

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const txt = await res.text();
      msg = txt || msg;
      const json = JSON.parse(txt);
      msg = json?.erro || json?.message || msg;
    } catch {}
    throw new Error(msg);
  }

  const blob = await res.blob();
  const cd = res.headers.get("Content-Disposition") || "";
  const m = cd.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
  const filename = m ? decodeURIComponent(m[1]) : undefined;

  return { blob, filename };
}
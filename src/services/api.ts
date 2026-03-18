// API service — wraps calls to the Python backend (main.py)
// Configure VITE_API_URL in .env (defaults to http://localhost:8000)

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  return fetch(url, {
    ...options,
    headers: {
      ...(options?.headers || {}),
    },
  });
}

export interface Cliente {
  empresa: string;
  experience_url_etapas: string;
  experience_url_pedidos?: string;
  ativo: boolean;
}

export interface OSData {
  dados: Record<string, string>[];
  aba: string;
}

export async function fetchAbas(): Promise<string[]> {
  const resp = await apiFetch("/abas");
  if (!resp.ok) throw new Error("Falha ao carregar abas");
  const data = await resp.json();
  return data.abas || [];
}

export async function fetchOS(aba?: string): Promise<OSData> {
  const resp = await apiFetch(`/os${aba ? "?aba=" + aba : ""}`);
  if (!resp.ok) throw new Error("Falha ao carregar OS");
  return resp.json();
}

export async function fetchClientes(): Promise<Cliente[]> {
  const resp = await apiFetch("/clientes");
  if (!resp.ok) throw new Error("Falha ao carregar clientes");
  const data = await resp.json();
  return data.clientes || [];
}

export async function salvarCliente(cliente: { empresa: string; experience_url_etapas: string; ativo: boolean }) {
  const resp = await apiFetch("/clientes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cliente),
  });
  if (!resp.ok) throw new Error("Erro ao salvar cliente");
  return resp.json();
}

export async function toggleClienteAtivo(empresa: string, ativoAtual: boolean) {
  const resp = await apiFetch(`/clientes/${empresa}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ativo: !ativoAtual }),
  });
  if (!resp.ok) throw new Error("Erro ao atualizar status");
  return resp.json();
}

export async function executarAutomacao(payload: any[]) {
  const resp = await apiFetch("/executar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error("Falha ao disparar automação");
  return resp.json();
}

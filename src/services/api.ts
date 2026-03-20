// API service — wraps calls to the Python backend (main.py)
// Configure VITE_API_URL in .env (defaults to http://localhost:8000)

import { supabase } from "@/integrations/supabase/client";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function getAuthToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const token = await getAuthToken();

  return fetch(url, {
    ...options,
    headers: {
      ...(options?.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

export interface SaldoResult {
  codigo: string | null;
  hrs_alocadas: string | null;
  hrs_consumidas: string | null;
  saldo_horas: string | null;
  tipo_operacao: string | null;
  tipo: string | null;
  data_mais_recente: string | null;
  ultima_atualizacao: string | null;
}

// ── Abas ──
export async function fetchAbas(): Promise<string[]> {
  const resp = await apiFetch("/abas");
  if (!resp.ok) throw new Error("Falha ao carregar abas");
  const data = await resp.json();
  return data.abas || [];
}

// ── OS ──
export async function fetchOS(aba?: string): Promise<OSData> {
  const resp = await apiFetch(`/os${aba ? "?aba=" + encodeURIComponent(aba) : ""}`);
  if (!resp.ok) throw new Error("Falha ao carregar OS");
  return resp.json();
}

// ── Clientes ──
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
  const resp = await apiFetch(`/clientes/${encodeURIComponent(empresa)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ativo: !ativoAtual }),
  });
  if (!resp.ok) throw new Error("Erro ao atualizar status");
  return resp.json();
}

// ── Saldo de horas ──
export async function consultarSaldo(empresa: string): Promise<{ status: string; empresa: string; dados: SaldoResult }> {
  const resp = await apiFetch(`/saldo/${encodeURIComponent(empresa)}`);
  if (!resp.ok) throw new Error(`Erro ao consultar saldo de ${empresa}`);
  return resp.json();
}

export async function consultarSaldoMultiplo(empresas: string[]): Promise<{
  status: string;
  consultadas: number;
  dados: Record<string, SaldoResult>;
}> {
  const resp = await apiFetch("/saldo-multiplo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(empresas),
  });
  if (!resp.ok) throw new Error("Erro ao consultar saldos múltiplos");
  return resp.json();
}

// ── Cache ──
export async function fetchCache(): Promise<Record<string, SaldoResult>> {
  const resp = await apiFetch("/cache");
  if (!resp.ok) throw new Error("Falha ao carregar cache");
  return resp.json();
}

// ── Execução ──
export async function executarAutomacao(payload: any[]) {
  const resp = await apiFetch("/executar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error("Falha ao disparar automação");
  return resp.json();
}

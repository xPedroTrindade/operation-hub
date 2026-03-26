import { useState, useEffect, useCallback, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import { fetchAbas, fetchOS, fetchClientesSupabase, executarAutomacao } from "@/services/api";
import { supabase } from "@/integrations/supabase/client";
import {
  Rocket, Search, Filter, Loader2, Inbox,
  Terminal, X, CheckCircle2, XCircle, AlertCircle, ClipboardList,
} from "lucide-react";

type TipoLog = "sucesso" | "erro" | "aviso" | "info";
interface LogEntry {
  id: string;
  tipo: TipoLog;
  mensagem: string;
  hora: string;
  detalhe?: string;
  execucao_id: string | null;
  criado_em: string;
}

interface ExecucaoResumo {
  sucesso: number;
  falha: number;
  hora: string;
  execucao_id: string;
}

type OSRow = Record<string, string>;
type ViewAtual = "os" | "logs";

export default function AutomacaoOS() {
  const [dados, setDados] = useState<OSRow[]>([]);
  const [colunasFixas, setColunasFixas] = useState<string[]>([]);
  const [abaAtual, setAbaAtual] = useState<string>("");
  const [abas, setAbas] = useState<string[]>([]);
  const [clientesMap, setClientesMap] = useState<Record<string, string>>({});
  const [filtrosColuna, setFiltrosColuna] = useState<Record<string, string[]>>({});
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);

  const [viewAtual, setViewAtual] = useState<ViewAtual>("os");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [ultimaExecucao, setUltimaExecucao] = useState<ExecucaoResumo | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // ── Carrega histórico de logs do banco ──
  const carregarLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const { data, error } = await supabase
        .from("logs")
        .select("*")
        .eq("modulo", "automacao_os")
        .order("criado_em", { ascending: false })
        .limit(300);
      if (error) throw error;
      const entries: LogEntry[] = (data ?? []).map((r: any) => ({
        id: r.id,
        tipo: r.tipo as TipoLog,
        mensagem: r.mensagem,
        hora: new Date(r.criado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        detalhe: r.detalhe ?? undefined,
        execucao_id: r.execucao_id,
        criado_em: r.criado_em,
      }));
      setLogs(entries);
    } catch (err) {
      console.error("Erro ao carregar logs:", err);
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const [filtroAberto, setFiltroAberto] = useState<string | null>(null);
  const [filtroTempSelecao, setFiltroTempSelecao] = useState<string[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);

  const carregarDados = useCallback(async (aba?: string) => {
    setLoading(true);
    setSelectedRows(new Set());
    try {
      const [osData, clientes, abasData] = await Promise.all([
        fetchOS(aba),
        fetchClientesSupabase(),
        abas.length ? Promise.resolve(abas) : fetchAbas(),
      ]);

      const dadosFiltrados = (osData.dados || []).filter(
        (linha) => linha["executante"] && String(linha["executante"]).trim() !== ""
      );

      setDados(dadosFiltrados);
      setAbaAtual(osData.aba || aba || "");
      if (!abas.length) setAbas(abasData);

      const normalizar = (s: string) =>
        s.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      const map: Record<string, string> = {};
      clientes.forEach((c) => { map[normalizar(c.empresa)] = c.experience_url_etapas; });
      setClientesMap(map);

      if (dadosFiltrados.length) setColunasFixas(Object.keys(dadosFiltrados[0]));
      setFiltrosColuna({});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [abas.length]);

  useEffect(() => { carregarDados(); }, []);

  // Carrega histórico ao abrir a aba de logs
  useEffect(() => {
    if (viewAtual === "logs") carregarLogs();
  }, [viewAtual, carregarLogs]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setFiltroAberto(null);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const dadosFiltrados = dados.filter((linha) =>
    Object.entries(filtrosColuna).every(([col, valores]) =>
      valores.includes(String(linha[col] ?? ""))
    )
  );

  const handleExecutar = async () => {
    const linhasSelecionadas = dadosFiltrados.filter((_, i) => selectedRows.has(i));
    if (!linhasSelecionadas.length) return;

    setExecuting(true);

    // UUID único para agrupar todos os logs desta rodada
    const execucao_id = crypto.randomUUID();

    const { data: { user } } = await supabase.auth.getUser();
    const usuario_id = user?.id ?? null;

    const gravar = async (entries: { tipo: TipoLog; mensagem: string; detalhe?: string }[]) => {
      await supabase.from("logs").insert(
        entries.map((e) => ({
          modulo: "automacao_os",
          execucao_id,
          tipo: e.tipo,
          mensagem: e.mensagem,
          detalhe: e.detalhe ?? null,
          usuario_id,
        }))
      );
    };

    await gravar([{ tipo: "info", mensagem: `Automação iniciada — ${linhasSelecionadas.length} OS(s) selecionada(s)` }]);

    try {
      const normalizar = (s: string) =>
        (s || "").toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      const payload = linhasSelecionadas.map((linha) => {
        const empresaKey = normalizar(linha["cliente"] ?? "");
        const experience_url_etapas = clientesMap[empresaKey];
        if (!experience_url_etapas) {
          throw new Error(`Empresa "${linha["cliente"]}" não tem URL configurada — verifique o Painel Admin → Clientes`);
        }
        return {
          aba: abaAtual,
          empresa: linha["cliente"],
          usuario: linha["executante"],
          data: linha["Data"],
          hora_inicio: linha["Hora inicio"],
          hora_fim: linha["Hora fim"],
          ticket: linha["Tarefa"],
          experience_url_etapas,
          linha_id: linha["linha_id"],
        };
      });

      const res = await executarAutomacao(payload);
      const sucessos: any[] = res.sucesso ?? [];
      const falhas: any[] = res.falha ?? [];

      const entradas = [
        ...sucessos.map((item) => ({
          tipo: "sucesso" as TipoLog,
          mensagem: `OS lançada — ${item.usuario} | ${item.empresa} | ${item.data} | ${item.hora_inicio}–${item.hora_fim} | Ticket: ${item.ticket ?? "–"}`,
        })),
        ...falhas.map((item) => ({
          tipo: "erro" as TipoLog,
          mensagem: `Falha ao lançar — ${item.usuario} | ${item.empresa} | ${item.data} | Ticket: ${item.ticket ?? "–"}`,
          detalhe: item.motivo ?? "Motivo não informado",
        })),
      ];

      if (entradas.length) await gravar(entradas);

      const hora = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      setUltimaExecucao({ sucesso: sucessos.length, falha: falhas.length, hora, execucao_id });

      await carregarLogs();
      setViewAtual("logs");
      carregarDados(abaAtual);
    } catch (err: any) {
      await gravar([{ tipo: "erro", mensagem: `Erro ao executar automação — ${err.message || "Erro desconhecido"}` }]);
      await carregarLogs();
      setViewAtual("logs");
    } finally {
      setExecuting(false);
    }
  };

  const toggleCheckbox = (index: number) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  };

  const getStatusBadge = (valor: string) => {
    const v = valor.trim().toLowerCase();
    if (v === "pendente") return "bg-[hsl(var(--amber-light))] text-[hsl(var(--amber))]";
    if (/lan.*ada/.test(v) || v.includes("apontada")) return "bg-[hsl(var(--green-light))] text-primary";
    if (v === "erro") return "bg-[hsl(var(--red-light))] text-destructive";
    return "";
  };

  const abrirFiltro = (col: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const valores = [...new Set(dados.map((d) => String(d[col] ?? "")))].sort();
    setFiltroTempSelecao(filtrosColuna[col] ?? valores);
    setFiltroAberto(col);
  };

  const aplicarFiltro = () => {
    if (!filtroAberto) return;
    const allValues = [...new Set(dados.map((d) => String(d[filtroAberto] ?? "")))];
    if (filtroTempSelecao.length === 0 || filtroTempSelecao.length === allValues.length) {
      setFiltrosColuna((prev) => { const next = { ...prev }; delete next[filtroAberto]; return next; });
    } else {
      setFiltrosColuna((prev) => ({ ...prev, [filtroAberto]: filtroTempSelecao }));
    }
    setFiltroAberto(null);
  };

  return (
    <AppLayout title="Controle de OS" subtitle={`Aba ativa: ${abaAtual}`}>

      {/* ── Abas Google Sheets ── */}
      <section className="bg-card border border-border rounded-xl p-3 shadow-[var(--shadow-sm)] flex flex-wrap items-center gap-1.5">
        {abas.map((aba) => (
          <button
            key={aba}
            onClick={() => carregarDados(aba)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              aba === abaAtual
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            {aba}
          </button>
        ))}
      </section>

      {/* ── Actions + Sub-tabs ── */}
      <section className="bg-card border border-border rounded-xl p-3 shadow-[var(--shadow-sm)] flex flex-wrap items-center gap-2">
        {/* Executar */}
        <button
          onClick={handleExecutar}
          disabled={executing || selectedRows.size === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {executing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
          {executing ? "Executando..." : "Executar lançamentos"}
        </button>

        {/* Saldo de horas */}
        <button
          onClick={() => window.open("/saldo-horas", "_self")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground font-medium text-xs hover:bg-[hsl(var(--green-light))] transition-all"
        >
          <Search className="h-3.5 w-3.5" />
          Saldo de horas
        </button>

        {selectedRows.size > 0 && (
          <span className="text-[11px] text-muted-foreground font-mono">
            {selectedRows.size} selecionada{selectedRows.size > 1 ? "s" : ""}
          </span>
        )}

        {/* Sub-tabs */}
        <div className="ml-auto flex items-center gap-1 border border-border rounded-lg p-0.5 bg-background">
          <button
            onClick={() => setViewAtual("os")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
              viewAtual === "os"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ClipboardList className="h-3.5 w-3.5" />
            OS
          </button>
          <button
            onClick={() => setViewAtual("logs")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
              viewAtual === "logs"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Terminal className="h-3.5 w-3.5" />
            Log de Execução
            {logs.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                viewAtual === "logs" ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                {logs.length}
              </span>
            )}
          </button>
        </div>
      </section>

      {/* ══════════════════ VIEW: OS ══════════════════ */}
      {viewAtual === "os" && (
        <section className="bg-card border border-border rounded-xl shadow-[var(--shadow-sm)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="p-3 w-10" />
                  {colunasFixas.map((col) => (
                    <th key={col} className="p-3 text-left font-semibold text-muted-foreground whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        {col}
                        <button
                          onClick={(e) => abrirFiltro(col, e)}
                          className={`p-0.5 rounded transition-all ${
                            filtrosColuna[col] ? "text-primary" : "text-muted-foreground/40 hover:text-muted-foreground"
                          }`}
                        >
                          <Filter className="h-3 w-3" />
                        </button>
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      <td className="p-3"><div className="w-4 h-4 rounded bg-muted animate-pulse" /></td>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="p-3"><div className="w-20 h-3 rounded bg-muted animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                ) : dadosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={colunasFixas.length + 1} className="p-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Inbox className="h-8 w-8 text-muted-foreground/30" />
                        <span>Nenhum dado disponível</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  dadosFiltrados.map((linha, i) => {
                    const statusExp = String(linha["Status experience"] || "").trim().toLowerCase();
                    const podeSelecionar = statusExp === "pendente";
                    return (
                      <tr key={i} className="border-b border-border hover:bg-muted/30 transition-colors">
                        <td className="p-3">
                          <input
                            type="checkbox"
                            disabled={!podeSelecionar}
                            checked={selectedRows.has(i)}
                            onChange={() => toggleCheckbox(i)}
                            className="accent-primary rounded"
                          />
                        </td>
                        {colunasFixas.map((col) => {
                          const valor = String(linha[col] ?? "");
                          const badge = col === "Status experience" ? getStatusBadge(valor) : "";
                          return (
                            <td key={col} className="p-3 whitespace-nowrap" title={valor}>
                              {badge ? (
                                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${badge}`}>
                                  {valor}
                                </span>
                              ) : valor}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ══════════════════ VIEW: LOG DE EXECUÇÃO ══════════════════ */}
      {viewAtual === "logs" && (
        <section className="bg-card border border-border rounded-xl shadow-[var(--shadow-sm)] overflow-hidden">

          {/* Banner de resumo da última execução */}
          {ultimaExecucao && (
            <div className={`flex items-center justify-between px-5 py-3 border-b border-border ${
              ultimaExecucao.falha === 0
                ? "bg-green-50 border-green-200"
                : ultimaExecucao.sucesso === 0
                  ? "bg-red-50 border-red-200"
                  : "bg-amber-50 border-amber-200"
            }`}>
              <div className="flex items-center gap-3">
                {ultimaExecucao.falha === 0
                  ? <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                  : ultimaExecucao.sucesso === 0
                    ? <XCircle className="h-4 w-4 text-red-600 shrink-0" />
                    : <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                }
                <div>
                  <p className={`text-xs font-semibold ${
                    ultimaExecucao.falha === 0 ? "text-green-800" :
                    ultimaExecucao.sucesso === 0 ? "text-red-800" : "text-amber-800"
                  }`}>
                    Automação encerrada · log gerado às {ultimaExecucao.hora}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    <span className="text-green-700 font-semibold">{ultimaExecucao.sucesso} sucesso{ultimaExecucao.sucesso !== 1 ? "s" : ""}</span>
                    {" · "}
                    <span className={`font-semibold ${ultimaExecucao.falha > 0 ? "text-red-700" : "text-muted-foreground"}`}>
                      {ultimaExecucao.falha} falha{ultimaExecucao.falha !== 1 ? "s" : ""}
                    </span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setUltimaExecucao(null)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Header da lista de logs */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/20">
            <div className="flex items-center gap-2">
              <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-foreground">Histórico de execuções</span>
              {logs.length > 0 && (
                <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{logs.length} eventos</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={carregarLogs}
                disabled={loadingLogs}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted/60"
              >
                {loadingLogs ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
                Atualizar
              </button>
              {logs.length > 0 && (
                <button
                  onClick={async () => {
                    await supabase.from("logs").delete().eq("modulo", "automacao_os");
                    setLogs([]);
                    setUltimaExecucao(null);
                  }}
                  className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded hover:bg-destructive/10"
                >
                  <X className="h-3 w-3" /> Limpar histórico
                </button>
              )}
            </div>
          </div>

          {/* Lista de logs */}
          <div className="overflow-y-auto max-h-[480px] font-mono">
            {loadingLogs ? (
              <div className="flex items-center justify-center gap-2 p-12 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-xs">Carregando histórico...</span>
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center gap-2 p-12 text-center text-muted-foreground">
                <Terminal className="h-8 w-8 opacity-20" />
                <span className="text-xs">Nenhuma execução registrada ainda.</span>
                <span className="text-[11px] opacity-60">Execute lançamentos e o relatório aparecerá aqui.</span>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {logs.map((log) => (
                  <div key={log.id} className={`flex items-start gap-3 px-5 py-3 ${
                    log.tipo === "sucesso" ? "hover:bg-green-50/40" :
                    log.tipo === "erro"    ? "hover:bg-red-50/40" :
                    log.tipo === "aviso"   ? "hover:bg-amber-50/40" : "hover:bg-blue-50/40"
                  } transition-colors`}>
                    <span className="text-[10px] text-muted-foreground/60 whitespace-nowrap pt-0.5 min-w-[58px]">{log.hora}</span>
                    <span className={`flex items-center gap-1 text-[10px] font-bold whitespace-nowrap px-2 py-0.5 rounded-full ${
                      log.tipo === "sucesso" ? "bg-green-100 text-green-700" :
                      log.tipo === "erro"    ? "bg-red-100 text-red-700" :
                      log.tipo === "aviso"   ? "bg-amber-100 text-amber-700" :
                                              "bg-blue-100 text-blue-700"
                    }`}>
                      {log.tipo === "sucesso" && <CheckCircle2 className="h-3 w-3" />}
                      {log.tipo === "erro"    && <XCircle className="h-3 w-3" />}
                      {log.tipo === "aviso"   && <AlertCircle className="h-3 w-3" />}
                      {log.tipo.toUpperCase()}
                    </span>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-[11px] text-foreground/80 leading-relaxed break-words">{log.mensagem}</span>
                      {log.detalhe && (
                        <span className="text-[11px] text-red-600 font-medium">↳ {log.detalhe}</span>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            )}
          </div>
        </section>
      )}

      {/* Filter popover */}
      {filtroAberto && (
        <div
          ref={menuRef}
          className="fixed z-[200] bg-card border border-border rounded-xl shadow-[var(--shadow-lg)] p-4 min-w-[220px]"
          style={{ top: "200px", left: "50%", transform: "translateX(-50%)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
            <Filter className="h-3 w-3 text-primary" />
            {filtroAberto}
          </div>
          <div className="max-h-[200px] overflow-y-auto flex flex-col gap-1">
            {[...new Set(dados.map((d) => String(d[filtroAberto] ?? "")))].sort().map((v) => (
              <label key={v} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 px-2 py-1 rounded">
                <input
                  type="checkbox"
                  checked={filtroTempSelecao.includes(v)}
                  onChange={(e) => {
                    if (e.target.checked) setFiltroTempSelecao((p) => [...p, v]);
                    else setFiltroTempSelecao((p) => p.filter((x) => x !== v));
                  }}
                  className="accent-primary rounded"
                />
                {v || "(Em branco)"}
              </label>
            ))}
          </div>
          <div className="flex gap-2 mt-3 pt-2 border-t border-border">
            <button
              onClick={() => setFiltroTempSelecao([])}
              className="flex-1 px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-xs font-medium hover:bg-muted transition-all"
            >
              Limpar
            </button>
            <button
              onClick={aplicarFiltro}
              className="flex-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

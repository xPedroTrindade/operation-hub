import { useState, useEffect, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import { fetchAbas, fetchOS } from "@/services/api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import {
  Clock, Building2, Activity, TrendingUp, Search, Loader2,
  BarChart3, User, Download, FileSpreadsheet, FileText, X,
} from "lucide-react";
import {
  parsearHoras,
  minutosParaHoras,
  agruparPorEmpresa,
  calcularResumo,
  type OSRow,
} from "@/services/exportHelpers";
import { exportarExcelGeral, exportarExcelPorEmpresa } from "@/services/exportExcel";
import { exportarPDF } from "@/services/exportPDF";

const GREEN_PAL = [
  "#2e7d32","#43a047","#66bb6a","#81c784","#a5d6a7",
  "#1b5e20","#388e3c","#00c853","#69f0ae","#b9f6ca",
  "#33691e","#558b2f","#7cb342","#9ccc65","#aed581",
];

interface EmpresaResumo {
  empresa: string;
  linhas: OSRow[];
  totalMinutos: number;
  quantidade: number;
}

// ── Modal de seleção de empresas ──────────────────────────────────────────────
function ModalExport({
  resumo,
  modo,
  abaAtual,
  dadosGlobais,
  onClose,
}: {
  resumo: EmpresaResumo[];
  modo: "excel" | "pdf";
  abaAtual: string;
  dadosGlobais: OSRow[];
  onClose: () => void;
}) {
  const [selecionadas, setSelecionadas] = useState<Set<string>>(
    new Set(resumo.map((r) => r.empresa))
  );
  const [exportando, setExportando] = useState(false);

  const toggle = (empresa: string) =>
    setSelecionadas((prev) => {
      const next = new Set(prev);
      next.has(empresa) ? next.delete(empresa) : next.add(empresa);
      return next;
    });

  const handleExportar = async () => {
    setExportando(true);
    const filtro = [...selecionadas];
    try {
      if (modo === "pdf") {
        await exportarPDF(dadosGlobais, abaAtual, filtro);
      } else {
        exportarExcelPorEmpresa(dadosGlobais, abaAtual, filtro);
      }
    } finally {
      setExportando(false);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-2xl shadow-xl w-[480px] max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <p className="text-sm font-semibold text-foreground">
              {modo === "pdf" ? "Exportar PDF" : "Exportar Excel"} por empresa
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {selecionadas.size} de {resumo.length} selecionadas
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Ações rápidas */}
        <div className="flex gap-2 px-5 py-2 border-b border-border/50">
          <button
            onClick={() => setSelecionadas(new Set(resumo.map((r) => r.empresa)))}
            className="text-[11px] text-primary hover:underline"
          >
            Selecionar todas
          </button>
          <span className="text-muted-foreground">·</span>
          <button
            onClick={() => setSelecionadas(new Set())}
            className="text-[11px] text-muted-foreground hover:underline"
          >
            Desmarcar todas
          </button>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1">
          {resumo.map((r) => {
            const res = calcularResumo(r.linhas);
            return (
              <label
                key={r.empresa}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selecionadas.has(r.empresa)}
                  onChange={() => toggle(r.empresa)}
                  className="accent-primary h-4 w-4"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{r.empresa}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {res.qtd} atividade{res.qtd !== 1 ? "s" : ""} · {minutosParaHoras(res.minutos)}h
                  </p>
                </div>
              </label>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted/30"
          >
            Cancelar
          </button>
          <button
            onClick={handleExportar}
            disabled={selecionadas.size === 0 || exportando}
            className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium
                       disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {exportando ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
            {exportando ? "Exportando…" : `Exportar ${selecionadas.size}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function StatusReport() {
  const [abas, setAbas] = useState<string[]>([]);
  const [abaAtual, setAbaAtual] = useState<string>("");
  const [dadosGlobais, setDadosGlobais] = useState<OSRow[]>([]);
  const [resumo, setResumo] = useState<EmpresaResumo[]>([]);
  const [totalMinutosGeral, setTotalMinutosGeral] = useState(0);
  const [empresaAtiva, setEmpresaAtiva] = useState<EmpresaResumo | null>(null);
  const [buscaAtividade, setBuscaAtividade] = useState("");
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Export
  const [exportDropdown, setExportDropdown] = useState(false);
  const [modal, setModal] = useState<{ aberto: boolean; modo: "excel" | "pdf" }>({
    aberto: false,
    modo: "excel",
  });

  const abrirModal = (modo: "excel" | "pdf") => {
    setExportDropdown(false);
    setModal({ aberto: true, modo });
  };

  const carregarDados = useCallback(async (aba?: string) => {
    setLoading(true);
    setErro(null);
    setEmpresaAtiva(null);
    try {
      const json = await fetchOS(aba);
      const filtered = (json.dados || []).filter((l) => {
        if (!l["executante"] || String(l["executante"]).trim() === "") return false;
        const statusExp = String(l["Status experience"] || "").trim().toLowerCase();
        const statusOS = String(l["Status OS"] || "").trim().toLowerCase();
        return statusExp.includes("lançada") && statusOS.includes("apontada");
      });
      setDadosGlobais(filtered);
      if (aba) setAbaAtual(aba);
      montar(filtered);
    } catch (e) {
      setErro("Não foi possível carregar os dados do servidor.");
      setDadosGlobais([]);
      montar([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const carregarAbas = useCallback(async () => {
    try {
      const abasData = await fetchAbas();
      setAbas(abasData);
      if (abasData.length) carregarDados(abasData[0]);
      else carregarDados();
    } catch {
      carregarDados();
    }
  }, [carregarDados]);

  const montar = (dados: OSRow[]) => {
    const porEmpresa = agruparPorEmpresa(dados);
    const res = Object.entries(porEmpresa)
      .map(([empresa, linhas]) => ({
        empresa,
        linhas,
        totalMinutos: linhas.reduce(
          (acc, l) => acc + parsearHoras(l["Executado"] || l["executado"] || "0:00"), 0
        ),
        quantidade: linhas.length,
      }))
      .sort((a, b) => b.totalMinutos - a.totalMinutos);
    setResumo(res);
    setTotalMinutosGeral(res.reduce((a, r) => a + r.totalMinutos, 0));
  };

  useEffect(() => { carregarAbas(); }, [carregarAbas]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    if (!exportDropdown) return;
    const handler = () => setExportDropdown(false);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [exportDropdown]);

  const atividadesFiltradas = empresaAtiva
    ? empresaAtiva.linhas.filter((l) => {
        if (!buscaAtividade) return true;
        const q = buscaAtividade.toLowerCase();
        return (
          (l["Tarefa"] || l["tarefa"] || "").toLowerCase().includes(q) ||
          (l["executante"] || "").toLowerCase().includes(q)
        );
      })
    : [];

  const pctEmpresa =
    empresaAtiva && totalMinutosGeral
      ? Math.round((empresaAtiva.totalMinutos / totalMinutosGeral) * 100)
      : 0;

  const chartData = resumo.map((r) => ({ name: r.empresa, horas: +(r.totalMinutos / 60).toFixed(2) }));

  const kpis = [
    { label: "Total de horas",    value: minutosParaHoras(totalMinutosGeral), icon: Clock },
    { label: "Empresas atendidas",value: String(resumo.length),               icon: Building2 },
    { label: "Total de atividades",value: String(dadosGlobais.length),        icon: Activity },
    {
      label: "Média por empresa",
      value: resumo.length ? minutosParaHoras(Math.round(totalMinutosGeral / resumo.length)) : "0:00",
      icon: TrendingUp,
    },
  ];

  // Botão de export no header
  const exportHeader = (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      {/* Aba selector */}
      <div className="flex items-center gap-2">
        <select
          value={abaAtual}
          onChange={(e) => carregarDados(e.target.value)}
          className="text-xs border border-border rounded-lg px-3 py-1.5 bg-background text-foreground"
        >
          {abas.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>

        {/* Export dropdown */}
        <div className="relative">
          <button
            disabled={dadosGlobais.length === 0}
            onClick={() => setExportDropdown((v) => !v)}
            className="flex items-center gap-1.5 text-xs border border-border rounded-lg px-3 py-1.5
                       bg-background text-foreground hover:bg-muted/40 disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" />
            Exportar
          </button>

          {exportDropdown && (
            <div className="absolute right-0 top-full mt-1 w-52 bg-card border border-border rounded-xl
                            shadow-lg z-20 overflow-hidden">
              <button
                onClick={() => { exportarExcelGeral(dadosGlobais, abaAtual); setExportDropdown(false); }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-left hover:bg-muted/40"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-green-700" />
                Excel — todos os dados
              </button>
              <button
                onClick={() => abrirModal("excel")}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-left hover:bg-muted/40"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-green-700" />
                Excel — por empresa
              </button>
              <div className="border-t border-border/50 mx-3" />
              <button
                onClick={() => abrirModal("pdf")}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-left hover:bg-muted/40"
              >
                <FileText className="h-3.5 w-3.5 text-red-500" />
                PDF — por empresa
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {modal.aberto && (
        <ModalExport
          resumo={resumo}
          modo={modal.modo}
          abaAtual={abaAtual}
          dadosGlobais={dadosGlobais}
          onClose={() => setModal((m) => ({ ...m, aberto: false }))}
        />
      )}

      <AppLayout
        title="Status Report"
        subtitle="Consumo de horas por empresa"
        headerExtra={exportHeader}
      >
        {/* Erro */}
        {erro && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 text-xs text-destructive">
            {erro}
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} className="bg-card border border-border rounded-xl p-4 shadow-[var(--shadow-sm)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground font-mono">
                    {kpi.label}
                  </span>
                  <Icon className="h-4 w-4 text-primary/60" />
                </div>
                <div className={`text-2xl font-bold font-mono ${loading ? "animate-pulse text-muted" : "text-primary"}`}>
                  {loading ? "–" : kpi.value}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bar chart */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-[var(--shadow-sm)]">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="h-4 w-4 text-primary" />
            <span className="text-[13px] font-semibold text-foreground">Horas por empresa</span>
          </div>
          <p className="text-[11px] text-muted-foreground mb-4">Clique em uma barra para ver o detalhamento</p>
          <div className="h-[280px]">
            {loading ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-xs gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Carregando dados…
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
                Nenhum dado disponível para esta aba.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  onClick={(data) => {
                    if (data?.activePayload?.[0]) {
                      const name = data.activePayload[0].payload.name;
                      const r = resumo.find((x) => x.empresa === name);
                      if (r) setEmpresaAtiva(r);
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(120 20% 88%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(120 13% 54%)" }} angle={-20} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(120 13% 54%)" }} tickFormatter={(v) => `${v}h`} />
                  <Tooltip formatter={(value: number) => [`${minutosParaHoras(Math.round(value * 60))}`, "Horas"]} />
                  <Bar dataKey="horas" radius={[6, 6, 0, 0]}>
                    {chartData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={GREEN_PAL[i % GREEN_PAL.length] + "cc"}
                        stroke={GREEN_PAL[i % GREEN_PAL.length]}
                        strokeWidth={1.5}
                        cursor="pointer"
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Company chips */}
        <div>
          <p className="text-[13px] font-semibold text-foreground mb-1">
            {empresaAtiva ? empresaAtiva.empresa : "Selecione uma empresa"}
          </p>
          <p className="text-[11px] text-muted-foreground mb-3">
            {empresaAtiva
              ? `${empresaAtiva.quantidade} atividade${empresaAtiva.quantidade !== 1 ? "s" : ""} registrada${empresaAtiva.quantidade !== 1 ? "s" : ""}`
              : "Clique em uma barra do gráfico ou escolha abaixo"}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {resumo.map((r) => (
              <button
                key={r.empresa}
                onClick={() => { setEmpresaAtiva(r); setBuscaAtividade(""); }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                  empresaAtiva?.empresa === r.empresa
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border text-secondary-foreground hover:bg-[hsl(var(--green-light))] hover:border-primary/50"
                }`}
              >
                {r.empresa}
                <span className="ml-1.5 opacity-70 font-mono">{minutosParaHoras(r.totalMinutos)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Detail panel */}
        {empresaAtiva ? (
          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
            {/* Metrics card */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-[var(--shadow-sm)] flex flex-col gap-4">
              <div>
                <div className="text-[11px] text-muted-foreground font-mono uppercase">Total de horas</div>
                <div className="text-3xl font-bold text-primary font-mono">{minutosParaHoras(empresaAtiva.totalMinutos)}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[11px] text-muted-foreground">Atividades</div>
                  <div className="text-lg font-bold font-mono">{empresaAtiva.quantidade}</div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground">Média/atividade</div>
                  <div className="text-lg font-bold font-mono">
                    {minutosParaHoras(Math.round(empresaAtiva.totalMinutos / (empresaAtiva.quantidade || 1)))}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center relative">
                <PieChart width={150} height={150}>
                  <Pie
                    data={[{ value: pctEmpresa }, { value: 100 - pctEmpresa }]}
                    cx={70} cy={70} innerRadius={48} outerRadius={66}
                    dataKey="value" startAngle={90} endAngle={-270}
                  >
                    <Cell fill="hsl(123, 46%, 34%)" />
                    <Cell fill="hsl(123, 43%, 93%)" />
                  </Pie>
                </PieChart>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold font-mono">{pctEmpresa}%</span>
                  <small className="text-[10px] text-muted-foreground">do total</small>
                </div>
              </div>
            </div>

            {/* Activities list */}
            <div className="bg-card border border-border rounded-xl shadow-[var(--shadow-sm)] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                <span className="text-[13px] font-semibold text-foreground">Atividades realizadas</span>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <input
                    type="text"
                    value={buscaAtividade}
                    onChange={(e) => setBuscaAtividade(e.target.value)}
                    placeholder="Buscar atividade…"
                    className="text-xs border border-border rounded-lg pl-7 pr-3 py-1.5 bg-background text-foreground w-[200px]"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto max-h-[400px]">
                {atividadesFiltradas.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                    <Activity className="h-6 w-6 text-muted-foreground/30" />
                    Nenhuma atividade encontrada.
                  </div>
                ) : (
                  atividadesFiltradas.map((l, i) => (
                    <div key={i} className="flex items-center justify-between px-5 py-3 border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-foreground truncate">{l["Tarefa"] || l["tarefa"] || "–"}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                          <User className="h-3 w-3 inline" />
                          {l["executante"] || "–"}
                          {l["Data"] && <span className="opacity-60 ml-1">· {l["Data"]}</span>}
                        </div>
                      </div>
                      <div className="text-xs font-bold font-mono text-primary shrink-0 ml-3">
                        {l["Executado"] || l["executado"] || "–"}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl p-10 flex flex-col items-center justify-center text-muted-foreground gap-2 shadow-[var(--shadow-sm)]">
            <BarChart3 className="h-10 w-10 text-muted-foreground/25" />
            <span className="text-xs">Selecione uma empresa para ver o detalhamento</span>
          </div>
        )}
      </AppLayout>
    </>
  );
}

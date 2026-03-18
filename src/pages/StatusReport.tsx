import { useState, useEffect, useCallback, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import { fetchAbas, fetchOS } from "@/services/api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

const GREEN_PAL = [
  "#2e7d32","#43a047","#66bb6a","#81c784","#a5d6a7",
  "#1b5e20","#388e3c","#00c853","#69f0ae","#b9f6ca",
  "#33691e","#558b2f","#7cb342","#9ccc65","#aed581",
];

type OSRow = Record<string, string>;

interface EmpresaResumo {
  empresa: string;
  linhas: OSRow[];
  totalMinutos: number;
  quantidade: number;
}

function parsearHoras(str: string): number {
  if (!str || str === "–") return 0;
  const partes = str.trim().split(":");
  if (partes.length < 2) return 0;
  return parseInt(partes[0]) * 60 + parseInt(partes[1]);
}

function minutosParaHoras(min: number): string {
  if (!min || isNaN(min)) return "0:00";
  const h = Math.floor(min / 60);
  const m = String(min % 60).padStart(2, "0");
  return `${h}:${m}`;
}

export default function StatusReport() {
  const [abas, setAbas] = useState<string[]>([]);
  const [abaAtual, setAbaAtual] = useState<string>("");
  const [dadosGlobais, setDadosGlobais] = useState<OSRow[]>([]);
  const [resumo, setResumo] = useState<EmpresaResumo[]>([]);
  const [totalMinutosGeral, setTotalMinutosGeral] = useState(0);
  const [empresaAtiva, setEmpresaAtiva] = useState<EmpresaResumo | null>(null);
  const [buscaAtividade, setBuscaAtividade] = useState("");
  const [loading, setLoading] = useState(true);

  // Export modal
  const [modalAberto, setModalAberto] = useState(false);
  const [exportSelecionadas, setExportSelecionadas] = useState<Set<string>>(new Set());

  const carregarAbas = useCallback(async () => {
    try {
      const abasData = await fetchAbas();
      setAbas(abasData);
      if (abasData.length) carregarDados(abasData[0]);
    } catch (err) {
      console.warn("Erro ao carregar abas:", err);
      carregarDados();
    }
  }, []);

  const carregarDados = async (aba?: string) => {
    setLoading(true);
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
    } catch (err) {
      console.warn("Erro ao carregar dados:", err);
      // Demo data
      const demo = gerarDemo();
      setDadosGlobais(demo);
      montar(demo);
    } finally {
      setLoading(false);
    }
  };

  const gerarDemo = (): OSRow[] => {
    const empresas = ["Quallymotos","Vortx","Indmed","JKC","Livo","Hidrogas","Kitoplastic"];
    const execs = ["Amanda Moura","Thiago Sanchez","Yuri Lima","Pedro Costa"];
    const tarefas = [
      "Configuração de relatório de vendas",
      "Ajuste no módulo de notas fiscais",
      "Criação de tela personalizada",
      "Correção de bug no processo de compras",
    ];

    return Array.from({ length: 60 }, (_, i) => ({
      cliente: empresas[i % empresas.length],
      executante: execs[i % execs.length],
      Tarefa: tarefas[i % tarefas.length],
      Executado: `0${Math.floor(Math.random() * 3)}:${String(Math.floor(Math.random() * 59)).padStart(2, "0")}`,
      Data: new Date(2026, 2, (i % 28) + 1).toLocaleDateString("pt-BR"),
      "Status experience": "OS Lançada",
    }));
  };

  const montar = (dados: OSRow[]) => {
    const porEmpresa: Record<string, OSRow[]> = {};
    dados.forEach((l) => {
      const emp = (l["cliente"] || l["Cliente"] || "").trim() || "Sem cliente";
      if (!porEmpresa[emp]) porEmpresa[emp] = [];
      porEmpresa[emp].push(l);
    });

    const res = Object.entries(porEmpresa)
      .map(([empresa, linhas]) => ({
        empresa,
        linhas,
        totalMinutos: linhas.reduce((acc, l) => acc + parsearHoras(l["Executado"] || l["executado"] || "0:00"), 0),
        quantidade: linhas.length,
      }))
      .sort((a, b) => b.totalMinutos - a.totalMinutos);

    const total = res.reduce((a, r) => a + r.totalMinutos, 0);
    setResumo(res);
    setTotalMinutosGeral(total);
  };

  useEffect(() => {
    carregarAbas();
  }, []);

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

  const pctEmpresa = empresaAtiva && totalMinutosGeral
    ? Math.round((empresaAtiva.totalMinutos / totalMinutosGeral) * 100)
    : 0;

  const chartData = resumo.map((r) => ({
    name: r.empresa,
    horas: +(r.totalMinutos / 60).toFixed(2),
  }));

  return (
    <AppLayout
      title="Status Report"
      subtitle="Consumo de horas por empresa"
      headerExtra={
        <select
          value={abaAtual}
          onChange={(e) => carregarDados(e.target.value)}
          className="text-xs border border-border rounded-lg px-3 py-1.5 bg-background text-foreground"
        >
          {abas.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      }
    >
      {/* KPIs */}
      <div className="text-[13px] font-semibold text-foreground">Visão Geral</div>
      <div className="text-[11px] text-muted-foreground -mt-3">Total consolidado de todas as empresas na aba selecionada</div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total de horas", value: minutosParaHoras(totalMinutosGeral) },
          { label: "Empresas atendidas", value: String(resumo.length) },
          { label: "Total de atividades", value: String(dadosGlobais.length) },
          { label: "Média por empresa", value: resumo.length ? minutosParaHoras(Math.round(totalMinutosGeral / resumo.length)) : "0:00" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-card border border-border rounded-xl p-4 shadow-[var(--shadow-sm)]">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground font-mono">{kpi.label}</div>
            <div className={`text-2xl font-bold font-mono mt-1 ${loading ? "animate-pulse text-muted" : "text-primary"}`}>
              {loading ? "–" : kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-[var(--shadow-sm)]">
        <div className="text-[13px] font-semibold text-foreground">Horas por empresa</div>
        <div className="text-[11px] text-muted-foreground mb-4">Clique em uma barra para ver o detalhamento</div>
        <div className="h-[280px]">
          {loading ? (
            <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
              Carregando dados…
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} onClick={(data) => {
                if (data?.activePayload?.[0]) {
                  const name = data.activePayload[0].payload.name;
                  const r = resumo.find((x) => x.empresa === name);
                  if (r) setEmpresaAtiva(r);
                }
              }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(120 20% 85%)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#8aa88a" }} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11, fill: "#8aa88a" }} tickFormatter={(v) => `${v}h`} />
                <Tooltip formatter={(value: number) => [`${minutosParaHoras(Math.round(value * 60))} horas`, "Horas"]} />
                <Bar dataKey="horas" radius={[8, 8, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={GREEN_PAL[i % GREEN_PAL.length] + "bb"} stroke={GREEN_PAL[i % GREEN_PAL.length]} strokeWidth={2} cursor="pointer" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Company chips */}
      <div className="text-[13px] font-semibold text-foreground">
        {empresaAtiva ? empresaAtiva.empresa : "Selecione uma empresa"}
      </div>
      <div className="text-[11px] text-muted-foreground -mt-3">
        {empresaAtiva
          ? `${empresaAtiva.quantidade} atividade${empresaAtiva.quantidade !== 1 ? "s" : ""} registrada${empresaAtiva.quantidade !== 1 ? "s" : ""}`
          : "Clique em uma barra do gráfico ou escolha abaixo"}
      </div>

      <div className="flex flex-wrap gap-2">
        {resumo.map((r) => (
          <button
            key={r.empresa}
            onClick={() => { setEmpresaAtiva(r); setBuscaAtividade(""); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
              empresaAtiva?.empresa === r.empresa
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border text-secondary-foreground hover:bg-green-light hover:border-primary"
            }`}
          >
            {r.empresa}
            <span className="ml-1.5 opacity-70 font-mono">{minutosParaHoras(r.totalMinutos)}</span>
          </button>
        ))}
      </div>

      {/* Detail panel */}
      {empresaAtiva ? (
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
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
            {/* Mini donut */}
            <div className="flex items-center justify-center relative">
              <PieChart width={160} height={160}>
                <Pie
                  data={[{ value: pctEmpresa }, { value: 100 - pctEmpresa }]}
                  cx={75}
                  cy={75}
                  innerRadius={50}
                  outerRadius={70}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                >
                  <Cell fill="#2e7d32" />
                  <Cell fill="#e8f5e9" />
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
              <input
                type="text"
                value={buscaAtividade}
                onChange={(e) => setBuscaAtividade(e.target.value)}
                placeholder="🔍 Buscar atividade…"
                className="text-xs border border-border rounded-lg px-3 py-1.5 bg-background text-foreground w-[200px]"
              />
            </div>
            <div className="flex-1 overflow-y-auto max-h-[400px]">
              {atividadesFiltradas.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">Nenhuma atividade encontrada.</div>
              ) : (
                atividadesFiltradas.map((l, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-3 border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <div>
                      <div className="text-xs font-medium text-foreground">{l["Tarefa"] || l["tarefa"] || "–"}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        👤 {l["executante"] || "–"}
                        {l["Data"] && <span className="ml-1.5 opacity-60">· {l["Data"]}</span>}
                      </div>
                    </div>
                    <div className="text-xs font-bold font-mono text-primary">{l["Executado"] || l["executado"] || "–"}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-10 flex flex-col items-center justify-center text-muted-foreground gap-2 shadow-[var(--shadow-sm)]">
          <div className="text-3xl">📊</div>
          <div className="text-xs">Selecione uma empresa para ver o detalhamento</div>
        </div>
      )}
    </AppLayout>
  );
}

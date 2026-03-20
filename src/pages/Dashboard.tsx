import AppLayout from "@/components/AppLayout";
import { Clock, ClipboardList, CheckCircle2, AlertTriangle, TrendingUp, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const kpis = [
  { label: "Pendentes hoje", value: "-", sub: "OS com status Pendente na data atual", icon: Clock, variant: "amber" as const },
  { label: "Total pendentes", value: "-", sub: "Todas as OS ainda não lançadas", icon: ClipboardList, variant: "amber" as const },
  { label: "Lançadas", value: "-", sub: "OS com status Lançada ou Apontada", icon: CheckCircle2, variant: "green" as const },
  { label: "Com erro", value: "-", sub: "OS que falharam no lançamento", icon: AlertTriangle, variant: "red" as const },
];

const variantStyles = {
  amber: { bg: "bg-[hsl(var(--amber-light))]", text: "text-[hsl(var(--amber))]" },
  green: { bg: "bg-[hsl(var(--green-light))]", text: "text-primary" },
  red:   { bg: "bg-[hsl(var(--red-light))]", text: "text-destructive" },
};

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <AppLayout title="Dashboard" subtitle="Visão geral das ordens de serviço">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon;
          const style = variantStyles[kpi.variant];
          return (
            <div
              key={kpi.label}
              className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3 shadow-[var(--shadow-sm)] animate-fade-up"
              style={{ animationDelay: `${0.05 + i * 0.06}s` }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground font-mono">
                  {kpi.label}
                </span>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${style.bg}`}>
                  <Icon className={`h-[18px] w-[18px] ${style.text}`} />
                </div>
              </div>
              <div className={`text-[30px] font-bold tracking-tight leading-none font-mono ${style.text}`}>
                {kpi.value}
              </div>
              <div className="text-[11px] text-muted-foreground leading-relaxed">{kpi.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Charts placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-up" style={{ animationDelay: "0.3s" }}>
        <div className="bg-card border border-border rounded-xl p-5 shadow-[var(--shadow-sm)]">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-[13px] font-semibold text-foreground">Pendentes por data</span>
          </div>
          <div className="text-[11px] text-muted-foreground mb-4">Quantidade de OS pendentes agrupadas por data</div>
          <div className="h-[220px] flex items-center justify-center text-muted-foreground text-xs border border-dashed border-border rounded-lg">
            Dados serão carregados ao conectar a automação
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 shadow-[var(--shadow-sm)]">
          <div className="flex items-center gap-2 mb-1">
            <ClipboardList className="h-4 w-4 text-primary" />
            <span className="text-[13px] font-semibold text-foreground">Pendentes por executante</span>
          </div>
          <div className="text-[11px] text-muted-foreground mb-4">Distribuição das OS pendentes por pessoa</div>
          <div className="h-[220px] flex items-center justify-center text-muted-foreground text-xs border border-dashed border-border rounded-lg">
            Dados serão carregados ao conectar a automação
          </div>
        </div>
      </div>

      {/* Table placeholder */}
      <div className="bg-card border border-border rounded-xl shadow-[var(--shadow-sm)] overflow-hidden animate-fade-up" style={{ animationDelay: "0.4s" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[hsl(var(--amber))]" />
            <h3 className="text-[13px] font-semibold text-foreground">OS pendentes hoje</h3>
          </div>
          <button
            onClick={() => navigate("/automacao-os")}
            className="text-xs text-primary font-medium flex items-center gap-1 hover:underline"
          >
            Ver todas <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2 text-xs">
          <ClipboardList className="h-8 w-8 text-muted-foreground/40" />
          Nenhum dado disponível ainda
        </div>
      </div>
    </AppLayout>
  );
}

import AppLayout from "@/components/AppLayout";

const kpis = [
  { label: "Pendentes hoje", value: "-", sub: "OS com status Pendente na data atual", icon: "⏳", color: "ella-amber" },
  { label: "Total pendentes", value: "-", sub: "Todas as OS ainda não lançadas", icon: "📋", color: "ella-amber" },
  { label: "Lançadas", value: "-", sub: "OS com status Lançada ou Apontada", icon: "✅", color: "green-primary" },
  { label: "Com erro", value: "-", sub: "OS que falharam no lançamento", icon: "⚠️", color: "ella-red" },
];

export default function Dashboard() {
  return (
    <AppLayout title="Dashboard" subtitle="Visão geral das ordens de serviço">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <div
            key={kpi.label}
            className="bg-card border border-border rounded-xl p-5 flex flex-col gap-2.5 shadow-[var(--shadow-sm)] animate-fade-up"
            style={{ animationDelay: `${0.05 + i * 0.05}s` }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground font-mono">
                {kpi.label}
              </span>
              <div className={`w-[34px] h-[34px] rounded-lg flex items-center justify-center text-base ${
                kpi.color === "ella-amber" ? "bg-ella-amber-light" :
                kpi.color === "green-primary" ? "bg-green-light" :
                "bg-ella-red-light"
              }`}>
                {kpi.icon}
              </div>
            </div>
            <div className={`text-[30px] font-bold tracking-tight leading-none font-mono ${
              kpi.color === "ella-amber" ? "text-ella-amber" :
              kpi.color === "green-primary" ? "text-primary" :
              "text-ella-red"
            }`}>
              {kpi.value}
            </div>
            <div className="text-[11px] text-muted-foreground">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-up" style={{ animationDelay: "0.25s" }}>
        <div className="bg-card border border-border rounded-xl p-5 shadow-[var(--shadow-sm)]">
          <div className="text-[13px] font-semibold text-foreground">Pendentes por data</div>
          <div className="text-[11px] text-muted-foreground mb-4">Quantidade de OS pendentes agrupadas por data</div>
          <div className="h-[220px] flex items-center justify-center text-muted-foreground text-xs">
            Dados serão carregados ao conectar a automação
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 shadow-[var(--shadow-sm)]">
          <div className="text-[13px] font-semibold text-foreground">Pendentes por executante</div>
          <div className="text-[11px] text-muted-foreground mb-4">Distribuição das OS pendentes por pessoa</div>
          <div className="h-[220px] flex items-center justify-center text-muted-foreground text-xs">
            Dados serão carregados ao conectar a automação
          </div>
        </div>
      </div>

      {/* Table placeholder */}
      <div className="bg-card border border-border rounded-xl shadow-[var(--shadow-sm)] overflow-hidden animate-fade-up" style={{ animationDelay: "0.35s" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-[13px] font-semibold text-foreground">⏳ OS pendentes hoje</h3>
          <span className="text-xs text-primary font-medium cursor-pointer hover:underline">Ver todas →</span>
        </div>
        <div className="flex flex-col items-center justify-center py-9 text-muted-foreground gap-2.5 text-xs">
          Nenhum dado disponível ainda
        </div>
      </div>
    </AppLayout>
  );
}

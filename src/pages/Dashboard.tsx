import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import { LogOut } from "lucide-react";

const navItems = [
  { label: "Dashboard", icon: "🏠", href: "/" },
];

const toolItems = [
  { label: "Automação de OS", icon: "🤖", href: "/automacao-os" },
  { label: "Gerador de Email OS", icon: "📧", href: "/gerador-email" },
  { label: "Status Report", icon: "📊", href: "/status-report" },
  { label: "Análise de Horas", icon: "⏱️", href: "/analisador-horas" },
  { label: "Saldo de Horas", icon: "🔎", href: "/saldo-horas" },
  { label: "Status OS / consultor", icon: "📊", href: "/status-os-consultor" },
];

const systemItems = [
  { label: "Painel Admin", icon: "⚙️", href: "/admin" },
];

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  const hoje = new Date();
  const dataFormatada = hoje.toLocaleDateString("pt-BR", {
    weekday: "short", day: "2-digit", month: "short", year: "numeric",
  });

  const kpis = [
    { label: "Pendentes hoje", value: "-", sub: "OS com status Pendente na data atual", icon: "⏳", color: "ella-amber" },
    { label: "Total pendentes", value: "-", sub: "Todas as OS ainda não lançadas", icon: "📋", color: "ella-amber" },
    { label: "Lançadas", value: "-", sub: "OS com status Lançada ou Apontada", icon: "✅", color: "green-primary" },
    { label: "Com erro", value: "-", sub: "OS que falharam no lançamento", icon: "⚠️", color: "ella-red" },
  ];

  return (
    <div className="flex min-h-screen bg-background text-foreground text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Sidebar */}
      <aside className="w-[230px] bg-card border-r border-border flex flex-col fixed top-0 left-0 h-screen z-[100] shadow-[var(--shadow-md)]">
        <div className="px-5 py-[22px] border-b border-border flex items-center gap-2.5">
          <div className="w-[34px] h-[34px] rounded-lg bg-green-light flex items-center justify-center text-lg">
            🤖
          </div>
          <div>
            <strong className="block text-[15px] font-bold text-primary tracking-tight">ELLA OS</strong>
            <span className="text-[10px] text-muted-foreground tracking-wide">Sankhya Bandeirantes</span>
          </div>
        </div>

        <nav className="flex-1 py-3.5 px-2.5 flex flex-col gap-0.5 overflow-y-auto">
          <div className="text-[10px] font-semibold uppercase tracking-[1px] text-muted-foreground px-2.5 py-2.5">
            Principal
          </div>
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={(e) => { e.preventDefault(); navigate(item.href); }}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all ${
                location.pathname === item.href
                  ? "bg-green-light text-primary font-semibold"
                  : "text-secondary-foreground hover:bg-green-light hover:text-primary"
              }`}
            >
              <span className="text-[15px] w-5 text-center shrink-0">{item.icon}</span>
              {item.label}
            </a>
          ))}

          <div className="text-[10px] font-semibold uppercase tracking-[1px] text-muted-foreground px-2.5 pt-4 pb-1">
            Ferramentas
          </div>
          {toolItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={(e) => { e.preventDefault(); navigate(item.href); }}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all ${
                location.pathname === item.href
                  ? "bg-green-light text-primary font-semibold"
                  : "text-secondary-foreground hover:bg-green-light hover:text-primary"
              }`}
            >
              <span className="text-[15px] w-5 text-center shrink-0">{item.icon}</span>
              {item.label}
            </a>
          ))}

          <div className="text-[10px] font-semibold uppercase tracking-[1px] text-muted-foreground px-2.5 pt-4 pb-1">
            Sistema
          </div>
          {systemItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={(e) => { e.preventDefault(); navigate(item.href); }}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all ${
                location.pathname === item.href
                  ? "bg-green-light text-primary font-semibold"
                  : "text-secondary-foreground hover:bg-green-light hover:text-primary"
              }`}
            >
              <span className="text-[15px] w-5 text-center shrink-0">{item.icon}</span>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="px-5 py-3.5 border-t border-border text-[11px] text-muted-foreground">
          v1.0 – Sankhya Experience
        </div>
      </aside>

      {/* Main */}
      <div className="ml-[230px] flex-1 flex flex-col">
        {/* Topbar */}
        <div className="h-[60px] bg-card border-b border-border flex items-center justify-between px-7 sticky top-0 z-50">
          <div>
            <h2 className="text-base font-semibold text-foreground">Dashboard</h2>
            <span className="text-xs text-muted-foreground block">Visão geral das ordens de serviço</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-xs text-muted-foreground font-mono">{user?.email}</span>
            <div className="text-xs text-muted-foreground font-mono bg-background px-2.5 py-1.5 rounded-md border border-border">
              {dataFormatada}
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors ml-2"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sair
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-7 flex flex-col gap-5">
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
        </div>
      </div>
    </div>
  );
}

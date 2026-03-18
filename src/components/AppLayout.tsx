import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import { LogOut } from "lucide-react";
import { ReactNode } from "react";

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

interface AppLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
  headerExtra?: ReactNode;
}

export default function AppLayout({ children, title, subtitle, headerExtra }: AppLayoutProps) {
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

  const renderNavSection = (items: typeof navItems) =>
    items.map((item) => (
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
    ));

  return (
    <div className="flex min-h-screen bg-background text-foreground text-sm font-sans">
      {/* Sidebar */}
      <aside className="w-[230px] bg-card border-r border-border flex flex-col fixed top-0 left-0 h-screen z-[100] shadow-[var(--shadow-md)]">
        <div className="px-5 py-[22px] border-b border-border flex items-center gap-2.5">
          <div className="w-[34px] h-[34px] rounded-lg bg-green-light flex items-center justify-center text-lg">🤖</div>
          <div>
            <strong className="block text-[15px] font-bold text-primary tracking-tight">ELLA OS</strong>
            <span className="text-[10px] text-muted-foreground tracking-wide">Sankhya Bandeirantes</span>
          </div>
        </div>

        <nav className="flex-1 py-3.5 px-2.5 flex flex-col gap-0.5 overflow-y-auto">
          <div className="text-[10px] font-semibold uppercase tracking-[1px] text-muted-foreground px-2.5 py-2.5">Principal</div>
          {renderNavSection(navItems)}

          <div className="text-[10px] font-semibold uppercase tracking-[1px] text-muted-foreground px-2.5 pt-4 pb-1">Ferramentas</div>
          {renderNavSection(toolItems)}

          <div className="text-[10px] font-semibold uppercase tracking-[1px] text-muted-foreground px-2.5 pt-4 pb-1">Sistema</div>
          {renderNavSection(systemItems)}
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
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            <span className="text-xs text-muted-foreground block">{subtitle}</span>
          </div>
          <div className="flex items-center gap-2.5">
            {headerExtra}
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
          {children}
        </div>
      </div>
    </div>
  );
}

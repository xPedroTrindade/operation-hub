import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Bot, Mail, BarChart3, Clock, Search,
  Users, Settings, LogOut, CalendarDays, Building2, ClipboardList,
} from "lucide-react";
import { ReactNode } from "react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

const mainItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
];

const toolItems = [
  { label: "Automação de OS", icon: Bot, href: "/automacao-os" },
  { label: "Lançamento de OS", icon: ClipboardList, href: "/lancamento-os" },
  { label: "Gerador de Email", icon: Mail, href: "/gerador-email" },
  { label: "Status Report", icon: BarChart3, href: "/status-report" },
  { label: "Análise de Horas", icon: Clock, href: "/analisador-horas" },
  { label: "Saldo de Horas", icon: Search, href: "/saldo-horas" },
  { label: "Status Consultor", icon: Users, href: "/status-os-consultor" },
];

const cadastroItems = [
  { label: "Clientes", icon: Building2, href: "/clientes" },
];

const systemItems = [
  { label: "Painel Admin", icon: Settings, href: "/admin" },
];

interface AppLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
  headerExtra?: ReactNode;
}

function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const renderGroup = (label: string, items: typeof mainItems) => (
    <SidebarGroup>
      <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[1.2px] text-sidebar-foreground/50 px-3">
        {!collapsed && label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={isActive(item.href)}
                tooltip={collapsed ? item.label : undefined}
              >
                <NavLink
                  to={item.href}
                  end
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <div className="px-4 py-5 flex items-center gap-2.5 border-b border-sidebar-border min-h-[68px]">
        <div className="w-8 h-8 rounded-lg bg-sidebar-accent flex items-center justify-center shrink-0">
          <Bot className="h-4.5 w-4.5 text-sidebar-primary" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <strong className="block text-[14px] font-bold text-sidebar-primary tracking-tight leading-tight">ELLA OS</strong>
            <span className="text-[10px] text-sidebar-foreground/50 tracking-wide leading-tight">Sankhya Bandeirantes</span>
          </div>
        )}
      </div>

      <SidebarContent className="py-2">
        {renderGroup("Principal", mainItems)}
        {renderGroup("Ferramentas", toolItems)}
        {renderGroup("Cadastros", cadastroItems)}
        {renderGroup("Sistema", systemItems)}
      </SidebarContent>

      {!collapsed && (
        <div className="px-4 py-3 border-t border-sidebar-border">
          <span className="text-[10px] text-sidebar-foreground/40 font-mono">v1.0 – Sankhya Experience</span>
        </div>
      )}
    </Sidebar>
  );
}

export default function AppLayout({ children, title, subtitle, headerExtra }: AppLayoutProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  const hoje = new Date();
  const dataFormatada = hoje.toLocaleDateString("pt-BR", {
    weekday: "short", day: "2-digit", month: "short", year: "numeric",
  });

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background text-foreground text-sm font-sans">
        <AppSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Topbar */}
          <header className="h-[56px] bg-card border-b border-border flex items-center justify-between px-4 lg:px-6 sticky top-0 z-50 shrink-0">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <Separator orientation="vertical" className="h-5" />
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-foreground truncate">{title}</h2>
                <span className="text-[11px] text-muted-foreground block truncate">{subtitle}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {headerExtra}
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground font-mono truncate max-w-[180px]">{user?.email}</span>
                <div className="text-[11px] text-muted-foreground font-mono bg-background px-2 py-1 rounded-md border border-border flex items-center gap-1.5">
                  <CalendarDays className="h-3 w-3" />
                  {dataFormatada}
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-destructive transition-colors ml-1 px-2 py-1.5 rounded-lg hover:bg-destructive/10"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 p-4 lg:p-6 flex flex-col gap-4">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

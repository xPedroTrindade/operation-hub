import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LogOut, Zap, FileText, Settings, BarChart3 } from "lucide-react";

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  const cards = [
    { icon: Zap, title: "Controle de OS", desc: "Automação de lançamentos", color: "text-primary" },
    { icon: FileText, title: "Status Report", desc: "Comparação de tickets", color: "text-accent" },
    { icon: BarChart3, title: "Analisador de Horas", desc: "Análise de OS por consultor", color: "text-primary" },
    { icon: Settings, title: "Painel Admin", desc: "Configuração de projetos", color: "text-muted-foreground" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-14">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="text-xs font-mono font-medium text-primary tracking-wider uppercase">ELLA OS</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground font-mono">{user?.email}</span>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ease: [0.2, 0.8, 0.2, 1] }}
        >
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Bem-vindo de volta. Selecione um módulo para começar.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          {cards.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05, ease: [0.2, 0.8, 0.2, 1] }}
              className="group p-5 rounded-xl bg-card border border-border hover:border-primary/30 transition-all duration-200 cursor-pointer hover:shadow-[var(--shadow-glow)]"
            >
              <div className={`w-10 h-10 rounded-lg bg-surface-elevated border border-border flex items-center justify-center mb-4 ${c.color}`}>
                <c.icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-foreground text-sm">{c.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">{c.desc}</p>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}

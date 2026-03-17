import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, AlertCircle, CheckCircle2, Zap, Shield, BarChart3 } from "lucide-react";

type Mode = "login" | "register";

export default function Login() {
  const { signIn, signUp, session } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ msg: string; type: "error" | "ok" | "" }>({ msg: "", type: "" });

  // Redirect if already logged in
  if (session) {
    navigate("/", { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ msg: "", type: "" });

    try {
      if (mode === "login") {
        await signIn(email, password);
        navigate("/", { replace: true });
      } else {
        const { needsConfirmation } = await signUp(email, password, nome);
        if (needsConfirmation) {
          setMode("login");
          setStatus({ msg: "Cadastro criado. Verifique seu email para confirmar.", type: "ok" });
        } else {
          navigate("/", { replace: true });
        }
      }
    } catch (err: any) {
      const msg = err?.message === "Invalid login credentials"
        ? "Email ou senha incorretos."
        : err?.message || "Erro ao processar. Tente novamente.";
      setStatus({ msg, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Zap, label: "Automação de OS em tempo real" },
    { icon: Shield, label: "Sessão segura via Supabase Auth" },
    { icon: BarChart3, label: "Dashboard de operações integrado" },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left hero panel */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
        className="hidden lg:flex lg:w-[55%] flex-col justify-between p-12 xl:p-16 relative overflow-hidden"
      >
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-card via-background to-card" />
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-accent/5 blur-3xl" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-8">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="text-xs font-mono font-medium text-primary tracking-wider uppercase">ELLA OS</span>
          </div>

          <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight leading-[1.1] text-foreground">
            Controle operacional
            <br />
            <span className="text-primary">inteligente.</span>
          </h1>

          <p className="mt-5 text-muted-foreground max-w-md leading-relaxed text-[15px]">
            Sistema centralizado de automação para gestão de ordens de serviço,
            lançamentos e análise de performance operacional.
          </p>
        </div>

        <div className="relative z-10 space-y-4">
          {features.map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1, ease: [0.2, 0.8, 0.2, 1] }}
              className="flex items-center gap-3 text-sm text-muted-foreground"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-surface-elevated border border-border">
                <f.icon className="w-4 h-4 text-primary" />
              </div>
              {f.label}
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
          className="w-full max-w-[400px]"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="text-xs font-mono font-medium text-primary tracking-wider uppercase">ELLA OS</span>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 p-1 rounded-xl bg-card border border-border mb-8">
            {(["login", "register"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setStatus({ msg: "", type: "" }); }}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                  mode === m
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "login" ? "Entrar" : "Cadastrar"}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, x: mode === "login" ? -10 : 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: mode === "login" ? 10 : -10 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                {mode === "login" ? "Entrar no sistema" : "Criar acesso"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1.5 mb-6">
                {mode === "login"
                  ? "Use seu email e senha para acessar."
                  : "Cadastre um usuário interno."}
              </p>

              {/* Status */}
              {status.msg && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-start gap-2 p-3 rounded-lg mb-5 text-sm font-medium ${
                    status.type === "error"
                      ? "bg-destructive/10 text-destructive border border-destructive/20"
                      : "bg-accent/10 text-accent border border-accent/20"
                  }`}
                >
                  {status.type === "error" ? <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> : <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />}
                  {status.msg}
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "register" && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nome</label>
                    <input
                      type="text"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-lg bg-card border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all"
                      placeholder="Seu nome"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    autoComplete="username"
                    className="w-full px-4 py-3 rounded-lg bg-card border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all"
                    placeholder="seu@email.com"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Senha</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    className="w-full px-4 py-3 rounded-lg bg-card border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all"
                    placeholder="••••••••"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : mode === "login" ? (
                    "Entrar"
                  ) : (
                    "Cadastrar"
                  )}
                </button>
              </form>
            </motion.div>
          </AnimatePresence>

          <p className="text-[11px] text-muted-foreground/50 text-center mt-8 font-mono">
            ELLA OS v1.0 · Controle interno
          </p>
        </motion.div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  Shield,
  Zap,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  Terminal,
} from "lucide-react";

type Mode = "login" | "register";

const floatingOrbs = [
  { size: 320, x: "-10%", y: "-15%", delay: 0, duration: 18 },
  { size: 200, x: "70%", y: "60%", delay: 2, duration: 22 },
  { size: 140, x: "30%", y: "80%", delay: 4, duration: 16 },
  { size: 100, x: "85%", y: "10%", delay: 1, duration: 20 },
];

const features = [
  { icon: Shield, text: "Autenticação segura com Supabase" },
  { icon: Zap, text: "Sessão persistida no navegador" },
  { icon: Terminal, text: "Acesso direto ao painel operacional" },
];

export default function Login() {
  const { signIn, signUp, session } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<{ msg: string; type: "error" | "ok" | "" }>({ msg: "", type: "" });

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
      const msg =
        err?.message === "Invalid login credentials"
          ? "Email ou senha incorretos."
          : err?.message || "Erro ao processar. Tente novamente.";
      setStatus({ msg, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.15fr_0.85fr]">
      {/* ── Hero Panel ── */}
      <div className="hidden lg:flex relative overflow-hidden flex-col justify-between p-14 bg-[hsl(var(--green-900))]">
        {/* Animated orbs */}
        {floatingOrbs.map((orb, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full pointer-events-none"
            style={{
              width: orb.size,
              height: orb.size,
              left: orb.x,
              top: orb.y,
              background:
                "radial-gradient(circle, hsla(var(--green-accent), 0.12), transparent 70%)",
              filter: "blur(40px)",
            }}
            animate={{
              y: [0, -30, 0, 20, 0],
              x: [0, 15, -10, 5, 0],
              scale: [1, 1.08, 0.95, 1.04, 1],
            }}
            transition={{
              duration: orb.duration,
              delay: orb.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        {/* Top content */}
        <motion.div
          className="relative z-10"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-[0.2em] border border-white/10"
            style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.9)" }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="w-2 h-2 rounded-full bg-[hsl(var(--green-accent))] animate-pulse-dot" />
            ELLA OS
            <span className="opacity-60 font-normal normal-case tracking-normal">
              Sistema operacional
            </span>
          </motion.div>

          <motion.h1
            className="mt-8 text-[clamp(38px,4.5vw,60px)] font-extrabold leading-[0.92] tracking-[-0.03em] max-w-[460px] text-white"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            Controle total.{" "}
            <span className="text-[hsl(var(--green-accent))]">Acesso seguro.</span>
          </motion.h1>

          <motion.p
            className="mt-5 max-w-[420px] leading-[1.7] text-[15px] text-white/70"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            Entre no sistema de automações operacionais com segurança.
            Gerencie ordens de serviço, relatórios e equipes em um só lugar.
          </motion.p>
        </motion.div>

        {/* Features */}
        <motion.div
          className="relative z-10 space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          {features.map((f, i) => (
            <motion.div
              key={i}
              className="flex items-center gap-3.5 text-sm text-white/85"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + i * 0.12 }}
            >
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/[0.07] border border-white/[0.08]">
                <f.icon className="w-4 h-4 text-[hsl(var(--green-accent))]" />
              </div>
              {f.text}
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* ── Form Panel ── */}
      <div className="flex flex-col justify-center items-center px-6 py-12 lg:px-16 bg-background relative overflow-hidden">
        {/* Subtle radial glow */}
        <div
          className="absolute top-0 right-0 w-[500px] h-[500px] pointer-events-none opacity-30"
          style={{
            background: "radial-gradient(circle at 80% 20%, hsla(var(--green-accent), 0.08), transparent 60%)",
          }}
        />

        <motion.div
          className="w-full max-w-[420px] relative z-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Mobile brand */}
          <div className="lg:hidden mb-8 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-[0.15em] bg-primary/10 text-primary">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse-dot" />
              ELLA OS
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="inline-flex p-1 gap-0.5 rounded-2xl w-full border border-border bg-muted/50 mb-8">
            {(["login", "register"] as Mode[]).map((m) => (
              <motion.button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setStatus({ msg: "", type: "" });
                }}
                className={`flex-1 px-5 py-3 rounded-xl text-sm font-semibold transition-colors relative ${
                  mode === m ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
                whileTap={{ scale: 0.98 }}
              >
                {mode === m && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 rounded-xl bg-primary shadow-md"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{m === "login" ? "Entrar" : "Cadastrar"}</span>
              </motion.button>
            ))}
          </div>

          {/* Heading */}
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, x: mode === "login" ? -12 : 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: mode === "login" ? 12 : -12 }}
              transition={{ duration: 0.25 }}
              className="mb-6"
            >
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                {mode === "login" ? "Bem-vindo de volta" : "Criar nova conta"}
              </h2>
              <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                {mode === "login"
                  ? "Entre com suas credenciais para acessar o painel."
                  : "Cadastre-se para ter acesso ao sistema operacional."}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Status */}
          <AnimatePresence>
            {status.msg && (
              <motion.div
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                className={`flex items-center gap-2 text-[13px] font-medium px-4 py-3 rounded-xl mb-4 ${
                  status.type === "error"
                    ? "bg-destructive/10 text-destructive border border-destructive/20"
                    : "bg-primary/10 text-primary border border-primary/20"
                }`}
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {status.msg}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence>
              {mode === "register" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-2 pb-1">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
                      Nome
                    </label>
                    <div className="relative group">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <input
                        type="text"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        required
                        className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-border bg-card text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-ring/20 placeholder:text-muted-foreground"
                        placeholder="Seu nome completo"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
                Email
              </label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  autoComplete="username"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-border bg-card text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-ring/20 placeholder:text-muted-foreground"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
                Senha
              </label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  className="w-full pl-11 pr-12 py-3.5 rounded-xl border border-border bg-card text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-ring/20 placeholder:text-muted-foreground"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-5 rounded-xl text-[15px] font-bold text-primary-foreground bg-primary cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 shadow-lg shadow-primary/20 mt-2"
              whileHover={{ scale: 1.01, boxShadow: "0 8px 30px hsla(var(--primary), 0.3)" }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {mode === "login" ? "Entrar no sistema" : "Criar conta"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </form>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground mt-8">
            Protegido por autenticação Supabase · ELLA OS v1.0
          </p>
        </motion.div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

type Mode = "login" | "register";

/* ── Particle field for hero ── */
function ParticleField() {
  const [particles] = useState(() =>
    Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 20 + 15,
      delay: Math.random() * -20,
      opacity: Math.random() * 0.4 + 0.1,
    }))
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            background: `hsl(var(--green-accent) / ${p.opacity})`,
          }}
          animate={{
            y: [0, -40, 10, -20, 0],
            x: [0, 15, -10, 20, 0],
            opacity: [p.opacity, p.opacity * 1.8, p.opacity * 0.5, p.opacity * 1.4, p.opacity],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

/* ── Animated rings ── */
function PulseRings() {
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
      {[280, 400, 540].map((size, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border"
          style={{
            width: size,
            height: size,
            top: -size / 2,
            left: -size / 2,
            borderColor: `hsl(var(--green-accent) / ${0.08 - i * 0.02})`,
          }}
          animate={{
            scale: [1, 1.05, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 6 + i * 2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.8,
          }}
        />
      ))}
    </div>
  );
}

/* ── Typing text effect ── */
function TypingText({ texts }: { texts: string[] }) {
  const [index, setIndex] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const current = texts[index];
    const speed = isDeleting ? 30 : 60;

    if (!isDeleting && displayed === current) {
      const timeout = setTimeout(() => setIsDeleting(true), 2200);
      return () => clearTimeout(timeout);
    }
    if (isDeleting && displayed === "") {
      setIsDeleting(false);
      setIndex((prev) => (prev + 1) % texts.length);
      return;
    }

    const timeout = setTimeout(() => {
      setDisplayed(
        isDeleting ? current.slice(0, displayed.length - 1) : current.slice(0, displayed.length + 1)
      );
    }, speed);
    return () => clearTimeout(timeout);
  }, [displayed, isDeleting, index, texts]);

  return (
    <span className="font-mono text-sm tracking-wide">
      {displayed}
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.6, repeat: Infinity }}
        className="inline-block w-[2px] h-4 ml-0.5 bg-[hsl(var(--green-accent))] align-middle"
      />
    </span>
  );
}

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
          setStatus({ msg: "Conta criada! Verifique seu email para ativar.", type: "ok" });
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
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
      {/* ════════ HERO PANEL ════════ */}
      <div className="hidden lg:flex relative overflow-hidden flex-col justify-between bg-[hsl(150,50%,6%)]">
        {/* Background layers */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <ParticleField />
        <PulseRings />

        {/* Gradient overlays */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 30% 50%, hsla(145,80%,40%,0.06), transparent), radial-gradient(ellipse 60% 50% at 80% 30%, hsla(120,60%,30%,0.04), transparent)",
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between h-full p-12 xl:p-16">
          {/* Top - Brand */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10">
                <motion.div
                  className="absolute inset-0 rounded-xl bg-gradient-to-br from-[hsl(var(--green-accent))] to-[hsl(var(--green-mid))]"
                  animate={{ rotate: [0, 90, 180, 270, 360] }}
                  transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                  style={{ opacity: 0.15 }}
                />
                <div className="absolute inset-[3px] rounded-[9px] bg-[hsl(150,50%,6%)] flex items-center justify-center">
                  <span className="text-lg font-extrabold text-[hsl(var(--green-accent))] tracking-tight">E</span>
                </div>
              </div>
              <div>
                <span className="text-white font-bold text-lg tracking-tight">Ella</span>
                <span className="block text-[10px] uppercase tracking-[0.3em] text-white/30 font-medium -mt-0.5">
                  Sistema Operacional
                </span>
              </div>
            </div>
          </motion.div>

          {/* Center - Main headline */}
          <motion.div
            className="flex-1 flex flex-col justify-center max-w-[520px] -mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            <motion.h1
              className="text-[clamp(36px,4.2vw,56px)] font-extrabold leading-[0.95] tracking-[-0.04em] text-white"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
              Onde operações
              <br />
              se tornam{" "}
              <span className="relative inline-block">
                <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-[hsl(var(--green-accent))] to-[hsl(145,90%,55%)]">
                  inteligentes
                </span>
                <motion.span
                  className="absolute -bottom-1 left-0 h-[3px] bg-gradient-to-r from-[hsl(var(--green-accent))] to-transparent rounded-full"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ delay: 1.2, duration: 0.8, ease: "easeOut" }}
                />
              </span>
            </motion.h1>

            <motion.p
              className="mt-6 text-[15px] leading-relaxed text-white/50 max-w-[400px]"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              Automatize processos, gerencie equipes e monitore resultados
              em uma plataforma feita para a eficiência.
            </motion.p>

            <motion.div
              className="mt-8 text-[hsl(var(--green-accent))]/70"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              <TypingText
                texts={[
                  "Automação de ordens de serviço",
                  "Controle de saldo de horas",
                  "Status reports automatizados",
                  "Gestão operacional completa",
                ]}
              />
            </motion.div>
          </motion.div>

          {/* Bottom - Stats */}
          <motion.div
            className="flex gap-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            {[
              { value: "99.9%", label: "Uptime" },
              { value: "24/7", label: "Monitoramento" },
              { value: "10x", label: "Mais rápido" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl font-bold text-white tracking-tight">{stat.value}</div>
                <div className="text-[11px] uppercase tracking-[0.15em] text-white/30 mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ════════ FORM PANEL ════════ */}
      <div className="flex flex-col justify-center items-center px-6 py-10 lg:px-14 bg-background relative overflow-hidden">
        {/* Subtle accent glow */}
        <div
          className="absolute -top-20 -right-20 w-[400px] h-[400px] rounded-full pointer-events-none opacity-20 blur-3xl"
          style={{ background: "hsl(var(--green-accent) / 0.08)" }}
        />

        <motion.div
          className="w-full max-w-[400px] relative z-10"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Mobile brand */}
          <div className="lg:hidden mb-10 text-center">
            <div className="inline-flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-sm font-extrabold text-primary-foreground">E</span>
              </div>
              <span className="text-xl font-bold text-foreground tracking-tight">Ella</span>
            </div>
            <p className="text-xs text-muted-foreground uppercase tracking-[0.2em]">Sistema Operacional</p>
          </div>

          {/* Tab switcher */}
          <div className="flex p-1 gap-1 rounded-2xl w-full border border-border bg-muted/40 mb-8">
            {(["login", "register"] as Mode[]).map((m) => (
              <motion.button
                key={m}
                type="button"
                onClick={() => { setMode(m); setStatus({ msg: "", type: "" }); }}
                className={`flex-1 px-4 py-3 rounded-xl text-sm font-semibold transition-colors relative cursor-pointer ${
                  mode === m ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
                whileTap={{ scale: 0.98 }}
              >
                {mode === m && (
                  <motion.div
                    layoutId="loginTab"
                    className="absolute inset-0 rounded-xl bg-primary shadow-lg"
                    style={{ boxShadow: "0 4px 20px hsl(var(--primary) / 0.25)" }}
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
              initial={{ opacity: 0, x: mode === "login" ? -10 : 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: mode === "login" ? 10 : -10 }}
              transition={{ duration: 0.2 }}
              className="mb-6"
            >
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                {mode === "login" ? "Bem-vindo de volta" : "Criar nova conta"}
              </h2>
              <p className="text-muted-foreground mt-1 text-sm">
                {mode === "login"
                  ? "Acesse sua conta para continuar."
                  : "Preencha os dados para começar."}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Status message */}
          <AnimatePresence>
            {status.msg && (
              <motion.div
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                className={`flex items-center gap-2.5 text-[13px] font-medium px-4 py-3 rounded-xl mb-5 ${
                  status.type === "error"
                    ? "bg-destructive/10 text-destructive border border-destructive/20"
                    : "bg-primary/10 text-primary border border-primary/20"
                }`}
              >
                {status.type === "error" ? (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                )}
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
                  <div className="space-y-1.5 pb-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Nome
                    </label>
                    <div className="relative group">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
                      <input
                        type="text"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        required
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-card text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-ring/20 placeholder:text-muted-foreground/50"
                        placeholder="Seu nome completo"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Email
              </label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  autoComplete="username"
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-card text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-ring/20 placeholder:text-muted-foreground/50"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Senha
              </label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  className="w-full pl-11 pr-12 py-3 rounded-xl border border-border bg-card text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-ring/20 placeholder:text-muted-foreground/50"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-5 rounded-xl text-sm font-bold text-primary-foreground bg-primary cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              style={{ boxShadow: "0 4px 20px hsl(var(--primary) / 0.25)" }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {mode === "login" ? "Entrar" : "Criar conta"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </form>

          <p className="text-center text-[11px] text-muted-foreground/60 mt-8 tracking-wide">
            Ella · Sistema Operacional v1.0
          </p>
        </motion.div>
      </div>
    </div>
  );
}

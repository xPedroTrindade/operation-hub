import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

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

  return (
    <div className="grid min-h-screen place-items-center p-6"
      style={{
        background: `
          radial-gradient(circle at top left, rgba(49, 160, 106, 0.18), transparent 28%),
          radial-gradient(circle at bottom right, rgba(31, 106, 70, 0.12), transparent 22%),
          linear-gradient(135deg, #edf5ef 0%, #f8fbf9 55%, #eef4f0 100%)
        `
      }}
    >
      <main className="w-full max-w-[1080px] grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] overflow-hidden rounded-3xl shadow-[0_24px_60px_rgba(22,63,47,0.12)]"
        style={{
          background: "rgba(255,255,255,0.78)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.7)",
        }}
      >
        {/* Hero panel */}
        <section
          className="hidden lg:flex flex-col justify-between p-14 relative overflow-hidden min-h-[640px]"
          style={{
            background: "linear-gradient(150deg, rgba(22,63,47,0.98), rgba(31,106,70,0.92))",
            color: "#fff",
          }}
        >
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.06), transparent 28%, rgba(0,0,0,0.18))" }}
          />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs uppercase tracking-widest"
              style={{ background: "rgba(255,255,255,0.12)" }}
            >
              ELLA OS <span className="opacity-80">Controle interno</span>
            </div>

            <h1 className="mt-6 text-[clamp(36px,4vw,56px)] font-extrabold leading-[0.95] tracking-tighter max-w-[420px]">
              Acesse o sistema com segurança.
            </h1>

            <p className="mt-4 max-w-[420px] leading-relaxed text-[15px]" style={{ color: "rgba(255,255,255,0.82)" }}>
              Cadastre um usuário para uso interno e entre no painel principal do sistema.
              O acesso agora depende de autenticação válida no backend.
            </p>
          </div>

          <ul className="relative z-10 space-y-3 text-sm" style={{ color: "rgba(255,255,255,0.92)" }}>
            <li className="flex items-center gap-2.5">
              <span style={{ color: "#b7f0cd" }}>•</span> Login com sessão persistida no navegador
            </li>
            <li className="flex items-center gap-2.5">
              <span style={{ color: "#b7f0cd" }}>•</span> Cadastro de novos usuários via Supabase
            </li>
            <li className="flex items-center gap-2.5">
              <span style={{ color: "#b7f0cd" }}>•</span> Redirecionamento direto para a tela principal
            </li>
          </ul>
        </section>

        {/* Form panel */}
        <section className="flex flex-col justify-center gap-5 p-9 bg-card">
          {/* Tab switcher */}
          <div className="inline-flex p-1 gap-1 rounded-full w-fit border border-border"
            style={{ background: "hsl(120 14% 97%)" }}
          >
            <button
              type="button"
              onClick={() => { setMode("login"); setStatus({ msg: "", type: "" }); }}
              className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                mode === "login"
                  ? "bg-green-900 text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => { setMode("register"); setStatus({ msg: "", type: "" }); }}
              className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                mode === "register"
                  ? "bg-green-900 text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Cadastrar
            </button>
          </div>

          <div>
            <h2 className="text-[28px] font-bold tracking-tight text-foreground">
              {mode === "login" ? "Entrar no sistema" : "Criar acesso"}
            </h2>
            <p className="text-muted-foreground mt-1 leading-relaxed">
              {mode === "login"
                ? "Use seu email e senha para abrir a tela principal."
                : "Cadastre um usuário interno e inicie a sessão imediatamente."}
            </p>
          </div>

          {/* Status */}
          {status.msg && (
            <div className={`text-[13px] font-semibold ${
              status.type === "error" ? "text-destructive" : "text-green-700"
            }`}>
              {status.msg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid gap-3.5">
            {mode === "register" && (
              <div className="grid gap-2">
                <label className="text-[13px] font-semibold text-foreground">Nome</label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                  className="w-full px-4 py-3.5 rounded-[14px] border border-border bg-surface-alt text-sm text-foreground outline-none transition-all focus:border-green-500 focus:shadow-[0_0_0_4px_rgba(49,160,106,0.15)]"
                  placeholder="Seu nome"
                />
              </div>
            )}

            <div className="grid gap-2">
              <label className="text-[13px] font-semibold text-foreground">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                autoComplete="username"
                className="w-full px-4 py-3.5 rounded-[14px] border border-border bg-surface-alt text-sm text-foreground outline-none transition-all focus:border-green-500 focus:shadow-[0_0_0_4px_rgba(49,160,106,0.15)]"
                placeholder="seu@email.com"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-[13px] font-semibold text-foreground">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                className="w-full px-4 py-3.5 rounded-[14px] border border-border bg-surface-alt text-sm text-foreground outline-none transition-all focus:border-green-500 focus:shadow-[0_0_0_4px_rgba(49,160,106,0.15)]"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="py-3.5 px-5 rounded-[14px] text-[15px] font-bold text-primary-foreground cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, hsl(152 50% 17%), hsl(152 54% 27%))" }}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : mode === "login" ? (
                "Entrar e abrir o sistema"
              ) : (
                "Cadastrar e entrar"
              )}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}

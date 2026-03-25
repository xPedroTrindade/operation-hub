import { useState, useEffect, useCallback, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import {
  ClipboardList, Plus, Save, Trash2, Loader2,
  Clock, Calendar, Building2, Tag, Inbox,
  ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight,
  LayoutGrid, FileText, Pencil, Terminal, ChevronDown, X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ── Tipos ─────────────────────────────────────────────────────────────────────
const STATUS_OPTIONS = ["Pendente Apontamento", "OS Apontada"] as const;
type StatusOS = typeof STATUS_OPTIONS[number];
type ModoVisualizacao = "formulario" | "grade";

interface ClienteItem { id: string; nome: string; }

interface FormState {
  executante: string;
  data_os: string;
  hora_inicio: string;
  hora_fim: string;
  cliente_id: string;
  ticket: string;
  tarefa: string;
  status_os: StatusOS;
  observacoes: string;
}

interface Apontamento {
  id: string;
  executante: string;
  usuario_id: string | null;
  cliente_id: string;
  cliente_nome: string;
  data_os: string;
  hora_inicio: string;
  hora_fim: string;
  ticket: string | null;
  tarefa: string;
  horas_executadas: number;
  status_os: StatusOS;
  observacoes: string | null;
  criado_em: string;
}

type TipoLog = "sucesso" | "erro" | "aviso" | "info";
interface LogEntry {
  id: number;
  tipo: TipoLog;
  mensagem: string;
  hora: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function calcularHoras(inicio: string, fim: string) {
  if (!inicio || !fim) return { decimal: 0, hhmm: "", valido: false };
  const [hi, mi] = inicio.split(":").map(Number);
  const [hf, mf] = fim.split(":").map(Number);
  const mins = hf * 60 + mf - (hi * 60 + mi);
  if (mins <= 0 || isNaN(mins)) return { decimal: 0, hhmm: "", valido: false };
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return {
    decimal: Math.round((mins / 60) * 100) / 100,
    hhmm: m > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${h}h`,
    valido: true,
  };
}

const fmtHora = (h: string) => (h ? h.slice(0, 5) : "--:--");
const fmtData = (d: string) => {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};

const FORM_VAZIO: FormState = {
  executante: "",
  data_os: new Date().toISOString().split("T")[0],
  hora_inicio: "",
  hora_fim: "",
  cliente_id: "",
  ticket: "",
  tarefa: "",
  status_os: "Pendente Apontamento",
  observacoes: "",
};

// ── Componente principal ──────────────────────────────────────────────────────
export default function LancamentoOS() {
  const { toast } = useToast();

  const [modo, setModo] = useState<ModoVisualizacao>("grade");
  const [form, setForm] = useState<FormState>(FORM_VAZIO);
  const [indiceAtual, setIndiceAtual] = useState(-1);   // -1 = novo registro

  const [clientes, setClientes] = useState<ClienteItem[]>([]);
  const [executantes, setExecutantes] = useState<string[]>([]);
  const [apontamentos, setApontamentos] = useState<Apontamento[]>([]);

  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [executanteLogado, setExecutanteLogado] = useState("");

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logAberto, setLogAberto] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((tipo: TipoLog, mensagem: string) => {
    const hora = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setLogs((prev) => [...prev, { id: Date.now(), tipo, mensagem, hora }]);
  }, []);

  useEffect(() => {
    if (logAberto) logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs, logAberto]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleHoraChange = (field: "hora_inicio" | "hora_fim", val: string) => {
    setForm((p) => ({ ...p, [field]: val }));
  };

  // ── Carregamento ──
  const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      // Usuário logado
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUsuarioId(user.id);
        const { data: profile } = await supabase
          .from("profiles")
          .select("nome")
          .eq("user_id", user.id)
          .maybeSingle();
        const nome = profile?.nome || user.email || "";
        setExecutanteLogado(nome);
        if (!profile?.nome) {
          addLog("aviso", `Perfil sem nome configurado para o usuário ${user.email} — configure o nome no Painel Admin`);
        }
      }

      // Todos os executantes (profiles com nome)
      const { data: profiles, error: errProfiles } = await supabase
        .from("profiles")
        .select("nome")
        .not("nome", "is", null)
        .order("nome", { ascending: true });
      if (errProfiles) addLog("erro", `Erro ao carregar executantes — ${errProfiles.message}`);
      const nomes = (profiles ?? []).map((p: any) => p.nome as string).filter(Boolean);
      setExecutantes(nomes);

      // Clientes ativos
      const { data: clientesData, error: errClientes } = await supabase
        .from("clientes")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome", { ascending: true });
      if (errClientes) addLog("erro", `Erro ao carregar clientes — ${errClientes.message}`);
      setClientes((clientesData as ClienteItem[]) ?? []);

      // Apontamentos
      const { data: apts, error: errApts } = await supabase
        .from("apontamentos_os")
        .select("*, clientes(nome)")
        .order("data_os", { ascending: false })
        .order("hora_inicio", { ascending: false })
        .limit(200);
      if (errApts) addLog("erro", `Erro ao carregar apontamentos — ${errApts.message}`);

      const lista = (apts ?? []).map((a: any) => ({
        ...a,
        cliente_nome: a.clientes?.nome ?? "–",
        hora_inicio: a.hora_inicio?.slice(0, 5) ?? "",
        hora_fim: a.hora_fim?.slice(0, 5) ?? "",
      }));
      setApontamentos(lista);

      addLog("info", `Dados carregados — ${nomes.length} executante(s), ${(clientesData ?? []).length} cliente(s), ${lista.length} apontamento(s)`);
    } catch (err: any) {
      addLog("erro", `Falha inesperada ao carregar dados — ${err?.message ?? String(err)}`);
    } finally {
      setLoading(false);
    }
  }, [addLog]);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  // ── Sincroniza form com registro atual (modo formulário) ──
  useEffect(() => {
    if (modo !== "formulario") return;
    if (indiceAtual === -1) {
      setForm((p) => ({ ...FORM_VAZIO, executante: p.executante || executanteLogado }));
      return;
    }
    const a = apontamentos[indiceAtual];
    if (!a) return;
    setForm({
      executante: a.executante,
      data_os: a.data_os,
      hora_inicio: a.hora_inicio,
      hora_fim: a.hora_fim,
  
      cliente_id: a.cliente_id,
      ticket: a.ticket ?? "",
      tarefa: a.tarefa,
      status_os: a.status_os,
      observacoes: a.observacoes ?? "",
    });
  }, [indiceAtual, modo, apontamentos, executanteLogado]);

  // ── Navegação ──
  const total = apontamentos.length;
  const isNovo = indiceAtual === -1;

  const navPrimeiro  = () => setIndiceAtual(0);
  const navAnterior  = () => setIndiceAtual((i) => Math.max(0, i - 1));
  const navProximo   = () => setIndiceAtual((i) => Math.min(total - 1, i + 1));
  const navUltimo    = () => setIndiceAtual(total - 1);

  const novoRegistro = () => {
    setIndiceAtual(-1);
    setForm((p) => ({ ...FORM_VAZIO, executante: p.executante || executanteLogado }));
    setModo("formulario");
  };

  const abrirFormulario = (index: number) => {
    setIndiceAtual(index);
    setModo("formulario");
  };

  // ── Salvar (insert ou update) ──
  const handleSalvar = async () => {
    const clienteNome = clientes.find((c) => c.id === form.cliente_id)?.nome ?? form.cliente_id;

    const faltando = [
      !form.executante && "executante",
      !form.data_os && "data",
      !form.hora_inicio && "hora início",
      !form.hora_fim && "hora fim",
      !form.cliente_id && "cliente",
      !form.tarefa.trim() && "tarefa",
    ].filter(Boolean);

    if (faltando.length > 0) {
      addLog("aviso", `Salvamento bloqueado — campos obrigatórios não preenchidos: ${faltando.join(", ")}`);
      toast({ title: "Campos obrigatórios", description: "Preencha executante, data, horários, cliente e tarefa.", variant: "destructive" });
      return;
    }

    const horas = calcularHoras(form.hora_inicio, form.hora_fim);
    if (!horas.valido) {
      addLog("aviso", `Horário inválido — executante: ${form.executante}, início: ${form.hora_inicio}, fim: ${form.hora_fim} (fim deve ser maior que início)`);
      toast({ title: "Horário inválido", description: "Hora fim deve ser maior que hora início.", variant: "destructive" });
      return;
    }

    setSalvando(true);
    try {
      const payload = {
        executante: form.executante,
        usuario_id: usuarioId,
        cliente_id: form.cliente_id,
        data_os: form.data_os,
        hora_inicio: form.hora_inicio,
        hora_fim: form.hora_fim,
        ticket: form.ticket.trim() || null,
        tarefa: form.tarefa.trim(),
        horas_executadas: horas.decimal,
        status_os: form.status_os,
        observacoes: form.observacoes.trim() || null,
      };

      if (isNovo) {
        const { error } = await supabase.from("apontamentos_os").insert(payload);
        if (error) throw error;
        addLog("sucesso", `Apontamento criado — executante: ${form.executante}, cliente: ${clienteNome}, data: ${fmtData(form.data_os)}, horas: ${horas.hhmm} (${horas.decimal}h), status: ${form.status_os}${form.ticket ? `, ticket: ${form.ticket}` : ""}`);
        toast({ title: "Apontamento salvo!" });
        await carregarDados();
        setIndiceAtual(0);
      } else {
        const id = apontamentos[indiceAtual].id;
        const { error } = await supabase
          .from("apontamentos_os")
          .update({ ...payload, atualizado_em: new Date().toISOString() })
          .eq("id", id);
        if (error) throw error;
        addLog("sucesso", `Apontamento atualizado — executante: ${form.executante}, cliente: ${clienteNome}, data: ${fmtData(form.data_os)}, horas: ${horas.hhmm} (${horas.decimal}h), status: ${form.status_os}`);
        toast({ title: "Apontamento atualizado!" });
        await carregarDados();
      }
    } catch (err: any) {
      addLog("erro", `Erro ao salvar apontamento — executante: ${form.executante}, cliente: ${clienteNome} — motivo: ${err.message}`);
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSalvando(false);
    }
  };

  // ── Excluir ──
  const handleExcluir = async (id?: string) => {
    const alvoId = id ?? (isNovo ? null : apontamentos[indiceAtual]?.id);
    if (!alvoId) return;
    const alvo = apontamentos.find((a) => a.id === alvoId);
    const contexto = alvo
      ? `executante: ${alvo.executante}, cliente: ${alvo.cliente_nome}, data: ${fmtData(alvo.data_os)}`
      : `id: ${alvoId}`;
    setExcluindoId(alvoId);
    try {
      const { error } = await supabase.from("apontamentos_os").delete().eq("id", alvoId);
      if (error) throw error;
      addLog("sucesso", `Apontamento excluído — ${contexto}`);
      toast({ title: "Apontamento excluído" });
      await carregarDados();
      if (!id) {
        const novo = Math.min(indiceAtual, total - 2);
        setIndiceAtual(novo < 0 ? -1 : novo);
      }
    } catch (err: any) {
      addLog("erro", `Erro ao excluir apontamento — ${contexto} — motivo: ${err.message}`);
      toast({ title: "Erro ao excluir", description: err.message, variant: "destructive" });
    } finally {
      setExcluindoId(null);
    }
  };

  const totalHoras = apontamentos.reduce((acc, a) => acc + Number(a.horas_executadas || 0), 0);

  // ── Header extra (toggle de modo) ────────────────────────────────────────────
  const headerExtra = (
    <div className="flex items-center gap-1 border border-border rounded-lg p-0.5 bg-background">
      <button
        onClick={() => setModo("grade")}
        title="Modo Grade"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
          modo === "grade"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        Grade
      </button>
      <button
        onClick={() => { setIndiceAtual(-1); setModo("formulario"); }}
        title="Modo Formulário"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
          modo === "formulario"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <FileText className="h-3.5 w-3.5" />
        Formulário
      </button>
    </div>
  );

  // ── Campos do formulário (reutilizado em ambos os modos) ──────────────────
  const inputCls = "w-full text-xs border border-border rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-colors";
  const labelCls = "text-[11px] font-semibold text-muted-foreground uppercase tracking-wide";

  const FormFields = (
    <div className="p-5 space-y-3 max-w-xl">

      {/* Executante */}
      <div className="space-y-1.5">
        <label className={labelCls}>Executante *</label>
        <select value={form.executante} onChange={(e) => set("executante", e.target.value)} className={inputCls}>
          <option value="">Selecionar executante...</option>
          {executantes.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>

      {/* Data */}
      <div className="space-y-1.5">
        <label className={`${labelCls} flex items-center gap-1`}><Calendar className="h-3 w-3" /> Data *</label>
        <input type="date" value={form.data_os} onChange={(e) => set("data_os", e.target.value)} className={inputCls} />
      </div>

      {/* Hora início */}
      <div className="space-y-1.5">
        <label className={`${labelCls} flex items-center gap-1`}><Clock className="h-3 w-3" /> Hora início *</label>
        <input type="time" value={form.hora_inicio} onChange={(e) => handleHoraChange("hora_inicio", e.target.value)} className={inputCls} />
      </div>

      {/* Hora fim */}
      <div className="space-y-1.5">
        <label className={`${labelCls} flex items-center gap-1`}><Clock className="h-3 w-3" /> Hora fim *</label>
        <input type="time" value={form.hora_fim} onChange={(e) => handleHoraChange("hora_fim", e.target.value)} className={inputCls} />
      </div>

      {/* Horas executadas (read-only) */}
      <div className="space-y-1.5">
        <label className={labelCls}>Horas executadas</label>
        {(() => {
          const h = calcularHoras(form.hora_inicio, form.hora_fim);
          return (
            <div className={`w-full text-xs border rounded-lg px-3 py-2 font-mono font-bold transition-colors ${
              h.valido ? "border-primary/40 bg-primary/5 text-primary" : "border-border bg-muted/30 text-muted-foreground"
            }`}>
              {h.valido ? `${h.hhmm} (${h.decimal}h)` : "–"}
            </div>
          );
        })()}
      </div>

      {/* Cliente */}
      <div className="space-y-1.5">
        <label className={`${labelCls} flex items-center gap-1`}><Building2 className="h-3 w-3" /> Cliente *</label>
        <select value={form.cliente_id} onChange={(e) => set("cliente_id", e.target.value)} className={inputCls}>
          <option value="">Selecionar cliente...</option>
          {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </div>

      {/* Ticket */}
      <div className="space-y-1.5">
        <label className={`${labelCls} flex items-center gap-1`}>
          <Tag className="h-3 w-3" /> Ticket / OS
          <span className="text-[10px] normal-case font-normal opacity-60 ml-1">(opcional)</span>
        </label>
        <input
          type="text"
          value={form.ticket}
          onChange={(e) => set("ticket", e.target.value)}
          placeholder="OS-12345 ou referência..."
          className={inputCls}
        />
      </div>

      {/* Tarefa */}
      <div className="space-y-1.5">
        <label className={labelCls}>Tarefa / Descrição *</label>
        <textarea
          value={form.tarefa}
          onChange={(e) => set("tarefa", e.target.value)}
          placeholder="Descreva a atividade executada..."
          rows={3}
          className={`${inputCls} resize-none`}
        />
      </div>

      {/* Status OS */}
      <div className="space-y-1.5">
        <label className={labelCls}>Status da OS</label>
        <select value={form.status_os} onChange={(e) => set("status_os", e.target.value as StatusOS)} className={inputCls}>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Observações */}
      <div className="space-y-1.5">
        <label className={labelCls}>
          Observações
          <span className="text-[10px] normal-case font-normal opacity-60 ml-1">(opcional)</span>
        </label>
        <textarea
          value={form.observacoes}
          onChange={(e) => set("observacoes", e.target.value)}
          placeholder="Anotações adicionais..."
          rows={2}
          className={`${inputCls} resize-none`}
        />
      </div>
    </div>
  );

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <AppLayout
      title="Lançamento de OS"
      subtitle={
        modo === "formulario"
          ? isNovo
            ? "Modo Formulário · Novo registro"
            : `Modo Formulário · Registro ${indiceAtual + 1} de ${total}`
          : `Modo Grade · ${total} registro${total !== 1 ? "s" : ""}`
      }
      headerExtra={headerExtra}
    >

      {/* ══════════════════ MODO FORMULÁRIO ══════════════════ */}
      {modo === "formulario" && (
        <section className="bg-card border border-border rounded-xl shadow-[var(--shadow-sm)]">

          {/* Barra de navegação estilo Sankhya */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-secondary/30">
            {/* Navegação */}
            <div className="flex items-center gap-0.5">
              <button
                onClick={navPrimeiro}
                disabled={indiceAtual <= 0 || total === 0}
                title="Primeiro"
                className="p-1.5 rounded text-muted-foreground hover:bg-muted/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>
              <button
                onClick={navAnterior}
                disabled={indiceAtual <= 0 || total === 0}
                title="Anterior"
                className="p-1.5 rounded text-muted-foreground hover:bg-muted/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <span className="px-3 text-xs font-mono text-muted-foreground min-w-[90px] text-center">
                {isNovo
                  ? <span className="text-primary font-semibold">Novo</span>
                  : `${indiceAtual + 1} de ${total}`}
              </span>

              <button
                onClick={navProximo}
                disabled={indiceAtual >= total - 1 || total === 0}
                title="Próximo"
                className="p-1.5 rounded text-muted-foreground hover:bg-muted/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={navUltimo}
                disabled={indiceAtual >= total - 1 || total === 0}
                title="Último"
                className="p-1.5 rounded text-muted-foreground hover:bg-muted/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>

            <div className="h-4 w-px bg-border mx-1" />

            {/* Novo */}
            <button
              onClick={novoRegistro}
              title="Novo registro"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              Novo
            </button>

            {/* Status do registro atual */}
            {!isNovo && apontamentos[indiceAtual] && (
              <span className={`ml-2 inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                apontamentos[indiceAtual].status_os === "OS Apontada"
                  ? "bg-green-100 text-green-700"
                  : "bg-amber-100 text-amber-700"
              }`}>
                {apontamentos[indiceAtual].status_os}
              </span>
            )}

            {/* Excluir (só para registro existente) */}
            {!isNovo && (
              <button
                onClick={() => handleExcluir()}
                disabled={!!excluindoId}
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-destructive/40 text-destructive text-xs hover:bg-destructive/10 transition-all disabled:opacity-50"
              >
                {excluindoId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Excluir
              </button>
            )}
          </div>

          {/* Campos */}
          {FormFields}

          {/* Rodapé */}
          <div className="flex items-center justify-between px-5 py-4 border-t border-border bg-muted/20">
            <div className="text-[11px] text-muted-foreground">
              {isNovo
                ? "Inserindo novo registro"
                : <span className="flex items-center gap-1"><Pencil className="h-3 w-3" /> Editando registro</span>
              }
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (isNovo) setForm((p) => ({ ...FORM_VAZIO, executante: p.executante }));
                  else setIndiceAtual(indiceAtual); // re-dispara o effect
                }}
                className="px-4 py-2 rounded-lg border border-border text-xs text-muted-foreground hover:bg-muted/30 transition-all"
              >
                {isNovo ? "Limpar" : "Desfazer"}
              </button>
              <button
                onClick={handleSalvar}
                disabled={salvando}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {salvando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {salvando ? "Salvando..." : isNovo ? "Salvar apontamento" : "Salvar alterações"}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════ MODO GRADE ══════════════════ */}
      {modo === "grade" && (
        <section className="bg-card border border-border rounded-xl shadow-[var(--shadow-sm)] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Apontamentos</span>
              {!loading && (
                <span className="text-[11px] text-muted-foreground font-mono">
                  ({total} registro{total !== 1 ? "s" : ""})
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-mono text-muted-foreground">
                Total: <span className="text-foreground font-semibold">{totalHoras.toFixed(2)}h</span>
              </span>
              <button
                onClick={novoRegistro}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all"
              >
                <Plus className="h-3.5 w-3.5" />
                Novo
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="p-3 text-left font-semibold text-muted-foreground whitespace-nowrap">Data</th>
                  <th className="p-3 text-left font-semibold text-muted-foreground whitespace-nowrap">Horário</th>
                  <th className="p-3 text-left font-semibold text-muted-foreground whitespace-nowrap">Executante</th>
                  <th className="p-3 text-left font-semibold text-muted-foreground whitespace-nowrap">Cliente</th>
                  <th className="p-3 text-left font-semibold text-muted-foreground whitespace-nowrap">Ticket</th>
                  <th className="p-3 text-left font-semibold text-muted-foreground">Tarefa</th>
                  <th className="p-3 text-left font-semibold text-muted-foreground whitespace-nowrap">Horas</th>
                  <th className="p-3 text-left font-semibold text-muted-foreground whitespace-nowrap">Status</th>
                  <th className="p-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      {Array.from({ length: 9 }).map((_, j) => (
                        <td key={j} className="p-3">
                          <div className="h-3 rounded bg-muted animate-pulse w-16" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : total === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Inbox className="h-8 w-8 opacity-25" />
                        <span>Nenhum apontamento registrado.</span>
                        <button
                          onClick={novoRegistro}
                          className="mt-1 text-xs text-primary hover:underline"
                        >
                          Criar primeiro apontamento
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  apontamentos.map((a, i) => (
                    <tr
                      key={a.id}
                      onDoubleClick={() => abrirFormulario(i)}
                      title="Duplo clique para editar"
                      className="border-b border-border hover:bg-primary/5 cursor-pointer transition-colors group"
                    >
                      <td className="p-3 font-mono whitespace-nowrap">{fmtData(a.data_os)}</td>
                      <td className="p-3 font-mono whitespace-nowrap text-muted-foreground">
                        {fmtHora(a.hora_inicio)} – {fmtHora(a.hora_fim)}
                      </td>
                      <td className="p-3 whitespace-nowrap font-medium">{a.executante}</td>
                      <td className="p-3 whitespace-nowrap font-medium">{a.cliente_nome}</td>
                      <td className="p-3 whitespace-nowrap font-mono text-muted-foreground">
                        {a.ticket || "–"}
                      </td>
                      <td className="p-3 max-w-[240px]">
                        <span className="line-clamp-1 block" title={a.tarefa}>{a.tarefa}</span>
                      </td>
                      <td className="p-3 font-mono font-bold text-primary whitespace-nowrap">
                        {Number(a.horas_executadas).toFixed(2)}h
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          a.status_os === "OS Apontada"
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        }`}>
                          {a.status_os}
                        </span>
                      </td>
                      <td className="p-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleExcluir(a.id); }}
                          disabled={excluindoId === a.id}
                          title="Excluir"
                          className="text-muted-foreground/30 hover:text-destructive group-hover:text-muted-foreground/60 transition-colors disabled:opacity-50"
                        >
                          {excluindoId === a.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {total > 0 && (
            <div className="px-5 py-2 border-t border-border bg-muted/10 text-[11px] text-muted-foreground">
              Duplo clique em uma linha para abrir o formulário de edição
            </div>
          )}
        </section>
      )}

      {/* ══════════════════ PAINEL DE LOGS ══════════════════ */}
      <section className="bg-card border border-border rounded-xl shadow-[var(--shadow-sm)] overflow-hidden font-mono">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground">Log de Operações</span>
            {logs.length > 0 && (
              <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {logs.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {logs.length > 0 && (
              <button
                onClick={() => setLogs([])}
                title="Limpar logs"
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded hover:bg-destructive/10"
              >
                <X className="h-3 w-3" /> Limpar
              </button>
            )}
            <button
              onClick={() => setLogAberto((v) => !v)}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${logAberto ? "" : "-rotate-90"}`} />
            </button>
          </div>
        </div>

        {logAberto && (
          <div className="overflow-y-auto max-h-48 bg-[hsl(var(--background))]">
            {logs.length === 0 ? (
              <p className="text-[11px] text-muted-foreground/50 p-4 text-center">Nenhum evento registrado ainda.</p>
            ) : (
              <div className="divide-y divide-border/40">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 px-4 py-2">
                    <span className="text-[10px] text-muted-foreground/60 whitespace-nowrap pt-0.5">{log.hora}</span>
                    <span className={`text-[10px] font-semibold uppercase whitespace-nowrap px-1.5 py-0.5 rounded pt-0 ${
                      log.tipo === "sucesso" ? "bg-green-100 text-green-700" :
                      log.tipo === "erro"    ? "bg-red-100 text-red-700" :
                      log.tipo === "aviso"   ? "bg-amber-100 text-amber-700" :
                                              "bg-blue-100 text-blue-700"
                    }`}>
                      {log.tipo}
                    </span>
                    <span className="text-[11px] text-foreground/80 leading-relaxed">{log.mensagem}</span>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            )}
          </div>
        )}
      </section>
    </AppLayout>
  );
}

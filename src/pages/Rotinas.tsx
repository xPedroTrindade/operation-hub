import { useEffect, useState, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  CalendarClock, Plus, Pencil, Users, Mail, Play,
  Search, Filter, Building2, Clock, CheckCircle2, XCircle,
  AlertTriangle, Loader2, Trash2, UserPlus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ── Tipos ─────────────────────────────────────────────────────────────────────

type Destinatario = { id: string; email: string; ativo: boolean };

type UltimoEnvio = { enviado_em: string; status: "enviado" | "erro" | "pendente" } | null;

type Rotina = {
  id: string;
  cliente_id: string;
  modelo_id: number | null;
  fap: string | null;
  periodo: string | null;
  dia_envio: number;
  enviar_sem_os: boolean;
  ativo: boolean;
  criado_em: string;
  clientes: { nome: string } | null;
  modelos_email: { assunto: string } | null;
  sr_destinatarios: Destinatario[];
  ultimoEnvio: UltimoEnvio;
};

type ClienteOpt = { id: string; nome: string };
type ModeloOpt = { id: number; assunto: string };

type FormData = {
  cliente_id: string;
  modelo_id: string; // "none" | string number
  fap: string;
  periodo: string;
  dia_envio: string;
  enviar_sem_os: boolean;
  ativo: boolean;
};

const FORM_VAZIO: FormData = {
  cliente_id: "",
  modelo_id: "none",
  fap: "",
  periodo: "mensal",
  dia_envio: "5",
  enviar_sem_os: false,
  ativo: true,
};

const periodoLabels: Record<string, string> = {
  semanal: "Semanal",
  quinzenal: "Quinzenal",
  mensal: "Mensal",
};

const StatusIcon = ({ status }: { status: string | null }) => {
  if (status === "enviado") return <CheckCircle2 className="h-4 w-4 text-accent" />;
  if (status === "erro")    return <XCircle className="h-4 w-4 text-destructive" />;
  if (status === "pendente") return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  return <Clock className="h-4 w-4 text-muted-foreground" />;
};

// ── Componente ─────────────────────────────────────────────────────────────────

export default function Rotinas() {
  const { toast } = useToast();

  // lista principal
  const [rotinas, setRotinas]     = useState<Rotina[]>([]);
  const [loading, setLoading]     = useState(true);
  const [busca, setBusca]         = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");

  // dialog detalhe (somente leitura)
  const [detalheOpen, setDetalheOpen]             = useState(false);
  const [rotinaSelecionada, setRotinaSelecionada] = useState<Rotina | null>(null);

  // dialog form (criar / editar)
  const [formOpen, setFormOpen]   = useState(false);
  const [editando, setEditando]   = useState<Rotina | null>(null);
  const [form, setForm]           = useState<FormData>(FORM_VAZIO);
  const [destinatarios, setDestinatarios] = useState<string[]>([]);
  const [novoEmail, setNovoEmail] = useState("");
  const [salvando, setSalvando]   = useState(false);

  // opções para selects
  const [clientes, setClientes]   = useState<ClienteOpt[]>([]);
  const [modelos, setModelos]     = useState<ModeloOpt[]>([]);

  // ── Carregar lista ─────────────────────────────────────────────────────────

  const carregar = useCallback(async () => {
    setLoading(true);

    const { data: configs, error } = await supabase
      .from("status_report_configs")
      .select("*, clientes(nome), modelos_email(assunto), sr_destinatarios(id, email, ativo)")
      .order("criado_em", { ascending: false });

    if (error) {
      toast({ title: "Erro ao carregar rotinas", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const { data: envios } = await supabase
      .from("sr_envios")
      .select("config_id, enviado_em, status")
      .order("enviado_em", { ascending: false });

    const ultimoEnvioMap: Record<string, UltimoEnvio> = {};
    for (const e of envios ?? []) {
      if (!ultimoEnvioMap[e.config_id]) {
        ultimoEnvioMap[e.config_id] = {
          enviado_em: e.enviado_em,
          status: e.status as UltimoEnvio["status"],
        };
      }
    }

    setRotinas(
      (configs ?? []).map((c: any) => ({
        ...c,
        sr_destinatarios: c.sr_destinatarios ?? [],
        ultimoEnvio: ultimoEnvioMap[c.id] ?? null,
      }))
    );
    setLoading(false);
  }, [toast]);

  useEffect(() => { carregar(); }, [carregar]);

  // ── Carregar opções para o form ────────────────────────────────────────────

  const carregarOpcoes = useCallback(async () => {
    const [{ data: cls }, { data: mods }] = await Promise.all([
      supabase.from("clientes").select("id, nome").eq("ativo", true).order("nome"),
      supabase.from("modelos_email").select("id, assunto").eq("ativo", true).order("assunto"),
    ]);
    setClientes(cls ?? []);
    setModelos(mods ?? []);
  }, []);

  // ── Abrir / fechar form ────────────────────────────────────────────────────

  const abrirNovo = async () => {
    await carregarOpcoes();
    setEditando(null);
    setForm(FORM_VAZIO);
    setDestinatarios([]);
    setNovoEmail("");
    setFormOpen(true);
  };

  const abrirEditar = async (r: Rotina) => {
    await carregarOpcoes();
    setEditando(r);
    setForm({
      cliente_id:    r.cliente_id,
      modelo_id:     r.modelo_id != null ? String(r.modelo_id) : "none",
      fap:           r.fap ?? "",
      periodo:       r.periodo ?? "mensal",
      dia_envio:     String(r.dia_envio),
      enviar_sem_os: r.enviar_sem_os,
      ativo:         r.ativo,
    });
    setDestinatarios(r.sr_destinatarios.map((d) => d.email));
    setNovoEmail("");
    setFormOpen(true);
  };

  // ── Destinatários no form ──────────────────────────────────────────────────

  const adicionarEmail = () => {
    const email = novoEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) return;
    if (destinatarios.includes(email)) {
      toast({ title: "E-mail já adicionado", variant: "destructive" });
      return;
    }
    setDestinatarios((prev) => [...prev, email]);
    setNovoEmail("");
  };

  const removerEmail = (email: string) => {
    setDestinatarios((prev) => prev.filter((e) => e !== email));
  };

  // ── Salvar ─────────────────────────────────────────────────────────────────

  const salvar = async () => {
    if (!form.cliente_id) {
      toast({ title: "Selecione um cliente", variant: "destructive" });
      return;
    }
    const dia = parseInt(form.dia_envio, 10);
    if (isNaN(dia) || dia < 1 || dia > 28) {
      toast({ title: "Dia de envio inválido (1–28)", variant: "destructive" });
      return;
    }

    setSalvando(true);

    const payload = {
      cliente_id:    form.cliente_id,
      modelo_id:     form.modelo_id !== "none" ? parseInt(form.modelo_id, 10) : null,
      fap:           form.fap || null,
      periodo:       form.periodo,
      dia_envio:     dia,
      enviar_sem_os: form.enviar_sem_os,
      ativo:         form.ativo,
    };

    let configId: string;

    if (editando) {
      // Atualiza config
      const { error } = await supabase
        .from("status_report_configs")
        .update(payload)
        .eq("id", editando.id);

      if (error) {
        toast({ title: "Erro ao atualizar rotina", description: error.message, variant: "destructive" });
        setSalvando(false);
        return;
      }
      configId = editando.id;

      // Remove todos os destinatários antigos e reinsere
      await supabase.from("sr_destinatarios").delete().eq("config_id", configId);
    } else {
      // Cria config
      const { data, error } = await supabase
        .from("status_report_configs")
        .insert(payload)
        .select("id")
        .single();

      if (error || !data) {
        toast({ title: "Erro ao criar rotina", description: error?.message, variant: "destructive" });
        setSalvando(false);
        return;
      }
      configId = data.id;
    }

    // Insere destinatários
    if (destinatarios.length > 0) {
      const { error: errDest } = await supabase.from("sr_destinatarios").insert(
        destinatarios.map((email) => ({ config_id: configId, email, ativo: true }))
      );
      if (errDest) {
        toast({ title: "Rotina salva, mas erro nos destinatários", description: errDest.message, variant: "destructive" });
      }
    }

    toast({ title: editando ? "Rotina atualizada" : "Rotina criada" });
    setFormOpen(false);
    carregar();
    setSalvando(false);
  };

  // ── Toggle ativo ───────────────────────────────────────────────────────────

  const toggleAtivo = async (r: Rotina) => {
    const { error } = await supabase
      .from("status_report_configs")
      .update({ ativo: !r.ativo })
      .eq("id", r.id);
    if (error) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    } else {
      setRotinas((prev) => prev.map((x) => x.id === r.id ? { ...x, ativo: !r.ativo } : x));
    }
  };

  // ── Filtros ────────────────────────────────────────────────────────────────

  const filtered = rotinas.filter((r) => {
    const nome = r.clientes?.nome ?? "";
    const matchBusca =
      nome.toLowerCase().includes(busca.toLowerCase()) ||
      (r.fap ?? "").toLowerCase().includes(busca.toLowerCase());
    const matchStatus =
      filtroStatus === "todos" ||
      (filtroStatus === "ativo"   && r.ativo) ||
      (filtroStatus === "inativo" && !r.ativo);
    return matchBusca && matchStatus;
  });

  const stats = {
    total:        rotinas.length,
    ativas:       rotinas.filter((r) => r.ativo).length,
    comErro:      rotinas.filter((r) => r.ultimoEnvio?.status === "erro").length,
    destinatarios: rotinas.reduce((s, r) => s + r.sr_destinatarios.filter((d) => d.ativo).length, 0),
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <AppLayout title="Rotinas & Agendamentos" subtitle="Configure e monitore automações de envio por cliente">

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente ou FAP..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="w-32">
              <Filter className="h-3.5 w-3.5 mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="ativo">Ativos</SelectItem>
              <SelectItem value="inativo">Inativos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button className="gap-2" onClick={abrirNovo}>
          <Plus className="h-4 w-4" /> Nova Rotina
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total de Rotinas",    value: stats.total,         icon: CalendarClock, color: "text-primary" },
          { label: "Ativas",              value: stats.ativas,        icon: Play,          color: "text-accent" },
          { label: "Com Erro",            value: stats.comErro,       icon: XCircle,       color: "text-destructive" },
          { label: "Destinatários Ativos",value: stats.destinatarios, icon: Users,         color: "text-primary" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-muted-foreground font-medium block">{s.label}</span>
                <span className={`text-2xl font-bold ${s.color}`}>{s.value}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Carregando rotinas...</span>
        </div>
      )}

      {/* Table */}
      {!loading && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Cliente</TableHead>
                    <TableHead className="text-xs">FAP</TableHead>
                    <TableHead className="text-xs">Período</TableHead>
                    <TableHead className="text-xs">Dia Envio</TableHead>
                    <TableHead className="text-xs">Modelo</TableHead>
                    <TableHead className="text-xs text-center">Destinatários</TableHead>
                    <TableHead className="text-xs text-center">Último Envio</TableHead>
                    <TableHead className="text-xs text-center">Status</TableHead>
                    <TableHead className="text-xs text-center">Ativo</TableHead>
                    <TableHead className="text-xs text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {filtered.map((r, i) => (
                      <motion.tr
                        key={r.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        className={`border-b border-border transition-colors hover:bg-muted/50 cursor-pointer ${!r.ativo ? "opacity-50" : ""}`}
                        onClick={() => { setRotinaSelecionada(r); setDetalheOpen(true); }}
                      >
                        <TableCell className="text-xs font-medium">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                            {r.clientes?.nome ?? "—"}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">{r.fap ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px]">
                            {periodoLabels[r.periodo ?? ""] ?? r.periodo ?? "—"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-center">Dia {r.dia_envio}</TableCell>
                        <TableCell className="text-xs max-w-[180px] truncate text-muted-foreground">
                          {r.modelos_email?.assunto ?? "Sem modelo"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-[10px] gap-1">
                            <Users className="h-3 w-3" />
                            {r.sr_destinatarios.filter((d) => d.ativo).length}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-center text-muted-foreground">
                          {r.ultimoEnvio
                            ? new Date(r.ultimoEnvio.enviado_em).toLocaleDateString("pt-BR")
                            : "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          <StatusIcon status={r.ultimoEnvio?.status ?? null} />
                        </TableCell>
                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          <Switch checked={r.ativo} onCheckedChange={() => toggleAtivo(r)} />
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => abrirEditar(r)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <CalendarClock className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Nenhuma rotina encontrada</p>
          <p className="text-xs mt-1 opacity-60">Clique em "Nova Rotina" para começar</p>
        </div>
      )}

      {/* ── Dialog Criar / Editar ──────────────────────────────────────────── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar Rotina" : "Nova Rotina"}</DialogTitle>
            <DialogDescription>
              Configure o agendamento de envio automático de Status Report.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-1">

            {/* Cliente */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Cliente <span className="text-destructive">*</span>
              </Label>
              <Select value={form.cliente_id} onValueChange={(v) => setForm({ ...form, cliente_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Modelo de email */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Modelo de Email
              </Label>
              <Select value={form.modelo_id} onValueChange={(v) => setForm({ ...form, modelo_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um modelo (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem modelo</SelectItem>
                  {modelos.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>{m.assunto}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* FAP */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                FAP
              </Label>
              <Input
                value={form.fap}
                onChange={(e) => setForm({ ...form, fap: e.target.value })}
                placeholder="Ex: FAP-001"
              />
            </div>

            {/* Período + Dia de Envio */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Período <span className="text-destructive">*</span>
                </Label>
                <Select value={form.periodo} onValueChange={(v) => setForm({ ...form, periodo: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semanal">Semanal</SelectItem>
                    <SelectItem value="quinzenal">Quinzenal</SelectItem>
                    <SelectItem value="mensal">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Dia de Envio <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={28}
                  value={form.dia_envio}
                  onChange={(e) => setForm({ ...form, dia_envio: e.target.value })}
                  placeholder="1 – 28"
                />
              </div>
            </div>

            {/* Switches */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
                <div>
                  <p className="text-xs font-semibold text-foreground">Enviar sem OS</p>
                  <p className="text-[11px] text-muted-foreground">Enviar mesmo sem apontamentos</p>
                </div>
                <Switch
                  checked={form.enviar_sem_os}
                  onCheckedChange={(v) => setForm({ ...form, enviar_sem_os: v })}
                />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
                <div>
                  <p className="text-xs font-semibold text-foreground">Rotina ativa</p>
                  <p className="text-[11px] text-muted-foreground">Habilitar agendamento</p>
                </div>
                <Switch
                  checked={form.ativo}
                  onCheckedChange={(v) => setForm({ ...form, ativo: v })}
                />
              </div>
            </div>

            <Separator />

            {/* Destinatários */}
            <div className="space-y-3">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Destinatários
              </Label>

              {/* Adicionar email */}
              <div className="flex gap-2">
                <Input
                  type="email"
                  value={novoEmail}
                  onChange={(e) => setNovoEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), adicionarEmail())}
                  placeholder="email@exemplo.com"
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={adicionarEmail} className="gap-1.5 shrink-0">
                  <UserPlus className="h-4 w-4" /> Adicionar
                </Button>
              </div>

              {/* Lista de emails */}
              {destinatarios.length === 0 ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground border border-dashed border-border rounded-xl px-4 py-3">
                  <Mail className="h-4 w-4 opacity-40" />
                  Nenhum destinatário adicionado ainda.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  <AnimatePresence>
                    {destinatarios.map((email) => (
                      <motion.div
                        key={email}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex items-center justify-between bg-muted rounded-lg px-3 py-2"
                      >
                        <span className="text-xs font-mono truncate">{email}</span>
                        <button
                          type="button"
                          onClick={() => removerEmail(email)}
                          className="text-muted-foreground hover:text-destructive transition-colors ml-2 shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={salvando || !form.cliente_id}>
              {salvando && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editando ? "Salvar Alterações" : "Criar Rotina"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Detalhe (somente leitura) ──────────────────────────────── */}
      <Dialog open={detalheOpen} onOpenChange={setDetalheOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {rotinaSelecionada?.clientes?.nome ?? "Rotina"}
            </DialogTitle>
            <DialogDescription>Detalhes da rotina de automação</DialogDescription>
          </DialogHeader>
          {rotinaSelecionada && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "FAP",           value: rotinaSelecionada.fap ?? "—" },
                  { label: "Período",       value: periodoLabels[rotinaSelecionada.periodo ?? ""] ?? rotinaSelecionada.periodo ?? "—" },
                  { label: "Dia de Envio",  value: `Dia ${rotinaSelecionada.dia_envio}` },
                  { label: "Enviar sem OS", value: rotinaSelecionada.enviar_sem_os ? "Sim" : "Não" },
                ].map((item) => (
                  <div key={item.label} className="bg-muted rounded-lg p-3">
                    <span className="text-[11px] text-muted-foreground block mb-0.5">{item.label}</span>
                    <span className="text-sm font-medium">{item.value}</span>
                  </div>
                ))}
              </div>

              {rotinaSelecionada.modelos_email && (
                <div className="bg-muted rounded-lg p-3">
                  <span className="text-[11px] text-muted-foreground block mb-0.5">
                    <Mail className="h-3 w-3 inline mr-1" /> Modelo Vinculado
                  </span>
                  <span className="text-sm font-medium">{rotinaSelecionada.modelos_email.assunto}</span>
                </div>
              )}

              {rotinaSelecionada.ultimoEnvio && (
                <div className="bg-muted rounded-lg p-3">
                  <span className="text-[11px] text-muted-foreground block mb-0.5">Último Envio</span>
                  <span className="text-sm font-medium">
                    {new Date(rotinaSelecionada.ultimoEnvio.enviado_em).toLocaleString("pt-BR")}
                    {" · "}
                    <span className={
                      rotinaSelecionada.ultimoEnvio.status === "enviado" ? "text-accent" :
                      rotinaSelecionada.ultimoEnvio.status === "erro"    ? "text-destructive" : "text-amber-500"
                    }>
                      {rotinaSelecionada.ultimoEnvio.status}
                    </span>
                  </span>
                </div>
              )}

              <Separator />

              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Destinatários ({rotinaSelecionada.sr_destinatarios.length})
                </h4>
                {rotinaSelecionada.sr_destinatarios.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum destinatário cadastrado.</p>
                ) : (
                  <div className="space-y-2">
                    {rotinaSelecionada.sr_destinatarios.map((d) => (
                      <div key={d.id} className="flex items-center justify-between bg-muted rounded-lg px-3 py-2">
                        <span className="text-xs font-mono">{d.email}</span>
                        <Badge variant={d.ativo ? "default" : "secondary"} className="text-[10px]">
                          {d.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-1">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setDetalheOpen(false); abrirEditar(rotinaSelecionada); }}>
                  <Pencil className="h-3.5 w-3.5" /> Editar Rotina
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

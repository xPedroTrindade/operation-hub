import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Building2, Plus, Search, Pencil, Trash2, Loader2,
  CheckCircle2, XCircle, Users, UserCheck, UserX, X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface Cliente {
  id: string;
  nome: string;
  cnpj: string;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

type FiltroStatus = "todos" | "ativos" | "inativos";

// ── Utilitários ───────────────────────────────────────────────────────────────
function mascaraCNPJ(v: string): string {
  v = v.replace(/\D/g, "").slice(0, 14);
  if (v.length > 12) return v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})$/, "$1.$2.$3/$4-$5");
  if (v.length > 8)  return v.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4})$/, "$1.$2.$3/$4");
  if (v.length > 5)  return v.replace(/^(\d{2})(\d{3})(\d{0,3})$/, "$1.$2.$3");
  if (v.length > 2)  return v.replace(/^(\d{2})(\d{0,3})$/, "$1.$2");
  return v;
}

function validarCNPJ(cnpj: string): boolean {
  const nums = cnpj.replace(/\D/g, "");
  if (nums.length !== 14) return false;
  if (/^(\d)\1+$/.test(nums)) return false;
  const calc = (n: number) => {
    let soma = 0;
    let peso = n - 7;
    for (let i = n; i >= 1; i--) {
      soma += parseInt(nums[n - i]) * peso--;
      if (peso < 2) peso = 9;
    }
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === parseInt(nums[12]) && calc(13) === parseInt(nums[13]);
}

function formatarData(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({
  icon: Icon, label, value, color, delay,
}: {
  icon: React.ElementType; label: string; value: number; color: string; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
    >
      <Card className="border-border bg-card">
        <CardContent className="p-5 flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold text-foreground leading-tight">{value}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Form de cadastro / edição ─────────────────────────────────────────────────
interface ClienteForm {
  nome: string;
  cnpj: string;
  ativo: boolean;
}

const FORM_VAZIO: ClienteForm = { nome: "", cnpj: "", ativo: true };

function DialogCliente({
  aberto,
  editando,
  onClose,
  onSalvo,
}: {
  aberto: boolean;
  editando: Cliente | null;
  onClose: () => void;
  onSalvo: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState<ClienteForm>(FORM_VAZIO);
  const [erros, setErros] = useState<Partial<Record<keyof ClienteForm, string>>>({});
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (aberto) {
      setErros({});
      setForm(
        editando
          ? { nome: editando.nome, cnpj: editando.cnpj, ativo: editando.ativo }
          : FORM_VAZIO
      );
    }
  }, [aberto, editando]);

  const set = <K extends keyof ClienteForm>(k: K, v: ClienteForm[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  function validar(): boolean {
    const e: Partial<Record<keyof ClienteForm, string>> = {};
    if (!form.nome.trim()) e.nome = "Razão social é obrigatória.";
    if (form.cnpj && !validarCNPJ(form.cnpj)) e.cnpj = "CNPJ inválido.";
    setErros(e);
    return Object.keys(e).length === 0;
  }

  async function handleSalvar() {
    if (!validar()) return;
    setSalvando(true);
    try {
      const payload = {
        nome: form.nome.trim(),
        cnpj: form.cnpj,
        ativo: form.ativo,
      };

      if (editando) {
        const { error } = await supabase
          .from("clientes")
          .update({ ...payload, atualizado_em: new Date().toISOString() })
          .eq("id", editando.id);
        if (error) throw error;
        toast({ title: "Cliente atualizado", description: `${payload.nome} foi salvo com sucesso.` });
      } else {
        const { error } = await supabase.from("clientes").insert(payload);
        if (error) {
          if (error.code === "23505") throw new Error("Já existe um cliente com este CNPJ.");
          throw error;
        }
        toast({ title: "Cliente cadastrado", description: `${payload.nome} foi adicionado com sucesso.` });
      }

      onSalvo();
      onClose();
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    }
    setSalvando(false);
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-primary" />
            {editando ? "Editar Cliente" : "Novo Cliente"}
          </DialogTitle>
          <DialogDescription className="text-[12px] text-muted-foreground">
            {editando
              ? "Atualize os dados do cliente abaixo."
              : "Preencha os dados para cadastrar um novo cliente."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Nome */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Razão Social <span className="text-destructive">*</span>
            </Label>
            <Input
              value={form.nome}
              onChange={(e) => set("nome", e.target.value)}
              placeholder="Ex: Empresa Exemplo Ltda"
              className="bg-background border-border"
              autoFocus
            />
            {erros.nome && (
              <p className="text-[11px] text-destructive flex items-center gap-1">
                <XCircle className="h-3 w-3" /> {erros.nome}
              </p>
            )}
          </div>

          {/* CNPJ */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              CNPJ <span className="text-muted-foreground/50">(opcional)</span>
            </Label>
            <Input
              value={form.cnpj}
              onChange={(e) => set("cnpj", mascaraCNPJ(e.target.value))}
              placeholder="XX.XXX.XXX/XXXX-XX"
              className="bg-background border-border font-mono tracking-wide"
              maxLength={18}
            />
            {erros.cnpj && (
              <p className="text-[11px] text-destructive flex items-center gap-1">
                <XCircle className="h-3 w-3" /> {erros.cnpj}
              </p>
            )}
          </div>

          {/* Ativo */}
          <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Status do cliente</p>
              <p className="text-[11px] text-muted-foreground">
                {form.ativo ? "Cliente ativo no sistema" : "Cliente inativo no sistema"}
              </p>
            </div>
            <Switch
              checked={form.ativo}
              onCheckedChange={(v) => set("ativo", v)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={salvando} className="border-border">
            Cancelar
          </Button>
          <Button onClick={handleSalvar} disabled={salvando} className="gap-2">
            {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {editando ? "Salvar alterações" : "Cadastrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Diálogo de confirmação de exclusão ────────────────────────────────────────
function DialogExcluir({
  cliente,
  onClose,
  onConfirmado,
}: {
  cliente: Cliente | null;
  onClose: () => void;
  onConfirmado: () => void;
}) {
  const { toast } = useToast();
  const [excluindo, setExcluindo] = useState(false);

  async function handleExcluir() {
    if (!cliente) return;
    setExcluindo(true);
    const { error } = await supabase.from("clientes").delete().eq("id", cliente.id);
    setExcluindo(false);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Cliente excluído", description: `${cliente.nome} foi removido.` });
      onConfirmado();
      onClose();
    }
  }

  return (
    <Dialog open={!!cliente} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base text-destructive">
            <Trash2 className="h-4 w-4" />
            Excluir Cliente
          </DialogTitle>
          <DialogDescription className="text-[13px]">
            Tem certeza que deseja excluir{" "}
            <span className="font-semibold text-foreground">{cliente?.nome}</span>? Esta
            ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={excluindo} className="border-border">
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleExcluir} disabled={excluindo} className="gap-2">
            {excluindo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Excluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function Clientes() {
  const { toast } = useToast();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("todos");

  const [dialogAberto, setDialogAberto] = useState(false);
  const [editando, setEditando] = useState<Cliente | null>(null);
  const [excluindo, setExcluindo] = useState<Cliente | null>(null);

  // ── Carregar clientes ──
  const carregar = useCallback(async () => {
    setCarregando(true);
    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .order("nome", { ascending: true });

    if (error) {
      toast({ title: "Erro ao carregar clientes", description: error.message, variant: "destructive" });
    } else {
      setClientes((data as Cliente[]) ?? []);
    }
    setCarregando(false);
  }, [toast]);

  useEffect(() => { carregar(); }, [carregar]);

  // ── Filtros ──
  const clientesFiltrados = clientes.filter((c) => {
    const termo = busca.toLowerCase();
    const matchBusca =
      !termo ||
      c.nome.toLowerCase().includes(termo) ||
      c.cnpj.includes(termo);
    const matchStatus =
      filtroStatus === "todos" ||
      (filtroStatus === "ativos" && c.ativo) ||
      (filtroStatus === "inativos" && !c.ativo);
    return matchBusca && matchStatus;
  });

  // ── KPIs ──
  const total = clientes.length;
  const ativos = clientes.filter((c) => c.ativo).length;
  const inativos = total - ativos;

  // ── Abrir edição ──
  function abrirEdicao(c: Cliente) {
    setEditando(c);
    setDialogAberto(true);
  }

  function fecharDialog() {
    setDialogAberto(false);
    setEditando(null);
  }

  // ── Toggle rápido de status ──
  async function toggleStatus(c: Cliente) {
    const novoStatus = !c.ativo;
    setClientes((prev) =>
      prev.map((x) => (x.id === c.id ? { ...x, ativo: novoStatus } : x))
    );
    const { error } = await supabase
      .from("clientes")
      .update({ ativo: novoStatus, atualizado_em: new Date().toISOString() })
      .eq("id", c.id);
    if (error) {
      setClientes((prev) =>
        prev.map((x) => (x.id === c.id ? { ...x, ativo: c.ativo } : x))
      );
      toast({ title: "Erro ao atualizar status", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: novoStatus ? "Cliente ativado" : "Cliente desativado",
        description: `${c.nome} foi ${novoStatus ? "ativado" : "desativado"}.`,
      });
    }
  }

  const filtrosBotoes: { key: FiltroStatus; label: string }[] = [
    { key: "todos", label: "Todos" },
    { key: "ativos", label: "Ativos" },
    { key: "inativos", label: "Inativos" },
  ];

  return (
    <AppLayout
      title="Clientes"
      subtitle="Cadastro e gestão de clientes"
      headerExtra={
        <Button
          onClick={() => { setEditando(null); setDialogAberto(true); }}
          size="sm"
          className="gap-2 h-8 text-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          Novo Cliente
        </Button>
      }
    >
      {/* ── KPIs ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard icon={Users}     label="Total de Clientes" value={total}   color="bg-primary/10 text-primary"         delay={0} />
        <KpiCard icon={UserCheck} label="Clientes Ativos"   value={ativos}  color="bg-green-500/10 text-green-600"    delay={0.05} />
        <KpiCard icon={UserX}     label="Clientes Inativos" value={inativos} color="bg-amber/10 text-amber-600"       delay={0.1} />
      </div>

      {/* ── Barra de busca e filtros ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        {/* Busca */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou CNPJ..."
            className="pl-9 bg-card border-border"
          />
          {busca && (
            <button
              onClick={() => setBusca("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filtro de status */}
        <div className="flex items-center bg-card border border-border rounded-lg p-1 gap-1 shrink-0">
          {filtrosBotoes.map((f) => (
            <button
              key={f.key}
              onClick={() => setFiltroStatus(f.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                filtroStatus === f.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── Tabela ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card border border-border rounded-xl overflow-hidden shadow-[var(--shadow-sm)]"
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pl-5">Razão Social</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">CNPJ</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cadastrado em</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right pr-5">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {carregando ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-40 text-center">
                    <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" />
                  </TableCell>
                </TableRow>
              ) : clientesFiltrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-40 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Building2 className="h-8 w-8 opacity-30" />
                      <p className="text-sm font-medium">
                        {busca || filtroStatus !== "todos"
                          ? "Nenhum cliente encontrado para este filtro."
                          : "Nenhum cliente cadastrado ainda."}
                      </p>
                      {!busca && filtroStatus === "todos" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-1 border-border"
                          onClick={() => { setEditando(null); setDialogAberto(true); }}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1.5" />
                          Cadastrar primeiro cliente
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                <AnimatePresence initial={false}>
                  {clientesFiltrados.map((c, i) => (
                    <motion.tr
                      key={c.id}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 6 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      {/* Nome */}
                      <TableCell className="pl-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Building2 className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <span className="font-medium text-[13px] text-foreground">{c.nome}</span>
                        </div>
                      </TableCell>

                      {/* CNPJ */}
                      <TableCell className="py-3.5">
                        <span className="font-mono text-[12px] text-muted-foreground tracking-wide">{c.cnpj}</span>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="py-3.5">
                        <button
                          onClick={() => toggleStatus(c)}
                          className="group focus:outline-none"
                          title={c.ativo ? "Clique para desativar" : "Clique para ativar"}
                        >
                          <Badge
                            variant={c.ativo ? "default" : "outline"}
                            className={`gap-1 text-[11px] transition-all cursor-pointer ${
                              c.ativo
                                ? "bg-green-500/15 text-green-700 border-green-500/30 hover:bg-green-500/25"
                                : "text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            {c.ativo
                              ? <CheckCircle2 className="h-3 w-3" />
                              : <XCircle className="h-3 w-3" />}
                            {c.ativo ? "Ativo" : "Inativo"}
                          </Badge>
                        </button>
                      </TableCell>

                      {/* Data */}
                      <TableCell className="py-3.5">
                        <span className="text-[12px] text-muted-foreground font-mono">{formatarData(c.criado_em)}</span>
                      </TableCell>

                      {/* Ações */}
                      <TableCell className="py-3.5 pr-5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => abrirEdicao(c)}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            title="Editar cliente"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setExcluindo(c)}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title="Excluir cliente"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Rodapé da tabela */}
        {!carregando && clientesFiltrados.length > 0 && (
          <div className="px-5 py-2.5 border-t border-border bg-muted/20 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              {clientesFiltrados.length === clientes.length
                ? `${total} cliente${total !== 1 ? "s" : ""}`
                : `${clientesFiltrados.length} de ${total} cliente${total !== 1 ? "s" : ""}`}
            </span>
            {busca || filtroStatus !== "todos" ? (
              <button
                onClick={() => { setBusca(""); setFiltroStatus("todos"); }}
                className="text-[11px] text-primary hover:underline"
              >
                Limpar filtros
              </button>
            ) : null}
          </div>
        )}
      </motion.div>

      {/* ── Diálogos ── */}
      <DialogCliente
        aberto={dialogAberto}
        editando={editando}
        onClose={fecharDialog}
        onSalvo={carregar}
      />
      <DialogExcluir
        cliente={excluindo}
        onClose={() => setExcluindo(null)}
        onConfirmado={carregar}
      />
    </AppLayout>
  );
}

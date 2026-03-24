import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import {
  Settings, Users, Save, Loader2, Shield, Eye, EyeOff,
  CheckCircle2, XCircle, Building2, SlidersHorizontal,
  User, Lock, FileText, Bot, Clock, Link2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

// ── Módulos ───────────────────────────────────────────────────────────────────
const MODULES = [
  { key: "automacao-os",       label: "Automação de OS" },
  { key: "gerador-email",      label: "Gerador de Email" },
  { key: "status-report",      label: "Status Report" },
  { key: "analisador-horas",   label: "Análise de Horas" },
  { key: "saldo-horas",        label: "Saldo de Horas" },
  { key: "status-os-consultor",label: "Status Consultor" },
  { key: "admin",              label: "Painel Admin" },
];

// ── Definição dos links do sistema ────────────────────────────────────────────
// Cada link tem um campo único na tabela configuracoes_clientes.
// Para adicionar um novo link no futuro: adicione aqui + coluna no banco.
const LINK_DEFS = [
  {
    campo:     "url_abertura_os" as const,
    titulo:    "Abertura de OS",
    descricao: "URL usada pelo robô Python para abrir ordens de serviço na FAP",
    icon:      Bot,
    cor:       "text-primary bg-primary/10 border-primary/20",
    corIcon:   "text-primary",
  },
  {
    campo:     "url_saldo_horas" as const,
    titulo:    "Consulta de Saldo de Horas",
    descricao: "URL usada pela tela Saldo de Horas para consultar o saldo do cliente",
    icon:      Clock,
    cor:       "text-blue-700 bg-blue/8 border-blue/20",
    corIcon:   "text-blue-600",
  },
] as const;

type CampoLink = typeof LINK_DEFS[number]["campo"];

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface ConfigData {
  id?: number;
  tenant_id: number | null;
  exp_url: string;
  exp_usuario: string;
  exp_senha: string;
  smtp_host: string;
  smtp_porta: number;
  smtp_usuario: string;
  smtp_senha: string;
  smtp_de_nome: string;
  smtp_usar_tls: boolean;
  pdf_nome_empresa: string;
  pdf_cabecalho: string;
  pdf_rodape: string;
}

const DEFAULT_CONFIG: ConfigData = {
  tenant_id: null,
  exp_url: "",
  exp_usuario: "",
  exp_senha: "",
  smtp_host: "smtp.gmail.com",
  smtp_porta: 587,
  smtp_usuario: "",
  smtp_senha: "",
  smtp_de_nome: "ServicePro",
  smtp_usar_tls: true,
  pdf_nome_empresa: "",
  pdf_cabecalho: "Relatório de Status",
  pdf_rodape: "Gerado pelo ServicePro",
};

interface UserProfile {
  id: string;
  user_id: string;
  nome: string | null;
  email: string | null;
  created_at: string;
}

interface ModuleAccess {
  [moduleKey: string]: boolean;
}

interface ClienteAdmin {
  id: string;
  nome: string;
  cnpj: string;
  ativo: boolean;
}

interface ConfigCliente {
  id?: string;
  cliente_id: string;
  exp_usuario: string;
  exp_senha: string;
  url_abertura_os: string;
  url_saldo_horas: string;
  obs: string;
}

const CONFIG_VAZIA: Omit<ConfigCliente, "cliente_id"> = {
  exp_usuario: "",
  exp_senha: "",
  url_abertura_os: "",
  url_saldo_horas: "",
  obs: "",
};

// ── Dialog de configuração por cliente ───────────────────────────────────────
function DialogConfigCliente({
  cliente,
  configAtual,
  onClose,
  onSalvo,
}: {
  cliente: ClienteAdmin | null;
  configAtual: ConfigCliente | null;
  onClose: () => void;
  onSalvo: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState<Omit<ConfigCliente, "cliente_id">>(CONFIG_VAZIA);
  const [showSenha, setShowSenha] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (cliente) {
      setShowSenha(false);
      setForm(
        configAtual
          ? {
              exp_usuario:    configAtual.exp_usuario,
              exp_senha:      configAtual.exp_senha,
              url_abertura_os: configAtual.url_abertura_os,
              url_saldo_horas: configAtual.url_saldo_horas,
              obs:            configAtual.obs,
            }
          : { ...CONFIG_VAZIA }
      );
    }
  }, [cliente, configAtual]);

  const set = <K extends keyof typeof form>(k: K, v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  // Conta links preenchidos
  const linksPreenchidos = LINK_DEFS.filter((l) => !!form[l.campo].trim()).length;

  async function handleSalvar() {
    if (!cliente) return;
    setSalvando(true);
    try {
      const payload: ConfigCliente = {
        cliente_id:      cliente.id,
        exp_usuario:     form.exp_usuario.trim(),
        exp_senha:       form.exp_senha,
        url_abertura_os: form.url_abertura_os.trim(),
        url_saldo_horas: form.url_saldo_horas.trim(),
        obs:             form.obs.trim(),
      };

      const { error } = await supabase
        .from("configuracoes_clientes")
        .upsert(payload, { onConflict: "cliente_id" });

      if (error) throw error;

      toast({ title: "Configurações salvas", description: `${cliente.nome} atualizado com sucesso.` });
      onSalvo();
      onClose();
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    }
    setSalvando(false);
  }

  return (
    <Dialog open={!!cliente} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-xl bg-card border-border p-0 gap-0 overflow-hidden">
        {/* ── Cabeçalho colorido ── */}
        <div className="bg-primary/5 border-b border-border px-6 py-5">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <Building2 className="h-4.5 w-4.5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-[15px] font-semibold text-foreground leading-tight">
                  {cliente?.nome}
                </DialogTitle>
                <DialogDescription className="text-[11px] font-mono text-muted-foreground mt-0.5">
                  {cliente?.cnpj}
                </DialogDescription>
              </div>
            </div>

            {/* Progresso dos links */}
            <div className="flex items-center gap-2 mt-4">
              {LINK_DEFS.map((l) => {
                const ok = !!form[l.campo].trim();
                return (
                  <div key={l.campo} className="flex items-center gap-1.5 text-[11px]">
                    {ok
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                      : <XCircle className="h-3.5 w-3.5 text-muted-foreground/40" />}
                    <span className={ok ? "text-green-700 font-medium" : "text-muted-foreground"}>{l.titulo}</span>
                  </div>
                );
              })}
              <span className="ml-auto text-[11px] text-muted-foreground">
                {linksPreenchidos}/{LINK_DEFS.length} link{LINK_DEFS.length !== 1 ? "s" : ""} configurado{linksPreenchidos !== 1 ? "s" : ""}
              </span>
            </div>
          </DialogHeader>
        </div>

        {/* ── Corpo ── */}
        <div className="px-6 py-5 space-y-6 max-h-[60vh] overflow-y-auto">

          {/* Credenciais de acesso */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Credenciais de Acesso
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <User className="h-3 w-3" /> Usuário
                </Label>
                <Input
                  value={form.exp_usuario}
                  onChange={(e) => set("exp_usuario", e.target.value)}
                  placeholder="login@empresa.com"
                  className="bg-background border-border text-[13px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Lock className="h-3 w-3" /> Senha
                </Label>
                <div className="relative">
                  <Input
                    type={showSenha ? "text" : "password"}
                    value={form.exp_senha}
                    onChange={(e) => set("exp_senha", e.target.value)}
                    placeholder="••••••••"
                    className="pr-9 bg-background border-border text-[13px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSenha((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showSenha ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <Separator className="bg-border" />

          {/* Links por funcionalidade */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Links por Funcionalidade
              </p>
            </div>

            <div className="space-y-3">
              {LINK_DEFS.map((def) => {
                const Icon = def.icon;
                const val = form[def.campo];
                const preenchido = !!val.trim();

                return (
                  <div
                    key={def.campo}
                    className={`rounded-xl border p-4 transition-colors ${
                      preenchido ? "border-border bg-background" : "border-dashed border-border/60 bg-muted/20"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Ícone */}
                      <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${def.cor}`}>
                        <Icon className={`h-4 w-4 ${def.corIcon}`} />
                      </div>

                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[13px] font-semibold text-foreground leading-tight">{def.titulo}</p>
                            <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{def.descricao}</p>
                          </div>
                          {preenchido && (
                            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                          )}
                        </div>

                        <Input
                          value={val}
                          onChange={(e) => set(def.campo, e.target.value)}
                          placeholder="https://..."
                          className="bg-card border-border text-[12px] font-mono h-8"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <Separator className="bg-border" />

          {/* Observações */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Observações</p>
            </div>
            <textarea
              value={form.obs}
              onChange={(e) => set("obs", e.target.value)}
              placeholder="Particularidades deste cliente, usuários alternativos, anotações..."
              rows={2}
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-colors"
            />
          </div>
        </div>

        {/* ── Rodapé ── */}
        <div className="border-t border-border px-6 py-4 bg-muted/20 flex items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground">
            Alterações salvas individualmente por cliente
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={salvando} className="border-border h-8 text-xs">
              Cancelar
            </Button>
            <Button onClick={handleSalvar} disabled={salvando} className="gap-2 h-8 text-xs">
              {salvando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Salvar configurações
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function Admin() {
  const { toast } = useToast();

  // Config geral
  const [config, setConfig] = useState<ConfigData>(DEFAULT_CONFIG);
  const [configLoading, setConfigLoading] = useState(true);
  const [configSaving, setConfigSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  // Usuários
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [userAccess, setUserAccess] = useState<Record<string, ModuleAccess>>({});
  const [savingUser, setSavingUser] = useState<string | null>(null);

  // Clientes
  const [clientes, setClientes] = useState<ClienteAdmin[]>([]);
  const [clientesLoading, setClientesLoading] = useState(true);
  const [configsClientes, setConfigsClientes] = useState<Record<string, ConfigCliente>>({});
  const [clienteSelecionado, setClienteSelecionado] = useState<ClienteAdmin | null>(null);

  useEffect(() => {
    loadConfig();
    loadUsers();
    loadClientes();
  }, []);

  // ── Config geral ──
  async function loadConfig() {
    setConfigLoading(true);
    const { data } = await supabase
      .from("configuracoes_gerais")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (data) {
      setConfig({
        id: data.id,
        tenant_id: data.tenant_id,
        exp_url: data.exp_url || "",
        exp_usuario: data.exp_usuario || "",
        exp_senha: data.exp_senha || "",
        smtp_host: data.smtp_host || "smtp.gmail.com",
        smtp_porta: data.smtp_porta || 587,
        smtp_usuario: data.smtp_usuario || "",
        smtp_senha: data.smtp_senha || "",
        smtp_de_nome: data.smtp_de_nome || "ServicePro",
        smtp_usar_tls: data.smtp_usar_tls ?? true,
        pdf_nome_empresa: data.pdf_nome_empresa || "",
        pdf_cabecalho: data.pdf_cabecalho || "Relatório de Status",
        pdf_rodape: data.pdf_rodape || "Gerado pelo ServicePro",
      });
    }
    setConfigLoading(false);
  }

  async function saveConfig() {
    setConfigSaving(true);
    try {
      const payload = {
        tenant_id: config.tenant_id,
        exp_url: config.exp_url,
        exp_usuario: config.exp_usuario,
        exp_senha: config.exp_senha,
        smtp_host: config.smtp_host,
        smtp_porta: config.smtp_porta,
        smtp_usuario: config.smtp_usuario,
        smtp_senha: config.smtp_senha,
        smtp_de_nome: config.smtp_de_nome,
        smtp_usar_tls: config.smtp_usar_tls,
        pdf_nome_empresa: config.pdf_nome_empresa,
        pdf_cabecalho: config.pdf_cabecalho,
        pdf_rodape: config.pdf_rodape,
      };

      if (config.id) {
        const { error } = await supabase.from("configuracoes_gerais").update(payload).eq("id", config.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("configuracoes_gerais").insert(payload).select().single();
        if (error) throw error;
        if (data) setConfig((prev) => ({ ...prev, id: data.id }));
      }

      toast({ title: "Configurações salvas", description: "As configurações foram atualizadas com sucesso." });
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    }
    setConfigSaving(false);
  }

  // ── Usuários ──
  async function loadUsers() {
    setUsersLoading(true);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: true });

    if (profiles) {
      setUsers(profiles);
      const { data: accessData } = await supabase.from("user_module_access").select("*");
      const accessMap: Record<string, ModuleAccess> = {};
      if (accessData) {
        for (const entry of accessData) {
          if (!accessMap[entry.user_id]) accessMap[entry.user_id] = {};
          accessMap[entry.user_id][entry.module_key] = entry.has_access;
        }
      }
      setUserAccess(accessMap);
    }
    setUsersLoading(false);
  }

  async function toggleModuleAccess(userId: string, moduleKey: string, currentValue: boolean) {
    setSavingUser(userId);
    const newValue = !currentValue;
    setUserAccess((prev) => ({ ...prev, [userId]: { ...prev[userId], [moduleKey]: newValue } }));

    const { error } = await supabase
      .from("user_module_access")
      .upsert({ user_id: userId, module_key: moduleKey, has_access: newValue }, { onConflict: "user_id,module_key" });

    if (error) {
      setUserAccess((prev) => ({ ...prev, [userId]: { ...prev[userId], [moduleKey]: currentValue } }));
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
    setSavingUser(null);
  }

  // ── Clientes ──
  async function loadClientes() {
    setClientesLoading(true);
    const { data: clientesData } = await supabase
      .from("clientes")
      .select("id, nome, cnpj, ativo")
      .order("nome", { ascending: true });

    if (clientesData) {
      setClientes(clientesData as ClienteAdmin[]);
      const { data: configsData } = await supabase.from("configuracoes_clientes").select("*");
      if (configsData) {
        const mapa: Record<string, ConfigCliente> = {};
        for (const c of configsData) mapa[c.cliente_id] = c as ConfigCliente;
        setConfigsClientes(mapa);
      }
    }
    setClientesLoading(false);
  }

  // ── Helpers ──
  const togglePassword = (field: string) =>
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));

  const PasswordInput = ({ field, value, onChange }: { field: string; value: string; onChange: (v: string) => void }) => (
    <div className="relative">
      <Input
        type={showPasswords[field] ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pr-10 bg-background border-border"
      />
      <button
        type="button"
        onClick={() => togglePassword(field)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      >
        {showPasswords[field] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );

  return (
    <AppLayout title="Painel Administrativo" subtitle="Configurações do sistema e gestão de usuários">
      <Tabs defaultValue="config" className="space-y-4">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="config" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Settings className="h-4 w-4" /> Configurações
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Users className="h-4 w-4" /> Usuários
          </TabsTrigger>
          <TabsTrigger value="clientes" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Building2 className="h-4 w-4" /> Clientes
          </TabsTrigger>
        </TabsList>

        {/* ====== CONFIG TAB ====== */}
        <TabsContent value="config" className="space-y-4">
          {configLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <Card className="border-border bg-card">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    Experience / RPA — Global
                  </CardTitle>
                  <CardDescription>Credenciais padrão do Sankhya Experience (fallback quando o cliente não tem config específica)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-xs font-medium text-muted-foreground">Tenant ID</Label>
                      <Input type="number" value={config.tenant_id ?? ""} onChange={(e) => setConfig((p) => ({ ...p, tenant_id: e.target.value ? Number(e.target.value) : null }))} placeholder="ID da empresa" className="bg-background border-border" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-xs font-medium text-muted-foreground">URL Experience (global)</Label>
                      <Input value={config.exp_url} onChange={(e) => setConfig((p) => ({ ...p, exp_url: e.target.value }))} placeholder="https://..." className="bg-background border-border" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Usuário RPA</Label>
                      <Input value={config.exp_usuario} onChange={(e) => setConfig((p) => ({ ...p, exp_usuario: e.target.value }))} placeholder="Login da conta de serviço" className="bg-background border-border" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Senha RPA</Label>
                      <PasswordInput field="exp_senha" value={config.exp_senha} onChange={(v) => setConfig((p) => ({ ...p, exp_senha: v }))} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Settings className="h-4 w-4 text-primary" />
                    SMTP — E-mail de Saída
                  </CardTitle>
                  <CardDescription>Configurações do servidor de e-mail para envio de relatórios</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Host SMTP</Label>
                      <Input value={config.smtp_host} onChange={(e) => setConfig((p) => ({ ...p, smtp_host: e.target.value }))} className="bg-background border-border" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Porta</Label>
                      <Input type="number" value={config.smtp_porta} onChange={(e) => setConfig((p) => ({ ...p, smtp_porta: Number(e.target.value) }))} className="bg-background border-border" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">E-mail Remetente</Label>
                      <Input value={config.smtp_usuario} onChange={(e) => setConfig((p) => ({ ...p, smtp_usuario: e.target.value }))} className="bg-background border-border" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Senha SMTP</Label>
                      <PasswordInput field="smtp_senha" value={config.smtp_senha} onChange={(v) => setConfig((p) => ({ ...p, smtp_senha: v }))} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Nome do Remetente (De:)</Label>
                      <Input value={config.smtp_de_nome} onChange={(e) => setConfig((p) => ({ ...p, smtp_de_nome: e.target.value }))} className="bg-background border-border" />
                    </div>
                    <div className="flex items-center gap-3 pt-6">
                      <Switch checked={config.smtp_usar_tls} onCheckedChange={(v) => setConfig((p) => ({ ...p, smtp_usar_tls: v }))} />
                      <Label className="text-xs font-medium text-muted-foreground">Ativar STARTTLS (porta 587)</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Settings className="h-4 w-4 text-primary" />
                    PDF — Relatórios
                  </CardTitle>
                  <CardDescription>Textos exibidos nos relatórios PDF gerados pelo sistema</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-xs font-medium text-muted-foreground">Nome da Empresa (cabeçalho)</Label>
                      <Input value={config.pdf_nome_empresa} onChange={(e) => setConfig((p) => ({ ...p, pdf_nome_empresa: e.target.value }))} className="bg-background border-border" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Título do Relatório</Label>
                      <Input value={config.pdf_cabecalho} onChange={(e) => setConfig((p) => ({ ...p, pdf_cabecalho: e.target.value }))} className="bg-background border-border" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Rodapé</Label>
                      <Input value={config.pdf_rodape} onChange={(e) => setConfig((p) => ({ ...p, pdf_rodape: e.target.value }))} className="bg-background border-border" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button onClick={saveConfig} disabled={configSaving} className="gap-2">
                  {configSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Salvar Configurações
                </Button>
              </div>
            </>
          )}
        </TabsContent>

        {/* ====== USERS TAB ====== */}
        <TabsContent value="users" className="space-y-4">
          <Card className="border-border bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Gestão de Usuários e Acessos
              </CardTitle>
              <CardDescription>Configure quais módulos cada usuário pode acessar no sistema</CardDescription>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : users.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum usuário cadastrado.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="text-xs font-semibold text-muted-foreground w-[200px]">Usuário</TableHead>
                        {MODULES.map((m) => (
                          <TableHead key={m.key} className="text-xs font-semibold text-muted-foreground text-center min-w-[100px]">
                            {m.label}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id} className="border-border">
                          <TableCell>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-sm font-medium text-foreground">{user.nome || "Sem nome"}</span>
                              <span className="text-[11px] text-muted-foreground font-mono">{user.email}</span>
                            </div>
                          </TableCell>
                          {MODULES.map((m) => {
                            const hasAccess = userAccess[user.user_id]?.[m.key] ?? false;
                            return (
                              <TableCell key={m.key} className="text-center">
                                <button
                                  onClick={() => toggleModuleAccess(user.user_id, m.key, hasAccess)}
                                  disabled={savingUser === user.user_id}
                                  className="inline-flex items-center justify-center"
                                >
                                  {hasAccess ? (
                                    <Badge variant="default" className="gap-1 bg-primary/15 text-primary border-primary/30 hover:bg-primary/25 cursor-pointer text-[10px]">
                                      <CheckCircle2 className="h-3 w-3" /> Sim
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="gap-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer text-[10px]">
                                      <XCircle className="h-3 w-3" /> Não
                                    </Badge>
                                  )}
                                </button>
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ====== CLIENTES TAB ====== */}
        <TabsContent value="clientes" className="space-y-4">
          {/* Legenda dos tipos de link */}
          <div className="flex items-center gap-3 flex-wrap">
            {LINK_DEFS.map((l) => {
              const Icon = l.icon;
              return (
                <div key={l.campo} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-medium ${l.cor}`}>
                  <Icon className={`h-3.5 w-3.5 ${l.corIcon}`} />
                  {l.titulo}
                </div>
              );
            })}
            <span className="text-[11px] text-muted-foreground ml-auto">Clique em "Configurar" para definir os links de cada cliente</span>
          </div>

          <Card className="border-border bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Links por Cliente
              </CardTitle>
              <CardDescription>
                Configure as URLs de acesso do robô e das funcionalidades para cada cliente
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {clientesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : clientes.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground px-6">
                  <Building2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhum cliente cadastrado.</p>
                  <p className="text-xs mt-1">Cadastre clientes na tela de <span className="font-medium">Clientes</span> primeiro.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {clientes.map((c) => {
                    const cfg = configsClientes[c.id];
                    return (
                      <div key={c.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors">
                        {/* Identidade */}
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Building2 className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[13px] font-semibold text-foreground">{c.nome}</span>
                            <span className="font-mono text-[11px] text-muted-foreground">{c.cnpj}</span>
                            {!c.ativo && (
                              <Badge variant="outline" className="text-[10px] text-muted-foreground h-4 px-1.5">Inativo</Badge>
                            )}
                          </div>

                          {/* Status dos links */}
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            {LINK_DEFS.map((l) => {
                              const Icon = l.icon;
                              const ok = !!(cfg?.[l.campo]);
                              return (
                                <div key={l.campo} className={`flex items-center gap-1 text-[11px] ${ok ? "text-green-700" : "text-muted-foreground/50"}`}>
                                  <Icon className="h-3 w-3" />
                                  <span>{l.titulo}</span>
                                  {ok
                                    ? <CheckCircle2 className="h-3 w-3 text-green-500" />
                                    : <XCircle className="h-3 w-3 opacity-40" />}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Botão */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setClienteSelecionado(c)}
                          className="h-8 text-xs gap-1.5 border-border hover:border-primary hover:text-primary shrink-0"
                        >
                          <SlidersHorizontal className="h-3.5 w-3.5" />
                          Configurar
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Rodapé */}
              {!clientesLoading && clientes.length > 0 && (
                <div className="border-t border-border px-5 py-2.5 bg-muted/20 flex items-center justify-between text-[11px] text-muted-foreground rounded-b-xl">
                  <span>{clientes.length} cliente{clientes.length !== 1 ? "s" : ""}</span>
                  <span>
                    {Object.keys(configsClientes).length} com links · {clientes.length - Object.keys(configsClientes).length} pendente{clientes.length - Object.keys(configsClientes).length !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <DialogConfigCliente
        cliente={clienteSelecionado}
        configAtual={clienteSelecionado ? configsClientes[clienteSelecionado.id] ?? null : null}
        onClose={() => setClienteSelecionado(null)}
        onSalvo={loadClientes}
      />
    </AppLayout>
  );
}

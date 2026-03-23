import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Settings, Users, Save, Loader2, Shield, Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

const MODULES = [
  { key: "automacao-os", label: "Automação de OS" },
  { key: "gerador-email", label: "Gerador de Email" },
  { key: "status-report", label: "Status Report" },
  { key: "analisador-horas", label: "Análise de Horas" },
  { key: "saldo-horas", label: "Saldo de Horas" },
  { key: "status-os-consultor", label: "Status Consultor" },
  { key: "admin", label: "Painel Admin" },
];

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

export default function Admin() {
  const { toast } = useToast();

  // Config state
  const [config, setConfig] = useState<ConfigData>(DEFAULT_CONFIG);
  const [configLoading, setConfigLoading] = useState(true);
  const [configSaving, setConfigSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  // Users state
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [userAccess, setUserAccess] = useState<Record<string, ModuleAccess>>({});
  const [savingUser, setSavingUser] = useState<string | null>(null);

  // Load config
  useEffect(() => {
    loadConfig();
    loadUsers();
  }, []);

  async function loadConfig() {
    setConfigLoading(true);
    const { data, error } = await supabase
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
        const { error } = await supabase
          .from("configuracoes_gerais")
          .update(payload)
          .eq("id", config.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("configuracoes_gerais")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        if (data) setConfig((prev) => ({ ...prev, id: data.id }));
      }

      toast({ title: "Configurações salvas", description: "As configurações foram atualizadas com sucesso." });
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    }
    setConfigSaving(false);
  }

  async function loadUsers() {
    setUsersLoading(true);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: true });

    if (profiles) {
      setUsers(profiles);

      // Load module access for all users
      const { data: accessData } = await supabase
        .from("user_module_access")
        .select("*");

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

    // Optimistic update
    setUserAccess((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], [moduleKey]: newValue },
    }));

    const { error } = await supabase
      .from("user_module_access")
      .upsert(
        { user_id: userId, module_key: moduleKey, has_access: newValue },
        { onConflict: "user_id,module_key" }
      );

    if (error) {
      // Revert
      setUserAccess((prev) => ({
        ...prev,
        [userId]: { ...prev[userId], [moduleKey]: currentValue },
      }));
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
    setSavingUser(null);
  }

  const togglePassword = (field: string) => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
  };

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
            <Settings className="h-4 w-4" />
            Configurações
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Users className="h-4 w-4" />
            Usuários
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
              {/* Experience / RPA */}
              <Card className="border-border bg-card">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    Experience / RPA
                  </CardTitle>
                  <CardDescription>Credenciais do painel Sankhya Experience</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-xs font-medium text-muted-foreground">Tenant ID</Label>
                      <Input
                        type="number"
                        value={config.tenant_id ?? ""}
                        onChange={(e) => setConfig((p) => ({ ...p, tenant_id: e.target.value ? Number(e.target.value) : null }))}
                        placeholder="ID da empresa"
                        className="bg-background border-border"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-xs font-medium text-muted-foreground">URL Experience</Label>
                      <Input
                        value={config.exp_url}
                        onChange={(e) => setConfig((p) => ({ ...p, exp_url: e.target.value }))}
                        placeholder="https://..."
                        className="bg-background border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Usuário RPA</Label>
                      <Input
                        value={config.exp_usuario}
                        onChange={(e) => setConfig((p) => ({ ...p, exp_usuario: e.target.value }))}
                        placeholder="Login da conta de serviço"
                        className="bg-background border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Senha RPA</Label>
                      <PasswordInput
                        field="exp_senha"
                        value={config.exp_senha}
                        onChange={(v) => setConfig((p) => ({ ...p, exp_senha: v }))}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* SMTP */}
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
                      <Input
                        value={config.smtp_host}
                        onChange={(e) => setConfig((p) => ({ ...p, smtp_host: e.target.value }))}
                        className="bg-background border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Porta</Label>
                      <Input
                        type="number"
                        value={config.smtp_porta}
                        onChange={(e) => setConfig((p) => ({ ...p, smtp_porta: Number(e.target.value) }))}
                        className="bg-background border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">E-mail Remetente</Label>
                      <Input
                        value={config.smtp_usuario}
                        onChange={(e) => setConfig((p) => ({ ...p, smtp_usuario: e.target.value }))}
                        className="bg-background border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Senha SMTP</Label>
                      <PasswordInput
                        field="smtp_senha"
                        value={config.smtp_senha}
                        onChange={(v) => setConfig((p) => ({ ...p, smtp_senha: v }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Nome do Remetente (De:)</Label>
                      <Input
                        value={config.smtp_de_nome}
                        onChange={(e) => setConfig((p) => ({ ...p, smtp_de_nome: e.target.value }))}
                        className="bg-background border-border"
                      />
                    </div>
                    <div className="flex items-center gap-3 pt-6">
                      <Switch
                        checked={config.smtp_usar_tls}
                        onCheckedChange={(v) => setConfig((p) => ({ ...p, smtp_usar_tls: v }))}
                      />
                      <Label className="text-xs font-medium text-muted-foreground">Ativar STARTTLS (porta 587)</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* PDF */}
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
                      <Input
                        value={config.pdf_nome_empresa}
                        onChange={(e) => setConfig((p) => ({ ...p, pdf_nome_empresa: e.target.value }))}
                        className="bg-background border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Título do Relatório</Label>
                      <Input
                        value={config.pdf_cabecalho}
                        onChange={(e) => setConfig((p) => ({ ...p, pdf_cabecalho: e.target.value }))}
                        className="bg-background border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Rodapé</Label>
                      <Input
                        value={config.pdf_rodape}
                        onChange={(e) => setConfig((p) => ({ ...p, pdf_rodape: e.target.value }))}
                        className="bg-background border-border"
                      />
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
              <CardDescription>
                Configure quais módulos cada usuário pode acessar no sistema
              </CardDescription>
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
                              <span className="text-sm font-medium text-foreground">
                                {user.nome || "Sem nome"}
                              </span>
                              <span className="text-[11px] text-muted-foreground font-mono">
                                {user.email}
                              </span>
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
                                      <CheckCircle2 className="h-3 w-3" />
                                      Sim
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="gap-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer text-[10px]">
                                      <XCircle className="h-3 w-3" />
                                      Não
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
      </Tabs>
    </AppLayout>
  );
}

import { useState, useEffect, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import { fetchClientes, Cliente } from "@/services/api";

interface SaldoRow {
  cliente: string;
  codigo: string;
  hrsAlocadas: string;
  hrsConsumidas: string;
  saldo: string;
  tipoOperacao: string;
  tipo: string;
  dataNegociacao: string;
}

export default function SaldoHoras() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [selectedEmpresas, setSelectedEmpresas] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState("Aguardando seleção...");
  const [saldos, setSaldos] = useState<SaldoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingClientes, setLoadingClientes] = useState(true);

  useEffect(() => {
    fetchClientes()
      .then((data) => {
        setClientes(data.filter((c) => c.ativo));
      })
      .catch((err) => {
        console.error(err);
        setStatus("Erro ao carregar empresas.");
      })
      .finally(() => setLoadingClientes(false));
  }, []);

  const toggleEmpresa = (empresa: string) => {
    setSelectedEmpresas((prev) => {
      const next = new Set(prev);
      if (next.has(empresa)) next.delete(empresa);
      else next.add(empresa);
      return next;
    });
  };

  const selecionarTodas = () => {
    setSelectedEmpresas(new Set(clientes.map((c) => c.empresa)));
  };

  const limpar = () => {
    setSelectedEmpresas(new Set());
  };

  const consultar = useCallback(async () => {
    if (selectedEmpresas.size === 0) {
      setStatus("Selecione ao menos uma empresa.");
      return;
    }

    setLoading(true);
    setStatus(`Consultando ${selectedEmpresas.size} empresa(s)...`);

    try {
      const empresasList = Array.from(selectedEmpresas);
      const clientesFiltrados = clientes.filter((c) => empresasList.includes(c.empresa));

      // Fetch pedidos for each selected company
      const results: SaldoRow[] = [];
      for (const cliente of clientesFiltrados) {
        const urlPedidos = cliente.experience_url_pedidos || cliente.experience_url_etapas.replace("screen=etapas", "screen=pedidos");
        // The actual fetching would happen via the backend API
        // For now showing the structure
        try {
          const resp = await fetch(
            `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/pedidos?empresa=${encodeURIComponent(cliente.empresa)}`
          );
          if (resp.ok) {
            const data = await resp.json();
            (data.pedidos || []).forEach((p: any) => {
              results.push({
                cliente: cliente.empresa,
                codigo: p.codigo || "",
                hrsAlocadas: p.hrs_alocadas || "",
                hrsConsumidas: p.hrs_consumidas || "",
                saldo: p.saldo || "",
                tipoOperacao: p.tipo_operacao || "",
                tipo: p.tipo || "",
                dataNegociacao: p.data_negociacao || "",
              });
            });
          }
        } catch {
          // Individual company error, continue
        }
      }

      setSaldos(results);
      setStatus(results.length ? `${results.length} registros encontrados.` : "Nenhum registro encontrado.");
    } catch (err) {
      console.error(err);
      setStatus("Erro ao consultar saldos.");
    } finally {
      setLoading(false);
    }
  }, [selectedEmpresas, clientes]);

  return (
    <AppLayout title="Saldo de Horas – FAP" subtitle="Análise automática de pedidos">
      {/* Company selection */}
      <section className="bg-card border border-border rounded-xl p-5 shadow-[var(--shadow-sm)]">
        <h3 className="text-sm font-semibold text-foreground mb-3">Selecione as empresas</h3>

        <div className="max-h-[240px] overflow-y-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
          {loadingClientes ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-8 rounded-lg bg-muted animate-pulse" />
            ))
          ) : (
            clientes.map((c) => (
              <label
                key={c.empresa}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs cursor-pointer transition-all border ${
                  selectedEmpresas.has(c.empresa)
                    ? "bg-green-light border-primary text-primary font-semibold"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedEmpresas.has(c.empresa)}
                  onChange={() => toggleEmpresa(c.empresa)}
                  className="accent-primary"
                />
                {c.empresa}
              </label>
            ))
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={selecionarTodas}
            className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-xs font-medium hover:bg-green-light transition-all"
          >
            ✔ Selecionar Todas
          </button>
          <button
            onClick={limpar}
            className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-xs font-medium hover:bg-green-light transition-all"
          >
            ✖ Limpar
          </button>
          <button
            onClick={consultar}
            disabled={loading || selectedEmpresas.size === 0}
            className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? "Consultando..." : "🔎 Consultar Selecionadas"}
          </button>
        </div>
      </section>

      {/* Status */}
      <section className="bg-card border border-border rounded-xl p-4 shadow-[var(--shadow-sm)]">
        <div className="text-xs text-muted-foreground">{status}</div>
      </section>

      {/* Results table */}
      <section className="bg-card border border-border rounded-xl shadow-[var(--shadow-sm)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="p-3 text-left font-semibold text-muted-foreground">Cliente</th>
                <th className="p-3 text-left font-semibold text-muted-foreground">Código</th>
                <th className="p-3 text-left font-semibold text-muted-foreground">Hrs Alocadas</th>
                <th className="p-3 text-left font-semibold text-muted-foreground">Hrs Consumidas</th>
                <th className="p-3 text-left font-semibold text-muted-foreground">Saldo</th>
                <th className="p-3 text-left font-semibold text-muted-foreground">Tipo Operação</th>
                <th className="p-3 text-left font-semibold text-muted-foreground">Tipo</th>
                <th className="p-3 text-left font-semibold text-muted-foreground">Data Negociação</th>
              </tr>
            </thead>
            <tbody>
              {saldos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    {loading ? "Carregando..." : "Nenhum dado disponível ainda"}
                  </td>
                </tr>
              ) : (
                saldos.map((row, i) => (
                  <tr key={i} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="p-3">{row.cliente}</td>
                    <td className="p-3">{row.codigo}</td>
                    <td className="p-3">{row.hrsAlocadas}</td>
                    <td className="p-3">{row.hrsConsumidas}</td>
                    <td className="p-3">{row.saldo}</td>
                    <td className="p-3">{row.tipoOperacao}</td>
                    <td className="p-3">{row.tipo}</td>
                    <td className="p-3">{row.dataNegociacao}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AppLayout>
  );
}

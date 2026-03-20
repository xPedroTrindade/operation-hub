import { useState, useEffect, useCallback, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import { fetchAbas, fetchOS, fetchClientes, executarAutomacao, Cliente } from "@/services/api";
import { Rocket, Search, Filter, ChevronDown, Loader2, Inbox } from "lucide-react";

type OSRow = Record<string, string>;

export default function AutomacaoOS() {
  const [dados, setDados] = useState<OSRow[]>([]);
  const [colunasFixas, setColunasFixas] = useState<string[]>([]);
  const [abaAtual, setAbaAtual] = useState<string>("");
  const [abas, setAbas] = useState<string[]>([]);
  const [clientesMap, setClientesMap] = useState<Record<string, string>>({});
  const [filtrosColuna, setFiltrosColuna] = useState<Record<string, string[]>>({});
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);

  const [filtroAberto, setFiltroAberto] = useState<string | null>(null);
  const [filtroTempSelecao, setFiltroTempSelecao] = useState<string[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);

  const carregarDados = useCallback(async (aba?: string) => {
    setLoading(true);
    setSelectedRows(new Set());
    try {
      const [osData, clientes, abasData] = await Promise.all([
        fetchOS(aba),
        fetchClientes(),
        abas.length ? Promise.resolve(abas) : fetchAbas(),
      ]);

      const dadosFiltrados = (osData.dados || []).filter(
        (linha) => linha["executante"] && String(linha["executante"]).trim() !== ""
      );

      setDados(dadosFiltrados);
      setAbaAtual(osData.aba || aba || "");
      if (!abas.length) setAbas(abasData);

      const map: Record<string, string> = {};
      clientes.forEach((c) => {
        if (c.ativo) map[c.empresa.toLowerCase()] = c.experience_url_etapas;
      });
      setClientesMap(map);

      if (dadosFiltrados.length) {
        setColunasFixas(Object.keys(dadosFiltrados[0]));
      }
      setFiltrosColuna({});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [abas.length]);

  useEffect(() => { carregarDados(); }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setFiltroAberto(null);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const dadosFiltrados = dados.filter((linha) =>
    Object.entries(filtrosColuna).every(([col, valores]) =>
      valores.includes(String(linha[col] ?? ""))
    )
  );

  const handleExecutar = async () => {
    const linhasSelecionadas = dadosFiltrados.filter((_, i) => selectedRows.has(i));
    if (!linhasSelecionadas.length) return;

    setExecuting(true);
    try {
      const payload = linhasSelecionadas.map((linha) => {
        const empresaKey = linha["cliente"]?.toLowerCase();
        const experience_url_etapas = clientesMap[empresaKey];
        if (!experience_url_etapas) throw new Error(`Empresa "${linha["cliente"]}" não cadastrada.`);
        return {
          aba: abaAtual,
          empresa: linha["cliente"],
          usuario: linha["executante"],
          data: linha["Data"],
          hora_inicio: linha["Hora inicio"],
          hora_fim: linha["Hora fim"],
          ticket: linha["Tarefa"],
          experience_url_etapas,
          linha_id: linha["linha_id"],
        };
      });

      const res = await executarAutomacao(payload);
      alert(`Automação executada.\nSucesso: ${res.sucesso}\nFalhas: ${res.falha}`);
      carregarDados(abaAtual);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Erro ao executar automação.");
    } finally {
      setExecuting(false);
    }
  };

  const toggleCheckbox = (index: number) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const getStatusBadge = (valor: string) => {
    const v = valor.trim().toLowerCase();
    if (v === "pendente") return "bg-[hsl(var(--amber-light))] text-[hsl(var(--amber))]";
    if (/lan.*ada/.test(v) || v.includes("apontada")) return "bg-[hsl(var(--green-light))] text-primary";
    if (v === "erro") return "bg-[hsl(var(--red-light))] text-destructive";
    return "";
  };

  const abrirFiltro = (col: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const valores = [...new Set(dados.map((d) => String(d[col] ?? "")))].sort();
    setFiltroTempSelecao(filtrosColuna[col] ?? valores);
    setFiltroAberto(col);
  };

  const aplicarFiltro = () => {
    if (!filtroAberto) return;
    const allValues = [...new Set(dados.map((d) => String(d[filtroAberto] ?? "")))];
    if (filtroTempSelecao.length === 0 || filtroTempSelecao.length === allValues.length) {
      setFiltrosColuna((prev) => {
        const next = { ...prev };
        delete next[filtroAberto];
        return next;
      });
    } else {
      setFiltrosColuna((prev) => ({ ...prev, [filtroAberto]: filtroTempSelecao }));
    }
    setFiltroAberto(null);
  };

  return (
    <AppLayout title="Controle de OS" subtitle={`Aba ativa: ${abaAtual}`}>
      {/* Tabs */}
      <section className="bg-card border border-border rounded-xl p-3 shadow-[var(--shadow-sm)] flex flex-wrap items-center gap-1.5">
        {abas.map((aba) => (
          <button
            key={aba}
            onClick={() => carregarDados(aba)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              aba === abaAtual
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            {aba}
          </button>
        ))}
      </section>

      {/* Actions */}
      <section className="bg-card border border-border rounded-xl p-3 shadow-[var(--shadow-sm)] flex flex-wrap items-center gap-2">
        <button
          onClick={handleExecutar}
          disabled={executing || selectedRows.size === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {executing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
          {executing ? "Executando..." : "Executar lançamentos"}
        </button>
        <button
          onClick={() => window.open("/saldo-horas", "_self")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground font-medium text-xs hover:bg-[hsl(var(--green-light))] transition-all"
        >
          <Search className="h-3.5 w-3.5" />
          Saldo de horas
        </button>
        {selectedRows.size > 0 && (
          <span className="text-[11px] text-muted-foreground font-mono ml-auto">
            {selectedRows.size} selecionada{selectedRows.size > 1 ? "s" : ""}
          </span>
        )}
      </section>

      {/* Table */}
      <section className="bg-card border border-border rounded-xl shadow-[var(--shadow-sm)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="p-3 w-10" />
                {colunasFixas.map((col) => (
                  <th key={col} className="p-3 text-left font-semibold text-muted-foreground whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      {col}
                      <button
                        onClick={(e) => abrirFiltro(col, e)}
                        className={`p-0.5 rounded transition-all ${
                          filtrosColuna[col]
                            ? "text-primary"
                            : "text-muted-foreground/40 hover:text-muted-foreground"
                        }`}
                      >
                        <Filter className="h-3 w-3" />
                      </button>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="p-3"><div className="w-4 h-4 rounded bg-muted animate-pulse" /></td>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="p-3"><div className="w-20 h-3 rounded bg-muted animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : dadosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={colunasFixas.length + 1} className="p-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Inbox className="h-8 w-8 text-muted-foreground/30" />
                      <span>Nenhum dado disponível</span>
                    </div>
                  </td>
                </tr>
              ) : (
                dadosFiltrados.map((linha, i) => {
                  const statusExp = String(linha["Status experience"] || "").trim().toLowerCase();
                  const podeSelecionar = statusExp === "pendente";
                  return (
                    <tr key={i} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          disabled={!podeSelecionar}
                          checked={selectedRows.has(i)}
                          onChange={() => toggleCheckbox(i)}
                          className="accent-primary rounded"
                        />
                      </td>
                      {colunasFixas.map((col) => {
                        const valor = String(linha[col] ?? "");
                        const badge = col === "Status experience" ? getStatusBadge(valor) : "";
                        return (
                          <td key={col} className="p-3 whitespace-nowrap" title={valor}>
                            {badge ? (
                              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${badge}`}>
                                {valor}
                              </span>
                            ) : (
                              valor
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Filter popover */}
      {filtroAberto && (
        <div
          ref={menuRef}
          className="fixed z-[200] bg-card border border-border rounded-xl shadow-[var(--shadow-lg)] p-4 min-w-[220px]"
          style={{ top: "200px", left: "50%", transform: "translateX(-50%)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
            <Filter className="h-3 w-3 text-primary" />
            {filtroAberto}
          </div>
          <div className="max-h-[200px] overflow-y-auto flex flex-col gap-1">
            {[...new Set(dados.map((d) => String(d[filtroAberto] ?? "")))].sort().map((v) => (
              <label key={v} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 px-2 py-1 rounded">
                <input
                  type="checkbox"
                  checked={filtroTempSelecao.includes(v)}
                  onChange={(e) => {
                    if (e.target.checked) setFiltroTempSelecao((p) => [...p, v]);
                    else setFiltroTempSelecao((p) => p.filter((x) => x !== v));
                  }}
                  className="accent-primary rounded"
                />
                {v || "(Em branco)"}
              </label>
            ))}
          </div>
          <div className="flex gap-2 mt-3 pt-2 border-t border-border">
            <button
              onClick={() => setFiltroTempSelecao([])}
              className="flex-1 px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-xs font-medium hover:bg-muted transition-all"
            >
              Limpar
            </button>
            <button
              onClick={aplicarFiltro}
              className="flex-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

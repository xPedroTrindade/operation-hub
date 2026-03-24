export type OSRow = Record<string, string>;

export function parsearHoras(str: string): number {
  if (!str || str === "–") return 0;
  const partes = String(str).trim().split(":");
  if (partes.length < 2) return 0;
  return parseInt(partes[0]) * 60 + parseInt(partes[1]);
}

export function minutosParaHoras(min: number): string {
  if (!min || isNaN(min)) return "0:00";
  const h = Math.floor(min / 60);
  const m = String(min % 60).padStart(2, "0");
  return `${h}:${m}`;
}

export function agruparPorEmpresa(dados: OSRow[]): Record<string, OSRow[]> {
  const mapa: Record<string, OSRow[]> = {};
  dados.forEach((l) => {
    const emp = (l["cliente"] || l["Cliente"] || "").trim() || "Sem cliente";
    if (!mapa[emp]) mapa[emp] = [];
    mapa[emp].push(l);
  });
  return mapa;
}

export function calcularResumo(linhas: OSRow[]) {
  const minutos = linhas.reduce((a, l) => a + parsearHoras(l["Executado"] || "0:00"), 0);
  return {
    minutos,
    qtd: linhas.length,
    media: linhas.length ? Math.round(minutos / linhas.length) : 0,
  };
}

export function formatarAba(aba: string): string {
  if (/^\d{6}$/.test(aba)) return `${aba.slice(0, 2)}/${aba.slice(2)}`;
  return aba;
}

export function nomeArquivoBase(aba: string): string {
  const abaFmt = /^\d{6}$/.test(aba) ? `${aba.slice(0, 2)}-${aba.slice(2)}` : aba;
  return `Status_Report_${abaFmt}`;
}

import { PERFIS } from "./Perfil";

const PROXY = "https://daytrade-proxy.onrender.com";

export const TAXAS_REFERENCIA = {
  selic: 14.50, cdi: 14.40, ipca: 4.39, atualizadoEm: "09/06/2026",
};

export const HORIZONTES = [
  { id: "curto",  label: "Curto prazo",  sub: "dias a semanas", icone: "⚡", cor: "#ff9f43", foco: "técnica: momentum, volume, candles recentes, notícias do dia." },
  { id: "medio",  label: "Médio prazo",  sub: "meses",          icone: "📊", cor: "#ffd60a", foco: "mistura de técnica e fundamentos: tendência, ciclo de juros, resultados trimestrais." },
  { id: "longo",  label: "Longo prazo",  sub: "anos",           icone: "🌱", cor: "#00e5a0", foco: "fundamentos e alocação: qualidade do negócio, dividendos, crescimento estrutural." },
];

async function carregarPerfilAPI() {
  try {
    const r = await fetch(`${PROXY}/api/perfil`);
    const data = await r.json();
    if (data.success && data.data) {
      const p = data.data;
      const perfilInfo = PERFIS[p.tipoPerfil];
      return { ...p, perfilInfo };
    }
    return null;
  } catch { return null; }
}

async function carregarContaAPI() {
  try {
    const r = await fetch(`${PROXY}/api/conta`);
    const data = await r.json();
    return data.success ? data.data : null;
  } catch { return null; }
}

export async function montarContextoUsuario(horizonteId = null) {
  const perfil = await carregarPerfilAPI();
  const conta = await carregarContaAPI();

  if (!perfil) {
    return `CONTEXTO DO INVESTIDOR: usuário ainda não definiu perfil de investidor.`;
  }

  const info = perfil.perfilInfo || {};
  const alocacao = info.alocacao || {};
  const alocacaoTexto = Object.entries(alocacao).map(([cat, pct]) => `${cat}: ${pct}%`).join(", ");
  const patrimonio = conta ? (conta.saldoConta || 0) + (conta.valorInvestido || 0) : null;

  let bloco = `CONTEXTO DO INVESTIDOR:
- Nome: ${perfil.nome || "Investidor"}
- Perfil de risco: ${info.nome || perfil.tipoPerfil} (score ${perfil.pontuacao}/40)
- Alocação ideal sugerida: ${alocacaoTexto || "não definida"}
- Capital declarado: R$ ${Number(perfil.capital || 0).toLocaleString("pt-BR")}
- Aporte mensal: R$ ${Number(perfil.orcamentoMensal || 0).toLocaleString("pt-BR")}`;

  if (patrimonio !== null) {
    bloco += `\n- Patrimônio total atual: R$ ${patrimonio.toLocaleString("pt-BR")}`;
  }

  bloco += `\n\nTAXAS DE REFERÊNCIA (${TAXAS_REFERENCIA.atualizadoEm}): Selic ${TAXAS_REFERENCIA.selic}% | CDI ${TAXAS_REFERENCIA.cdi}% | IPCA ${TAXAS_REFERENCIA.ipca}%`;

  if (horizonteId) {
    const h = HORIZONTES.find(x => x.id === horizonteId);
    if (h) bloco += `\n\nHORIZONTE: ${h.label} (${h.sub}). Foque em: ${h.foco}`;
  }

  return bloco;
}

export async function obterDadosUsuario() {
  const [perfil, conta] = await Promise.all([carregarPerfilAPI(), carregarContaAPI()]);
  return { perfil, conta };
}

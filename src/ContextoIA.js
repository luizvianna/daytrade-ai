import { carregarPerfil } from "./Perfil";

const STORAGE_CONTA = "tradeai_conta";

// Taxas de referência (mesmas usadas em Investimentos.js) — junho/2026
export const TAXAS_REFERENCIA = {
  selic: 14.50,
  cdi: 14.40,
  ipca: 4.39,
  atualizadoEm: "09/06/2026",
};

export const HORIZONTES = [
  {
    id: "curto",
    label: "Curto prazo",
    sub: "dias a semanas",
    icone: "⚡",
    cor: "#ff9f43",
    foco: "técnica: momentum, volume, candles recentes, notícias do dia. Ruído de mercado importa muito. Ideal para day trade e swing trade.",
  },
  {
    id: "medio",
    label: "Médio prazo",
    sub: "meses",
    icone: "📊",
    cor: "#ffd60a",
    foco: "mistura de técnica e fundamentos: tendência de médio prazo, ciclo de juros (Selic/CDI), resultados trimestrais, fluxo de capital.",
  },
  {
    id: "longo",
    label: "Longo prazo",
    sub: "anos",
    icone: "🌱",
    cor: "#00e5a0",
    foco: "fundamentos e alocação: qualidade do negócio, dividendos recorrentes, crescimento estrutural, proteção contra inflação (IPCA). Ruído diário é irrelevante.",
  },
];

function carregarConta() {
  try {
    const stored = localStorage.getItem(STORAGE_CONTA);
    return stored ? JSON.parse(stored) : null;
  } catch { return null; }
}

/**
 * Monta um bloco de texto com o contexto do usuário (perfil, alocação,
 * capital, patrimônio e horizonte escolhido) para ser injetado no
 * systemPrompt de qualquer chamada à IA.
 *
 * @param {string|null} horizonteId - "curto" | "medio" | "longo" | null
 * @returns {string} bloco de texto formatado, ou string vazia se sem perfil
 */
export function montarContextoUsuario(horizonteId = null) {
  const perfil = carregarPerfil();
  const conta = carregarConta();

  if (!perfil) {
    return `CONTEXTO DO INVESTIDOR: usuário ainda não definiu perfil de investidor. Dê respostas gerais e, se fizer sentido, sugira que ele complete o questionário de perfil no app para receber recomendações personalizadas.`;
  }

  const info = perfil.perfilInfo || {};
  const alocacao = info.alocacao || {};
  const alocacaoTexto = Object.entries(alocacao).map(([cat, pct]) => `${cat}: ${pct}%`).join(", ");

  const patrimonio = conta ? (conta.saldoConta || 0) + (conta.valorInvestido || 0) : null;

  let bloco = `CONTEXTO DO INVESTIDOR (use isso para personalizar a resposta, sem repetir tudo de volta):
- Nome: ${perfil.nome || "Investidor"}
- Perfil de risco: ${info.nome || perfil.tipoPerfil} (score ${perfil.pontuacao}/40)
- Alocação ideal sugerida: ${alocacaoTexto || "não definida"}
- Capital declarado: R$ ${Number(perfil.capital || 0).toLocaleString("pt-BR")}
- Aporte mensal: R$ ${Number(perfil.orcamentoMensal || 0).toLocaleString("pt-BR")}`;

  if (patrimonio !== null) {
    bloco += `\n- Patrimônio total atual (conta + investido): R$ ${patrimonio.toLocaleString("pt-BR")}`;
  }

  bloco += `\n\nTAXAS DE REFERÊNCIA ATUAIS (${TAXAS_REFERENCIA.atualizadoEm}): Selic ${TAXAS_REFERENCIA.selic}% a.a. | CDI ${TAXAS_REFERENCIA.cdi}% a.a. | IPCA ${TAXAS_REFERENCIA.ipca}% a.a.`;

  if (horizonteId) {
    const h = HORIZONTES.find(x => x.id === horizonteId);
    if (h) {
      bloco += `\n\nHORIZONTE DESTA ANÁLISE: ${h.label} (${h.sub}). Foque sua análise em: ${h.foco}`;
    }
  }

  return bloco;
}

/**
 * Retorna apenas o objeto de perfil + conta, para uso em componentes
 * que precisam exibir dados (não só montar prompt).
 */
export function obterDadosUsuario() {
  return {
    perfil: carregarPerfil(),
    conta: carregarConta(),
  };
}

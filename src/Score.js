import { useState, useCallback } from "react";
import { montarContextoUsuario, HORIZONTES } from "./ContextoIA";
import SeletorHorizonte from "./SeletorHorizonte";
import { authFetch } from "./supabaseClient";
import {
  Star, RefreshCw, Play, Loader2, Clock, Award,
  CheckCircle2, AlertTriangle, XCircle, Brain,
} from "lucide-react";

const PROXY = "https://daytrade-proxy.onrender.com";
const ICON_STROKE = 2.25;

function paleta(tema) {
  if (tema === "claro") {
    return { card: "#FFFFFF", cardInner: "#F4F7FA", border: "#E2E8F0", textPrimary: "#172033", textSecondary: "#64748B", textFaint: "#94A3B8" };
  }
  return { card: "#0d1320", cardInner: "#111a27", border: "#1e2d45", textPrimary: "#fff", textSecondary: "#ccc", textFaint: "#444" };
}

const ATIVOS_PARA_SCORE = {
  "Ações": ["PETR4","VALE3","ITUB4","BBDC4","WEGE3","ABEV3","RENT3","SUZB3","GGBR4","EMBR3","RADL3","EQTL3","MGLU3","B3SA3","HAPV3"],
  "FIIs":  ["HGLG11","KNRI11","MXRF11","XPML11","BCFF11","VISC11","IRDM11","KNCR11","BRCO11","RBRF11"],
  "ETFs":  ["IVVB11","BOVA11","HASH11","SMAL11","DIVO11"],
  "Cripto":["BTC-USD","ETH-USD","BNB-USD","SOL-USD"],
};

async function salvarNoHistorico({ ativo, origem, horizonte, recomendacao, score, precoNoMomento, analise }) {
  try {
    await authFetch(`${PROXY}/api/historico`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo, origem, horizonte, recomendacao, score, precoNoMomento, analise }),
    });
  } catch (e) { console.error("Erro ao salvar histórico:", e.message); }
}

function ScoreBar({ score, size = "normal", cores }) {
  const color = score >= 7 ? "#00e5a0" : score >= 5 ? "#ffd60a" : "#ff4d6d";
  const h = size === "small" ? "5px" : "8px";
  return (
    <div style={{ background: cores.border, borderRadius: "4px", overflow: "hidden", height: h }}>
      <div style={{ height: "100%", width: `${score * 10}%`, background: color, borderRadius: "4px", transition: "width 0.6s ease" }} />
    </div>
  );
}

function ScoreLabel({ score }) {
  if (score >= 8) return <span style={{ color: "#00e5a0", fontSize: "10px", fontFamily: "monospace", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "3px" }}><Star size={11} strokeWidth={ICON_STROKE} /> EXCELENTE</span>;
  if (score >= 6) return <span style={{ color: "#00e5a0", fontSize: "10px", fontFamily: "monospace", display: "inline-flex", alignItems: "center", gap: "3px" }}><CheckCircle2 size={11} strokeWidth={ICON_STROKE} /> BOM</span>;
  if (score >= 4) return <span style={{ color: "#ffd60a", fontSize: "10px", fontFamily: "monospace", display: "inline-flex", alignItems: "center", gap: "3px" }}><AlertTriangle size={11} strokeWidth={ICON_STROKE} /> NEUTRO</span>;
  return <span style={{ color: "#ff4d6d", fontSize: "10px", fontFamily: "monospace", display: "inline-flex", alignItems: "center", gap: "3px" }}><XCircle size={11} strokeWidth={ICON_STROKE} /> FRACO</span>;
}

function RecomendacaoBadge({ rec }) {
  const map = {
    "COMPRAR": { bg: "#00e5a022", border: "#00e5a0", text: "#00e5a0", icon: "▲" },
    "AGUARDAR": { bg: "#ffd60a22", border: "#ffd60a", text: "#ffd60a", icon: "◆" },
    "EVITAR": { bg: "#ff4d6d22", border: "#ff4d6d", text: "#ff4d6d", icon: "▼" },
  };
  const s = map[rec] || map["AGUARDAR"];
  return (
    <span style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.text, borderRadius: "6px", padding: "2px 8px", fontSize: "10px", fontWeight: "700", fontFamily: "monospace" }}>
      {s.icon} {rec}
    </span>
  );
}

function AtivoScoreCard({ item, rank, cores }) {
  const [expanded, setExpanded] = useState(false);
  const color = item.score >= 7 ? "#00e5a0" : item.score >= 5 ? "#ffd60a" : "#ff4d6d";
  const corMedalha = rank === 1 ? "#ffd60a" : rank === 2 ? "#c0c0c0" : rank === 3 ? "#cd7f32" : null;

  return (
    <div style={{ background: cores.card, border: `1px solid ${color}33`, borderRadius: "12px", padding: "14px", marginBottom: "8px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }} onClick={() => setExpanded(e => !e)}>

        {/* Rank */}
        <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: corMedalha ? `${corMedalha}22` : cores.cardInner, border: `1px solid ${corMedalha || cores.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {corMedalha
            ? <Award size={16} strokeWidth={ICON_STROKE} color={corMedalha} />
            : <span style={{ color: cores.textFaint, fontWeight: "700", fontSize: "13px", fontFamily: "monospace" }}>#{rank}</span>}
        </div>

        {/* Ticker e categoria */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
            <span style={{ color: cores.textPrimary, fontWeight: "700", fontSize: "15px", fontFamily: "monospace" }}>{item.ticker}</span>
            <span style={{ color: cores.textFaint, fontSize: "10px", background: cores.cardInner, borderRadius: "4px", padding: "1px 6px" }}>{item.categoria}</span>
            {item.recomendacao && <RecomendacaoBadge rec={item.recomendacao} />}
          </div>
          <ScoreBar score={item.score} cores={cores} />
        </div>

        {/* Score */}
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ color, fontSize: "22px", fontWeight: "700", fontFamily: "monospace" }}>{item.score.toFixed(1)}</div>
          <ScoreLabel score={item.score} />
        </div>

        <span style={{ color: cores.textFaint, fontSize: "12px" }}>{expanded ? "▲" : "▼"}</span>
      </div>

      {expanded && item.analise && (
        <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: `1px solid ${cores.border}` }}>
          {/* Sub-scores */}
          {item.subScores && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "8px", marginBottom: "12px" }}>
              {Object.entries(item.subScores).map(([k, v]) => (
                <div key={k} style={{ background: cores.cardInner, borderRadius: "8px", padding: "8px 10px" }}>
                  <div style={{ color: cores.textFaint, fontSize: "9px", fontFamily: "monospace", marginBottom: "4px" }}>{k.toUpperCase()}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ color: v >= 7 ? "#00e5a0" : v >= 5 ? "#ffd60a" : "#ff4d6d", fontWeight: "700", fontSize: "14px", fontFamily: "monospace" }}>{v}/10</span>
                    <div style={{ flex: 1 }}><ScoreBar score={v} size="small" cores={cores} /></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Análise textual */}
          <div style={{ background: cores.cardInner, borderRadius: "8px", padding: "12px", borderLeft: `3px solid ${color}`, marginBottom: "10px" }}>
            <div style={{ color: cores.textFaint, fontSize: "9px", fontFamily: "monospace", marginBottom: "6px", display: "flex", alignItems: "center", gap: "4px" }}>
              <Brain size={12} strokeWidth={ICON_STROKE} /> ANÁLISE DA IA
            </div>
            <p style={{ color: cores.textSecondary, fontSize: "12px", lineHeight: "1.7", margin: 0 }}>{item.analise}</p>
          </div>

          {/* Pontos fortes e fracos */}
          {(item.pontosFortres?.length > 0 || item.pontosFragos?.length > 0) && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {item.pontosFortres?.length > 0 && (
                <div style={{ background: "#00e5a008", border: "1px solid #00e5a022", borderRadius: "8px", padding: "10px" }}>
                  <div style={{ color: "#00e5a0", fontSize: "9px", fontFamily: "monospace", marginBottom: "6px", display: "flex", alignItems: "center", gap: "4px" }}>
                    <CheckCircle2 size={12} strokeWidth={ICON_STROKE} /> PONTOS FORTES
                  </div>
                  {item.pontosFortres.map((p, i) => <div key={i} style={{ color: cores.textSecondary, fontSize: "11px", lineHeight: "1.6" }}>• {p}</div>)}
                </div>
              )}
              {item.pontosFragos?.length > 0 && (
                <div style={{ background: "#ff4d6d08", border: "1px solid #ff4d6d22", borderRadius: "8px", padding: "10px" }}>
                  <div style={{ color: "#ff4d6d", fontSize: "9px", fontFamily: "monospace", marginBottom: "6px", display: "flex", alignItems: "center", gap: "4px" }}>
                    <AlertTriangle size={12} strokeWidth={ICON_STROKE} /> RISCOS
                  </div>
                  {item.pontosFragos.map((p, i) => <div key={i} style={{ color: cores.textSecondary, fontSize: "11px", lineHeight: "1.6" }}>• {p}</div>)}
                </div>
              )}
            </div>
          )}

          {item.preco && (
            <div style={{ color: cores.textFaint, fontSize: "10px", fontFamily: "monospace", marginTop: "8px" }}>
              Preço: R${item.preco.toFixed(2)} · Variação: {item.variacao >= 0 ? "+" : ""}{item.variacao?.toFixed(2)}% · Analisado: {item.analisadoEm}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Score({ tema = "escuro" }) {
  const cores = paleta(tema);
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [progressoMsg, setProgressoMsg] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("Todos");
  const [analisado, setAnalisado] = useState(false);
  const [erros, setErros] = useState([]);
  const [horizonte, setHorizonte] = useState(null);

  const analisarAtivos = useCallback(async () => {
    setLoading(true);
    setRanking([]);
    setErros([]);
    setAnalisado(false);
    setProgresso(0);

    const todosAtivos = Object.entries(ATIVOS_PARA_SCORE).flatMap(([cat, ativos]) =>
      ativos.map(ticker => ({ ticker, categoria: cat }))
    );

    const contextoUsuario = montarContextoUsuario(horizonte);
    const horizonteInfo = horizonte ? HORIZONTES.find(h => h.id === horizonte) : null;

    const resultados = [];
    let processados = 0;

    for (const { ticker, categoria } of todosAtivos) {
      processados++;
      const pct = Math.round((processados / todosAtivos.length) * 100);
      setProgresso(pct);
      setProgressoMsg(`Analisando ${ticker}... (${processados}/${todosAtivos.length})`);

      try {
        // Busca preço atual
        let preco = 0, variacao = 0;
        try {
          const precoRes = await fetch(`${PROXY}/api/prices?tickers=${ticker}`);
          const precoData = await precoRes.json();
          preco = precoData[ticker]?.price || 0;
          variacao = precoData[ticker]?.change || 0;
        } catch {}

        // Busca candles para análise técnica
        let tendencia = "LATERAL", volatilidade = 0, momentum = 0;
        try {
          const candleRes = await fetch(`${PROXY}/api/candles?ticker=${ticker}&interval=1d&range=1mo`);
          const candleData = await candleRes.json();
          if (candleData.candles?.length > 5) {
            const candles = candleData.candles;
            const last = candles.slice(-20);
            const bullCandles = last.filter(c => c.close > c.open).length;
            tendencia = bullCandles >= 12 ? "ALTA" : bullCandles <= 8 ? "BAIXA" : "LATERAL";
            const precos = candles.map(c => c.close);
            const maxP = Math.max(...precos);
            const minP = Math.min(...precos);
            volatilidade = maxP > 0 ? ((maxP - minP) / minP * 100) : 0;
            const primeiroPreco = candles[0]?.close || preco;
            momentum = primeiroPreco > 0 ? ((preco - primeiroPreco) / primeiroPreco * 100) : 0;
          }
        } catch {}

        // IA gera o score
        const prompt = `${contextoUsuario}

Analise o ativo ${ticker} (${categoria}) da B3 brasileira e gere um score de qualidade de investimento${horizonteInfo ? ` com foco em ${horizonteInfo.label.toLowerCase()} (${horizonteInfo.sub})` : ""}.

Dados disponíveis:
- Preço atual: R$${preco.toFixed(2)}
- Variação hoje: ${variacao.toFixed(2)}%
- Momentum (1 mês): ${momentum.toFixed(2)}%
- Tendência técnica: ${tendencia}
- Volatilidade (1 mês): ${volatilidade.toFixed(2)}%
- Categoria: ${categoria}

Considere:
${categoria === "FIIs" ? "- Dividend Yield, qualidade dos imóveis, vacância, gestora" : ""}
${categoria === "Ações" ? "- P/L estimado, ROE, crescimento, solidez financeira, setor" : ""}
${categoria === "ETFs" ? "- Diversificação, taxa de administração, liquidez, índice seguido" : ""}
${categoria === "Cripto" ? "- Adoção, tecnologia, liquidez, dominância de mercado, risco regulatório" : ""}
- Contexto macroeconômico brasileiro (Selic, inflação, câmbio)
${horizonteInfo ? `- IMPORTANTE: pondere o score considerando especificamente o horizonte de ${horizonteInfo.label.toLowerCase()} (${horizonteInfo.foco})` : "- Considere curto, médio e longo prazo de forma equilibrada"}

Responda APENAS JSON:
{
  "score": 0-10,
  "recomendacao": "COMPRAR|AGUARDAR|EVITAR",
  "analise": "análise completa em 3 frases, mencionando o horizonte considerado",
  "subScores": {
    "Técnico": 0-10,
    "Fundamentos": 0-10,
    "Risco": 0-10,
    "Momento": 0-10
  },
  "pontosFortres": ["ponto 1", "ponto 2"],
  "pontosFragos": ["risco 1", "risco 2"],
  "horizonte": "curto|médio|longo prazo"
}`;

        // Chama a IA, com retry real quando bate limite de taxa da Groq —
        // em vez de desistir do ativo na hora, espera o tempo que a própria
        // Groq pediu (retryAfterSeconds) e tenta de novo, até 3 vezes.
        let parsed = null;
        let tentativas = 0;
        const MAX_TENTATIVAS = 3;
        let ultimoErro = null;

        while (tentativas < MAX_TENTATIVAS && !parsed) {
          tentativas++;
          try {
            const aiRes = await fetch(`${PROXY}/api/ai/analyze`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                systemPrompt: "Analista de investimentos brasileiro especialista, cobrindo curto, médio e longo prazo. Responda APENAS JSON válido.",
                prompt,
              }),
            });

            if (aiRes.status === 429) {
              const aiData429 = await aiRes.json().catch(() => ({}));
              const esperaMs = (aiData429.retryAfterSeconds || 10) * 1000 + 500;
              setProgressoMsg(`Limite da IA atingido — aguardando ${Math.round(esperaMs / 1000)}s antes de continuar (${ticker})...`);
              await new Promise(r => setTimeout(r, esperaMs));
              continue; // tenta o mesmo ticker de novo
            }

            const aiData = await aiRes.json();
            if (!aiData.success) throw new Error(aiData.error || "Erro desconhecido da IA");
            parsed = aiData.data;
          } catch (e) {
            ultimoErro = e;
          }
        }

        if (!parsed) throw ultimoErro || new Error("Não foi possível analisar após múltiplas tentativas.");

        resultados.push({
          ticker, categoria,
          score: parsed.score || 5,
          recomendacao: parsed.recomendacao || "AGUARDAR",
          analise: parsed.analise || "",
          subScores: parsed.subScores || {},
          pontosFortres: parsed.pontosFortres || [],
          pontosFragos: parsed.pontosFragos || [],
          horizonte: parsed.horizonte || horizonteInfo?.label.toLowerCase() || "médio prazo",
          preco, variacao, tendencia, momentum,
          analisadoEm: new Date().toLocaleTimeString("pt-BR"),
        });

        // Salva no histórico de recomendações (não bloqueia o fluxo)
        salvarNoHistorico({
          ativo: ticker, origem: "score", horizonte: horizonte || null,
          recomendacao: parsed.recomendacao || "AGUARDAR",
          score: parsed.score || 5, precoNoMomento: preco,
          analise: parsed.analise || "",
        });

      } catch (e) {
        console.error(`Erro ${ticker}:`, e.message);
        setErros(prev => [...prev, ticker]);
        resultados.push({
          ticker, categoria, score: 0,
          recomendacao: "AGUARDAR", analise: "Erro ao analisar.",
          subScores: {}, pontosFortres: [], pontosFragos: [],
          preco: 0, variacao: 0, analisadoEm: new Date().toLocaleTimeString("pt-BR"),
        });
      }

      // Pausa entre ativos — 1.5s, porque o modelo atual (openai/gpt-oss-120b)
      // tem limite de 8.000 tokens/min na Groq. O retry acima é quem garante
      // de verdade que o loop não desiste em cascata se ainda assim acontecer.
      await new Promise(r => setTimeout(r, 1500));
    }

    // Ordena por score
    resultados.sort((a, b) => b.score - a.score);
    setRanking(resultados);
    setAnalisado(true);
    setLoading(false);
    setProgressoMsg("Análise concluída!");
  }, [horizonte]);

  const rankingFiltrado = categoriaFiltro === "Todos"
    ? ranking
    : ranking.filter(r => r.categoria === categoriaFiltro);

  const mediaScore = ranking.length > 0
    ? (ranking.reduce((s, r) => s + r.score, 0) / ranking.length).toFixed(1)
    : "—";

  const melhor = ranking[0];
  const piorFiltrado = [...ranking].sort((a, b) => a.score - b.score)[0];

  return (
    <div style={{ padding: "14px", maxWidth: "900px", margin: "0 auto" }}>
      {/* Estilos em public/index.html — não usar <style> aqui (causa removeChild no React 19) */}

      {/* Header */}
      <div style={{ marginBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "4px", color: cores.textPrimary, display: "flex", alignItems: "center", gap: "8px" }}>
            <Star size={20} strokeWidth={ICON_STROKE} color="#ffd60a" /> Score Fundamentalista
          </h2>
          <p style={{ color: cores.textFaint, fontSize: "12px" }}>IA analisa e pontua todos os ativos de 0 a 10</p>
        </div>
        <button onClick={analisarAtivos} disabled={loading}
          style={{ background: loading ? "#555" : "linear-gradient(135deg,#ffd60a,#ff9f43)", color: "#000", border: "none", borderRadius: "10px", padding: "12px 20px", fontSize: "14px", fontWeight: "700", cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
          {loading
            ? <><Loader2 size={16} strokeWidth={ICON_STROKE} className="spin" /> Analisando...</>
            : analisado
              ? <><RefreshCw size={16} strokeWidth={ICON_STROKE} /> Reanalisar</>
              : <><Play size={16} strokeWidth={ICON_STROKE} /> Analisar Todos</>}
        </button>
      </div>

      {/* Seletor de horizonte */}
      <div style={{ marginBottom: "16px" }}>
        <div style={{ color: cores.textFaint, fontSize: "10px", fontFamily: "monospace", letterSpacing: "0.1em", marginBottom: "6px" }}>HORIZONTE DA ANÁLISE (opcional)</div>
        <SeletorHorizonte value={horizonte} onChange={setHorizonte} compact />
        {horizonte && (
          <div style={{ color: cores.textFaint, fontSize: "11px", marginTop: "6px" }}>
            O score será ponderado considerando {HORIZONTES.find(h => h.id === horizonte)?.label.toLowerCase()}.
          </div>
        )}
      </div>

      {/* Progresso */}
      {loading && (
        <div style={{ background: cores.card, border: `1px solid ${cores.border}`, borderRadius: "12px", padding: "16px", marginBottom: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ color: "#00e5a0", fontSize: "12px" }}>{progressoMsg}</span>
            <span style={{ color: cores.textFaint, fontSize: "12px", fontFamily: "monospace" }}>{progresso}%</span>
          </div>
          <div className="prog"><div className="prog-fill" style={{ width: `${progresso}%` }} /></div>
          <div style={{ color: cores.textFaint, fontSize: "10px", marginTop: "8px", display: "flex", alignItems: "center", gap: "5px" }}>
            <Clock size={11} strokeWidth={ICON_STROKE} /> Isso pode levar alguns minutos enquanto a IA analisa cada ativo individualmente
          </div>
        </div>
      )}

      {/* Stats resumo */}
      {analisado && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "10px", marginBottom: "14px" }}>
          {[
            { label: "SCORE MÉDIO", value: mediaScore, sub: "carteira geral", color: parseFloat(mediaScore) >= 6 ? "#00e5a0" : "#ffd60a" },
            { label: "MELHOR ATIVO", value: melhor?.ticker || "—", sub: `Score: ${melhor?.score.toFixed(1) || "—"}`, color: "#00e5a0" },
            { label: "MAIS FRACO", value: piorFiltrado?.ticker || "—", sub: `Score: ${piorFiltrado?.score.toFixed(1) || "—"}`, color: "#ff4d6d" },
          ].map((s, i) => (
            <div key={i} style={{ background: cores.card, border: `1px solid ${cores.border}`, borderRadius: "10px", padding: "12px 14px" }}>
              <div style={{ color: cores.textFaint, fontSize: "9px", fontFamily: "monospace", letterSpacing: "0.1em", marginBottom: "4px" }}>{s.label}</div>
              <div style={{ color: s.color, fontSize: "18px", fontWeight: "700", fontFamily: "monospace" }}>{s.value}</div>
              <div style={{ color: cores.textFaint, fontSize: "10px", marginTop: "2px" }}>{s.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filtros por categoria */}
      {analisado && (
        <div style={{ display: "flex", gap: "4px", background: cores.card, border: `1px solid ${cores.border}`, borderRadius: "10px", padding: "4px", marginBottom: "14px", flexWrap: "wrap" }}>
          {["Todos", "Ações", "FIIs", "ETFs", "Cripto"].map(cat => (
            <button key={cat} onClick={() => setCategoriaFiltro(cat)}
              style={{ flex: 1, minWidth: "60px", background: categoriaFiltro === cat ? "#ffd60a22" : "transparent", border: categoriaFiltro === cat ? "1px solid #ffd60a44" : "1px solid transparent", color: categoriaFiltro === cat ? "#ffd60a" : cores.textFaint, borderRadius: "7px", padding: "7px 8px", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>
              {cat} {cat !== "Todos" ? `(${ranking.filter(r => r.categoria === cat).length})` : `(${ranking.length})`}
            </button>
          ))}
        </div>
      )}

      {/* Ranking */}
      {!analisado && !loading && (
        <div style={{ background: cores.card, border: `1px solid ${cores.border}`, borderRadius: "12px", padding: "50px", textAlign: "center" }}>
          <Star size={44} strokeWidth={ICON_STROKE} color="#ffd60a" style={{ marginBottom: "14px" }} />
          <div style={{ color: cores.textFaint, fontSize: "15px", marginBottom: "8px" }}>Clique em "Analisar Todos" para a IA</div>
          <div style={{ color: cores.textFaint, fontSize: "13px" }}>pontuar todos os {Object.values(ATIVOS_PARA_SCORE).flat().length} ativos de 0 a 10</div>
        </div>
      )}

      {rankingFiltrado.length > 0 && (
        <div>
          <div style={{ color: cores.textFaint, fontSize: "10px", fontFamily: "monospace", letterSpacing: "0.1em", marginBottom: "10px" }}>
            RANKING — {rankingFiltrado.length} ATIVOS · Clique para expandir análise
          </div>
          {rankingFiltrado.map((item, i) => (
            <AtivoScoreCard key={item.ticker} item={item} rank={i + 1} cores={cores} />
          ))}
        </div>
      )}

      {erros.length > 0 && (
        <div style={{ background: "#ff4d6d11", border: "1px solid #ff4d6d33", borderRadius: "10px", padding: "10px 14px", marginTop: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
          <AlertTriangle size={13} strokeWidth={ICON_STROKE} color="#ff4d6d" />
          <span style={{ color: "#ff4d6d", fontSize: "11px" }}>Erro ao analisar: {erros.join(", ")}</span>
        </div>
      )}

      <div style={{ padding: "10px 14px", background: cores.card, border: `1px solid ${cores.border}`, borderRadius: "10px", marginTop: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
        <Star size={13} strokeWidth={ICON_STROKE} color={cores.textFaint} />
        <span style={{ color: cores.textFaint, fontSize: "11px" }}>
          Score baseado em análise técnica + fundamentos + contexto macroeconômico · IA: Groq
        </span>
      </div>
    </div>
  );
}

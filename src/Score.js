import { useState, useCallback } from "react";
import { montarContextoUsuario, HORIZONTES } from "./ContextoIA";
import SeletorHorizonte from "./SeletorHorizonte";

const PROXY = "https://daytrade-proxy.onrender.com";

const ATIVOS_PARA_SCORE = {
  "Ações": ["PETR4","VALE3","ITUB4","BBDC4","WEGE3","ABEV3","RENT3","SUZB3","GGBR4","EMBR3","RADL3","EQTL3","MGLU3","B3SA3","HAPV3"],
  "FIIs":  ["HGLG11","KNRI11","MXRF11","XPML11","BCFF11","VISC11","IRDM11","KNCR11","BRCO11","RBRF11"],
  "ETFs":  ["IVVB11","BOVA11","HASH11","SMAL11","DIVO11"],
  "Cripto":["BTC-USD","ETH-USD","BNB-USD","SOL-USD"],
};

async function salvarNoHistorico({ ativo, origem, horizonte, recomendacao, score, precoNoMomento, analise }) {
  try {
    await fetch(`${PROXY}/api/historico`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo, origem, horizonte, recomendacao, score, precoNoMomento, analise }),
    });
  } catch (e) { console.error("Erro ao salvar histórico:", e.message); }
}

function ScoreBar({ score, size = "normal" }) {
  const color = score >= 7 ? "#00e5a0" : score >= 5 ? "#ffd60a" : "#ff4d6d";
  const h = size === "small" ? "5px" : "8px";
  return (
    <div style={{ background: "#1e2d45", borderRadius: "4px", overflow: "hidden", height: h }}>
      <div style={{ height: "100%", width: `${score * 10}%`, background: color, borderRadius: "4px", transition: "width 0.6s ease" }} />
    </div>
  );
}

function ScoreLabel({ score }) {
  if (score >= 8) return <span style={{ color: "#00e5a0", fontSize: "10px", fontFamily: "monospace", fontWeight: "700" }}>⭐ EXCELENTE</span>;
  if (score >= 6) return <span style={{ color: "#00e5a0", fontSize: "10px", fontFamily: "monospace" }}>✅ BOM</span>;
  if (score >= 4) return <span style={{ color: "#ffd60a", fontSize: "10px", fontFamily: "monospace" }}>⚠️ NEUTRO</span>;
  return <span style={{ color: "#ff4d6d", fontSize: "10px", fontFamily: "monospace" }}>❌ FRACO</span>;
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

function AtivoScoreCard({ item, rank }) {
  const [expanded, setExpanded] = useState(false);
  const color = item.score >= 7 ? "#00e5a0" : item.score >= 5 ? "#ffd60a" : "#ff4d6d";

  return (
    <div style={{ background: "#0d1320", border: `1px solid ${color}33`, borderRadius: "12px", padding: "14px", marginBottom: "8px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }} onClick={() => setExpanded(e => !e)}>

        {/* Rank */}
        <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: rank <= 3 ? `${color}22` : "#111a27", border: `1px solid ${rank <= 3 ? color : "#1e2d45"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ color: rank <= 3 ? color : "#555", fontWeight: "700", fontSize: "13px", fontFamily: "monospace" }}>
            {rank <= 3 ? ["🥇","🥈","🥉"][rank-1] : `#${rank}`}
          </span>
        </div>

        {/* Ticker e categoria */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
            <span style={{ color: "#fff", fontWeight: "700", fontSize: "15px", fontFamily: "monospace" }}>{item.ticker}</span>
            <span style={{ color: "#444", fontSize: "10px", background: "#111a27", borderRadius: "4px", padding: "1px 6px" }}>{item.categoria}</span>
            {item.recomendacao && <RecomendacaoBadge rec={item.recomendacao} />}
          </div>
          <ScoreBar score={item.score} />
        </div>

        {/* Score */}
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ color, fontSize: "22px", fontWeight: "700", fontFamily: "monospace" }}>{item.score.toFixed(1)}</div>
          <ScoreLabel score={item.score} />
        </div>

        <span style={{ color: "#444", fontSize: "12px" }}>{expanded ? "▲" : "▼"}</span>
      </div>

      {expanded && item.analise && (
        <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: "1px solid #1e2d45" }}>
          {/* Sub-scores */}
          {item.subScores && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "8px", marginBottom: "12px" }}>
              {Object.entries(item.subScores).map(([k, v]) => (
                <div key={k} style={{ background: "#111a27", borderRadius: "8px", padding: "8px 10px" }}>
                  <div style={{ color: "#444", fontSize: "9px", fontFamily: "monospace", marginBottom: "4px" }}>{k.toUpperCase()}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ color: v >= 7 ? "#00e5a0" : v >= 5 ? "#ffd60a" : "#ff4d6d", fontWeight: "700", fontSize: "14px", fontFamily: "monospace" }}>{v}/10</span>
                    <div style={{ flex: 1 }}><ScoreBar score={v} size="small" /></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Análise textual */}
          <div style={{ background: "#111a27", borderRadius: "8px", padding: "12px", borderLeft: `3px solid ${color}`, marginBottom: "10px" }}>
            <div style={{ color: "#444", fontSize: "9px", fontFamily: "monospace", marginBottom: "6px" }}>📊 ANÁLISE DA IA</div>
            <p style={{ color: "#ccc", fontSize: "12px", lineHeight: "1.7", margin: 0 }}>{item.analise}</p>
          </div>

          {/* Pontos fortes e fracos */}
          {(item.pontosFortres?.length > 0 || item.pontosFragos?.length > 0) && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {item.pontosFortres?.length > 0 && (
                <div style={{ background: "#00e5a008", border: "1px solid #00e5a022", borderRadius: "8px", padding: "10px" }}>
                  <div style={{ color: "#00e5a0", fontSize: "9px", fontFamily: "monospace", marginBottom: "6px" }}>✅ PONTOS FORTES</div>
                  {item.pontosFortres.map((p, i) => <div key={i} style={{ color: "#aaa", fontSize: "11px", lineHeight: "1.6" }}>• {p}</div>)}
                </div>
              )}
              {item.pontosFragos?.length > 0 && (
                <div style={{ background: "#ff4d6d08", border: "1px solid #ff4d6d22", borderRadius: "8px", padding: "10px" }}>
                  <div style={{ color: "#ff4d6d", fontSize: "9px", fontFamily: "monospace", marginBottom: "6px" }}>⚠️ RISCOS</div>
                  {item.pontosFragos.map((p, i) => <div key={i} style={{ color: "#aaa", fontSize: "11px", lineHeight: "1.6" }}>• {p}</div>)}
                </div>
              )}
            </div>
          )}

          {item.preco && (
            <div style={{ color: "#333", fontSize: "10px", fontFamily: "monospace", marginTop: "8px" }}>
              Preço: R${item.preco.toFixed(2)} · Variação: {item.variacao >= 0 ? "+" : ""}{item.variacao?.toFixed(2)}% · Analisado: {item.analisadoEm}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Score() {
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

        const aiRes = await fetch(`${PROXY}/api/ai/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemPrompt: "Analista de investimentos brasileiro especialista, cobrindo curto, médio e longo prazo. Responda APENAS JSON válido.",
            prompt,
          }),
        });

        const aiData = await aiRes.json();
        if (!aiData.success) throw new Error(aiData.error);

        const parsed = aiData.data;
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

      // Pequena pausa para não sobrecarregar
      await new Promise(r => setTimeout(r, 500));
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
          <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "4px" }}>⭐ <span style={{ color: "#ffd60a" }}>Score</span> Fundamentalista</h2>
          <p style={{ color: "#444", fontSize: "12px" }}>IA analisa e pontua todos os ativos de 0 a 10</p>
        </div>
        <button onClick={analisarAtivos} disabled={loading}
          style={{ background: loading ? "#555" : "linear-gradient(135deg,#ffd60a,#ff9f43)", color: "#000", border: "none", borderRadius: "10px", padding: "12px 20px", fontSize: "14px", fontWeight: "700", cursor: loading ? "not-allowed" : "pointer" }}>
          {loading ? "⏳ Analisando..." : analisado ? "🔄 Reanalisar" : "▶ Analisar Todos"}
        </button>
      </div>

      {/* Seletor de horizonte */}
      <div style={{ marginBottom: "16px" }}>
        <div style={{ color: "#444", fontSize: "10px", fontFamily: "monospace", letterSpacing: "0.1em", marginBottom: "6px" }}>HORIZONTE DA ANÁLISE (opcional)</div>
        <SeletorHorizonte value={horizonte} onChange={setHorizonte} compact />
        {horizonte && (
          <div style={{ color: "#555", fontSize: "11px", marginTop: "6px" }}>
            O score será ponderado considerando {HORIZONTES.find(h => h.id === horizonte)?.label.toLowerCase()}.
          </div>
        )}
      </div>

      {/* Progresso */}
      {loading && (
        <div style={{ background: "#0d1320", border: "1px solid #1e2d45", borderRadius: "12px", padding: "16px", marginBottom: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ color: "#00e5a0", fontSize: "12px" }}>{progressoMsg}</span>
            <span style={{ color: "#444", fontSize: "12px", fontFamily: "monospace" }}>{progresso}%</span>
          </div>
          <div className="prog"><div className="prog-fill" style={{ width: `${progresso}%` }} /></div>
          <div style={{ color: "#333", fontSize: "10px", marginTop: "8px" }}>
            ⏱️ Isso pode levar alguns minutos enquanto a IA analisa cada ativo individualmente
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
            <div key={i} style={{ background: "#0d1320", border: "1px solid #1e2d45", borderRadius: "10px", padding: "12px 14px" }}>
              <div style={{ color: "#444", fontSize: "9px", fontFamily: "monospace", letterSpacing: "0.1em", marginBottom: "4px" }}>{s.label}</div>
              <div style={{ color: s.color, fontSize: "18px", fontWeight: "700", fontFamily: "monospace" }}>{s.value}</div>
              <div style={{ color: "#444", fontSize: "10px", marginTop: "2px" }}>{s.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filtros por categoria */}
      {analisado && (
        <div style={{ display: "flex", gap: "4px", background: "#0d1320", border: "1px solid #1e2d45", borderRadius: "10px", padding: "4px", marginBottom: "14px", flexWrap: "wrap" }}>
          {["Todos", "Ações", "FIIs", "ETFs", "Cripto"].map(cat => (
            <button key={cat} onClick={() => setCategoriaFiltro(cat)}
              style={{ flex: 1, minWidth: "60px", background: categoriaFiltro === cat ? "#ffd60a22" : "transparent", border: categoriaFiltro === cat ? "1px solid #ffd60a44" : "1px solid transparent", color: categoriaFiltro === cat ? "#ffd60a" : "#555", borderRadius: "7px", padding: "7px 8px", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>
              {cat} {cat !== "Todos" ? `(${ranking.filter(r => r.categoria === cat).length})` : `(${ranking.length})`}
            </button>
          ))}
        </div>
      )}

      {/* Ranking */}
      {!analisado && !loading && (
        <div style={{ background: "#0d1320", border: "1px solid #1e2d45", borderRadius: "12px", padding: "50px", textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "14px" }}>⭐</div>
          <div style={{ color: "#444", fontSize: "15px", marginBottom: "8px" }}>Clique em "Analisar Todos" para a IA</div>
          <div style={{ color: "#333", fontSize: "13px" }}>pontuar todos os {Object.values(ATIVOS_PARA_SCORE).flat().length} ativos de 0 a 10</div>
        </div>
      )}

      {rankingFiltrado.length > 0 && (
        <div>
          <div style={{ color: "#444", fontSize: "10px", fontFamily: "monospace", letterSpacing: "0.1em", marginBottom: "10px" }}>
            RANKING — {rankingFiltrado.length} ATIVOS · Clique para expandir análise
          </div>
          {rankingFiltrado.map((item, i) => (
            <AtivoScoreCard key={item.ticker} item={item} rank={i + 1} />
          ))}
        </div>
      )}

      {erros.length > 0 && (
        <div style={{ background: "#ff4d6d11", border: "1px solid #ff4d6d33", borderRadius: "10px", padding: "10px 14px", marginTop: "10px" }}>
          <span style={{ color: "#ff4d6d", fontSize: "11px" }}>⚠️ Erro ao analisar: {erros.join(", ")}</span>
        </div>
      )}

      <div style={{ padding: "10px 14px", background: "#0d1320", border: "1px solid #1e2d45", borderRadius: "10px", marginTop: "12px" }}>
        <span style={{ color: "#444", fontSize: "11px" }}>
          ⭐ Score baseado em análise técnica + fundamentos + contexto macroeconômico · IA: Groq LLaMA 3.3
        </span>
      </div>
    </div>
  );
}

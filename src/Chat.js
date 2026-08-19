import { useState, useEffect, useRef, useCallback } from "react";
import { montarContextoUsuario, HORIZONTES } from "./ContextoIA";
import SeletorHorizonte from "./SeletorHorizonte";
import { authFetch } from "./supabaseClient";

const PROXY = "https://daytrade-proxy.onrender.com";

function paleta(tema) {
  if (tema === "claro") {
    return { card: "#FFFFFF", cardInner: "#F4F7FA", border: "#E2E8F0", textPrimary: "#172033", textSecondary: "#64748B", textFaint: "#94A3B8" };
  }
  return { card: "#0d1320", cardInner: "#111a27", border: "#1e2d45", textPrimary: "#e0e6f0", textSecondary: "#aaa", textFaint: "#444" };
}

async function salvarNoHistorico({ ativo, horizonte, recomendacao, score, precoNoMomento, analise }) {
  try {
    await authFetch(`${PROXY}/api/historico`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo, origem: "chat", horizonte, recomendacao, score, precoNoMomento, analise }),
    });
  } catch (e) { console.error("Erro ao salvar histórico:", e.message); }
}

const SUGESTOES = [
  "Analise PETR4 para longo prazo",
  "Quais FIIs pagam os melhores dividendos?",
  "Como os juros altos afetam minha carteira?",
  "HGLG11 vale a pena comprar agora?",
  "Qual o impacto da inflação em ETFs?",
  "Analise IVVB11 para 2026",
  "Bitcoin está em boa hora para comprar?",
  "Quais ações se beneficiam com Selic alta?",
  "Minha alocação está adequada para meu perfil?",
];

function TypingIndicator({ cores }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "4px", padding: "12px 16px", background: cores.card, borderRadius: "12px", width: "fit-content", marginBottom: "12px" }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: "7px", height: "7px", borderRadius: "50%", background: "#00e5a0",
          animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}

    </div>
  );
}

function Message({ msg, cores }) {
  const isUser = msg.role === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: "12px" }}>
      {!isUser && (
        <div style={{ width: "30px", height: "30px", background: "linear-gradient(135deg,#00e5a0,#006eff)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", marginRight: "8px", flexShrink: 0, alignSelf: "flex-end" }}>
          🤖
        </div>
      )}
      <div style={{
        maxWidth: "80%",
        background: isUser ? "linear-gradient(135deg,#00e5a0,#00b07a)" : cores.card,
        border: isUser ? "none" : `1px solid ${cores.border}`,
        color: isUser ? "#000" : cores.textPrimary,
        borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
        padding: "12px 16px",
        fontSize: "13px",
        lineHeight: "1.7",
      }}>
        {msg.horizonte && (
          <div style={{ marginBottom: "8px" }}>
            <span style={{ background: `${msg.horizonte.cor}22`, color: msg.horizonte.cor, border: `1px solid ${msg.horizonte.cor}44`, borderRadius: "6px", padding: "2px 8px", fontSize: "10px", fontFamily: "monospace", fontWeight: "700" }}>
              {msg.horizonte.icone} {msg.horizonte.label}
            </span>
          </div>
        )}
        {msg.sources && msg.sources.length > 0 && (
          <div style={{ marginBottom: "8px", paddingBottom: "8px", borderBottom: `1px solid ${cores.border}` }}>
            <div style={{ color: "#6af", fontSize: "10px", fontFamily: "monospace", marginBottom: "4px" }}>🌐 FONTES PESQUISADAS</div>
            {msg.sources.map((s, i) => (
              <div key={i} style={{ color: cores.textFaint, fontSize: "10px", marginTop: "2px" }}>• {s}</div>
            ))}
          </div>
        )}
        <div style={{ whiteSpace: "pre-wrap" }}>{msg.content}</div>
        {msg.analysis && (
          <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: `1px solid ${isUser ? "#00000022" : cores.border}` }}>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {msg.analysis.recomendacao && (
                <span style={{
                  background: msg.analysis.recomendacao === "COMPRAR" ? "#00e5a022" : msg.analysis.recomendacao === "VENDER" ? "#ff4d6d22" : "#ffd60a22",
                  color: msg.analysis.recomendacao === "COMPRAR" ? "#00e5a0" : msg.analysis.recomendacao === "VENDER" ? "#ff4d6d" : "#ffd60a",
                  border: `1px solid ${msg.analysis.recomendacao === "COMPRAR" ? "#00e5a044" : msg.analysis.recomendacao === "VENDER" ? "#ff4d6d44" : "#ffd60a44"}`,
                  borderRadius: "6px", padding: "3px 10px", fontSize: "11px", fontWeight: "700", fontFamily: "monospace"
                }}>
                  {msg.analysis.recomendacao === "COMPRAR" ? "▲" : msg.analysis.recomendacao === "VENDER" ? "▼" : "◆"} {msg.analysis.recomendacao}
                </span>
              )}
              {msg.analysis.risco && (
                <span style={{ background: "#ff4d6d11", color: "#ff4d6d", border: "1px solid #ff4d6d33", borderRadius: "6px", padding: "3px 10px", fontSize: "11px", fontFamily: "monospace" }}>
                  ⚠️ Risco: {msg.analysis.risco}
                </span>
              )}
              {msg.analysis.horizonte && (
                <span style={{ background: "#6af11", color: "#6af", border: "1px solid #6af33", borderRadius: "6px", padding: "3px 10px", fontSize: "11px", fontFamily: "monospace" }}>
                  📅 {msg.analysis.horizonte}
                </span>
              )}
              {msg.analysis.score !== undefined && (
                <span style={{ background: "#ffd60a11", color: "#ffd60a", border: "1px solid #ffd60a33", borderRadius: "6px", padding: "3px 10px", fontSize: "11px", fontFamily: "monospace" }}>
                  ⭐ Score: {msg.analysis.score}/10
                </span>
              )}
            </div>
          </div>
        )}
        <div style={{ fontSize: "10px", color: isUser ? "#00000066" : cores.textFaint, marginTop: "6px", textAlign: "right", fontFamily: "monospace" }}>
          {msg.time}
        </div>
      </div>
      {isUser && (
        <div style={{ width: "30px", height: "30px", background: cores.border, borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", marginLeft: "8px", flexShrink: 0, alignSelf: "flex-end" }}>
          👤
        </div>
      )}
    </div>
  );
}

export default function Chat({ tema = "escuro" }) {
  const cores = paleta(tema);
  const [messages, setMessages] = useState([
    {
      id: 1, role: "assistant",
      content: "Olá! Sou sua IA de investimentos 🤖\n\nPosso te ajudar com:\n• Análise de ações, FIIs, ETFs e criptomoedas\n• Renda fixa, Tesouro Direto e alocação\n• Pesquisa de notícias e impacto econômico\n• Análise por horizonte: curto, médio ou longo prazo\n• Score de risco e probabilidade de ativos\n\nDica: escolha um horizonte abaixo antes de perguntar, para uma análise mais focada. O que quer analisar hoje?",
      time: new Date().toLocaleTimeString("pt-BR"),
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [webSearch, setWebSearch] = useState(true);
  const [horizonte, setHorizonte] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = useCallback(async (text) => {
    const userText = text || input.trim();
    if (!userText || loading) return;
    setInput("");

    const horizonteInfo = horizonte ? HORIZONTES.find(h => h.id === horizonte) : null;

    const userMsg = { id: Date.now(), role: "user", content: userText, time: new Date().toLocaleTimeString("pt-BR"), horizonte: horizonteInfo };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      // Histórico da conversa para contexto
      const history = messages.slice(-10).map(m => ({
        role: m.role,
        content: m.content,
      }));

      const contextoUsuario = montarContextoUsuario(horizonte);

      const systemPrompt = `Você é uma IA especialista em investimentos brasileiros, cobrindo ações B3, FIIs, ETFs, renda fixa, tesouro direto e criptomoedas — sua missão é ser a IA de investimentos mais completa possível, cobrindo curto, médio e longo prazo.

${contextoUsuario}

SUAS RESPONSABILIDADES:
1. Sempre que possível, conecte a resposta ao perfil e à alocação do investidor acima
2. Pesquisar notícias recentes e impacto econômico
3. Avaliar riscos: juros Selic, inflação IPCA, câmbio, geopolítica
4. Dar score de 0-10 e recomendação clara quando analisar um ativo
5. Explicar como mudanças macroeconômicas afetam os ativos
6. Ser direto, prático e educativo
7. Deixar claro quando há incerteza — você não prevê o mercado, ajuda a pensar em probabilidades e gestão de risco

TIPOS DE ATIVOS QUE VOCÊ DOMINA:
- Ações B3: PETR4, VALE3, ITUB4, etc.
- FIIs: HGLG11, KNRI11, MXRF11, etc.
- ETFs: IVVB11, BOVA11, HASH11, etc.
- Cripto: BTC, ETH, BNB, etc.
- Renda Fixa: Tesouro Selic/IPCA+/Prefixado, CDB, LCI, LCA

FORMATO DE RESPOSTA:
- Use emojis para tornar mais visual
- Organize em tópicos quando necessário
- Sempre mencione riscos
- Para análises de ativos, termine com um resumo estruturado em JSON:
{"recomendacao":"COMPRAR|AGUARDAR|EVITAR","risco":"BAIXO|MÉDIO|ALTO","horizonte":"curto|médio|longo prazo","score":0-10}`;

      const prompt = webSearch
        ? `${userText}\n\n[INSTRUÇÃO: Pesquise na web informações recentes sobre este tema antes de responder. Mencione as fontes que usou.]`
        : userText;

      const response = await fetch(`${PROXY}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt,
          messages: [...history, { role: "user", content: prompt }],
          webSearch,
        }),
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error || "Erro na IA");

      let content = data.data?.content || data.data?.raw || "";
      let analysis = null;
      let sources = data.data?.sources || [];

      // Extrai JSON de análise se houver
      const jsonMatch = content.match(/\{[^{}]*"recomendacao"[^{}]*\}/);
      if (jsonMatch) {
        try {
          analysis = JSON.parse(jsonMatch[0]);
          content = content.replace(jsonMatch[0], "").trim();
        } catch {}
      }

      // Salva no histórico se a IA deu uma recomendação estruturada
      // e conseguimos identificar o ativo mencionado na pergunta
      if (analysis?.recomendacao) {
        const tickerMatch = userText.match(/[A-Z]{4}[0-9]{1,2}|BTC|ETH|BNB|SOL/i);
        if (tickerMatch) {
          let precoNoMomento = null;
          try {
            const pr = await fetch(`${PROXY}/api/prices?tickers=${tickerMatch[0].toUpperCase()}`);
            const prData = await pr.json();
            precoNoMomento = prData[tickerMatch[0].toUpperCase()]?.price || null;
          } catch {}

          salvarNoHistorico({
            ativo: tickerMatch[0].toUpperCase(),
            horizonte: horizonte || null,
            recomendacao: analysis.recomendacao,
            score: analysis.score || null,
            precoNoMomento,
            analise: content.slice(0, 300),
          });
        }
      }

      const aiMsg = {
        id: Date.now() + 1, role: "assistant",
        content, analysis, sources,
        time: new Date().toLocaleTimeString("pt-BR"),
      };
      setMessages(prev => [...prev, aiMsg]);

    } catch (e) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1, role: "assistant",
        content: `❌ Erro: ${e.message}\n\nTente novamente em alguns instantes.`,
        time: new Date().toLocaleTimeString("pt-BR"),
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [input, loading, messages, webSearch, horizonte]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 60px)", maxWidth: "900px", margin: "0 auto", padding: "0 12px" }}>
      {/* Estilos em public/index.html — não usar <style> aqui (causa removeChild no React 19) */}

      {/* Header do chat */}
      <div style={{ padding: "14px 0", borderBottom: `1px solid ${cores.border}`, marginBottom: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "2px", color: cores.textPrimary }}>💬 Chat com IA de Investimentos</h2>
          <p style={{ color: cores.textFaint, fontSize: "11px" }}>Ações · FIIs · ETFs · Cripto · Renda Fixa · Curto, Médio e Longo Prazo</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: cores.textSecondary, fontSize: "11px" }}>🌐 Web</span>
          <button onClick={() => setWebSearch(w => !w)}
            style={{ background: webSearch ? "#00e5a022" : cores.cardInner, border: `1px solid ${webSearch ? "#00e5a0" : cores.border}`, color: webSearch ? "#00e5a0" : cores.textFaint, borderRadius: "6px", padding: "5px 12px", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}>
            {webSearch ? "ON ✓" : "OFF"}
          </button>
        </div>
      </div>

      {/* Seletor de horizonte */}
      <div style={{ marginBottom: "12px" }}>
        <div style={{ color: cores.textFaint, fontSize: "10px", fontFamily: "monospace", letterSpacing: "0.1em", marginBottom: "6px" }}>HORIZONTE DA ANÁLISE (opcional)</div>
        <SeletorHorizonte value={horizonte} onChange={setHorizonte} compact />
      </div>

      {/* Sugestões rápidas */}
      {messages.length <= 1 && (
        <div style={{ marginBottom: "14px" }}>
          <div style={{ color: cores.textFaint, fontSize: "10px", fontFamily: "monospace", letterSpacing: "0.1em", marginBottom: "8px" }}>💡 SUGESTÕES RÁPIDAS</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {SUGESTOES.map((s, i) => (
              <button key={i} className="sugestao" onClick={() => sendMessage(s)}
                style={{ background: cores.card, border: `1px solid ${cores.border}`, color: cores.textSecondary, borderRadius: "20px", padding: "6px 12px", fontSize: "11px", cursor: "pointer", transition: "all 0.2s" }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mensagens */}
      <div style={{ flex: 1, overflowY: "auto", paddingRight: "4px" }}>
        {messages.map(msg => <Message key={msg.id} msg={msg} cores={cores} />)}
        {loading && <TypingIndicator cores={cores} />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "12px 0", borderTop: `1px solid ${cores.border}` }}>
        <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
          <textarea
            ref={inputRef}
            className="chat-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte sobre ações, FIIs, ETFs, cripto, renda fixa, economia..."
            rows={1}
            style={{
              flex: 1, background: cores.card, border: `1px solid ${cores.border}`,
              color: cores.textPrimary, borderRadius: "12px", padding: "12px 14px",
              fontSize: "13px", outline: "none", resize: "none",
              fontFamily: "inherit", lineHeight: "1.5", transition: "all 0.2s",
              maxHeight: "120px", overflowY: "auto",
            }}
            onInput={e => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
          />
          <button className="send-btn" onClick={() => sendMessage()} disabled={loading || !input.trim()}
            style={{ background: loading || !input.trim() ? cores.border : "linear-gradient(135deg,#00e5a0,#00b07a)", color: loading || !input.trim() ? cores.textFaint : "#000", border: "none", borderRadius: "12px", padding: "12px 16px", fontSize: "18px", cursor: loading || !input.trim() ? "not-allowed" : "pointer", transition: "all 0.2s", flexShrink: 0 }}>
            {loading ? "⏳" : "➤"}
          </button>
        </div>
        <div style={{ color: cores.textFaint, fontSize: "10px", textAlign: "center", marginTop: "6px", fontFamily: "monospace" }}>
          Enter para enviar · Shift+Enter para nova linha · {webSearch ? "🌐 Pesquisa web ativa" : "Pesquisa web desativada"}
        </div>
      </div>
    </div>
  );
}

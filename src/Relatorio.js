import { useState, useEffect, useCallback, useRef } from "react";

const PROXY = "https://daytrade-proxy.onrender.com";
const STORAGE_KEY = "tradeai_relatorio";

const EMAILJS_SERVICE_ID = "service_ihson4a";
const EMAILJS_TEMPLATE_ID = "template_y30vyxv";
const EMAILJS_PUBLIC_KEY = process.env.REACT_APP_EMAILJS_KEY || "";

const ATIVOS_RELATORIO = [
  "PETR4","VALE3","ITUB4","BBDC4","WEGE3","ABEV3",
  "HGLG11","KNRI11","MXRF11",
  "IVVB11","BOVA11",
  "BTC-USD","ETH-USD",
];

function paleta(tema) {
  if (tema === "claro") {
    return { card: "#FFFFFF", cardInner: "#F4F7FA", border: "#E2E8F0", textPrimary: "#172033", textSecondary: "#64748B", textFaint: "#94A3B8" };
  }
  return { card: "#0d1320", cardInner: "#111a27", border: "#1e2d45", textPrimary: "#fff", textSecondary: "#888", textFaint: "#444" };
}

function salvarConfig(config) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

function carregarConfig() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {
      ativo: true,
      diaSemana: 0, // 0 = domingo
      hora: "08:00",
      email: "",
      ultimoEnvio: null,
      incluirScore: true,
      incluirAlertas: true,
      incluirMercado: true,
    };
  } catch { return {}; }
}

async function sendEmailRelatorio(conteudo) {
  if (!EMAILJS_PUBLIC_KEY) return false;
  try {
    const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_PUBLIC_KEY,
        template_params: {
          tipo_sinal: "📊 RELATÓRIO SEMANAL TradeAI",
          ativo: "Carteira Completa",
          preco: conteudo.resumoPrecos || conteudo.preco || "—",
stop_loss: conteudo.melhores || conteudo.stop_loss || "—",
take_profit: conteudo.piores || conteudo.take_profit || "—",
confianca: conteudo.scoreGeral || conteudo.confianca || "—",
analise: conteudo.analiseCompleta || conteudo.analise || "—",
          horario: new Date().toLocaleString("pt-BR"),
        },
      }),
    });
    return res.ok || res.status === 200;
  } catch { return false; }
}

function fmt(v) { return v !== undefined ? `R$ ${Number(v).toFixed(2)}` : "—"; }
function pct(v) { return v !== undefined ? `${v >= 0 ? "+" : ""}${Number(v).toFixed(2)}%` : "—"; }

function StatusCard({ label, value, sub, color = "#fff", cores }) {
  return (
    <div style={{ background: cores.card, border: `1px solid ${cores.border}`, borderRadius: "10px", padding: "12px 14px" }}>
      <div style={{ color: cores.textFaint, fontSize: "9px", fontFamily: "monospace", letterSpacing: "0.1em", marginBottom: "4px" }}>{label}</div>
      <div style={{ color, fontSize: "18px", fontWeight: "700" }}>{value}</div>
      {sub && <div style={{ color: cores.textFaint, fontSize: "10px", marginTop: "2px" }}>{sub}</div>}
    </div>
  );
}

export default function Relatorio({ tema = "escuro" }) {
  const cores = paleta(tema);
  const [config, setConfig] = useState(carregarConfig);
  const [gerando, setGerando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [progressoMsg, setProgressoMsg] = useState("");
  const [preview, setPreview] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [statusEmail, setStatusEmail] = useState("");
  const [proximoEnvio, setProximoEnvio] = useState("");
  const intervalRef = useRef(null);

  // Calcula próximo envio
  useEffect(() => {
    const calcular = () => {
      const agora = new Date();
      const prox = new Date();
      const diaSemanaAlvo = config.diaSemana;
      const [hora, min] = (config.hora || "08:00").split(":").map(Number);
      prox.setHours(hora, min, 0, 0);

      const diasAte = (diaSemanaAlvo - agora.getDay() + 7) % 7;
      if (diasAte === 0 && agora >= prox) prox.setDate(prox.getDate() + 7);
      else prox.setDate(prox.getDate() + diasAte);

      const diff = prox - agora;
      const dias = Math.floor(diff / 86400000);
      const horas = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);

      if (dias > 0) setProximoEnvio(`${dias}d ${horas}h ${mins}min`);
      else if (horas > 0) setProximoEnvio(`${horas}h ${mins}min`);
      else setProximoEnvio(`${mins}min`);
    };
    calcular();
    const i = setInterval(calcular, 60000);
    return () => clearInterval(i);
  }, [config.diaSemana, config.hora]);

  // Verifica se deve enviar automaticamente
  useEffect(() => {
    if (!config.ativo || !config.email) return;

    const verificar = () => {
      const agora = new Date();
      const [hora, min] = (config.hora || "08:00").split(":").map(Number);
      const diaCorreto = agora.getDay() === parseInt(config.diaSemana);
      const horaCorreta = agora.getHours() === hora && agora.getMinutes() === min;

      if (diaCorreto && horaCorreta) {
        const hoje = agora.toDateString();
        if (config.ultimoEnvio !== hoje) {
          gerarEEnviar(true);
        }
      }
    };

    intervalRef.current = setInterval(verificar, 60000);
    return () => clearInterval(intervalRef.current);
  }, [config]);

  const gerarRelatorio = useCallback(async () => {
    setGerando(true);
    setProgresso(0);
    setPreview(null);

    try {
      setProgressoMsg("Buscando preços dos ativos...");
      setProgresso(10);

      // Busca preços
      const precoRes = await fetch(`${PROXY}/api/prices?tickers=${ATIVOS_RELATORIO.join(",")}`);
      const precos = await precoRes.json();
      setProgresso(25);

      // Ordena por variação
      const ativosComPreco = ATIVOS_RELATORIO.map(ticker => ({
        ticker,
        preco: precos[ticker]?.price || 0,
        variacao: precos[ticker]?.change || 0,
      })).filter(a => a.preco > 0);

      const melhores = [...ativosComPreco].sort((a, b) => b.variacao - a.variacao).slice(0, 3);
      const piores = [...ativosComPreco].sort((a, b) => a.variacao - b.variacao).slice(0, 3);

      setProgressoMsg("IA analisando o mercado...");
      setProgresso(40);

      // IA gera análise completa
      const semana = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
      const resumoAtivos = ativosComPreco.map(a => `${a.ticker}: R$${a.preco.toFixed(2)} (${pct(a.variacao)})`).join(", ");

      const aiRes = await fetch(`${PROXY}/api/ai/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: "Analista de investimentos brasileiro experiente. Escreva em português claro e objetivo.",
          prompt: `Gere um relatório semanal de investimentos para a B3. Data: ${semana}.

ATIVOS MONITORADOS:
${resumoAtivos}

MELHORES DA SEMANA:
${melhores.map(a => `${a.ticker}: ${pct(a.variacao)}`).join(", ")}

PIORES DA SEMANA:
${piores.map(a => `${a.ticker}: ${pct(a.variacao)}`).join(", ")}

Escreva um relatório completo incluindo:
1. Resumo do mercado desta semana
2. Análise dos melhores e piores desempenhos
3. Perspectivas para a próxima semana
4. Alertas macroeconômicos (Selic, inflação, câmbio)
5. Recomendações de ação

Responda em JSON:
{
  "titulo": "Relatório Semanal TradeAI",
  "resumoMercado": "parágrafo resumo",
  "analiseDestaqes": "análise dos melhores e piores",
  "perspectivas": "perspectivas próxima semana",
  "macroeconomia": "alertas macro",
  "recomendacoes": ["rec 1", "rec 2", "rec 3"],
  "scoreGeral": 0-10,
  "sentimento": "OTIMISTA|NEUTRO|PESSIMISTA"
}`,
        }),
      });

      const aiData = await aiRes.json();
      setProgresso(80);
      setProgressoMsg("Montando relatório...");

      const analise = aiData.data || {};

      const relatorio = {
        data: new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
        ativos: ativosComPreco,
        melhores,
        piores,
        analise,
        resumoPrecos: ativosComPreco.slice(0, 5).map(a => `${a.ticker} ${pct(a.variacao)}`).join(" | "),
        melhoresTexto: melhores.map(a => `${a.ticker}: ${pct(a.variacao)}`).join(", "),
        pioresTexto: piores.map(a => `${a.ticker}: ${pct(a.variacao)}`).join(", "),
        scoreGeral: analise.scoreGeral || 5,
        sentimento: analise.sentimento || "NEUTRO",
        analiseCompleta: `${analise.resumoMercado || ""}\n\n${analise.analiseDestaqes || ""}\n\nPerspectivas: ${analise.perspectivas || ""}\n\nMacroeconomia: ${analise.macroeconomia || ""}\n\nRecomendações: ${(analise.recomendacoes || []).join(", ")}`,
      };

      setPreview(relatorio);
      setProgresso(100);
      setProgressoMsg("Relatório gerado!");

    } catch (e) {
      console.error(e);
      setProgressoMsg(`Erro: ${e.message}`);
    } finally {
      setGerando(false);
    }
  }, []);

  const gerarEEnviar = useCallback(async (automatico = false) => {
    await gerarRelatorio();
    if (preview && config.email) {
      await enviarEmail(preview);
      if (automatico) {
        const hoje = new Date().toDateString();
        const novaConfig = { ...config, ultimoEnvio: hoje };
        setConfig(novaConfig);
        salvarConfig(novaConfig);
      }
    }
  }, [preview, config, gerarRelatorio]);

  const enviarEmail = async (rel) => {
    if (!config.email) { setStatusEmail("⚠️ Configure seu email primeiro!"); return; }
    setEnviando(true);
    const ok = await sendEmailRelatorio({
      resumoPrecos: rel.resumoPrecos,
      melhores: rel.melhoresTexto,
      piores: rel.pioresTexto,
      scoreGeral: `${rel.scoreGeral}/10 · Sentimento: ${rel.sentimento}`,
      analiseCompleta: rel.analiseCompleta,
    });
    setStatusEmail(ok ? "✅ Relatório enviado com sucesso!" : "❌ Erro ao enviar. Verifique o EmailJS.");
    setTimeout(() => setStatusEmail(""), 5000);
    setEnviando(false);
  };

  const atualizarConfig = (campo, valor) => {
    const nova = { ...config, [campo]: valor };
    setConfig(nova);
    salvarConfig(nova);
  };

  const DIAS = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];
  const sentimentoColor = preview?.sentimento === "OTIMISTA" ? "#00e5a0" : preview?.sentimento === "PESSIMISTA" ? "#ff4d6d" : "#ffd60a";

  return (
    <div style={{ padding: "14px", maxWidth: "900px", margin: "0 auto" }}>


      {/* Header */}
      <div style={{ marginBottom: "16px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "4px", color: cores.textPrimary }}>📅 <span style={{ color: "#6af" }}>Relatório</span> Semanal</h2>
        <p style={{ color: cores.textFaint, fontSize: "12px" }}>Análise automática enviada por email toda semana</p>
      </div>

      {/* Config */}
      <div style={{ background: cores.card, border: `1px solid ${cores.border}`, borderRadius: "12px", padding: "18px", marginBottom: "14px" }}>
        <div style={{ color: cores.textFaint, fontSize: "10px", fontFamily: "monospace", letterSpacing: "0.1em", marginBottom: "14px" }}>⚙️ CONFIGURAÇÃO</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
          <div>
            <label style={{ display: "block", color: cores.textSecondary, fontSize: "11px", marginBottom: "5px" }}>Dia da semana</label>
            <select value={config.diaSemana} onChange={e => atualizarConfig("diaSemana", parseInt(e.target.value))}
              style={{ width: "100%", background: cores.cardInner, border: `1px solid ${cores.border}`, color: cores.textPrimary, borderRadius: "8px", padding: "10px", fontSize: "13px" }}>
              {DIAS.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: "block", color: cores.textSecondary, fontSize: "11px", marginBottom: "5px" }}>Horário</label>
            <input type="time" value={config.hora} onChange={e => atualizarConfig("hora", e.target.value)}
              style={{ width: "100%", background: cores.cardInner, border: `1px solid ${cores.border}`, color: cores.textPrimary, borderRadius: "8px", padding: "10px", fontSize: "13px" }} />
          </div>
        </div>

        <div style={{ marginBottom: "12px" }}>
          <label style={{ display: "block", color: cores.textSecondary, fontSize: "11px", marginBottom: "5px" }}>Seu email</label>
          <input type="email" value={config.email} onChange={e => atualizarConfig("email", e.target.value)}
            placeholder="seu@email.com"
            style={{ width: "100%", background: cores.cardInner, border: `1px solid ${cores.border}`, color: cores.textPrimary, borderRadius: "8px", padding: "10px 14px", fontSize: "14px" }} />
        </div>

        {/* Toggles */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "14px" }}>
          {[
            { campo: "incluirScore", label: "⭐ Incluir scores" },
            { campo: "incluirMercado", label: "📈 Incluir mercado" },
            { campo: "incluirAlertas", label: "🔔 Incluir alertas" },
            { campo: "ativo", label: "⏰ Envio automático" },
          ].map(({ campo, label }) => (
            <div key={campo} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: cores.cardInner, borderRadius: "8px", padding: "8px 12px" }}>
              <span style={{ color: cores.textSecondary, fontSize: "12px" }}>{label}</span>
              <button onClick={() => atualizarConfig(campo, !config[campo])}
                style={{ background: config[campo] ? "#00e5a022" : cores.border, border: `1px solid ${config[campo] ? "#00e5a0" : cores.border}`, color: config[campo] ? "#00e5a0" : cores.textFaint, borderRadius: "6px", padding: "3px 10px", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}>
                {config[campo] ? "ON" : "OFF"}
              </button>
            </div>
          ))}
        </div>

        {/* Status */}
        {config.ativo && (
          <div style={{ background: "#00e5a011", border: "1px solid #00e5a033", borderRadius: "8px", padding: "10px 14px", marginBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#00e5a0", fontSize: "12px" }}>⏰ Próximo envio: <strong>{DIAS[config.diaSemana]} às {config.hora}</strong></span>
            <span style={{ color: "#00e5a0", fontSize: "11px", fontFamily: "monospace" }}>em {proximoEnvio}</span>
          </div>
        )}

        {config.ultimoEnvio && (
          <div style={{ color: cores.textFaint, fontSize: "10px", fontFamily: "monospace", marginBottom: "10px" }}>
            Último envio: {config.ultimoEnvio}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <button onClick={gerarRelatorio} disabled={gerando}
            style={{ background: gerando ? "#555" : cores.cardInner, border: `1px solid ${cores.border}`, color: gerando ? "#888" : cores.textSecondary, borderRadius: "10px", padding: "12px", fontSize: "13px", fontWeight: "700", cursor: gerando ? "not-allowed" : "pointer" }}>
            {gerando ? "⏳ Gerando..." : "📊 Pré-visualizar"}
          </button>
          <button onClick={() => preview ? enviarEmail(preview) : gerarRelatorio()} disabled={gerando || enviando}
            style={{ background: gerando || enviando ? "#555" : "linear-gradient(135deg,#6af,#006eff)", color: "#fff", border: "none", borderRadius: "10px", padding: "12px", fontSize: "13px", fontWeight: "700", cursor: gerando || enviando ? "not-allowed" : "pointer" }}>
            {enviando ? "⏳ Enviando..." : "📧 Enviar Agora"}
          </button>
        </div>

        {statusEmail && (
          <div style={{ background: statusEmail.includes("✅") ? "#00e5a011" : "#ff4d6d11", border: `1px solid ${statusEmail.includes("✅") ? "#00e5a033" : "#ff4d6d33"}`, borderRadius: "8px", padding: "8px 12px", marginTop: "10px", color: statusEmail.includes("✅") ? "#00e5a0" : "#ff4d6d", fontSize: "12px" }}>
            {statusEmail}
          </div>
        )}
      </div>

      {/* Progresso */}
      {gerando && (
        <div style={{ background: cores.card, border: `1px solid ${cores.border}`, borderRadius: "12px", padding: "16px", marginBottom: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ color: "#6af", fontSize: "12px" }}>{progressoMsg}</span>
            <span style={{ color: cores.textFaint, fontSize: "12px", fontFamily: "monospace" }}>{progresso}%</span>
          </div>
          <div className="prog"><div className="prog-fill" style={{ width: `${progresso}%` }} /></div>
        </div>
      )}

      {/* Preview do relatório */}
      {preview && (
        <div style={{ background: tema === "claro" ? "#F4F7FA" : "#0a0f1a", border: "1px solid #6af33", borderRadius: "14px", padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <div style={{ color: "#6af", fontSize: "10px", fontFamily: "monospace", letterSpacing: "0.1em", marginBottom: "4px" }}>📊 PRÉVIA DO RELATÓRIO</div>
              <h3 style={{ fontSize: "16px", fontWeight: "700", color: cores.textPrimary }}>{preview.analise?.titulo || "Relatório Semanal TradeAI"}</h3>
              <div style={{ color: cores.textFaint, fontSize: "11px", marginTop: "2px" }}>{preview.data}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: sentimentoColor, fontSize: "14px", fontWeight: "700" }}>
                {preview.sentimento === "OTIMISTA" ? "😊" : preview.sentimento === "PESSIMISTA" ? "😟" : "😐"} {preview.sentimento}
              </div>
              <div style={{ color: "#ffd60a", fontSize: "12px", fontFamily: "monospace" }}>Score: {preview.scoreGeral}/10</div>
            </div>
          </div>

          {/* Stats dos ativos */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
            <StatusCard label="MELHORES DA SEMANA" value={preview.melhores[0]?.ticker || "—"} sub={pct(preview.melhores[0]?.variacao)} color="#00e5a0" cores={cores} />
            <StatusCard label="PIORES DA SEMANA" value={preview.piores[0]?.ticker || "—"} sub={pct(preview.piores[0]?.variacao)} color="#ff4d6d" cores={cores} />
          </div>

          {/* Tabela de ativos */}
          <div style={{ background: cores.card, borderRadius: "10px", padding: "14px", marginBottom: "14px" }}>
            <div style={{ color: cores.textFaint, fontSize: "9px", fontFamily: "monospace", letterSpacing: "0.1em", marginBottom: "10px" }}>ATIVOS MONITORADOS</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "6px" }}>
              {preview.ativos.map(a => (
                <div key={a.ticker} style={{ display: "flex", justifyContent: "space-between", padding: "5px 8px", background: cores.cardInner, borderRadius: "6px" }}>
                  <span style={{ color: cores.textSecondary, fontFamily: "monospace", fontSize: "12px" }}>{a.ticker}</span>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ color: cores.textPrimary, fontFamily: "monospace", fontSize: "11px" }}>{fmt(a.preco)}</span>
                    <span style={{ color: a.variacao >= 0 ? "#00e5a0" : "#ff4d6d", fontSize: "10px", marginLeft: "6px" }}>{pct(a.variacao)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Análise da IA */}
          {preview.analise?.resumoMercado && (
            <div style={{ background: cores.card, borderLeft: "4px solid #6af", borderRadius: "10px", padding: "14px", marginBottom: "12px" }}>
              <div style={{ color: "#6af", fontSize: "9px", fontFamily: "monospace", marginBottom: "6px" }}>📝 RESUMO DO MERCADO</div>
              <p style={{ color: cores.textSecondary, fontSize: "12px", lineHeight: "1.8", margin: 0 }}>{preview.analise.resumoMercado}</p>
            </div>
          )}

          {preview.analise?.perspectivas && (
            <div style={{ background: cores.card, borderLeft: "4px solid #ffd60a", borderRadius: "10px", padding: "14px", marginBottom: "12px" }}>
              <div style={{ color: "#ffd60a", fontSize: "9px", fontFamily: "monospace", marginBottom: "6px" }}>🔭 PERSPECTIVAS</div>
              <p style={{ color: cores.textSecondary, fontSize: "12px", lineHeight: "1.8", margin: 0 }}>{preview.analise.perspectivas}</p>
            </div>
          )}

          {preview.analise?.recomendacoes?.length > 0 && (
            <div style={{ background: cores.card, borderRadius: "10px", padding: "14px", marginBottom: "12px" }}>
              <div style={{ color: "#00e5a0", fontSize: "9px", fontFamily: "monospace", marginBottom: "8px" }}>✅ RECOMENDAÇÕES DA SEMANA</div>
              {preview.analise.recomendacoes.map((r, i) => (
                <div key={i} style={{ color: cores.textSecondary, fontSize: "12px", lineHeight: "1.7", display: "flex", gap: "8px" }}>
                  <span style={{ color: "#00e5a0" }}>{i + 1}.</span> {r}
                </div>
              ))}
            </div>
          )}

          {preview.analise?.macroeconomia && (
            <div style={{ background: "#ff4d6d08", border: "1px solid #ff4d6d22", borderRadius: "10px", padding: "14px" }}>
              <div style={{ color: "#ff4d6d", fontSize: "9px", fontFamily: "monospace", marginBottom: "6px" }}>⚠️ ALERTAS MACROECONÔMICOS</div>
              <p style={{ color: cores.textSecondary, fontSize: "12px", lineHeight: "1.8", margin: 0 }}>{preview.analise.macroeconomia}</p>
            </div>
          )}
        </div>
      )}

      <div style={{ padding: "10px 14px", background: cores.card, border: `1px solid ${cores.border}`, borderRadius: "10px", marginTop: "12px" }}>
        <span style={{ color: cores.textFaint, fontSize: "11px" }}>
          📅 Relatório automático todo {DIAS[config.diaSemana]} às {config.hora} · EmailJS · IA: Groq LLaMA
        </span>
      </div>
    </div>
  );
}

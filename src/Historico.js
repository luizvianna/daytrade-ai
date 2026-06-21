import { useState, useEffect, useCallback } from "react";

const PROXY = "https://daytrade-proxy.onrender.com";

function fmtMoney(v) {
  return v !== null && v !== undefined ? `R$ ${Number(v).toFixed(2)}` : "—";
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
      {s.icon} {rec || "—"}
    </span>
  );
}

// Avalia se a recomendação "acertou" comparando preço na época vs agora
function avaliarResultado(item) {
  if (!item.precoAtual || !item.precoNoMomento) return null;
  const variacao = ((item.precoAtual - item.precoNoMomento) / item.precoNoMomento) * 100;

  if (item.recomendacao === "COMPRAR") {
    return { acertou: variacao > 0, variacao, texto: variacao > 0 ? "Subiu desde a recomendação" : "Caiu desde a recomendação" };
  }
  if (item.recomendacao === "EVITAR") {
    return { acertou: variacao <= 0, variacao, texto: variacao <= 0 ? "Evitou queda corretamente" : "Subiu mesmo sendo recomendado evitar" };
  }
  return { acertou: null, variacao, texto: "Recomendação neutra (aguardar)" };
}

function HistoricoCard({ item }) {
  const resultado = avaliarResultado(item);
  const corResultado = resultado?.acertou === true ? "#00e5a0" : resultado?.acertou === false ? "#ff4d6d" : "#888";

  return (
    <div style={{ background: "#0d1320", border: "1px solid #1e2d45", borderRadius: "12px", padding: "14px", marginBottom: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
            <span style={{ color: "#fff", fontWeight: "700", fontSize: "15px", fontFamily: "monospace" }}>{item.ativo}</span>
            <RecomendacaoBadge rec={item.recomendacao} />
            <span style={{ color: "#444", fontSize: "10px", background: "#111a27", borderRadius: "4px", padding: "1px 6px" }}>
              {item.origem === "score" ? "⭐ Score" : item.origem === "chat" ? "💬 Chat" : item.origem}
            </span>
            {item.horizonte && (
              <span style={{ color: "#6af", fontSize: "10px", background: "#6af11", borderRadius: "4px", padding: "1px 6px" }}>
                {item.horizonte}
              </span>
            )}
          </div>
          <div style={{ color: "#555", fontSize: "11px" }}>{new Date(item.criadoEm).toLocaleString("pt-BR")}</div>
        </div>
        {item.score !== null && (
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#ffd60a", fontSize: "18px", fontWeight: "700", fontFamily: "monospace" }}>{item.score.toFixed(1)}</div>
            <div style={{ color: "#444", fontSize: "9px" }}>SCORE</div>
          </div>
        )}
      </div>

      {item.analise && (
        <p style={{ color: "#999", fontSize: "12px", lineHeight: "1.6", marginBottom: "10px" }}>{item.analise}</p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
        <div style={{ background: "#111a27", borderRadius: "8px", padding: "8px 10px" }}>
          <div style={{ color: "#444", fontSize: "9px", fontFamily: "monospace" }}>PREÇO NA ÉPOCA</div>
          <div style={{ color: "#ccc", fontSize: "13px", fontWeight: "700", fontFamily: "monospace" }}>{fmtMoney(item.precoNoMomento)}</div>
        </div>
        <div style={{ background: "#111a27", borderRadius: "8px", padding: "8px 10px" }}>
          <div style={{ color: "#444", fontSize: "9px", fontFamily: "monospace" }}>PREÇO ATUAL</div>
          <div style={{ color: "#fff", fontSize: "13px", fontWeight: "700", fontFamily: "monospace" }}>
            {item.precoAtual ? fmtMoney(item.precoAtual) : "..."}
          </div>
        </div>
        <div style={{ background: "#111a27", borderRadius: "8px", padding: "8px 10px" }}>
          <div style={{ color: "#444", fontSize: "9px", fontFamily: "monospace" }}>VARIAÇÃO</div>
          <div style={{ color: resultado?.variacao >= 0 ? "#00e5a0" : "#ff4d6d", fontSize: "13px", fontWeight: "700", fontFamily: "monospace" }}>
            {resultado ? `${resultado.variacao >= 0 ? "+" : ""}${resultado.variacao.toFixed(2)}%` : "..."}
          </div>
        </div>
      </div>

      {resultado && resultado.acertou !== null && (
        <div style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "14px" }}>{resultado.acertou ? "✅" : "❌"}</span>
          <span style={{ color: corResultado, fontSize: "11px" }}>{resultado.texto}</span>
        </div>
      )}
    </div>
  );
}

export default function Historico() {
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(true);
  const [precos, setPrecos] = useState({});
  const [filtroOrigem, setFiltroOrigem] = useState("Todos");

  const carregarHistorico = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${PROXY}/api/historico`);
      const data = await r.json();
      if (data.success) {
        setHistorico(data.data);
        // Busca preços atuais de todos os ativos únicos
        const ativosUnicos = [...new Set(data.data.map(h => h.ativo))];
        if (ativosUnicos.length) {
          const pr = await fetch(`${PROXY}/api/prices?tickers=${ativosUnicos.join(",")}`);
          setPrecos(await pr.json());
        }
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { carregarHistorico(); }, [carregarHistorico]);

  const historicoComPreco = historico.map(h => ({
    ...h,
    precoAtual: precos[h.ativo]?.price || null,
  }));

  const origens = ["Todos", "score", "chat"];
  const filtrado = filtroOrigem === "Todos" ? historicoComPreco : historicoComPreco.filter(h => h.origem === filtroOrigem);

  // Estatísticas de acerto
  const comResultado = historicoComPreco.map(h => avaliarResultado(h)).filter(r => r && r.acertou !== null);
  const acertos = comResultado.filter(r => r.acertou).length;
  const taxaAcerto = comResultado.length > 0 ? ((acertos / comResultado.length) * 100).toFixed(0) : null;

  return (
    <div style={{ padding: "14px", maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ marginBottom: "16px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "4px" }}>📋 <span style={{ color: "#00e5a0" }}>Histórico</span> de Recomendações</h2>
        <p style={{ color: "#444", fontSize: "12px" }}>Acompanhe o que a IA recomendou e o que aconteceu depois</p>
      </div>

      {taxaAcerto !== null && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "10px", marginBottom: "16px" }}>
          <div style={{ background: "#0d1320", border: "1px solid #1e2d45", borderRadius: "10px", padding: "12px", textAlign: "center" }}>
            <div style={{ color: "#444", fontSize: "9px", fontFamily: "monospace" }}>TAXA DE ACERTO</div>
            <div style={{ color: taxaAcerto >= 50 ? "#00e5a0" : "#ff4d6d", fontSize: "22px", fontWeight: "700" }}>{taxaAcerto}%</div>
          </div>
          <div style={{ background: "#0d1320", border: "1px solid #1e2d45", borderRadius: "10px", padding: "12px", textAlign: "center" }}>
            <div style={{ color: "#444", fontSize: "9px", fontFamily: "monospace" }}>AVALIADAS</div>
            <div style={{ color: "#fff", fontSize: "22px", fontWeight: "700" }}>{comResultado.length}</div>
          </div>
          <div style={{ background: "#0d1320", border: "1px solid #1e2d45", borderRadius: "10px", padding: "12px", textAlign: "center" }}>
            <div style={{ color: "#444", fontSize: "9px", fontFamily: "monospace" }}>TOTAL</div>
            <div style={{ color: "#fff", fontSize: "22px", fontWeight: "700" }}>{historico.length}</div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: "4px", background: "#0d1320", border: "1px solid #1e2d45", borderRadius: "10px", padding: "4px", marginBottom: "14px" }}>
        {origens.map(o => (
          <button key={o} onClick={() => setFiltroOrigem(o)}
            style={{ flex: 1, background: filtroOrigem === o ? "#00e5a022" : "transparent", border: filtroOrigem === o ? "1px solid #00e5a044" : "1px solid transparent", color: filtroOrigem === o ? "#00e5a0" : "#555", borderRadius: "7px", padding: "8px", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>
            {o === "Todos" ? "Todos" : o === "score" ? "⭐ Score" : "💬 Chat"}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#00e5a0" }}>⏳ Carregando histórico...</div>
      ) : filtrado.length === 0 ? (
        <div style={{ background: "#0d1320", border: "1px solid #1e2d45", borderRadius: "12px", padding: "40px", textAlign: "center" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>📋</div>
          <div style={{ color: "#444", fontSize: "14px", marginBottom: "8px" }}>Nenhuma recomendação salva ainda</div>
          <div style={{ color: "#333", fontSize: "12px" }}>Use o Score para começar a construir seu histórico</div>
        </div>
      ) : (
        filtrado.map(item => <HistoricoCard key={item.id} item={item} />)
      )}

      <div style={{ padding: "10px 14px", background: "#0d1320", border: "1px solid #1e2d45", borderRadius: "10px", marginTop: "12px" }}>
        <span style={{ color: "#444", fontSize: "11px" }}>
          📊 Compara o preço no momento da recomendação com o preço atual · Últimas 100 recomendações
        </span>
      </div>
    </div>
  );
}

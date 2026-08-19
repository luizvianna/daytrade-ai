import { useState, useEffect, useCallback } from "react";
import { authFetch } from "./supabaseClient";

const PROXY = "https://daytrade-proxy.onrender.com";

function paleta(tema) {
  if (tema === "claro") {
    return { card: "#FFFFFF", cardInner: "#F4F7FA", border: "#E2E8F0", textPrimary: "#172033", textSecondary: "#64748B", textFaint: "#94A3B8" };
  }
  return { card: "#0d1320", cardInner: "#111a27", border: "#1e2d45", textPrimary: "#fff", textSecondary: "#999", textFaint: "#444" };
}

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

function OrdemStatusBadge({ status }) {
  const map = {
    pendente: { bg: "#ffd60a22", border: "#ffd60a", text: "#ffd60a", icon: "⏳", label: "PENDENTE" },
    executada: { bg: "#00e5a022", border: "#00e5a0", text: "#00e5a0", icon: "✅", label: "EXECUTADA" },
    cancelada: { bg: "#ff4d6d22", border: "#ff4d6d", text: "#ff4d6d", icon: "✕", label: "CANCELADA" },
  };
  const s = map[status] || map.pendente;
  return (
    <span style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.text, borderRadius: "6px", padding: "2px 8px", fontSize: "10px", fontWeight: "700", fontFamily: "monospace" }}>
      {s.icon} {s.label}
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

function HistoricoCard({ item, cores }) {
  const resultado = avaliarResultado(item);
  const corResultado = resultado?.acertou === true ? "#00e5a0" : resultado?.acertou === false ? "#ff4d6d" : cores.textSecondary;

  return (
    <div style={{ background: cores.card, border: `1px solid ${cores.border}`, borderRadius: "12px", padding: "14px", marginBottom: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
            <span style={{ color: cores.textPrimary, fontWeight: "700", fontSize: "15px", fontFamily: "monospace" }}>{item.ativo}</span>
            <RecomendacaoBadge rec={item.recomendacao} />
            <span style={{ color: cores.textFaint, fontSize: "10px", background: cores.cardInner, borderRadius: "4px", padding: "1px 6px" }}>
              {item.origem === "score" ? "⭐ Score" : item.origem === "chat" ? "💬 Chat" : item.origem}
            </span>
            {item.horizonte && (
              <span style={{ color: "#6af", fontSize: "10px", background: "#6af11", borderRadius: "4px", padding: "1px 6px" }}>
                {item.horizonte}
              </span>
            )}
          </div>
          <div style={{ color: cores.textFaint, fontSize: "11px" }}>{new Date(item.criadoEm).toLocaleString("pt-BR")}</div>
        </div>
        {item.score !== null && (
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#ffd60a", fontSize: "18px", fontWeight: "700", fontFamily: "monospace" }}>{item.score.toFixed(1)}</div>
            <div style={{ color: cores.textFaint, fontSize: "9px" }}>SCORE</div>
          </div>
        )}
      </div>

      {item.analise && (
        <p style={{ color: cores.textSecondary, fontSize: "12px", lineHeight: "1.6", marginBottom: "10px" }}>{item.analise}</p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
        <div style={{ background: cores.cardInner, borderRadius: "8px", padding: "8px 10px" }}>
          <div style={{ color: cores.textFaint, fontSize: "9px", fontFamily: "monospace" }}>PREÇO NA ÉPOCA</div>
          <div style={{ color: cores.textSecondary, fontSize: "13px", fontWeight: "700", fontFamily: "monospace" }}>{fmtMoney(item.precoNoMomento)}</div>
        </div>
        <div style={{ background: cores.cardInner, borderRadius: "8px", padding: "8px 10px" }}>
          <div style={{ color: cores.textFaint, fontSize: "9px", fontFamily: "monospace" }}>PREÇO ATUAL</div>
          <div style={{ color: cores.textPrimary, fontSize: "13px", fontWeight: "700", fontFamily: "monospace" }}>
            {item.precoAtual ? fmtMoney(item.precoAtual) : "..."}
          </div>
        </div>
        <div style={{ background: cores.cardInner, borderRadius: "8px", padding: "8px 10px" }}>
          <div style={{ color: cores.textFaint, fontSize: "9px", fontFamily: "monospace" }}>VARIAÇÃO</div>
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

function OrdemCard({ ordem, onCancelar, cancelando, cores }) {
  const isCompra = ordem.tipo === "compra";
  return (
    <div style={{ background: cores.card, border: `1px solid ${cores.border}`, borderRadius: "12px", padding: "14px", marginBottom: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
            <span style={{ color: cores.textPrimary, fontWeight: "700", fontSize: "15px", fontFamily: "monospace" }}>{ordem.ativo}</span>
            <span style={{
              background: isCompra ? "#00e5a022" : "#ff4d6d22",
              border: `1px solid ${isCompra ? "#00e5a0" : "#ff4d6d"}`,
              color: isCompra ? "#00e5a0" : "#ff4d6d",
              borderRadius: "6px", padding: "2px 8px", fontSize: "10px", fontWeight: "700", fontFamily: "monospace"
            }}>
              {isCompra ? "▲ COMPRA" : "▼ VENDA"}
            </span>
            <OrdemStatusBadge status={ordem.status} />
          </div>
          <div style={{ color: cores.textFaint, fontSize: "11px" }}>{new Date(ordem.criado_em).toLocaleString("pt-BR")}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: ordem.status === "pendente" ? "12px" : 0 }}>
        <div style={{ background: cores.cardInner, borderRadius: "8px", padding: "8px 10px" }}>
          <div style={{ color: cores.textFaint, fontSize: "9px", fontFamily: "monospace" }}>QUANTIDADE</div>
          <div style={{ color: cores.textSecondary, fontSize: "13px", fontWeight: "700", fontFamily: "monospace" }}>{ordem.quantidade}</div>
        </div>
        <div style={{ background: cores.cardInner, borderRadius: "8px", padding: "8px 10px" }}>
          <div style={{ color: cores.textFaint, fontSize: "9px", fontFamily: "monospace" }}>PREÇO</div>
          <div style={{ color: cores.textPrimary, fontSize: "13px", fontWeight: "700", fontFamily: "monospace" }}>
            {ordem.preco_tipo === "mercado" ? "A mercado" : fmtMoney(ordem.preco_limite)}
          </div>
        </div>
      </div>

      {ordem.status === "pendente" && (
        <button
          onClick={() => onCancelar(ordem.id)}
          disabled={cancelando === ordem.id}
          style={{ width: "100%", background: "#ff4d6d15", border: "1px solid #ff4d6d33", color: "#ff4d6d", borderRadius: "8px", padding: "9px", fontSize: "12px", fontWeight: "700", cursor: cancelando === ordem.id ? "not-allowed" : "pointer" }}>
          {cancelando === ordem.id ? "Cancelando..." : "✕ Cancelar Ordem"}
        </button>
      )}
    </div>
  );
}

export default function Historico({ tema = "escuro" }) {
  const cores = paleta(tema);
  const [viewTab, setViewTab] = useState("recomendacoes"); // "recomendacoes" | "ordens"

  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(true);
  const [precos, setPrecos] = useState({});
  const [filtroOrigem, setFiltroOrigem] = useState("Todos");

  const [ordens, setOrdens] = useState([]);
  const [loadingOrdens, setLoadingOrdens] = useState(true);
  const [cancelando, setCancelando] = useState(null);

  const carregarHistorico = useCallback(async () => {
    setLoading(true);
    try {
      const r = await authFetch(`${PROXY}/api/historico`);
      const data = await r.json();
      if (data.success) {
        setHistorico(data.data);
        const ativosUnicos = [...new Set(data.data.map(h => h.ativo))];
        if (ativosUnicos.length) {
          const pr = await fetch(`${PROXY}/api/prices?tickers=${ativosUnicos.join(",")}`);
          setPrecos(await pr.json());
        }
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  const carregarOrdens = useCallback(async () => {
    setLoadingOrdens(true);
    try {
      const r = await authFetch(`${PROXY}/api/ordens`);
      const data = await r.json();
      if (data.success) setOrdens(data.data);
    } catch (e) { console.error(e); }
    setLoadingOrdens(false);
  }, []);

  useEffect(() => { carregarHistorico(); carregarOrdens(); }, [carregarHistorico, carregarOrdens]);

  const cancelarOrdem = async (id) => {
    setCancelando(id);
    try {
      const r = await authFetch(`${PROXY}/api/ordens/${id}`, { method: "DELETE" });
      const data = await r.json();
      if (data.success) {
        setOrdens(prev => prev.map(o => o.id === id ? { ...o, status: "cancelada" } : o));
      }
    } catch (e) { console.error(e); }
    setCancelando(null);
  };

  const historicoComPreco = historico.map(h => ({
    ...h,
    precoAtual: precos[h.ativo]?.price || null,
  }));

  const origens = ["Todos", "score", "chat"];
  const filtrado = filtroOrigem === "Todos" ? historicoComPreco : historicoComPreco.filter(h => h.origem === filtroOrigem);

  const comResultado = historicoComPreco.map(h => avaliarResultado(h)).filter(r => r && r.acertou !== null);
  const acertos = comResultado.filter(r => r.acertou).length;
  const taxaAcerto = comResultado.length > 0 ? ((acertos / comResultado.length) * 100).toFixed(0) : null;

  const ordensPendentes = ordens.filter(o => o.status === "pendente").length;

  return (
    <div style={{ padding: "14px", maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ marginBottom: "16px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "4px", color: cores.textPrimary }}>📋 <span style={{ color: "#00e5a0" }}>Histórico</span></h2>
        <p style={{ color: cores.textFaint, fontSize: "12px" }}>Recomendações da IA e suas ordens de compra/venda</p>
      </div>

      {/* Alterna entre Recomendações e Ordens */}
      <div style={{ display: "flex", gap: "4px", background: cores.card, border: `1px solid ${cores.border}`, borderRadius: "10px", padding: "4px", marginBottom: "16px" }}>
        <button onClick={() => setViewTab("recomendacoes")}
          style={{ flex: 1, background: viewTab === "recomendacoes" ? "#00e5a022" : "transparent", border: viewTab === "recomendacoes" ? "1px solid #00e5a044" : "1px solid transparent", color: viewTab === "recomendacoes" ? "#00e5a0" : cores.textSecondary, borderRadius: "7px", padding: "9px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}>
          📋 Recomendações
        </button>
        <button onClick={() => setViewTab("ordens")}
          style={{ flex: 1, background: viewTab === "ordens" ? "#00e5a022" : "transparent", border: viewTab === "ordens" ? "1px solid #00e5a044" : "1px solid transparent", color: viewTab === "ordens" ? "#00e5a0" : cores.textSecondary, borderRadius: "7px", padding: "9px", fontSize: "12px", fontWeight: "700", cursor: "pointer", position: "relative" }}>
          💰 Ordens {ordensPendentes > 0 && <span style={{ background: "#ffd60a", color: "#000", borderRadius: "10px", padding: "1px 6px", fontSize: "10px", marginLeft: "4px" }}>{ordensPendentes}</span>}
        </button>
      </div>

      {viewTab === "recomendacoes" && (
        <>
          {taxaAcerto !== null && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "10px", marginBottom: "16px" }}>
              <div style={{ background: cores.card, border: `1px solid ${cores.border}`, borderRadius: "10px", padding: "12px", textAlign: "center" }}>
                <div style={{ color: cores.textFaint, fontSize: "9px", fontFamily: "monospace" }}>TAXA DE ACERTO</div>
                <div style={{ color: taxaAcerto >= 50 ? "#00e5a0" : "#ff4d6d", fontSize: "22px", fontWeight: "700" }}>{taxaAcerto}%</div>
              </div>
              <div style={{ background: cores.card, border: `1px solid ${cores.border}`, borderRadius: "10px", padding: "12px", textAlign: "center" }}>
                <div style={{ color: cores.textFaint, fontSize: "9px", fontFamily: "monospace" }}>AVALIADAS</div>
                <div style={{ color: cores.textPrimary, fontSize: "22px", fontWeight: "700" }}>{comResultado.length}</div>
              </div>
              <div style={{ background: cores.card, border: `1px solid ${cores.border}`, borderRadius: "10px", padding: "12px", textAlign: "center" }}>
                <div style={{ color: cores.textFaint, fontSize: "9px", fontFamily: "monospace" }}>TOTAL</div>
                <div style={{ color: cores.textPrimary, fontSize: "22px", fontWeight: "700" }}>{historico.length}</div>
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: "4px", background: cores.card, border: `1px solid ${cores.border}`, borderRadius: "10px", padding: "4px", marginBottom: "14px" }}>
            {origens.map(o => (
              <button key={o} onClick={() => setFiltroOrigem(o)}
                style={{ flex: 1, background: filtroOrigem === o ? "#00e5a022" : "transparent", border: filtroOrigem === o ? "1px solid #00e5a044" : "1px solid transparent", color: filtroOrigem === o ? "#00e5a0" : cores.textSecondary, borderRadius: "7px", padding: "8px", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>
                {o === "Todos" ? "Todos" : o === "score" ? "⭐ Score" : "💬 Chat"}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#00e5a0" }}>⏳ Carregando histórico...</div>
          ) : filtrado.length === 0 ? (
            <div style={{ background: cores.card, border: `1px solid ${cores.border}`, borderRadius: "12px", padding: "40px", textAlign: "center" }}>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>📋</div>
              <div style={{ color: cores.textFaint, fontSize: "14px", marginBottom: "8px" }}>Nenhuma recomendação salva ainda</div>
              <div style={{ color: cores.textFaint, fontSize: "12px" }}>Use o Score para começar a construir seu histórico</div>
            </div>
          ) : (
            filtrado.map(item => <HistoricoCard key={item.id} item={item} cores={cores} />)
          )}

          <div style={{ padding: "10px 14px", background: cores.card, border: `1px solid ${cores.border}`, borderRadius: "10px", marginTop: "12px" }}>
            <span style={{ color: cores.textFaint, fontSize: "11px" }}>
              📊 Compara o preço no momento da recomendação com o preço atual · Últimas 100 recomendações
            </span>
          </div>
        </>
      )}

      {viewTab === "ordens" && (
        <>
          {loadingOrdens ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#00e5a0" }}>⏳ Carregando ordens...</div>
          ) : ordens.length === 0 ? (
            <div style={{ background: cores.card, border: `1px solid ${cores.border}`, borderRadius: "12px", padding: "40px", textAlign: "center" }}>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>💰</div>
              <div style={{ color: cores.textFaint, fontSize: "14px", marginBottom: "8px" }}>Nenhuma ordem enviada ainda</div>
              <div style={{ color: cores.textFaint, fontSize: "12px" }}>Use o botão "Enviar Ordem" na Bolsa pra começar</div>
            </div>
          ) : (
            ordens.map(o => <OrdemCard key={o.id} ordem={o} onCancelar={cancelarOrdem} cancelando={cancelando} cores={cores} />)
          )}

          <div style={{ padding: "10px 14px", background: cores.card, border: `1px solid ${cores.border}`, borderRadius: "10px", marginTop: "12px" }}>
            <span style={{ color: cores.textFaint, fontSize: "11px" }}>
              💰 Ordens pendentes ainda não foram executadas de verdade — aguardando integração com corretora
            </span>
          </div>
        </>
      )}
    </div>
  );
}

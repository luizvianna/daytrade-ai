import { useState, useEffect, useCallback, useRef } from "react";

const PROXY = "https://daytrade-proxy.onrender.com";
const STORAGE_KEY = "tradeai_alertas";

const EMAILJS_SERVICE_ID = "service_ihson4a";
const EMAILJS_TEMPLATE_ID = "kjk77se";
const EMAILJS_PUBLIC_KEY = process.env.REACT_APP_EMAILJS_KEY || "";

const TODOS_ATIVOS = [
  "PETR4","VALE3","ITUB4","BBDC4","MGLU3","WEGE3","ABEV3","B3SA3",
  "RENT3","SUZB3","GGBR4","EMBR3","RADL3","EQTL3","SBSP3","VIVT3",
  "HGLG11","KNRI11","MXRF11","XPML11","BCFF11","VISC11","IRDM11",
  "IVVB11","BOVA11","HASH11","SMAL11","DIVO11",
  "BTC-USD","ETH-USD","BNB-USD","SOL-USD",
];

function salvarAlertas(alertas) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alertas));
}

function carregarAlertas() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

async function sendEmail(params) {
  if (!EMAILJS_PUBLIC_KEY) return false;
  try {
    const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_PUBLIC_KEY,
        template_params: { ...params, horario: new Date().toLocaleString("pt-BR") },
      }),
    });
    return res.ok;
  } catch { return false; }
}

function fmt(v) { return v !== undefined && v !== null ? `R$ ${Number(v).toFixed(2)}` : "—"; }

// ── Componente de alerta disparado ───────────────────────────────
function AlertaNotificacao({ alerta, onDismiss }) {
  useEffect(() => { const t = setTimeout(onDismiss, 10000); return () => clearTimeout(t); }, [onDismiss]);
  const cor = alerta.tipo === "subiu" ? "#00e5a0" : alerta.tipo === "caiu" ? "#ff4d6d" : "#ffd60a";
  return (
    <div style={{ position: "fixed", top: "70px", right: "12px", left: "12px", zIndex: 9999, background: "#0d1320", border: `2px solid ${cor}`, borderRadius: "14px", padding: "16px", boxShadow: `0 8px 32px ${cor}44`, maxWidth: "400px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ color: cor, fontWeight: "700", fontSize: "14px", marginBottom: "4px" }}>
            {alerta.tipo === "subiu" ? "📈" : alerta.tipo === "caiu" ? "📉" : "🔔"} ALERTA DISPARADO!
          </div>
          <div style={{ color: "#fff", fontSize: "16px", fontWeight: "700", fontFamily: "monospace" }}>{alerta.ativo}</div>
          <div style={{ color: "#aaa", fontSize: "13px", marginTop: "4px" }}>{alerta.mensagem}</div>
          <div style={{ color: cor, fontSize: "18px", fontWeight: "700", fontFamily: "monospace", marginTop: "6px" }}>{fmt(alerta.precoAtual)}</div>
        </div>
        <button onClick={onDismiss} style={{ background: "none", border: "none", color: "#444", cursor: "pointer", fontSize: "20px" }}>×</button>
      </div>
    </div>
  );
}

// ── Card de alerta ────────────────────────────────────────────────
function AlertaCard({ alerta, precoAtual, onDelete, onToggle }) {
  const ativo = alerta.ativo;
  const preco = precoAtual || 0;
  const diff = alerta.tipo === "preco_exato"
    ? ((preco - alerta.valor) / alerta.valor * 100).toFixed(2)
    : null;
  const cor = alerta.disparado ? "#555" : alerta.ativo ? "#00e5a0" : "#ffd60a";
  const progressoPct = alerta.tipo === "preco_exato" && preco && alerta.valor
    ? Math.min(100, Math.abs((preco / alerta.valor) * 100))
    : null;

  return (
    <div style={{ background: "#0d1320", border: `1px solid ${alerta.disparado ? "#1e2d45" : cor + "44"}`, borderRadius: "12px", padding: "14px", marginBottom: "10px", opacity: alerta.disparado ? 0.6 : 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span style={{ color: "#fff", fontWeight: "700", fontSize: "15px", fontFamily: "monospace" }}>{ativo}</span>
            <span style={{ background: `${cor}22`, color: cor, border: `1px solid ${cor}44`, borderRadius: "4px", padding: "2px 8px", fontSize: "10px", fontFamily: "monospace", fontWeight: "700" }}>
              {alerta.tipo === "preco_exato" ? "💰 PREÇO EXATO" : alerta.direcao === "sobe" ? "📈 SUBIDA %" : "📉 QUEDA %"}
            </span>
            {alerta.disparado && <span style={{ background: "#00e5a022", color: "#00e5a0", borderRadius: "4px", padding: "2px 8px", fontSize: "10px", fontFamily: "monospace" }}>✅ DISPARADO</span>}
          </div>
          <div style={{ color: "#aaa", fontSize: "12px" }}>
            {alerta.tipo === "preco_exato"
              ? `Alerta quando atingir ${fmt(alerta.valor)}`
              : `Alerta quando ${alerta.direcao === "sobe" ? "subir" : "cair"} ${alerta.valor}%`
            }
          </div>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          <button onClick={() => onToggle(alerta.id)}
            style={{ background: alerta.ativo ? "#00e5a022" : "#111a27", border: `1px solid ${alerta.ativo ? "#00e5a044" : "#1e2d45"}`, color: alerta.ativo ? "#00e5a0" : "#555", borderRadius: "6px", padding: "4px 10px", fontSize: "11px", cursor: "pointer" }}>
            {alerta.ativo ? "ON" : "OFF"}
          </button>
          <button onClick={() => onDelete(alerta.id)}
            style={{ background: "#ff4d6d22", border: "1px solid #ff4d6d44", color: "#ff4d6d", borderRadius: "6px", padding: "4px 10px", fontSize: "11px", cursor: "pointer" }}>
            🗑️
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
        <div style={{ background: "#111a27", borderRadius: "8px", padding: "8px 10px" }}>
          <div style={{ color: "#444", fontSize: "9px", fontFamily: "monospace" }}>PREÇO ATUAL</div>
          <div style={{ color: "#fff", fontSize: "14px", fontWeight: "700", fontFamily: "monospace" }}>{preco ? fmt(preco) : "..."}</div>
        </div>
        <div style={{ background: "#111a27", borderRadius: "8px", padding: "8px 10px" }}>
          <div style={{ color: "#444", fontSize: "9px", fontFamily: "monospace" }}>ALVO</div>
          <div style={{ color: cor, fontSize: "14px", fontWeight: "700", fontFamily: "monospace" }}>
            {alerta.tipo === "preco_exato" ? fmt(alerta.valor) : `${alerta.direcao === "sobe" ? "+" : "-"}${alerta.valor}%`}
          </div>
        </div>
        <div style={{ background: "#111a27", borderRadius: "8px", padding: "8px 10px" }}>
          <div style={{ color: "#444", fontSize: "9px", fontFamily: "monospace" }}>DISTÂNCIA</div>
          <div style={{ color: diff >= 0 ? "#00e5a0" : "#ff4d6d", fontSize: "14px", fontWeight: "700", fontFamily: "monospace" }}>
            {alerta.tipo === "preco_exato" && diff !== null ? `${diff >= 0 ? "+" : ""}${diff}%` : "—"}
          </div>
        </div>
      </div>

      {alerta.tipo === "preco_exato" && progressoPct && (
        <div style={{ marginTop: "10px" }}>
          <div style={{ height: "4px", background: "#1e2d45", borderRadius: "2px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.min(progressoPct, 100)}%`, background: cor, borderRadius: "2px", transition: "width 0.5s" }} />
          </div>
        </div>
      )}

      <div style={{ color: "#333", fontSize: "10px", fontFamily: "monospace", marginTop: "8px" }}>
        Criado: {alerta.criadoEm} {alerta.disparadoEm && `· Disparado: ${alerta.disparadoEm}`}
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────
export default function Alertas() {
  const [alertas, setAlertas] = useState(carregarAlertas);
  const [historico, setHistorico] = useState([]);
  const [precos, setPrecos] = useState({});
  const [notificacao, setNotificacao] = useState(null);
  const [monitorando, setMonitorando] = useState(false);

  // Form
  const [novoAtivo, setNovoAtivo] = useState("PETR4");
  const [novoTipo, setNovoTipo] = useState("preco_exato");
  const [novoDirecao, setNovoDirecao] = useState("sobe");
  const [novoValor, setNovoValor] = useState("");
  const [novoEmail, setNovoEmail] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [aba, setAba] = useState("ativos");

  const alertasRef = useRef(alertas);
  alertasRef.current = alertas;

  // Buscar preços
  const fetchPrecos = useCallback(async () => {
    const ativos = [...new Set(alertasRef.current.map(a => a.ativo))];
    if (!ativos.length) return;
    try {
      const res = await fetch(`${PROXY}/api/prices?tickers=${ativos.join(",")}`);
      const data = await res.json();
      setPrecos(prev => ({ ...prev, ...data }));
      return data;
    } catch (e) { console.error(e); }
  }, []);

  // Verificar alertas
  const verificarAlertas = useCallback(async () => {
    const data = await fetchPrecos();
    if (!data) return;

    const agora = new Date().toLocaleTimeString("pt-BR");
    let atualizados = false;

    const novosAlertas = alertasRef.current.map(alerta => {
      if (!alerta.ativo || alerta.disparado) return alerta;
      const precoAtual = data[alerta.ativo]?.price;
      if (!precoAtual) return alerta;

      let disparar = false;
      let tipo = "";
      let mensagem = "";

      if (alerta.tipo === "preco_exato") {
        const diff = Math.abs((precoAtual - alerta.valor) / alerta.valor * 100);
        if (diff <= 0.5) { // Dentro de 0.5% do alvo
          disparar = true;
          tipo = precoAtual >= alerta.valor ? "subiu" : "caiu";
          mensagem = `Atingiu o preço alvo de ${fmt(alerta.valor)}`;
        }
      } else if (alerta.tipo === "variacao_pct") {
        const variacao = data[alerta.ativo]?.change || 0;
        if (alerta.direcao === "sobe" && variacao >= alerta.valor) {
          disparar = true; tipo = "subiu";
          mensagem = `Subiu ${variacao.toFixed(2)}% (alvo: +${alerta.valor}%)`;
        } else if (alerta.direcao === "cai" && variacao <= -alerta.valor) {
          disparar = true; tipo = "caiu";
          mensagem = `Caiu ${Math.abs(variacao).toFixed(2)}% (alvo: -${alerta.valor}%)`;
        }
      }

      if (disparar) {
        atualizados = true;
        const alertaDisparado = { ...alerta, disparado: true, disparadoEm: agora, precoDisparo: precoAtual };

        setHistorico(prev => [{ ...alertaDisparado, tipo, mensagem, precoAtual }, ...prev].slice(0, 20));
        setNotificacao({ ativo: alerta.ativo, tipo, mensagem, precoAtual });

        if (alerta.email) {
          sendEmail({
            tipo_sinal: `🔔 ALERTA: ${alerta.ativo}`,
            ativo: alerta.ativo,
            preco: fmt(precoAtual),
            stop_loss: "—",
            take_profit: fmt(alerta.tipo === "preco_exato" ? alerta.valor : precoAtual),
            confianca: "—",
            analise: mensagem,
          });
        }

        return alertaDisparado;
      }
      return alerta;
    });

    if (atualizados) {
      setAlertas(novosAlertas);
      salvarAlertas(novosAlertas);
    }
  }, [fetchPrecos]);

  // Monitoramento automático
  useEffect(() => {
    if (!monitorando) return;
    verificarAlertas();
    const interval = setInterval(verificarAlertas, 30000);
    return () => clearInterval(interval);
  }, [monitorando, verificarAlertas]);

  // Inicia monitoramento se há alertas ativos
  useEffect(() => {
    const temAtivos = alertas.some(a => a.ativo && !a.disparado);
    setMonitorando(temAtivos);
  }, [alertas]);

  const criarAlerta = () => {
    if (!novoValor || isNaN(parseFloat(novoValor))) return;
    setSalvando(true);

    const novoAlerta = {
      id: Date.now(),
      ativo: novoAtivo,
      tipo: novoTipo,
      direcao: novoDirecao,
      valor: parseFloat(novoValor),
      email: novoEmail,
      ativo: true,
      disparado: false,
      criadoEm: new Date().toLocaleString("pt-BR"),
      disparadoEm: null,
    };

    const novos = [novoAlerta, ...alertas];
    setAlertas(novos);
    salvarAlertas(novos);
    setNovoValor("");
    setSalvando(false);
    setAba("ativos");
  };

  const deletarAlerta = (id) => {
    const novos = alertas.filter(a => a.id !== id);
    setAlertas(novos);
    salvarAlertas(novos);
  };

  const toggleAlerta = (id) => {
    const novos = alertas.map(a => a.id === id ? { ...a, ativo: !a.ativo, disparado: false } : a);
    setAlertas(novos);
    salvarAlertas(novos);
  };

  const alertasAtivos = alertas.filter(a => a.ativo && !a.disparado);
  const alertasDisparados = alertas.filter(a => a.disparado);

  return (
    <div style={{ padding: "14px", maxWidth: "800px", margin: "0 auto" }}>
      <style>{`
        select, input { outline: none; }
        .tab-btn:hover { color: #aaa !important; }
      `}</style>

      {notificacao && <AlertaNotificacao alerta={notificacao} onDismiss={() => setNotificacao(null)} />}

      {/* Header */}
      <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "4px" }}>🔔 <span style={{ color: "#00e5a0" }}>Alertas</span> de Preço</h1>
          <p style={{ color: "#444", fontSize: "12px" }}>Monitoramento automático a cada 30 segundos</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: monitorando ? "#00e5a0" : "#555", animation: monitorando ? "pulse 2s infinite" : "none" }} />
          <span style={{ color: monitorando ? "#00e5a0" : "#555", fontSize: "11px", fontFamily: "monospace" }}>
            {monitorando ? `MONITORANDO (${alertasAtivos.length})` : "PARADO"}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "10px", marginBottom: "16px" }}>
        {[
          { label: "ATIVOS", value: alertasAtivos.length, color: "#00e5a0" },
          { label: "DISPARADOS", value: alertasDisparados.length, color: "#ffd60a" },
          { label: "TOTAL", value: alertas.length, color: "#fff" },
        ].map((s, i) => (
          <div key={i} style={{ background: "#0d1320", border: "1px solid #1e2d45", borderRadius: "10px", padding: "12px 14px", textAlign: "center" }}>
            <div style={{ color: "#444", fontSize: "9px", fontFamily: "monospace", marginBottom: "4px" }}>{s.label}</div>
            <div style={{ color: s.color, fontSize: "24px", fontWeight: "700" }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Abas */}
      <div style={{ display: "flex", gap: "4px", background: "#0d1320", border: "1px solid #1e2d45", borderRadius: "10px", padding: "4px", marginBottom: "14px" }}>
        {[
          { id: "ativos", label: `🔔 Ativos (${alertasAtivos.length})` },
          { id: "criar", label: "➕ Criar Alerta" },
          { id: "historico", label: `📋 Histórico (${alertasDisparados.length})` },
        ].map(tab => (
          <button key={tab.id} className="tab-btn" onClick={() => setAba(tab.id)}
            style={{ flex: 1, background: aba === tab.id ? "#00e5a015" : "transparent", border: aba === tab.id ? "1px solid #00e5a033" : "1px solid transparent", color: aba === tab.id ? "#00e5a0" : "#555", borderRadius: "7px", padding: "8px", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Aba: Alertas ativos */}
      {aba === "ativos" && (
        <div>
          {alertasAtivos.length === 0 ? (
            <div style={{ background: "#0d1320", border: "1px solid #1e2d45", borderRadius: "12px", padding: "40px", textAlign: "center" }}>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>🔕</div>
              <div style={{ color: "#444", fontSize: "14px", marginBottom: "8px" }}>Nenhum alerta ativo</div>
              <button onClick={() => setAba("criar")}
                style={{ background: "linear-gradient(135deg,#00e5a0,#00b07a)", color: "#000", border: "none", borderRadius: "8px", padding: "10px 20px", fontSize: "13px", fontWeight: "700", cursor: "pointer" }}>
                ➕ Criar primeiro alerta
              </button>
            </div>
          ) : (
            alertasAtivos.map(a => (
              <AlertaCard key={a.id} alerta={a} precoAtual={precos[a.ativo]?.price} onDelete={deletarAlerta} onToggle={toggleAlerta} />
            ))
          )}
        </div>
      )}

      {/* Aba: Criar alerta */}
      {aba === "criar" && (
        <div style={{ background: "#0d1320", border: "1px solid #1e2d45", borderRadius: "12px", padding: "20px" }}>
          <div style={{ color: "#444", fontSize: "10px", fontFamily: "monospace", letterSpacing: "0.1em", marginBottom: "16px" }}>NOVO ALERTA</div>

          {/* Ativo */}
          <div style={{ marginBottom: "12px" }}>
            <label style={{ display: "block", color: "#666", fontSize: "11px", marginBottom: "5px" }}>Ativo</label>
            <select value={novoAtivo} onChange={e => setNovoAtivo(e.target.value)}
              style={{ width: "100%", background: "#111a27", border: "1px solid #1e2d45", color: "#e0e6f0", borderRadius: "8px", padding: "10px 12px", fontSize: "14px", fontFamily: "monospace" }}>
              {TODOS_ATIVOS.map(a => <option key={a} value={a}>{a} {precos[a] ? `· R$${precos[a].price?.toFixed(2)}` : ""}</option>)}
            </select>
          </div>

          {/* Tipo */}
          <div style={{ marginBottom: "12px" }}>
            <label style={{ display: "block", color: "#666", fontSize: "11px", marginBottom: "5px" }}>Tipo de alerta</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {[{ v: "preco_exato", l: "💰 Preço exato" }, { v: "variacao_pct", l: "📊 Variação %" }].map(t => (
                <button key={t.v} onClick={() => setNovoTipo(t.v)}
                  style={{ background: novoTipo === t.v ? "#00e5a022" : "#111a27", border: `1px solid ${novoTipo === t.v ? "#00e5a0" : "#1e2d45"}`, color: novoTipo === t.v ? "#00e5a0" : "#666", borderRadius: "8px", padding: "10px", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}>
                  {t.l}
                </button>
              ))}
            </div>
          </div>

          {/* Direção (só para variação %) */}
          {novoTipo === "variacao_pct" && (
            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", color: "#666", fontSize: "11px", marginBottom: "5px" }}>Direção</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {[{ v: "sobe", l: "📈 Sobe X%" }, { v: "cai", l: "📉 Cai X%" }].map(d => (
                  <button key={d.v} onClick={() => setNovoDirecao(d.v)}
                    style={{ background: novoDirecao === d.v ? (d.v === "sobe" ? "#00e5a022" : "#ff4d6d22") : "#111a27", border: `1px solid ${novoDirecao === d.v ? (d.v === "sobe" ? "#00e5a0" : "#ff4d6d") : "#1e2d45"}`, color: novoDirecao === d.v ? (d.v === "sobe" ? "#00e5a0" : "#ff4d6d") : "#666", borderRadius: "8px", padding: "10px", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}>
                    {d.l}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Valor */}
          <div style={{ marginBottom: "12px" }}>
            <label style={{ display: "block", color: "#666", fontSize: "11px", marginBottom: "5px" }}>
              {novoTipo === "preco_exato" ? "Preço alvo (R$)" : `Variação alvo (%)`}
            </label>
            <input type="number" value={novoValor} onChange={e => setNovoValor(e.target.value)} step="0.01"
              placeholder={novoTipo === "preco_exato" ? "Ex: 45.50" : "Ex: 5"}
              style={{ width: "100%", background: "#111a27", border: "1px solid #1e2d45", color: "#e0e6f0", borderRadius: "8px", padding: "12px 14px", fontSize: "16px", fontFamily: "monospace" }} />
            {novoTipo === "preco_exato" && precos[novoAtivo]?.price && (
              <div style={{ color: "#555", fontSize: "11px", marginTop: "4px", fontFamily: "monospace" }}>
                Preço atual: R${precos[novoAtivo].price.toFixed(2)}
              </div>
            )}
          </div>

          {/* Email */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#111a27", borderRadius: "8px", padding: "10px 12px", marginBottom: "16px" }}>
            <div>
              <div style={{ color: "#888", fontSize: "12px" }}>📧 Notificação por email</div>
              <div style={{ color: "#444", fontSize: "10px" }}>Receber email quando disparar</div>
            </div>
            <button onClick={() => setNovoEmail(e => !e)}
              style={{ background: novoEmail ? "#00e5a022" : "#111a27", border: `1px solid ${novoEmail ? "#00e5a0" : "#1e2d45"}`, color: novoEmail ? "#00e5a0" : "#555", borderRadius: "6px", padding: "6px 14px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}>
              {novoEmail ? "ON ✓" : "OFF"}
            </button>
          </div>

          <button onClick={criarAlerta} disabled={!novoValor || salvando}
            style={{ width: "100%", background: !novoValor ? "#1e2d45" : "linear-gradient(135deg,#00e5a0,#00b07a)", color: !novoValor ? "#555" : "#000", border: "none", borderRadius: "10px", padding: "14px", fontSize: "15px", fontWeight: "700", cursor: !novoValor ? "not-allowed" : "pointer" }}>
            {salvando ? "⏳ Salvando..." : "🔔 Criar Alerta"}
          </button>
        </div>
      )}

      {/* Aba: Histórico */}
      {aba === "historico" && (
        <div>
          {alertasDisparados.length === 0 ? (
            <div style={{ background: "#0d1320", border: "1px solid #1e2d45", borderRadius: "12px", padding: "40px", textAlign: "center" }}>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>📋</div>
              <div style={{ color: "#444", fontSize: "14px" }}>Nenhum alerta disparado ainda</div>
            </div>
          ) : (
            alertasDisparados.map(a => (
              <AlertaCard key={a.id} alerta={a} precoAtual={precos[a.ativo]?.price} onDelete={deletarAlerta} onToggle={toggleAlerta} />
            ))
          )}
        </div>
      )}

      <div style={{ padding: "10px 14px", background: "#0d1320", border: "1px solid #1e2d45", borderRadius: "10px", marginTop: "14px" }}>
        <span style={{ color: "#444", fontSize: "11px" }}>
          💾 Alertas salvos no navegador · 🔄 Verificação a cada 30s · 📧 Email via EmailJS
        </span>
      </div>
    </div>
  );
}

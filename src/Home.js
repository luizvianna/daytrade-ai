import { useState, useEffect, useCallback } from "react";
import { carregarPerfil } from "./Perfil";

const PROXY = "https://daytrade-proxy.onrender.com";
// STORAGE_KEY mantido para compatibilidade temporária durante migração

const ATIVOS_RESUMO = ["PETR4","VALE3","ITUB4","HGLG11","IVVB11","BTC-USD"];

// Ticker usado como referência para o gráfico de rentabilidade (proxy do mercado)
const TICKER_REFERENCIA = "BOVA11";

const PERIODOS = [
  { id: "1d",  label: "1D", range: "1d",  interval: "5m"  },
  { id: "1s",  label: "1S", range: "5d",  interval: "30m" },
  { id: "1m",  label: "1M", range: "1mo", interval: "1d"  },
  { id: "6m",  label: "6M", range: "6mo", interval: "1d"  },
  { id: "1a",  label: "1A", range: "1y",  interval: "1wk" },
  { id: "tudo",label: "Tudo", range: "5y", interval: "1mo" },
];

const CONTA_DEFAULT = { saldoConta: 0, valorInvestido: 0, lancamentosFuturos: 0, conectado: false, corretora: "" };

async function salvarContaBanco(conta) {
  try {
    await fetch(`${PROXY}/api/conta`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(conta),
    });
  } catch (e) { console.error("Erro ao salvar conta:", e.message); }
}

function fmtMoney(v) {
  return `R$ ${Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── Gráfico de rentabilidade (linha ou candle) — sem <defs> para evitar bug removeChild ──
function RentabilidadeChart({ candles, tipo, width = 600, height = 200 }) {
  if (!candles || candles.length < 2) {
    return <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "#333", fontSize: "13px" }}>Carregando dados...</div>;
  }

  const pad = { l: 8, r: 8, t: 14, b: 22 };
  const w = width - pad.l - pad.r;
  const h = height - pad.t - pad.b;

  const closes = candles.map(c => c.close);
  const prices = candles.flatMap(c => [c.high, c.low]);
  const minP = Math.min(...prices), maxP = Math.max(...prices);
  const range = (maxP - minP) || 1;

  const first = closes[0];
  const last = closes[closes.length - 1];
  const positivo = last >= first;
  const corPrincipal = positivo ? "#00e5a0" : "#ff4d6d";

  const px = i => pad.l + (i / (candles.length - 1)) * w;
  const py = v => pad.t + h - ((v - minP) / range) * h;

  if (tipo === "linha") {
    const points = closes.map((v, i) => `${px(i)},${py(v)}`).join(" ");
    const areaPoints = `${px(0)},${py(minP)} ${points} ${px(closes.length - 1)},${py(minP)}`;
    return (
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
        {/* Área sob a linha — fill sólido semi-transparente, sem <defs> */}
        <polygon points={areaPoints} fill={corPrincipal} opacity="0.12" />
        <polyline points={points} fill="none" stroke={corPrincipal} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <line x1={pad.l} y1={py(first)} x2={width - pad.r} y2={py(first)} stroke="#ffffff22" strokeDasharray="4,4" />
      </svg>
    );
  }

  // Candle
  const cw = w / candles.length;
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
      <line x1={pad.l} y1={py(first)} x2={width - pad.r} y2={py(first)} stroke="#ffffff22" strokeDasharray="4,4" />
      {candles.map((c, i) => {
        const x = pad.l + i * cw + cw * 0.1;
        const bw = Math.max(1, cw * 0.8);
        const isUp = c.close >= c.open;
        const color = isUp ? "#00e5a0" : "#ff4d6d";
        const bodyTop = py(Math.max(c.open, c.close));
        const bodyH = Math.max(1, py(Math.min(c.open, c.close)) - bodyTop);
        const cx = x + bw / 2;
        return (
          <g key={i}>
            <line x1={cx} y1={py(c.high)} x2={cx} y2={py(c.low)} stroke={color} strokeWidth="1" />
            <rect x={x} y={bodyTop} width={bw} height={bodyH} fill={color} rx="1" />
          </g>
        );
      })}
    </svg>
  );
}

// ── Modal de edição de saldos ─────────────────────────────────────
function EditarContaModal({ conta, onSave, onClose }) {
  const [saldoConta, setSaldoConta] = useState(conta.saldoConta || "");
  const [valorInvestido, setValorInvestido] = useState(conta.valorInvestido || "");
  const [lancamentosFuturos, setLancamentosFuturos] = useState(conta.lancamentosFuturos || "");
  const [corretora, setCorretora] = useState(conta.corretora || "");

  const salvar = () => {
    onSave({
      ...conta,
      saldoConta: parseFloat(saldoConta) || 0,
      valorInvestido: parseFloat(valorInvestido) || 0,
      lancamentosFuturos: parseFloat(lancamentosFuturos) || 0,
      corretora,
    });
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000aa", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#0d1320", border: "1px solid #1e2d45", borderRadius: "16px", padding: "22px", maxWidth: "380px", width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#fff" }}>💰 Atualizar Saldos</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#444", cursor: "pointer", fontSize: "20px" }}>×</button>
        </div>

        <div style={{ background: "#6af11", border: "1px solid #6af33", borderRadius: "8px", padding: "10px 12px", marginBottom: "16px" }}>
          <div style={{ color: "#6af", fontSize: "11px", lineHeight: "1.6" }}>
            🔌 Em breve: conexão automática via Open Finance com sua corretora. Por agora, atualize manualmente.
          </div>
        </div>

        <div style={{ marginBottom: "12px" }}>
          <label style={{ display: "block", color: "#666", fontSize: "11px", marginBottom: "5px" }}>Corretora</label>
          <input value={corretora} onChange={e => setCorretora(e.target.value)} placeholder="Ex: Clear, BTG, Rico..."
            style={{ width: "100%", background: "#111a27", border: "1px solid #1e2d45", color: "#e0e6f0", borderRadius: "8px", padding: "10px 14px", fontSize: "14px" }} />
        </div>

        <div style={{ marginBottom: "12px" }}>
          <label style={{ display: "block", color: "#666", fontSize: "11px", marginBottom: "5px" }}>Saldo em conta (livre)</label>
          <input type="number" value={saldoConta} onChange={e => setSaldoConta(e.target.value)} placeholder="0,00"
            style={{ width: "100%", background: "#111a27", border: "1px solid #1e2d45", color: "#e0e6f0", borderRadius: "8px", padding: "10px 14px", fontSize: "14px", fontFamily: "monospace" }} />
        </div>

        <div style={{ marginBottom: "12px" }}>
          <label style={{ display: "block", color: "#666", fontSize: "11px", marginBottom: "5px" }}>Total investido (patrimônio)</label>
          <input type="number" value={valorInvestido} onChange={e => setValorInvestido(e.target.value)} placeholder="0,00"
            style={{ width: "100%", background: "#111a27", border: "1px solid #1e2d45", color: "#e0e6f0", borderRadius: "8px", padding: "10px 14px", fontSize: "14px", fontFamily: "monospace" }} />
        </div>

        <div style={{ marginBottom: "18px" }}>
          <label style={{ display: "block", color: "#666", fontSize: "11px", marginBottom: "5px" }}>Lançamentos futuros (negativo = saída)</label>
          <input type="number" value={lancamentosFuturos} onChange={e => setLancamentosFuturos(e.target.value)} placeholder="0,00"
            style={{ width: "100%", background: "#111a27", border: "1px solid #1e2d45", color: "#e0e6f0", borderRadius: "8px", padding: "10px 14px", fontSize: "14px", fontFamily: "monospace" }} />
        </div>

        <button onClick={salvar}
          style={{ width: "100%", background: "linear-gradient(135deg,#00e5a0,#00b07a)", color: "#000", border: "none", borderRadius: "10px", padding: "13px", fontSize: "14px", fontWeight: "700", cursor: "pointer" }}>
          💾 Salvar
        </button>
      </div>
    </div>
  );
}

export default function Home({ setPage }) {
  const [conta, setConta] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [valoresOcultos, setValoresOcultos] = useState(false);
  const [precos, setPrecos] = useState({});

  // Carrega perfil e conta do banco ao montar
  useEffect(() => {
    carregarPerfil().then(p => setPerfil(p));
    fetch(`${PROXY}/api/conta`)
      .then(r => r.json())
      .then(data => { if (data.success && data.data) setConta(data.data); })
      .catch(() => {});
  }, []);

  // Gráfico de rentabilidade
  const [periodo, setPeriodo] = useState("1m");
  const [tipoGrafico, setTipoGrafico] = useState("linha"); // linha | candle
  const [candles, setCandles] = useState([]);
  const [loadingChart, setLoadingChart] = useState(false);
  const [rentabilidade, setRentabilidade] = useState(null);

  const fetchPrecos = useCallback(async () => {
    try {
      const res = await fetch(`${PROXY}/api/prices?tickers=${ATIVOS_RESUMO.join(",")}`);
      setPrecos(await res.json());
    } catch {}
  }, []);

  const fetchCandlesRentabilidade = useCallback(async (periodoId) => {
    setLoadingChart(true);
    try {
      const conf = PERIODOS.find(p => p.id === periodoId);
      const res = await fetch(`${PROXY}/api/candles?ticker=${TICKER_REFERENCIA}&interval=${conf.interval}&range=${conf.range}`);
      const data = await res.json();
      if (data.error || !data.candles?.length) throw new Error(data.error || "sem dados");

      setCandles(data.candles);

      const first = data.candles[0].close;
      const last = data.candles[data.candles.length - 1].close;
      const pct = ((last - first) / first) * 100;
      setRentabilidade(pct);
    } catch (e) {
      console.error(e);
      setCandles([]);
      setRentabilidade(null);
    } finally {
      setLoadingChart(false);
    }
  }, []);

  useEffect(() => {
    fetchPrecos();
    const i = setInterval(fetchPrecos, 60000);
    return () => clearInterval(i);
  }, [fetchPrecos]);

  useEffect(() => {
    fetchCandlesRentabilidade(periodo);
  }, [periodo, fetchCandlesRentabilidade]);

  const salvarContaInfo = (novaConta) => {
    setConta(novaConta);
    salvarContaBanco(novaConta);
  };

  const patrimonioTotal = ((conta || CONTA_DEFAULT).saldoConta || 0) + ((conta || CONTA_DEFAULT).valorInvestido || 0);

  const perfilInfo = perfil ? {
    conservador: { nome: "Conservador", icone: "🛡️", cor: "#6af" },
    moderado: { nome: "Moderado", icone: "⚖️", cor: "#ffd60a" },
    arrojado: { nome: "Arrojado", icone: "🚀", cor: "#00e5a0" },
    agressivo: { nome: "Agressivo", icone: "⚡", cor: "#ff9f43" },
  }[perfil.tipoPerfil] : null;

  const oculto = (val) => valoresOcultos ? "••••••" : val;
  const rentColor = rentabilidade === null ? "#888" : rentabilidade >= 0 ? "#00e5a0" : "#ff4d6d";

  return (
    <div style={{ padding: "14px", maxWidth: "700px", margin: "0 auto" }}>
      {showEditModal && <EditarContaModal conta={conta} onSave={salvarContaInfo} onClose={() => setShowEditModal(false)} />}

      {/* Header com perfil */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "linear-gradient(135deg,#00e5a0,#006eff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", fontWeight: "700", color: "#000" }}>
            {(perfil?.nome || "I")[0].toUpperCase()}
          </div>
          <div>
            <div style={{ color: "#fff", fontWeight: "700", fontSize: "16px" }}>{perfil?.nome || "Investidor"}</div>
            <div style={{ color: "#444", fontSize: "11px" }}>
              {conta.corretora ? `${conta.corretora}` : "Nenhuma corretora conectada"}
            </div>
          </div>
        </div>
        <button onClick={() => setValoresOcultos(v => !v)}
          style={{ background: "#0d1320", border: "1px solid #1e2d45", color: "#666", borderRadius: "10px", width: "38px", height: "38px", fontSize: "16px", cursor: "pointer" }}>
          {valoresOcultos ? "🙈" : "👁️"}
        </button>
      </div>

      {/* Card Investimentos (patrimônio + gráfico) */}
      <div style={{ background: "linear-gradient(135deg,#0d1320,#0a0f1a)", border: "1px solid #1e2d45", borderRadius: "18px", padding: "22px", marginBottom: "14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
          <span style={{ fontSize: "20px" }}>📊</span>
          <span style={{ color: "#ccc", fontWeight: "700", fontSize: "15px" }}>Investimentos</span>
        </div>

        <div style={{ color: "#444", fontSize: "11px", marginBottom: "4px" }}>Patrimônio total</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
          <span style={{ color: "#fff", fontSize: "28px", fontWeight: "700", fontFamily: "monospace" }}>{oculto(fmtMoney(patrimonioTotal))}</span>
        </div>

        {/* Controles do gráfico */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
          {/* Períodos */}
          <div style={{ display: "flex", gap: "4px", background: "#111a27", borderRadius: "8px", padding: "3px", flexWrap: "wrap" }}>
            {PERIODOS.map(p => (
              <button key={p.id} onClick={() => setPeriodo(p.id)}
                style={{ background: periodo === p.id ? "#00e5a022" : "transparent", border: periodo === p.id ? "1px solid #00e5a044" : "1px solid transparent", color: periodo === p.id ? "#00e5a0" : "#666", borderRadius: "6px", padding: "5px 9px", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}>
                {p.label}
              </button>
            ))}
          </div>

          {/* Toggle linha/candle */}
          <div style={{ display: "flex", gap: "4px", background: "#111a27", borderRadius: "8px", padding: "3px" }}>
            <button onClick={() => setTipoGrafico("linha")}
              style={{ background: tipoGrafico === "linha" ? "#6af22" : "transparent", border: tipoGrafico === "linha" ? "1px solid #6af44" : "1px solid transparent", color: tipoGrafico === "linha" ? "#6af" : "#666", borderRadius: "6px", padding: "5px 9px", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}>
              📈 Linha
            </button>
            <button onClick={() => setTipoGrafico("candle")}
              style={{ background: tipoGrafico === "candle" ? "#6af22" : "transparent", border: tipoGrafico === "candle" ? "1px solid #6af44" : "1px solid transparent", color: tipoGrafico === "candle" ? "#6af" : "#666", borderRadius: "6px", padding: "5px 9px", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}>
              🕯️ Candle
            </button>
          </div>
        </div>

        {/* Rentabilidade do período */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <span style={{ color: "#444", fontSize: "10px", fontFamily: "monospace" }}>IBOV ({TICKER_REFERENCIA}) · {PERIODOS.find(p => p.id === periodo)?.label}</span>
          {rentabilidade !== null && (
            <span style={{ color: rentColor, fontSize: "13px", fontWeight: "700", fontFamily: "monospace" }}>
              {rentabilidade >= 0 ? "+" : ""}{rentabilidade.toFixed(2)}%
            </span>
          )}
          {loadingChart && <span style={{ color: "#555", fontSize: "11px" }}>🔄</span>}
        </div>

        {/* Gráfico */}
        <RentabilidadeChart candles={candles} tipo={tipoGrafico} width={640} height={180} />

        <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "16px", borderTop: "1px solid #1e2d45", marginTop: "12px" }}>
          <div>
            <div style={{ color: "#444", fontSize: "10px", marginBottom: "4px" }}>Total investido</div>
            <div style={{ color: "#00e5a0", fontSize: "15px", fontWeight: "700", fontFamily: "monospace" }}>{oculto(fmtMoney(conta.valorInvestido))}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#444", fontSize: "10px", marginBottom: "4px" }}>Lançamentos futuros</div>
            <div style={{ color: (conta.lancamentosFuturos || 0) < 0 ? "#ff4d6d" : "#00e5a0", fontSize: "15px", fontWeight: "700", fontFamily: "monospace" }}>
              {(conta.lancamentosFuturos || 0) >= 0 ? "+" : ""}{oculto(fmtMoney(conta.lancamentosFuturos))}
            </div>
          </div>
        </div>
      </div>

      {/* Card Conta Digital */}
      <div style={{ background: "#0d1320", border: "1px solid #1e2d45", borderRadius: "18px", padding: "22px", marginBottom: "14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "20px" }}>💵</span>
            <span style={{ color: "#ccc", fontWeight: "700", fontSize: "15px" }}>Conta Digital</span>
          </div>
          <button onClick={() => setShowEditModal(true)}
            style={{ background: "#00e5a015", border: "1px solid #00e5a033", color: "#00e5a0", borderRadius: "8px", padding: "6px 12px", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}>
            ✏️ Editar
          </button>
        </div>
        <div>
          <div style={{ color: "#444", fontSize: "10px", marginBottom: "4px" }}>Saldo disponível</div>
          <div style={{ color: "#fff", fontSize: "20px", fontWeight: "700", fontFamily: "monospace" }}>{oculto(fmtMoney(conta.saldoConta))}</div>
        </div>
        {!conta.conectado && (
          <div style={{ marginTop: "14px", background: "#6af11", border: "1px solid #6af33", borderRadius: "8px", padding: "8px 12px" }}>
            <span style={{ color: "#6af", fontSize: "11px" }}>🔌 Conecte sua corretora via Open Finance (em breve)</span>
          </div>
        )}
      </div>

      {/* Perfil de investidor */}
      {perfilInfo ? (
        <div onClick={() => setPage("perfil")} style={{ background: `${perfilInfo.cor}11`, border: `1px solid ${perfilInfo.cor}33`, borderRadius: "14px", padding: "16px", marginBottom: "14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "28px" }}>{perfilInfo.icone}</span>
            <div>
              <div style={{ color: "#444", fontSize: "10px", fontFamily: "monospace" }}>SEU PERFIL</div>
              <div style={{ color: perfilInfo.cor, fontWeight: "700", fontSize: "15px" }}>{perfilInfo.nome}</div>
            </div>
          </div>
          <span style={{ color: "#555", fontSize: "12px" }}>Editar →</span>
        </div>
      ) : (
        <div onClick={() => setPage("perfil")} style={{ background: "#ffd60a11", border: "1px solid #ffd60a33", borderRadius: "14px", padding: "16px", marginBottom: "14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "28px" }}>🧠</span>
            <div>
              <div style={{ color: "#ffd60a", fontWeight: "700", fontSize: "14px" }}>Defina seu perfil de investidor</div>
              <div style={{ color: "#666", fontSize: "11px" }}>Receba recomendações personalizadas</div>
            </div>
          </div>
          <span style={{ color: "#ffd60a", fontSize: "12px" }}>Iniciar →</span>
        </div>
      )}

      {/* Acessos rápidos */}
      <div style={{ marginBottom: "8px", color: "#444", fontSize: "10px", fontFamily: "monospace", letterSpacing: "0.1em" }}>INVISTA AGORA</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
        <button onClick={() => setPage("dashboard")}
          style={{ background: "#0d1320", border: "1px solid #1e2d45", borderRadius: "14px", padding: "18px", textAlign: "left", cursor: "pointer" }}>
          <div style={{ fontSize: "26px", marginBottom: "8px" }}>📈</div>
          <div style={{ color: "#fff", fontWeight: "700", fontSize: "14px", marginBottom: "4px" }}>Bolsa</div>
          <div style={{ color: "#555", fontSize: "11px", lineHeight: "1.5" }}>Daytrade · Ações, FIIs, ETFs, Cripto em tempo real</div>
        </button>
        <button onClick={() => setPage("investimentos")}
          style={{ background: "#0d1320", border: "1px solid #1e2d45", borderRadius: "14px", padding: "18px", textAlign: "left", cursor: "pointer" }}>
          <div style={{ fontSize: "26px", marginBottom: "8px" }}>💼</div>
          <div style={{ color: "#fff", fontWeight: "700", fontSize: "14px", marginBottom: "4px" }}>Investimentos</div>
          <div style={{ color: "#555", fontSize: "11px", lineHeight: "1.5" }}>Renda Fixa, Tesouro, COE, Previdência</div>
        </button>
      </div>

      {/* Mercado resumo */}
      <div style={{ background: "#0d1320", border: "1px solid #1e2d45", borderRadius: "14px", padding: "16px", marginBottom: "14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <span style={{ color: "#444", fontSize: "10px", fontFamily: "monospace", letterSpacing: "0.1em" }}>MERCADO AGORA ⚡</span>
          <button onClick={() => setPage("dashboard")} style={{ background: "none", border: "none", color: "#00e5a0", fontSize: "11px", cursor: "pointer" }}>Ver tudo →</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "8px" }}>
          {ATIVOS_RESUMO.map(t => {
            const p = precos[t];
            return (
              <div key={t} style={{ background: "#111a27", borderRadius: "10px", padding: "10px" }}>
                <div style={{ color: "#666", fontSize: "10px", fontFamily: "monospace", marginBottom: "4px" }}>{t}</div>
                <div style={{ color: "#fff", fontSize: "12px", fontFamily: "monospace", fontWeight: "700" }}>{p?.price ? `R$${p.price.toFixed(2)}` : "..."}</div>
                {p?.change !== undefined && <div style={{ color: p.change >= 0 ? "#00e5a0" : "#ff4d6d", fontSize: "10px", fontFamily: "monospace" }}>{p.change >= 0 ? "+" : ""}{p.change.toFixed(2)}%</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Ações rápidas - grid de ferramentas IA */}
      <div style={{ marginBottom: "8px", color: "#444", fontSize: "10px", fontFamily: "monospace", letterSpacing: "0.1em" }}>FERRAMENTAS IA</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "8px", marginBottom: "14px" }}>
        {[
          { id: "chat", icone: "💬", label: "Chat IA" },
          { id: "score", icone: "⭐", label: "Pontuação" },
          { id: "alertas", icone: "🔔", label: "Alertas" },
          { id: "relatorio", icone: "📅", label: "Relatório" },
        ].map(item => (
          <button key={item.id} onClick={() => setPage(item.id)}
            style={{ background: "#0d1320", border: "1px solid #1e2d45", borderRadius: "12px", padding: "14px 8px", textAlign: "center", cursor: "pointer" }}>
            <div style={{ fontSize: "22px", marginBottom: "6px" }}>{item.icone}</div>
            <div style={{ color: "#888", fontSize: "10px", fontWeight: "600" }}>{item.label}</div>
          </button>
        ))}
      </div>

      <div style={{ padding: "10px 14px", background: "#0d1320", border: "1px solid #1e2d45", borderRadius: "10px" }}>
        <span style={{ color: "#444", fontSize: "11px" }}>
          ☰ Use o menu lateral para acessar todas as ferramentas · Gráfico baseado no IBOVESPA (BOVA11)
        </span>
      </div>
    </div>
  );
}

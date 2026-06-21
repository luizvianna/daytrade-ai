import { useState, useEffect, useRef, useCallback } from "react";

const PROXY = "https://daytrade-proxy.onrender.com";
const CAPITAL_INICIAL = 1000;
const AI_INTERVAL = 120;

const EMAILJS_SERVICE_ID = "service_ihson4a";
const EMAILJS_TEMPLATE_ID = "kjk77se";
const EMAILJS_PUBLIC_KEY = process.env.REACT_APP_EMAILJS_KEY || "";

const ASSETS = [
  "PETR4","VALE3","ITUB4","BBDC4","MGLU3","WEGE3",
  "ABEV3","B3SA3","RENT3","SUZB3","GGBR4","EMBR3",
];

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handle = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);
  return isMobile;
}

function calcSMA(candles, period) {
  if (candles.length < period) return candles[candles.length - 1]?.close || 0;
  return candles.slice(-period).reduce((s, c) => s + c.close, 0) / period;
}

function calcRSI(candles, period = 14) {
  if (candles.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = candles.length - period; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff > 0) gains += diff; else losses += Math.abs(diff);
  }
  return 100 - 100 / (1 + gains / (losses || 0.001));
}

function calcMACD(candles) {
  if (candles.length < 26) return { macd: 0, signal: 0, histogram: 0 };
  const ema12 = calcSMA(candles, 12);
  const ema26 = calcSMA(candles, 26);
  const macd = ema12 - ema26;
  const signal = calcSMA(candles.slice(-9), 9);
  return { macd, signal, histogram: macd - signal };
}

function calcVolume(candles) {
  if (candles.length < 2) return { current: 0, avg: 0, ratio: 1 };
  const avg = candles.slice(-20).reduce((s, c) => s + c.volume, 0) / 20;
  const current = candles[candles.length - 1]?.volume || 0;
  return { current, avg, ratio: avg > 0 ? current / avg : 1 };
}

function calcBB(candles, period = 20) {
  if (candles.length < period) return { upper: 0, lower: 0, middle: 0, width: 0 };
  const slice = candles.slice(-period);
  const middle = slice.reduce((s, c) => s + c.close, 0) / period;
  const variance = slice.reduce((s, c) => s + Math.pow(c.close - middle, 2), 0) / period;
  const std = Math.sqrt(variance);
  return { upper: middle + 2 * std, lower: middle - 2 * std, middle, width: (4 * std / middle) * 100 };
}

function fmt(v) { return `R$ ${v.toFixed(2)}`; }
function pct(v) { return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`; }

const sendEmail = async (params) => {
  if (!EMAILJS_PUBLIC_KEY) return false;
  try {
    const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service_id: EMAILJS_SERVICE_ID, template_id: EMAILJS_TEMPLATE_ID, user_id: EMAILJS_PUBLIC_KEY, template_params: { ...params, horario: new Date().toLocaleString("pt-BR") } }),
    });
    return res.ok;
  } catch { return false; }
};

function CandleChart({ candles, height = 150 }) {
  if (!candles || candles.length === 0) return (
    <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "#2a2a2a", fontSize: "13px" }}>Carregando candles...</div>
  );
  const last = candles.slice(-40);
  const width = 340;
  const pad = { l: 8, r: 8, t: 8, b: 16 };
  const w = width - pad.l - pad.r;
  const h = height - pad.t - pad.b;
  const prices = last.flatMap(c => [c.high, c.low]);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const range = maxP - minP || 1;
  const cw = w / last.length;
  const py = p => pad.t + h - ((p - minP) / range) * h;
  const sma5 = last.map((_, i) => { const sl = last.slice(Math.max(0, i-4), i+1); return sl.reduce((s, c) => s+c.close, 0)/sl.length; });
  const sma20 = last.map((_, i) => { const sl = last.slice(Math.max(0, i-19), i+1); return sl.reduce((s, c) => s+c.close, 0)/sl.length; });
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
      <polyline points={sma5.map((v, i) => `${pad.l+i*cw+cw/2},${py(v)}`).join(" ")} fill="none" stroke="#6af" strokeWidth="1" opacity="0.6" />
      <polyline points={sma20.map((v, i) => `${pad.l+i*cw+cw/2},${py(v)}`).join(" ")} fill="none" stroke="#ffd60a" strokeWidth="1" opacity="0.6" />
      {last.map((c, i) => {
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

function MiniEquity({ data }) {
  if (!data || data.length < 2) return null;
  const width = 280, height = 50, pad = 4;
  const w = width - pad*2, h = height - pad*2;
  const values = data.map(d => d.value);
  const minV = Math.min(...values), maxV = Math.max(...values);
  const range = maxV - minV || 1;
  const px = i => pad + (i/(data.length-1))*w;
  const py = v => pad + h - ((v-minV)/range)*h;
  const points = data.map((d,i) => `${px(i)},${py(d.value)}`).join(" ");
  const area = `${pad},${pad+h} ${points} ${px(data.length-1)},${pad+h}`;
  const color = values[values.length-1] >= values[0] ? "#00e5a0" : "#ff4d6d";
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
      <defs><linearGradient id="meg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.3"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>
      <polygon points={area} fill="url(#meg2)" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function PositionCard({ position, currentPrice, onClose }) {
  if (!position || !currentPrice) return null;
  const pnlPct = position.type === "COMPRA" ? ((currentPrice - position.entryPrice) / position.entryPrice) * 100 : ((position.entryPrice - currentPrice) / position.entryPrice) * 100;
  const pnlVal = position.size * (pnlPct / 100);
  const color = pnlVal >= 0 ? "#00e5a0" : "#ff4d6d";
  const elapsed = Math.floor((Date.now() - position.openedAt) / 60000);
  return (
    <div style={{ background: "#0d1320", border: `2px solid ${color}44`, borderRadius: "12px", padding: "14px", marginBottom: "12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: "#fff", fontWeight: "700", fontSize: "16px" }}>{position.asset}</span>
          <span style={{ background: position.type === "COMPRA" ? "#00e5a022" : "#ff4d6d22", color: position.type === "COMPRA" ? "#00e5a0" : "#ff4d6d", border: `1px solid ${position.type === "COMPRA" ? "#00e5a044" : "#ff4d6d44"}`, borderRadius: "4px", padding: "2px 8px", fontSize: "11px", fontFamily: "monospace", fontWeight: "700" }}>
            {position.type === "COMPRA" ? "▲ COMPRA" : "▼ VENDA"}
          </span>
          <span style={{ color: "#444", fontSize: "11px" }}>{elapsed}min</span>
        </div>
        <button onClick={onClose} style={{ background: "#ff4d6d22", border: "1px solid #ff4d6d55", color: "#ff4d6d", borderRadius: "8px", padding: "5px 10px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}>✕</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "10px" }}>
        {[{ label: "Entrada", value: fmt(position.entryPrice), c: "#aaa" }, { label: "Atual", value: fmt(currentPrice), c: "#fff" }, { label: "Stop Loss", value: fmt(position.sl), c: "#ff4d6d" }, { label: "Take Profit", value: fmt(position.tp), c: "#00e5a0" }].map(({ label, value, c }) => (
          <div key={label} style={{ background: "#111a27", borderRadius: "8px", padding: "8px 10px" }}>
            <div style={{ color: "#444", fontSize: "9px", fontFamily: "monospace" }}>{label}</div>
            <div style={{ color: c, fontSize: "13px", fontWeight: "700", fontFamily: "monospace", marginTop: "2px" }}>{value}</div>
          </div>
        ))}
      </div>
      <div style={{ background: "#111a27", borderRadius: "8px", padding: "12px", display: "flex", justifyContent: "space-between" }}>
        <div><div style={{ color: "#444", fontSize: "9px", fontFamily: "monospace" }}>P&L</div><div style={{ color, fontSize: "20px", fontWeight: "700", fontFamily: "monospace" }}>{fmt(pnlVal)}</div></div>
        <div style={{ textAlign: "right" }}><div style={{ color: "#444", fontSize: "9px", fontFamily: "monospace" }}>VARIAÇÃO</div><div style={{ color, fontSize: "20px", fontWeight: "700", fontFamily: "monospace" }}>{pct(pnlPct)}</div></div>
      </div>
    </div>
  );
}

function SignalAlert({ alert, onDismiss }) {
  useEffect(() => { const t = setTimeout(onDismiss, 7000); return () => clearTimeout(t); }, [onDismiss]);
  const color = alert.signal === "COMPRA" ? "#00e5a0" : alert.signal === "VENDA" ? "#ff4d6d" : "#ffd60a";
  return (
    <div style={{ position: "fixed", top: "70px", right: "12px", left: "12px", zIndex: 9999, background: "#0d1320", border: `1px solid ${color}`, borderRadius: "12px", padding: "12px 16px", boxShadow: `0 8px 30px ${color}33` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
        <span style={{ color, fontWeight: "700", fontSize: "12px", fontFamily: "monospace" }}>{alert.title}</span>
        <button onClick={onDismiss} style={{ background: "none", border: "none", color: "#444", cursor: "pointer", fontSize: "18px" }}>×</button>
      </div>
      <p style={{ color: "#888", fontSize: "12px", lineHeight: "1.5", margin: 0 }}>{alert.message}</p>
    </div>
  );
}

function AnalysisPanel({ analysis, indicators, countdown }) {
  const [expanded, setExpanded] = useState(false);
  if (!indicators && !analysis) return null;
  const signalColor = !analysis ? "#555" : analysis.action === "COMPRAR" ? "#00e5a0" : analysis.action === "VENDER" ? "#ff4d6d" : "#ffd60a";

  const getInfo = (type, val, val2) => {
    if (type === "rsi") {
      if (val >= 70) return { label: "SOBRECOMPRADO", color: "#ff4d6d", desc: `RSI ${val.toFixed(0)} — risco de queda.` };
      if (val <= 30) return { label: "SOBREVENDIDO", color: "#00e5a0", desc: `RSI ${val.toFixed(0)} — possível compra.` };
      return { label: "NEUTRO", color: "#888", desc: `RSI ${val.toFixed(0)} — sem pressão clara.` };
    }
    if (type === "sma") {
      if (val > val2 * 1.002) return { label: "ALTA ▲", color: "#00e5a0", desc: `SMA5 acima da SMA20. Tendência de alta.` };
      if (val < val2 * 0.998) return { label: "BAIXA ▼", color: "#ff4d6d", desc: `SMA5 abaixo da SMA20. Tendência de queda.` };
      return { label: "NEUTRO →", color: "#ffd60a", desc: `Médias convergindo. Mercado indeciso.` };
    }
    if (type === "vol") {
      if (val >= 1.5) return { label: "ALTO ▲", color: "#00e5a0", desc: `Volume ${val.toFixed(1)}x. Movimento confiável.` };
      if (val <= 0.5) return { label: "BAIXO ▼", color: "#ff4d6d", desc: `Volume fraco. Sinal menos confiável.` };
      return { label: "NORMAL →", color: "#888", desc: `Volume normal.` };
    }
    if (type === "trend") {
      if (val === "ALTA") return { label: "ALTA ▲", color: "#00e5a0", desc: `${val2}/20 candles de alta.` };
      if (val === "BAIXA") return { label: "BAIXA ▼", color: "#ff4d6d", desc: `Apenas ${val2}/20 de alta.` };
      return { label: "LATERAL →", color: "#ffd60a", desc: `Sem direção clara.` };
    }
    return { label: "—", color: "#555", desc: "" };
  };

  return (
    <div style={{ background: "#0a0f1a", border: "1px solid #1e2d45", borderRadius: "12px", padding: "14px", marginTop: "12px" }}>
      <button onClick={() => setExpanded(e => !e)}
        style={{ width: "100%", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", padding: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "14px" }}>📊</span>
          <span style={{ fontWeight: "700", fontSize: "13px", color: "#fff" }}>ANÁLISE DETALHADA</span>
          {analysis && (
            <span style={{ background: `${signalColor}11`, border: `1px solid ${signalColor}44`, color: signalColor, borderRadius: "6px", padding: "2px 8px", fontSize: "11px", fontWeight: "700", fontFamily: "monospace" }}>
              {analysis.action} · {analysis.confidence}%
            </span>
          )}
        </div>
        <span style={{ color: "#444", fontSize: "14px" }}>{expanded ? "▲" : "▼"}</span>
      </button>

      {countdown > 0 && (
        <div style={{ color: "#444", fontSize: "11px", fontFamily: "monospace", marginTop: "6px" }}>
          ⏱ Próxima análise em <strong style={{ color: countdown <= 10 ? "#ffd60a" : "#555" }}>{countdown}s</strong>
        </div>
      )}

      {expanded && (
        <>
          {/* Indicadores - 2 colunas */}
          {indicators && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "12px" }}>
              {[
                { title: "RSI (14)", ...getInfo("rsi", indicators.rsi), value: indicators.rsi.toFixed(1) },
                { title: "SMA 5/20", ...getInfo("sma", indicators.sma5, indicators.sma20), value: getInfo("sma", indicators.sma5, indicators.sma20).label },
                { title: "VOLUME", ...getInfo("vol", indicators.volume.ratio), value: `${indicators.volume.ratio.toFixed(1)}x` },
                { title: "TENDÊNCIA", ...getInfo("trend", indicators.trend, indicators.bullCandles), value: indicators.trend },
              ].map(({ title, label, color: c, desc, value }) => (
                <div key={title} style={{ background: "#0d1320", border: `1px solid ${c}22`, borderRadius: "8px", padding: "10px" }}>
                  <div style={{ color: "#444", fontSize: "9px", fontFamily: "monospace", marginBottom: "4px" }}>{title}</div>
                  <div style={{ color: c, fontSize: "14px", fontWeight: "700" }}>{value}</div>
                  <div style={{ color: c, fontSize: "9px", fontWeight: "600", marginTop: "2px" }}>{label}</div>
                  <div style={{ color: "#555", fontSize: "10px", lineHeight: "1.4", marginTop: "6px", borderTop: "1px solid #1e2d45", paddingTop: "6px" }}>{desc}</div>
                </div>
              ))}
            </div>
          )}

          {/* Raciocínio da IA */}
          {analysis && (
            <div style={{ background: "#0d1320", border: `1px solid ${signalColor}33`, borderRadius: "10px", padding: "14px", marginTop: "10px" }}>
              <div style={{ color: "#444", fontSize: "10px", fontFamily: "monospace", marginBottom: "8px" }}>💬 O QUE A IA ESTÁ PENSANDO · {analysis.time}</div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px", flexWrap: "wrap" }}>
                <span style={{ color: signalColor, fontSize: "16px", fontWeight: "700", fontFamily: "monospace" }}>
                  {analysis.action === "COMPRAR" ? "▲ COMPRAR" : analysis.action === "VENDER" ? "▼ VENDER" : analysis.action === "FECHAR" ? "✕ FECHAR" : analysis.action === "MANTER" ? "● MANTER" : "◆ AGUARDAR"}
                </span>
                <span style={{ background: "#111a27", color: analysis.confidence >= 70 ? "#00e5a0" : "#ffd60a", borderRadius: "4px", padding: "2px 7px", fontSize: "10px", fontFamily: "monospace" }}>{analysis.confidence}%</span>
                <span style={{ background: "#111a27", color: analysis.risk === "BAIXO" ? "#00e5a0" : analysis.risk === "MÉDIO" ? "#ffd60a" : "#ff4d6d", borderRadius: "4px", padding: "2px 7px", fontSize: "10px", fontFamily: "monospace" }}>Risco {analysis.risk}</span>
              </div>
              <div style={{ background: "#111a27", borderRadius: "8px", padding: "12px", borderLeft: `3px solid ${signalColor}`, marginBottom: "10px" }}>
                <p style={{ color: "#ddd", fontSize: "12px", lineHeight: "1.8", margin: 0 }}>{analysis.fullReasoning || analysis.reasoning}</p>
              </div>
              {(analysis.pros?.length > 0 || analysis.cons?.length > 0) && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <div style={{ background: "#00e5a008", border: "1px solid #00e5a022", borderRadius: "8px", padding: "10px" }}>
                    <div style={{ color: "#00e5a0", fontSize: "9px", fontFamily: "monospace", marginBottom: "6px" }}>✅ A FAVOR</div>
                    {(analysis.pros || []).map((p, i) => <div key={i} style={{ color: "#aaa", fontSize: "11px", lineHeight: "1.6" }}>• {p}</div>)}
                  </div>
                  <div style={{ background: "#ff4d6d08", border: "1px solid #ff4d6d22", borderRadius: "8px", padding: "10px" }}>
                    <div style={{ color: "#ff4d6d", fontSize: "9px", fontFamily: "monospace", marginBottom: "6px" }}>⚠️ RISCOS</div>
                    {(analysis.cons || []).map((c, i) => <div key={i} style={{ color: "#aaa", fontSize: "11px", lineHeight: "1.6" }}>• {c}</div>)}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function PaperTrading() {
  const isMobile = useIsMobile();
  const [asset, setAsset] = useState("PETR4");
  const [stopLoss, setStopLoss] = useState("2.0");
  const [takeProfit, setTakeProfit] = useState("4.0");
  const [running, setRunning] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [capital, setCapital] = useState(CAPITAL_INICIAL);
  const [position, setPosition] = useState(null);
  const [trades, setTrades] = useState([]);
  const [equityCurve, setEquityCurve] = useState([{ date: "início", value: CAPITAL_INICIAL }]);
  const [candles, setCandles] = useState([]);
  const [currentPrice, setCurrentPrice] = useState(null);
  const [allPrices, setAllPrices] = useState({});
  const [loadingData, setLoadingData] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState(null);
  const [indicators, setIndicators] = useState(null);
  const [alert, setAlert] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [status, setStatus] = useState("Aguardando...");
  const [countdown, setCountdown] = useState(0);
  const [emailStatus, setEmailStatus] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const positionRef = useRef(null);
  const capitalRef = useRef(CAPITAL_INICIAL);
  const priceRef = useRef(null);
  const candlesRef = useRef([]);
  const countdownRef = useRef(null);
  const emailEnabledRef = useRef(true);
  positionRef.current = position;
  capitalRef.current = capital;
  priceRef.current = currentPrice;
  candlesRef.current = candles;
  emailEnabledRef.current = emailEnabled;

  const wins = trades.filter(t => t.pnl > 0);
  const losses = trades.filter(t => t.pnl <= 0);
  const winRate = trades.length > 0 ? (wins.length / trades.length * 100) : 0;
  const totalPnl = capital - CAPITAL_INICIAL;
  const totalPnlPct = (totalPnl / CAPITAL_INICIAL) * 100;
  const totalPnlColor = totalPnl >= 0 ? "#00e5a0" : "#ff4d6d";

  const startCountdown = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setCountdown(AI_INTERVAL);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => { if (prev <= 1) { clearInterval(countdownRef.current); return 0; } return prev - 1; });
    }, 1000);
  }, []);

  const fetchCandles = useCallback(async (assetName) => {
    setLoadingData(true);
    setStatus("Buscando dados...");
    try {
      const res = await fetch(`${PROXY}/api/candles?ticker=${assetName}&interval=5m&range=5d`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCandles(data.candles);
      setCurrentPrice(data.currentPrice);
      priceRef.current = data.currentPrice;
      candlesRef.current = data.candles;
      setLastUpdate(new Date().toLocaleTimeString("pt-BR"));
      setStatus("Dados carregados ✓");
      if (data.candles.length > 20) {
        const cands = data.candles;
        const rsi = calcRSI(cands);
        const sma5 = calcSMA(cands, 5);
        const sma20 = calcSMA(cands, 20);
        const macd = calcMACD(cands);
        const volume = calcVolume(cands);
        const bb = calcBB(cands);
        const last20 = cands.slice(-20);
        const bullCandles = last20.filter(c => c.close > c.open).length;
        const trend = bullCandles >= 12 ? "ALTA" : bullCandles <= 8 ? "BAIXA" : "LATERAL";
        setIndicators({ rsi, sma5, sma20, macd, volume, bb, trend, bullCandles });
      }
      return data;
    } catch (e) { console.error(e); setStatus("Erro ao buscar dados"); return null; }
    finally { setLoadingData(false); }
  }, []);

  const fetchAllPrices = useCallback(async () => {
    try { const res = await fetch(`${PROXY}/api/prices?tickers=${ASSETS.join(",")}`); setAllPrices(await res.json()); }
    catch (e) { console.error(e); }
  }, []);

  const closePosition = useCallback(async (reason, exitPrice) => {
    const pos = positionRef.current;
    const price = exitPrice || priceRef.current;
    const cap = capitalRef.current;
    if (!pos || !price) return;
    const pnlPct = pos.type === "COMPRA" ? ((price - pos.entryPrice) / pos.entryPrice) * 100 : ((pos.entryPrice - price) / pos.entryPrice) * 100;
    const pnlVal = pos.size * (pnlPct / 100);
    const newCapital = cap + pnlVal;
    setTrades(prev => [{ asset: pos.asset, type: pos.type, entryPrice: pos.entryPrice, exitPrice: price, pnlPct, pnl: pnlVal, time: new Date().toLocaleTimeString("pt-BR"), reason }, ...prev]);
    setCapital(newCapital); capitalRef.current = newCapital;
    setEquityCurve(prev => [...prev, { date: new Date().toLocaleTimeString("pt-BR"), value: newCapital }]);
    setPosition(null); positionRef.current = null;
    setAlert({ signal: pnlVal >= 0 ? "LUCRO" : "PERDA", title: pnlVal >= 0 ? "✅ LUCRO" : "❌ PERDA", message: `${pos.asset} — ${reason}: ${fmt(pnlVal)} (${pnlVal >= 0 ? "+" : ""}${pnlPct.toFixed(2)}%)` });
    if (emailEnabledRef.current) {
      await sendEmail({ tipo_sinal: pnlVal >= 0 ? "✅ FECHADO COM LUCRO" : "❌ FECHADO COM PERDA", ativo: pos.asset, preco: fmt(price), stop_loss: fmt(pos.sl), take_profit: fmt(pos.tp), confianca: "—", analise: `${pos.type} encerrada (${reason}). Resultado: ${fmt(pnlVal)} (${pnlPct.toFixed(2)}%)` });
    }
  }, []);

  const analyzeAndTrade = useCallback(async () => {
    const cands = candlesRef.current;
    const price = priceRef.current;
    const pos = positionRef.current;
    const cap = capitalRef.current;
    if (!cands || cands.length < 5 || !price) { setStatus("Aguardando dados..."); return; }
    if (pos) {
      const pnlPct = pos.type === "COMPRA" ? ((price - pos.entryPrice) / pos.entryPrice) * 100 : ((pos.entryPrice - price) / pos.entryPrice) * 100;
      if (pnlPct <= -parseFloat(stopLoss)) { closePosition("Stop Loss", price); return; }
      if (pnlPct >= parseFloat(takeProfit)) { closePosition("Take Profit", price); return; }
    }
    setLoadingAI(true);
    setStatus("IA analisando...");
    try {
      const last20 = cands.slice(-20);
      const sma5 = calcSMA(cands, 5);
      const sma20 = calcSMA(cands, 20);
      const rsi = calcRSI(cands);
      const macd = calcMACD(cands);
      const volume = calcVolume(cands);
      const bb = calcBB(cands);
      const bullCandles = last20.filter(c => c.close > c.open).length;
      const trend = bullCandles >= 12 ? "ALTA" : bullCandles <= 8 ? "BAIXA" : "LATERAL";
      const lastC = cands[cands.length - 1];
      const priceVsBB = price > bb.upper ? "ACIMA da banda superior" : price < bb.lower ? "ABAIXO da banda inferior" : "DENTRO das bandas";

      const response = await fetch(`${PROXY}/api/ai/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: "Trader quantitativo B3. Responda APENAS JSON válido.",
          prompt: `Ativo: ${asset} | Preço: R$${price.toFixed(2)} | Timeframe: 5min\nRSI: ${rsi.toFixed(1)} | SMA5: ${sma5.toFixed(2)} | SMA20: ${sma20.toFixed(2)}\nMACD: ${macd.macd.toFixed(3)} | Volume: ${volume.ratio.toFixed(2)}x | Bollinger: ${priceVsBB}\nTendência: ${trend} (${bullCandles}/20) | Último: A${lastC.open.toFixed(2)} F${lastC.close.toFixed(2)}\nCapital: R$${cap.toFixed(2)} | Posição: ${pos ? `${pos.type} desde R$${pos.entryPrice.toFixed(2)}` : "Nenhuma"}\nSL: ${stopLoss}% | TP: ${takeProfit}%\n${!pos ? "Decida: COMPRAR, VENDER ou AGUARDAR" : "Decida: MANTER ou FECHAR"} (confiança ≥ 65%)\nResponda JSON: {"action":"${!pos ? "COMPRAR|VENDER|AGUARDAR" : "MANTER|FECHAR"}","confidence":0-100,"risk":"BAIXO|MÉDIO|ALTO","reasoning":"1 frase","fullReasoning":"4 frases completas","indicatorNarrative":[{"indicator":"RSI","observation":"texto","bullish":true,"bearish":false}],"pros":["a","b"],"cons":["c"],"size":${!pos ? "valor R$" : 0}}`,
        }),
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error || "Erro IA");
      const parsed = data.data;

      const analysisResult = { time: new Date().toLocaleTimeString("pt-BR"), action: parsed.action, confidence: parsed.confidence, risk: parsed.risk, reasoning: parsed.reasoning, fullReasoning: parsed.fullReasoning, indicatorNarrative: parsed.indicatorNarrative || [], pros: parsed.pros || [], cons: parsed.cons || [], price };
      setLastAnalysis(analysisResult);
      setStatus(`IA: ${parsed.action} (${parsed.confidence}%)`);
      startCountdown();

      const sl = parseFloat(stopLoss);
      const tp = parseFloat(takeProfit);

      if (!pos && parsed.action === "COMPRAR" && parsed.confidence >= 65) {
        const size = Math.min(parsed.size || cap * 0.8, cap * 0.9);
        const newPos = { asset, type: "COMPRA", entryPrice: price, size, sl: price*(1-sl/100), tp: price*(1+tp/100), openedAt: Date.now() };
        setPosition(newPos); positionRef.current = newPos;
        setAlert({ signal: "COMPRA", title: "▲ IA ABRIU COMPRA", message: `${asset} @ ${fmt(price)} — ${parsed.reasoning}` });
        if (emailEnabledRef.current) { await sendEmail({ tipo_sinal: "▲ SINAL DE COMPRA", ativo: asset, preco: fmt(price), stop_loss: fmt(price*(1-sl/100)), take_profit: fmt(price*(1+tp/100)), confianca: parsed.confidence, analise: parsed.fullReasoning || parsed.reasoning }); setEmailStatus("📧 Email enviado!"); setTimeout(() => setEmailStatus(""), 4000); }
      } else if (!pos && parsed.action === "VENDER" && parsed.confidence >= 65) {
        const size = Math.min(parsed.size || cap * 0.8, cap * 0.9);
        const newPos = { asset, type: "VENDA", entryPrice: price, size, sl: price*(1+sl/100), tp: price*(1-tp/100), openedAt: Date.now() };
        setPosition(newPos); positionRef.current = newPos;
        setAlert({ signal: "VENDA", title: "▼ IA ABRIU VENDA", message: `${asset} @ ${fmt(price)} — ${parsed.reasoning}` });
        if (emailEnabledRef.current) { await sendEmail({ tipo_sinal: "▼ SINAL DE VENDA", ativo: asset, preco: fmt(price), stop_loss: fmt(price*(1+sl/100)), take_profit: fmt(price*(1-tp/100)), confianca: parsed.confidence, analise: parsed.fullReasoning || parsed.reasoning }); setEmailStatus("📧 Email enviado!"); setTimeout(() => setEmailStatus(""), 4000); }
      } else if (pos && parsed.action === "FECHAR") {
        closePosition("IA fechou", price);
      }
    } catch (e) { console.error(e); setStatus(`Erro: ${e.message}`); }
    finally { setLoadingAI(false); }
  }, [asset, stopLoss, takeProfit, closePosition, startCountdown]);

  useEffect(() => {
    setCandles([]); setCurrentPrice(null); setIndicators(null);
    fetchCandles(asset); fetchAllPrices();
  }, [asset, fetchCandles, fetchAllPrices]);

  useEffect(() => {
    if (!running) return;
    const start = async () => { const d = await fetchCandles(asset); if (d) await analyzeAndTrade(); };
    start();
    const dataInt = setInterval(() => fetchCandles(asset), 120000);
    const aiInt = setInterval(() => analyzeAndTrade(), AI_INTERVAL * 1000);
    const priceInt = setInterval(fetchAllPrices, 30000);
    return () => { clearInterval(dataInt); clearInterval(aiInt); clearInterval(priceInt); if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [running, asset]);

  return (
    <div style={{ padding: "12px", maxWidth: "1200px", margin: "0 auto" }}>


      {alert && <SignalAlert alert={alert} onDismiss={() => setAlert(null)} />}

      {/* Header da página */}
      <div style={{ marginBottom: "14px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "2px" }}>🏦 <span style={{ color: "#00e5a0" }}>Paper Trading</span></h1>
          <p style={{ color: "#444", fontSize: "11px" }}>Capital: {fmt(CAPITAL_INICIAL)} · Groq LLaMA 3.3</p>
        </div>
        {running && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "#0d1320", border: "1px solid #00e5a033", borderRadius: "8px", padding: "6px 10px" }}>
            <div className="pulse" style={{ width: "7px", height: "7px", borderRadius: "50%", background: loadingAI ? "#ffd60a" : "#00e5a0" }} />
            <span style={{ color: loadingAI ? "#ffd60a" : "#00e5a0", fontSize: "11px", fontFamily: "monospace" }}>{status}</span>
          </div>
        )}
      </div>

      {emailStatus && <div style={{ background: "#00e5a011", border: "1px solid #00e5a033", borderRadius: "8px", padding: "8px 12px", marginBottom: "10px", color: "#00e5a0", fontSize: "12px" }}>{emailStatus}</div>}

      {/* Stats - 2 colunas */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
        {[
          { label: "CAPITAL", value: fmt(capital), sub: pct(totalPnlPct), color: totalPnlColor },
          { label: "P&L TOTAL", value: `${totalPnl >= 0 ? "+" : ""}${fmt(totalPnl)}`, sub: "desde o início", color: totalPnlColor },
          { label: "WIN RATE", value: `${winRate.toFixed(1)}%`, sub: `${wins.length}W / ${losses.length}L`, color: winRate >= 50 ? "#00e5a0" : trades.length === 0 ? "#555" : "#ff4d6d" },
          { label: "STATUS", value: running ? (position ? `🟡 ${position.type}` : "🟢 ATIVO") : "⚪ PARADO", sub: position ? position.asset : "sem posição", color: running ? "#00e5a0" : "#555" },
        ].map((s, i) => (
          <div key={i} style={{ background: "#0d1320", border: "1px solid #1e2d45", borderRadius: "10px", padding: "12px 14px" }}>
            <div style={{ color: "#444", fontSize: "9px", fontFamily: "monospace", letterSpacing: "0.1em", marginBottom: "4px" }}>{s.label}</div>
            <div style={{ color: s.color, fontSize: "17px", fontWeight: "700" }}>{s.value}</div>
            <div style={{ color: "#444", fontSize: "10px", marginTop: "2px" }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Posição aberta */}
      {position ? (
        <PositionCard position={position} currentPrice={currentPrice || position.entryPrice} onClose={() => closePosition("Manual", currentPrice)} />
      ) : (
        <div className="panel" style={{ textAlign: "center", padding: "20px" }}>
          <div style={{ fontSize: "24px", marginBottom: "6px" }}>◯</div>
          <div style={{ color: "#333", fontSize: "13px" }}>{running ? "IA monitorando..." : "Sem posição aberta"}</div>
        </div>
      )}

      {/* Gráfico */}
      <div className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <div>
            <div style={{ color: "#444", fontSize: "9px", fontFamily: "monospace" }}>{asset} · 5 MIN · TEMPO REAL ⚡</div>
            <div style={{ color: currentPrice ? "#00e5a0" : "#555", fontSize: "22px", fontWeight: "700", fontFamily: "monospace" }}>{currentPrice ? fmt(currentPrice) : "..."}</div>
            {lastUpdate && <div style={{ color: "#333", fontSize: "10px", fontFamily: "monospace" }}>{lastUpdate}</div>}
          </div>
          <div style={{ textAlign: "right" }}>
            {loadingData && <div style={{ color: "#555", fontSize: "11px" }}>🔄</div>}
            {loadingAI && <div className="pulse" style={{ color: "#ffd60a", fontSize: "11px" }}>🤖</div>}
            <div style={{ color: "#2a2a2a", fontSize: "10px", fontFamily: "monospace" }}>{candles.length} candles</div>
          </div>
        </div>
        <CandleChart candles={candles} height={140} />
      </div>

      {/* Configuração */}
      <div className="panel">
        <div style={{ color: "#444", fontSize: "9px", fontFamily: "monospace", letterSpacing: "0.1em", marginBottom: "10px" }}>CONFIGURAÇÃO</div>
        <div style={{ marginBottom: "10px" }}>
          <label style={{ display: "block", color: "#666", fontSize: "11px", marginBottom: "4px" }}>Ativo</label>
          <select value={asset} onChange={e => setAsset(e.target.value)} disabled={running}
            style={{ width: "100%", background: "#111a27", border: "1px solid #1e2d45", color: "#e0e6f0", borderRadius: "8px", padding: "10px", fontSize: "14px", fontFamily: "monospace" }}>
            {ASSETS.map(a => <option key={a} value={a}>{a} {allPrices[a] ? `· R$${allPrices[a].price?.toFixed(2)}` : ""}</option>)}
          </select>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "10px" }}>
          {[{ label: "Stop Loss %", val: stopLoss, set: setStopLoss }, { label: "Take Profit %", val: takeProfit, set: setTakeProfit }].map((f, i) => (
            <div key={i}>
              <label style={{ display: "block", color: "#666", fontSize: "11px", marginBottom: "4px" }}>{f.label}</label>
              <input type="number" value={f.val} onChange={e => f.set(e.target.value)} disabled={running} step="0.5"
                style={{ width: "100%", background: "#111a27", border: "1px solid #1e2d45", color: "#e0e6f0", borderRadius: "8px", padding: "10px", fontSize: "14px", fontFamily: "monospace" }} />
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#111a27", borderRadius: "8px", padding: "10px 12px", marginBottom: "10px" }}>
          <div>
            <div style={{ color: "#888", fontSize: "12px" }}>📧 Notificações por email</div>
            <div style={{ color: "#444", fontSize: "10px" }}>Avisa quando a IA operar</div>
          </div>
          <button onClick={() => setEmailEnabled(e => !e)}
            style={{ background: emailEnabled ? "#00e5a022" : "#111a27", border: `1px solid ${emailEnabled ? "#00e5a0" : "#1e2d45"}`, color: emailEnabled ? "#00e5a0" : "#555", borderRadius: "6px", padding: "6px 14px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}>
            {emailEnabled ? "ON ✓" : "OFF"}
          </button>
        </div>
        <button onClick={() => setRunning(r => !r)}
          style={{ width: "100%", marginBottom: "8px", background: running ? "#ff4d6d22" : "linear-gradient(135deg,#00e5a0,#00b07a)", color: running ? "#ff4d6d" : "#000", border: running ? "1px solid #ff4d6d55" : "none", borderRadius: "10px", padding: "13px", fontSize: "15px", fontWeight: "700", cursor: "pointer" }}>
          {running ? "⏹ PARAR" : "▶ INICIAR PAPER TRADING"}
        </button>
        <button onClick={() => { if (running) return; setCapital(CAPITAL_INICIAL); capitalRef.current = CAPITAL_INICIAL; setPosition(null); positionRef.current = null; setTrades([]); setEquityCurve([{ date: "início", value: CAPITAL_INICIAL }]); setLastAnalysis(null); setStatus("Resetado"); setCountdown(0); }} disabled={running}
          style={{ width: "100%", background: "#111a27", border: "1px solid #1e2d45", color: "#555", borderRadius: "8px", padding: "10px", fontSize: "13px", cursor: running ? "not-allowed" : "pointer" }}>
          🔄 Resetar carteira
        </button>
      </div>

      {/* Equity curve */}
      {equityCurve.length > 1 && (
        <div className="panel">
          <div style={{ color: "#444", fontSize: "9px", fontFamily: "monospace", letterSpacing: "0.1em", marginBottom: "8px" }}>CURVA DE EQUITY</div>
          <MiniEquity data={equityCurve} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px" }}>
            <span style={{ color: "#333", fontSize: "10px", fontFamily: "monospace" }}>{fmt(CAPITAL_INICIAL)}</span>
            <span style={{ color: totalPnlColor, fontSize: "10px", fontFamily: "monospace", fontWeight: "700" }}>{fmt(capital)}</span>
          </div>
        </div>
      )}

      {/* Mercado ao vivo */}
      <div className="panel">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
          {ASSETS.slice(0, 6).map(a => {
            const p = allPrices[a];
            return (
              <div key={a} onClick={() => !running && setAsset(a)}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: a === asset ? "#00e5a011" : "#111a27", border: `1px solid ${a === asset ? "#00e5a033" : "#1e2d45"}`, borderRadius: "8px", padding: "8px 10px", cursor: "pointer" }}>
                <span style={{ fontFamily: "monospace", fontSize: "12px", color: a === asset ? "#00e5a0" : "#888", fontWeight: a === asset ? "700" : "400" }}>{a}</span>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "monospace", fontSize: "11px", color: "#ccc" }}>{p?.price ? `R$${p.price.toFixed(2)}` : "..."}</div>
                  {p?.change !== undefined && <div style={{ fontSize: "10px", color: p.change >= 0 ? "#00e5a0" : "#ff4d6d" }}>{p.change >= 0 ? "+" : ""}{p.change.toFixed(2)}%</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Histórico - colapsável */}
      <div className="panel">
        <button onClick={() => setShowHistory(h => !h)}
          style={{ width: "100%", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", padding: 0, color: "#444", fontSize: "10px", fontFamily: "monospace", letterSpacing: "0.1em" }}>
          <span>HISTÓRICO {trades.length > 0 && `(${trades.length})`}</span>
          <span>{showHistory ? "▲" : "▼"}</span>
        </button>
        {showHistory && (
          <div style={{ marginTop: "10px", maxHeight: "200px", overflowY: "auto" }}>
            {trades.length === 0 ? (
              <div style={{ color: "#2a2a2a", textAlign: "center", padding: "20px", fontSize: "12px" }}>Nenhuma operação ainda</div>
            ) : trades.map((t, i) => {
              const c = t.pnl >= 0 ? "#00e5a0" : "#ff4d6d";
              return (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #0d1827" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ color: t.type === "COMPRA" ? "#00e5a0" : "#ff4d6d", fontSize: "11px", fontWeight: "700" }}>{t.type === "COMPRA" ? "▲" : "▼"} {t.asset}</span>
                      <span style={{ color: "#333", fontSize: "10px" }}>{t.time}</span>
                    </div>
                    <div style={{ color: "#555", fontSize: "10px", marginTop: "2px" }}>{t.reason}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: c, fontSize: "13px", fontWeight: "700", fontFamily: "monospace" }}>{fmt(t.pnl)}</div>
                    <div style={{ color: c, fontSize: "10px" }}>{pct(t.pnlPct)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Análise detalhada */}
      <AnalysisPanel analysis={lastAnalysis} indicators={indicators} countdown={countdown} />

      <div style={{ padding: "10px 14px", background: "#0d1320", border: "1px solid #ffd60a22", borderRadius: "10px", marginTop: "12px" }}>
        <span style={{ color: "#555", fontSize: "11px" }}>
          <strong style={{ color: "#ffd60a" }}>⚠️</strong> Capital fictício. Nenhuma ordem real enviada. IA: Groq · Preços: Brapi ⚡
        </span>
      </div>
    </div>
  );
}

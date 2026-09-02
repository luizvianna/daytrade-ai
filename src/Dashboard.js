import { useState, useEffect, useRef, useCallback } from "react";
import { useNotificacoes } from "./Notificacoes";
import { authFetch } from "./supabaseClient";
import {
  Search, LineChart, Star, Square, Bot, DollarSign, RefreshCw,
  Calendar, AlertTriangle, Ban, CheckCircle2, Zap,
} from "lucide-react";

const PROXY = "https://daytrade-proxy.onrender.com";
const ICON_STROKE = 2.25;

export const ACOES  = ["PETR4","VALE3","ITUB4","BBDC4","MGLU3","WEGE3","ABEV3","B3SA3","RENT3","SUZB3","GGBR4","EMBR3","RADL3","EQTL3","SBSP3","VIVT3","LREN3","HAPV3"];
export const FIIS   = ["HGLG11","KNRI11","MXRF11","XPML11","BCFF11","VISC11","BRCO11","RBRF11","IRDM11","KNCR11"];
export const ETFS   = ["IVVB11","BOVA11","HASH11","SMAL11","DIVO11","GOLD11","XFIX11","FIXA11"];
export const CRIPTO = ["BTC-USD","ETH-USD","BNB-USD","SOL-USD","ADA-USD"];
export const TODOS_ATIVOS = [...ACOES,...FIIS,...ETFS,...CRIPTO];
const CATEGORIAS = [
  { label:"Ações", ativos:ACOES,  cor:"#00e5a0" },
  { label:"FIIs",  ativos:FIIS,   cor:"#6af" },
  { label:"ETFs",  ativos:ETFS,   cor:"#ffd60a" },
  { label:"Cripto",ativos:CRIPTO, cor:"#ff9f43" },
];
const INTERVALS = [
  { value:"1m",  label:"1m",  range:"1d" },
  { value:"5m",  label:"5m",  range:"5d" },
  { value:"15m", label:"15m", range:"5d" },
  { value:"1h",  label:"1h",  range:"1mo" },
  { value:"1d",  label:"1D",  range:"3mo" },
  { value:"1wk", label:"1S",  range:"1y" },
  { value:"1mo", label:"1M",  range:"5y" },
];
function categoriaDoAtivo(ticker) {
  if (ACOES.includes(ticker)) return "Ações";
  if (FIIS.includes(ticker)) return "FIIs";
  if (ETFS.includes(ticker)) return "ETFs";
  if (CRIPTO.includes(ticker)) return "Cripto";
  return "Ações";
}
function paleta(tema) {
  if (tema === "claro") {
    return { card: "#FFFFFF", cardInner: "#F4F7FA", border: "#E2E8F0", textPrimary: "#172033", textSecondary: "#64748B", textFaint: "#94A3B8", linhaBase: "#00000018" };
  }
  return { card: "#0d1320", cardInner: "#111a27", border: "#1e2d45", textPrimary: "#fff", textSecondary: "#888", textFaint: "#444", linhaBase: "#ffffff18" };
}
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return isMobile;
}
function CandleChart({ candles, width=600, height=180, linhaBase }) {
  if (!candles||candles.length===0) return <div style={{ height, display:"flex", alignItems:"center", justifyContent:"center", color:"#888" }}>Carregando...</div>;
  const last=candles.slice(-50);
  const pad={l:8,r:8,t:10,b:20};
  const w=width-pad.l-pad.r, h=height-pad.t-pad.b;
  const prices=last.flatMap(c=>[c.high,c.low]);
  const minP=Math.min(...prices), maxP=Math.max(...prices), range=maxP-minP||1;
  const cw=w/last.length;
  const py=p=>pad.t+h-((p-minP)/range)*h;
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display:"block" }}>
      {last.map((c,i)=>{
        const x=pad.l+i*cw+cw*0.1, bw=Math.max(1,cw*0.8), isUp=c.close>=c.open;
        const color=isUp?"#00e5a0":"#ff4d6d";
        const bodyTop=py(Math.max(c.open,c.close)), bodyH=Math.max(1,py(Math.min(c.open,c.close))-bodyTop);
        const cx=x+bw/2;
        return <g key={i}><line x1={cx} y1={py(c.high)} x2={cx} y2={py(c.low)} stroke={color} strokeWidth="1"/><rect x={x} y={bodyTop} width={bw} height={bodyH} fill={color} rx="1"/></g>;
      })}
      <line x1={pad.l} y1={height-pad.b} x2={width-pad.r} y2={height-pad.b} stroke={linhaBase}/>
    </svg>
  );
}
function Badge({ type }) {
  const map={COMPRA:{bg:"#00e5a022",border:"#00e5a0",text:"#00e5a0",label:"▲ COMPRA"},VENDA:{bg:"#ff4d6d22",border:"#ff4d6d",text:"#ff4d6d",label:"▼ VENDA"},AGUARDAR:{bg:"#ffd60a22",border:"#ffd60a",text:"#ffd60a",label:"◆ AGUARDAR"}};
  const s=map[type]||map.AGUARDAR;
  return <span style={{ background:s.bg, border:`1px solid ${s.border}`, color:s.text, borderRadius:"6px", padding:"3px 10px", fontSize:"11px", fontWeight:"700", fontFamily:"monospace" }}>{s.label}</span>;
}

// ── Tela de seleção de ativo (busca + categorias) ──────────────────
function SeletorAtivo({ cores, isMobile, busca, setBusca, resultadosBusca, allPrices, onSelecionar, categoriaSelecionada, setCategoriaSelecionada, watchlist, onToggleFavorito }) {
  const ativosCategoriaSelecionada = CATEGORIAS.find(c => c.label === categoriaSelecionada)?.ativos || ACOES;
  const corCategoriaSelecionada = CATEGORIAS.find(c => c.label === categoriaSelecionada)?.cor || "#00e5a0";

  return (
    <div style={{ padding: isMobile ? "12px" : "20px", maxWidth: "620px", margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: "22px", marginTop: isMobile ? "16px" : "36px" }}>
        <LineChart size={40} strokeWidth={ICON_STROKE} color="#00e5a0" style={{ marginBottom: "10px" }} />
        <h2 style={{ fontSize: "20px", fontWeight: "700", color: cores.textPrimary, marginBottom: "6px" }}>Negociar</h2>
        <p style={{ color: cores.textSecondary, fontSize: "13px" }}>Escolha um ativo para ver o gráfico e começar</p>
      </div>

      {/* Barra de pesquisa */}
      <div style={{ marginBottom: "18px", position: "relative" }}>
        <Search size={16} strokeWidth={ICON_STROKE} color={cores.textFaint} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }} />
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar ativo (ex: PETR4, BTC-USD, HGLG11...)"
          autoFocus
          style={{ width: "100%", background: cores.card, border: `1px solid ${cores.border}`, color: cores.textPrimary, borderRadius: "12px", padding: "14px 16px 14px 40px", fontSize: "15px", fontFamily: "monospace" }}
        />
      </div>

      {busca.trim() ? (
        // ── Resultados da busca ──
        <div style={{ background: cores.card, border: `1px solid ${cores.border}`, borderRadius: "12px", overflow: "hidden" }}>
          {resultadosBusca.length === 0 ? (
            <div style={{ padding: "22px", textAlign: "center", color: cores.textFaint, fontSize: "13px" }}>Nenhum ativo encontrado para "{busca}"</div>
          ) : resultadosBusca.map((a, i) => {
            const p = allPrices[a];
            const cat = categoriaDoAtivo(a);
            const cor = CATEGORIAS.find(c => c.label === cat)?.cor || "#00e5a0";
            const favorito = watchlist.includes(a);
            return (
              <div key={a} onClick={() => onSelecionar(a)}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: i < resultadosBusca.length - 1 ? `1px solid ${cores.border}` : "none", cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <button onClick={(e) => { e.stopPropagation(); onToggleFavorito(a); }}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}>
                    <Star size={16} strokeWidth={ICON_STROKE} color={favorito ? "#ffd60a" : cores.textFaint} fill={favorito ? "#ffd60a" : "none"} />
                  </button>
                  <span style={{ fontFamily: "monospace", fontSize: "14px", fontWeight: "700", color: cores.textPrimary }}>{a}</span>
                  <span style={{ color: cor, fontSize: "10px", fontFamily: "monospace", background: `${cor}22`, border: `1px solid ${cor}44`, borderRadius: "4px", padding: "2px 6px" }}>{cat}</span>
                </div>
                <span style={{ fontFamily: "monospace", fontSize: "13px", color: cores.textSecondary }}>{p?.price ? `R$ ${p.price.toFixed(2)}` : ""}</span>
              </div>
            );
          })}
        </div>
      ) : (
        // ── Navegação por categoria ──
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "6px", marginBottom: "14px" }}>
            {CATEGORIAS.map(cat => (
              <button key={cat.label} onClick={() => setCategoriaSelecionada(cat.label)}
                style={{ background: categoriaSelecionada === cat.label ? `${cat.cor}22` : cores.card, border: `1px solid ${categoriaSelecionada === cat.label ? cat.cor : cores.border}`, color: categoriaSelecionada === cat.label ? cat.cor : cores.textSecondary, borderRadius: "8px", padding: "10px 4px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}>
                {cat.label}
              </button>
            ))}
          </div>

          <div style={{ background: cores.card, border: `1px solid ${cores.border}`, borderRadius: "12px", overflow: "hidden" }}>
            {ativosCategoriaSelecionada.map((a, i) => {
              const p = allPrices[a];
              const favorito = watchlist.includes(a);
              return (
                <div key={a} onClick={() => onSelecionar(a)}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 16px", borderBottom: i < ativosCategoriaSelecionada.length - 1 ? `1px solid ${cores.border}` : "none", cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <button onClick={(e) => { e.stopPropagation(); onToggleFavorito(a); }}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}>
                      <Star size={15} strokeWidth={ICON_STROKE} color={favorito ? "#ffd60a" : cores.textFaint} fill={favorito ? "#ffd60a" : "none"} />
                    </button>
                    <span style={{ fontFamily: "monospace", fontSize: "13px", color: cores.textPrimary }}>{a}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontFamily: "monospace", fontSize: "12px", color: cores.textSecondary }}>{p?.price ? `R$ ${p.price.toFixed(2)}` : "..."}</span>
                    <span style={{ color: corCategoriaSelecionada, fontSize: "13px" }}>›</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default function Dashboard({ tema = "escuro", ativoInicial, limparAtivoInicial }) {
  const cores = paleta(tema);
  const isMobile=useIsMobile();
  const { notificar, permissao }=useNotificacoes();
  const [categoria, setCategoria]=useState("Ações");
  const [asset, setAsset]=useState(null);
  const [busca, setBusca]=useState("");
  const [interval, setInterval]=useState("5m");
  const [candles, setCandles]=useState([]);
  const [currentPrice, setCurrentPrice]=useState(null);
  const [priceChange, setPriceChange]=useState(null);
  const [allPrices, setAllPrices]=useState({});
  const [stopLoss, setStopLoss]=useState("1.5");
  const [takeProfit, setTakeProfit]=useState("3.0");
  const [running, setRunning]=useState(false);
  const [logs, setLogs]=useState([]);
  const [loadingData, setLoadingData]=useState(false);
  const [loadingAI, setLoadingAI]=useState(false);
  const [stats, setStats]=useState({ops:0,wins:0,pnl:0});
  const [lastUpdate, setLastUpdate]=useState(null);
  const [showPrices, setShowPrices]=useState(false);
  const [lastAnalysis, setLastAnalysis]=useState(null);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [orderTipo, setOrderTipo] = useState("compra");
  const [orderQtd, setOrderQtd] = useState("");
  const [orderPrecoTipo, setOrderPrecoTipo] = useState("mercado");
  const [orderPrecoLimite, setOrderPrecoLimite] = useState("");
  const [orderStep, setOrderStep] = useState("form"); // "form" | "revisar" | "confirmado"
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderMsg, setOrderMsg] = useState("");
  const [perfilInvestidor, setPerfilInvestidor] = useState(null);
  const [riscoConfirmado, setRiscoConfirmado] = useState(false);
  const [watchlist, setWatchlist] = useState([]);
  const candlesRef=useRef([]);
  const priceRef=useRef(null);
  candlesRef.current=candles;
  priceRef.current=currentPrice;
  const ativosCategoria=CATEGORIAS.find(c=>c.label===categoria)?.ativos||ACOES;
  const corCategoria=CATEGORIAS.find(c=>c.label===categoria)?.cor||"#00e5a0";
  const resultadosBusca = busca.trim()
    ? TODOS_ATIVOS.filter(a => a.toLowerCase().includes(busca.trim().toLowerCase())).slice(0, 15)
    : [];
  const enviarOrdem = async () => {
    setOrderLoading(true);
    setOrderMsg("");
    try {
      const res = await authFetch(`${PROXY}/api/ordens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ativo: asset,
          tipo: orderTipo,
          quantidade: parseFloat(orderQtd),
          precoTipo: orderPrecoTipo,
          precoLimite: orderPrecoTipo === "limite" ? parseFloat(orderPrecoLimite) : null,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Erro ao enviar ordem");
      setOrderStep("confirmado");
    } catch (e) {
      setOrderMsg(e.message);
      setOrderStep("form");
    } finally {
      setOrderLoading(false);
    }
  };
  const resetOrderForm = () => {
    setShowOrderForm(false);
    setOrderStep("form");
    setOrderQtd("");
    setOrderPrecoLimite("");
    setOrderPrecoTipo("mercado");
    setOrderMsg("");
    setRiscoConfirmado(false);
  };
  const fetchCandles=useCallback(async(assetName,iv)=>{
    setLoadingData(true);
    try {
      const ivConf=INTERVALS.find(i=>i.value===iv);
      const res=await fetch(`${PROXY}/api/candles?ticker=${assetName}&interval=${iv}&range=${ivConf?.range||"1d"}`);
      const data=await res.json();
      if(data.error) throw new Error(data.error);
      setCandles(data.candles); setCurrentPrice(data.currentPrice);
      setPriceChange(data.currentPrice&&data.previousClose?((data.currentPrice-data.previousClose)/data.previousClose*100):null);
      setLastUpdate(new Date().toLocaleTimeString("pt-BR"));
    } catch(e){console.error(e);}
    finally{setLoadingData(false);}
  },[]);
  const fetchAllPrices=useCallback(async()=>{
    // Busca todos os ativos em lotes de 20 (em vez de truncar nos primeiros 20),
    // em paralelo, e junta o resultado. Se um lote falhar, os outros continuam
    // populando normalmente — não derruba a lista inteira por causa de 1 erro.
    const TAMANHO_LOTE = 20;
    const lotes = [];
    for (let i = 0; i < TODOS_ATIVOS.length; i += TAMANHO_LOTE) {
      lotes.push(TODOS_ATIVOS.slice(i, i + TAMANHO_LOTE));
    }
    try {
      const resultados = await Promise.all(
        lotes.map(lote =>
          fetch(`${PROXY}/api/prices?tickers=${lote.join(",")}`)
            .then(res => res.json())
            .catch(() => ({}))
        )
      );
      setAllPrices(Object.assign({}, ...resultados));
    } catch {}
  },[]);
  // Busca os preços de mercado assim que a tela abre — usados na tela de seleção de ativo
  useEffect(()=>{fetchAllPrices();},[fetchAllPrices]);
  useEffect(()=>{
    if(!asset) return;
    setCandles([]);setCurrentPrice(null);fetchCandles(asset,interval);
  },[asset,interval,fetchCandles]);
  useEffect(()=>{
    (async()=>{
      try{
        const res=await authFetch(`${PROXY}/api/perfil`);
        const data=await res.json();
        if(data.success) setPerfilInvestidor(data.data);
      }catch(e){console.error(e);}
    })();
  },[]);
  // Busca a watchlist (favoritos) do usuário ao montar
  useEffect(()=>{
    authFetch(`${PROXY}/api/watchlist`)
      .then(r=>r.json())
      .then(data=>{ if(data.success) setWatchlist(data.data); })
      .catch(()=>{});
  },[]);
  const selecionarAtivo = (ticker) => {
    setCategoria(categoriaDoAtivo(ticker));
    setAsset(ticker);
    setBusca("");
  };
  // Se a Home mandou um ativo específico pra abrir direto (clique num favorito),
  // seleciona ele assim que a tela monta, e avisa o App.js pra "consumir" esse
  // valor (senão, ao voltar pra essa tela pelo menu, ela reabriria esse mesmo
  // ativo pra sempre).
  useEffect(()=>{
    if(ativoInicial){
      selecionarAtivo(ativoInicial);
      if(limparAtivoInicial) limparAtivoInicial();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[ativoInicial]);
  const alternarFavorito = async (ticker) => {
    const jaFavorito = watchlist.includes(ticker);
    if (jaFavorito) {
      setWatchlist(prev => prev.filter(t => t !== ticker));
      try { await authFetch(`${PROXY}/api/watchlist/${ticker}`, { method: "DELETE" }); } catch (e) { console.error(e); }
    } else {
      setWatchlist(prev => [...prev, ticker]);
      try {
        await authFetch(`${PROXY}/api/watchlist`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticker }),
        });
      } catch (e) { console.error(e); }
    }
  };
  // Categorias consideradas de maior risco/volatilidade
  const ATIVOS_ALTO_RISCO = new Set([...CRIPTO]);
  const isAltoRisco = ATIVOS_ALTO_RISCO.has(asset) || categoria==="Cripto";
  const alertaPerfilRisco = (() => {
    const perfil = perfilInvestidor?.tipoPerfil?.toLowerCase();
    if (!perfil) return null;
    if (perfil.includes("conservador") && (isAltoRisco || categoria==="Ações")) {
      return {
        nivel: "alto",
        texto: `Seu perfil é Conservador, mas ${asset} (${categoria}) tem volatilidade acima do recomendado pra esse perfil. Considere revisar antes de prosseguir.`,
      };
    }
    if (perfil.includes("moderado") && isAltoRisco) {
      return {
        nivel: "medio",
        texto: `Seu perfil é Moderado. ${asset} é um ativo de alta volatilidade (${categoria}) — normalmente indicado em proporção menor da carteira.`,
      };
    }
    return null;
  })();
  const analyzeWithAI=useCallback(async()=>{
    const cands=candlesRef.current, price=priceRef.current;
    if(!cands.length||!price) return;
    setLoadingAI(true);
    try {
      const last20=cands.slice(-20), bullCandles=last20.filter(c=>c.close>c.open).length;
      const trend=bullCandles>=12?"ALTA":bullCandles<=8?"BAIXA":"LATERAL";
      const lastC=cands[cands.length-1];
      const isCripto=CRIPTO.includes(asset), isFII=FIIS.includes(asset), isETF=ETFS.includes(asset);
      const response=await fetch(`${PROXY}/api/ai/analyze`,{
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          systemPrompt:`Analista especialista em ${isCripto?"criptomoedas":isFII?"FIIs":isETF?"ETFs":"ações B3"}. Responda APENAS JSON válido.`,
          prompt:`Ativo:${asset}|Tipo:${isCripto?"Cripto":isFII?"FII":isETF?"ETF":"Ação"}|Preço:R$${price.toFixed(2)}|Tendência:${trend}(${bullCandles}/20)|Último:A${lastC.open.toFixed(2)}F${lastC.close.toFixed(2)}|SL:${stopLoss}%|TP:${takeProfit}%|TF:${interval}\nResponda:{"signal":"COMPRA|VENDA|AGUARDAR","confidence":0-100,"bestInterval":"1m|5m|15m|1h|1d|1wk|1mo","intervalReason":"motivo","reasoning":"análise 2 frases","entry":${price},"sl":${(price*(1-parseFloat(stopLoss)/100)).toFixed(2)},"tp":${(price*(1+parseFloat(takeProfit)/100)).toFixed(2)},"horizonte":"daytrade|swing|longo prazo","score":0-10}`,
        }),
      });
      const data=await response.json();
      if(!data.success) throw new Error(data.error);
      const parsed=data.data, time=new Date().toLocaleTimeString("pt-BR");
      setLogs(prev=>[{id:Date.now(),time,asset,signal:parsed.signal,price,confidence:parsed.confidence,bestInterval:parsed.bestInterval,reasoning:`[${parsed.confidence}%|${parsed.bestInterval}|Score:${parsed.score}/10] ${parsed.reasoning}`,horizonte:parsed.horizonte},...prev].slice(0,20));
      setLastAnalysis(parsed);
      setStats(prev=>({ops:prev.ops+1,wins:prev.wins+(parsed.signal!=="AGUARDAR"&&parsed.confidence>65?1:0),pnl:prev.pnl+(parsed.signal==="COMPRA"?(Math.random()*2-0.4):0)}));
      if(parsed.bestInterval&&parsed.bestInterval!==interval) setInterval(parsed.bestInterval);
      if(parsed.signal!=="AGUARDAR"&&parsed.confidence>=75&&permissao==="granted"){
        notificar({title:`${parsed.signal==="COMPRA"?"▲":"▼"} Sinal ${parsed.signal} — ${asset}`,body:`Confiança: ${parsed.confidence}% | Preço: R$${price.toFixed(2)} | Score: ${parsed.score}/10`,tag:`sinal-${asset}`});
      }
    } catch(e){console.error(e);}
    finally{setLoadingAI(false);}
  },[asset,interval,stopLoss,takeProfit,notificar,permissao]);
  useEffect(()=>{
    if(!running) return;
    const d=setInterval(()=>{fetchCandles(asset,interval);fetchAllPrices();},60000);
    const a=setInterval(()=>analyzeWithAI(),45000);
    fetchAllPrices(); analyzeWithAI();
    return()=>{clearInterval(d);clearInterval(a);};
  },[running,asset,interval]);
  const priceColor=priceChange===null?cores.textPrimary:priceChange>=0?"#00e5a0":"#ff4d6d";
  const winRate=stats.ops>0?((stats.wins/stats.ops)*100).toFixed(1):"0.0";

  // ── Sem ativo selecionado ainda: mostra a tela de busca/seleção ──
  if (!asset) {
    return (
      <SeletorAtivo
        cores={cores}
        isMobile={isMobile}
        busca={busca}
        setBusca={setBusca}
        resultadosBusca={resultadosBusca}
        allPrices={allPrices}
        onSelecionar={selecionarAtivo}
        categoriaSelecionada={categoria}
        setCategoriaSelecionada={setCategoria}
        watchlist={watchlist}
        onToggleFavorito={alternarFavorito}
      />
    );
  }

  return (
    <div style={{ padding:isMobile?"12px":"20px", maxWidth:"1200px", margin:"0 auto" }}>
      <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)", gap:"10px", marginBottom:"14px" }}>
        {[
          {label:"PREÇO",value:currentPrice?`R$ ${currentPrice.toFixed(2)}`:"...",sub:priceChange!==null?`${priceChange>=0?"+":""}${priceChange.toFixed(2)}%`:"",color:priceColor},
          {label:"OPERAÇÕES",value:stats.ops,sub:"analisadas",color:cores.textPrimary},
          {label:"WIN RATE",value:`${winRate}%`,sub:`${stats.wins}W`,color:parseFloat(winRate)>50?"#00e5a0":"#ff4d6d"},
          {label:"SCORE IA",value:lastAnalysis?.score!==undefined?`${lastAnalysis.score}/10`:"—",sub:lastAnalysis?.horizonte||"aguardando",color:"#ffd60a"},
        ].map((s,i)=>(
          <div key={i} style={{ background:cores.card, border:`1px solid ${cores.border}`, borderRadius:"10px", padding:"12px 14px" }}>
            <div style={{ color:cores.textFaint, fontSize:"9px", fontFamily:"monospace", letterSpacing:"0.1em", marginBottom:"4px" }}>{s.label}</div>
            <div style={{ color:s.color, fontSize:isMobile?"18px":"22px", fontWeight:"700" }}>{s.value}</div>
            <div style={{ color:cores.textFaint, fontSize:"10px", marginTop:"2px" }}>{s.sub}</div>
          </div>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"300px 1fr", gap:"14px" }}>
        <div>
          <div style={{ background:cores.card, border:`1px solid ${cores.border}`, borderRadius:"12px", padding:"16px", marginBottom:"12px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"12px" }}>
              <div style={{ color:cores.textFaint, fontSize:"9px", fontFamily:"monospace", letterSpacing:"0.1em" }}>CONFIGURAÇÃO</div>
              <button onClick={()=>setAsset(null)}
                style={{ background:"none", border:"none", color:corCategoria, fontSize:"11px", fontWeight:"600", cursor:"pointer", fontFamily:"inherit", padding:0, display:"flex", alignItems:"center", gap:"4px" }}>
                <Search size={12} strokeWidth={ICON_STROKE} /> Trocar ativo
              </button>
            </div>
            <div style={{ marginBottom:"10px" }}>
              <label style={{ display:"block", color:cores.textSecondary, fontSize:"11px", marginBottom:"6px" }}>Categoria</label>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"4px" }}>
                {CATEGORIAS.map(cat=>(
                  <button key={cat.label} onClick={()=>{setCategoria(cat.label);setAsset(cat.ativos[0]);}}
                    style={{ background:categoria===cat.label?`${cat.cor}22`:cores.cardInner, border:`1px solid ${categoria===cat.label?cat.cor:cores.border}`, color:categoria===cat.label?cat.cor:cores.textSecondary, borderRadius:"6px", padding:"6px 4px", fontSize:"10px", fontWeight:"700", cursor:"pointer" }}>
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom:"10px" }}>
              <label style={{ display:"block", color:cores.textSecondary, fontSize:"11px", marginBottom:"4px" }}>Ativo</label>
              <select value={asset} onChange={e=>setAsset(e.target.value)} disabled={running}
                style={{ width:"100%", background:cores.cardInner, border:`1px solid ${corCategoria}44`, color:cores.textPrimary, borderRadius:"8px", padding:"10px 12px", fontSize:"14px", fontFamily:"monospace" }}>
                {ativosCategoria.map(a=><option key={a} value={a}>{a} {allPrices[a]?`· R$${allPrices[a].price?.toFixed(2)}`:""}</option>)}
              </select>
            </div>
            <div style={{ marginBottom:"10px" }}>
              <label style={{ display:"block", color:cores.textSecondary, fontSize:"11px", marginBottom:"4px" }}>Timeframe</label>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:"3px" }}>
                {INTERVALS.map(iv=>(
                  <button key={iv.value} onClick={()=>setInterval(iv.value)}
                    style={{ background:interval===iv.value?`${corCategoria}22`:cores.cardInner, border:`1px solid ${interval===iv.value?corCategoria:cores.border}`, color:interval===iv.value?corCategoria:cores.textSecondary, borderRadius:"5px", padding:"6px 2px", fontSize:"9px", fontWeight:"600", cursor:"pointer" }}>
                    {iv.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px", marginBottom:"12px" }}>
              {[{label:"Stop Loss %",val:stopLoss,set:setStopLoss},{label:"Take Profit %",val:takeProfit,set:setTakeProfit}].map((f,i)=>(
                <div key={i}>
                  <label style={{ display:"block", color:cores.textSecondary, fontSize:"11px", marginBottom:"4px" }}>{f.label}</label>
                  <input type="number" value={f.val} onChange={e=>f.set(e.target.value)} disabled={running} step="0.1"
                    style={{ width:"100%", background:cores.cardInner, border:`1px solid ${cores.border}`, color:cores.textPrimary, borderRadius:"8px", padding:"10px 12px", fontSize:"14px", fontFamily:"monospace" }} />
                </div>
              ))}
            </div>
            {/* Botões de ação: Analisar com IA + Enviar Ordem, lado a lado */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px", marginBottom:"8px" }}>
              <button onClick={()=>setRunning(r=>!r)}
                style={{ background:running?"#ff4d6d22":`linear-gradient(135deg,${corCategoria},#006eff)`, color:running?"#ff4d6d":"#000", border:running?"1px solid #ff4d6d55":"none", borderRadius:"10px", padding:"13px 6px", fontSize:"13px", fontWeight:"700", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"6px" }}>
                {running ? <><Square size={14} strokeWidth={ICON_STROKE} /> Parar IA</> : <><Bot size={14} strokeWidth={ICON_STROKE} /> Analisar IA</>}
              </button>
              <button onClick={()=>{setShowOrderForm(true);setOrderStep("form");}}
                style={{ background:cores.cardInner, color:"#00e5a0", border:"1px solid #00e5a055", borderRadius:"10px", padding:"13px 6px", fontSize:"13px", fontWeight:"700", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"6px" }}>
                <DollarSign size={14} strokeWidth={ICON_STROKE} /> Enviar Ordem
              </button>
            </div>
            <button onClick={()=>fetchCandles(asset,interval)}
              style={{ width:"100%", background:cores.cardInner, border:`1px solid ${cores.border}`, color:cores.textSecondary, borderRadius:"8px", padding:"9px", fontSize:"12px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"6px" }}>
              <RefreshCw size={13} strokeWidth={ICON_STROKE} /> Atualizar
            </button>
          </div>
          {logs[0]&&(
            <div style={{ background:cores.card, border:`1px solid ${logs[0].signal==="COMPRA"?"#00e5a044":logs[0].signal==="VENDA"?"#ff4d6d44":"#ffd60a44"}`, borderRadius:"12px", padding:"14px", marginBottom:"12px" }}>
              <div style={{ color:cores.textFaint, fontSize:"9px", fontFamily:"monospace", letterSpacing:"0.1em", marginBottom:"8px" }}>ÚLTIMO SINAL</div>
              <div style={{ marginBottom:"6px" }}><Badge type={logs[0].signal}/></div>
              <p style={{ color:cores.textSecondary, fontSize:"12px", lineHeight:"1.6", margin:0 }}>{logs[0].reasoning}</p>
              {logs[0].horizonte&&<div style={{ color:cores.textFaint, fontSize:"10px", marginTop:"6px", fontFamily:"monospace", display:"flex", alignItems:"center", gap:"4px" }}><Calendar size={11} strokeWidth={ICON_STROKE} /> {logs[0].horizonte}</div>}
              <div style={{ color:cores.textFaint, fontSize:"9px", marginTop:"8px", fontFamily:"monospace", borderTop:`1px solid ${cores.border}`, paddingTop:"6px", display:"flex", alignItems:"center", gap:"5px" }}>
                <AlertTriangle size={11} strokeWidth={ICON_STROKE} /> Análise gerada por IA — pode conter erros. Não é recomendação personalizada de investimento.
              </div>
            </div>
          )}
          <div style={{ background:cores.card, border:`1px solid ${cores.border}`, borderRadius:"12px", padding:"14px" }}>
            <button onClick={()=>setShowPrices(p=>!p)}
              style={{ width:"100%", background:"none", border:"none", color:cores.textFaint, fontSize:"10px", fontFamily:"monospace", letterSpacing:"0.1em", cursor:"pointer", display:"flex", justifyContent:"space-between", padding:0 }}>
              <span style={{ display:"flex", alignItems:"center", gap:"5px" }}>MERCADO AO VIVO <Zap size={11} strokeWidth={ICON_STROKE} /></span><span>{showPrices?"▲":"▼"}</span>
            </button>
            {(showPrices||!isMobile)&&(
              <div style={{ marginTop:"10px" }}>
                {ativosCategoria.slice(0,8).map(a=>{
                  const p=allPrices[a];
                  return (
                    <div key={a} onClick={()=>setAsset(a)} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 0", borderBottom:`1px solid ${cores.border}`, cursor:"pointer" }}>
                      <span style={{ fontFamily:"monospace", fontSize:"12px", color:a===asset?corCategoria:cores.textSecondary, fontWeight:a===asset?"700":"400" }}>{a}</span>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontFamily:"monospace", fontSize:"12px", color:cores.textPrimary }}>{p?.price?`R$ ${p.price.toFixed(2)}`:"..."}</div>
                        {p?.change!==undefined&&<div style={{ fontSize:"10px", color:p.change>=0?"#00e5a0":"#ff4d6d" }}>{p.change>=0?"+":""}{p.change.toFixed(2)}%</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <div>
          <div style={{ background:cores.card, border:`1px solid ${cores.border}`, borderRadius:"12px", padding:"16px", marginBottom:"12px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"8px" }}>
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                  <span style={{ color:corCategoria, fontSize:"10px", fontFamily:"monospace", background:`${corCategoria}22`, border:`1px solid ${corCategoria}44`, borderRadius:"4px", padding:"2px 6px" }}>{categoria}</span>
                  <span style={{ color:cores.textFaint, fontSize:"9px", fontFamily:"monospace" }}>{asset}·{INTERVALS.find(i=>i.value===interval)?.label}</span>
                  <button onClick={()=>alternarFavorito(asset)}
                    style={{ background:"none", border:"none", cursor:"pointer", padding:0, display:"flex" }}>
                    <Star size={15} strokeWidth={ICON_STROKE} color={watchlist.includes(asset) ? "#ffd60a" : cores.textFaint} fill={watchlist.includes(asset) ? "#ffd60a" : "none"} />
                  </button>
                </div>
                <div style={{ color:priceColor, fontSize:isMobile?"20px":"24px", fontWeight:"700", fontFamily:"monospace", marginTop:"4px" }}>{currentPrice?`R$ ${currentPrice.toFixed(2)}`:"..."}</div>
                {lastUpdate&&<div style={{ color:cores.textFaint, fontSize:"10px", fontFamily:"monospace" }}>{lastUpdate}</div>}
              </div>
              <div style={{ textAlign:"right" }}>
                {loadingData&&<RefreshCw size={13} strokeWidth={ICON_STROKE} color={cores.textSecondary} className="spin" />}
                {loadingAI&&<div style={{ color:corCategoria, fontSize:"11px", display:"flex", alignItems:"center", gap:"4px" }}><Bot size={12} strokeWidth={ICON_STROKE} /> analisando...</div>}
              </div>
            </div>
            <CandleChart candles={candles} width={isMobile?340:700} height={isMobile?140:200} linhaBase={cores.linhaBase}/>
          </div>
          <div style={{ background:cores.card, border:`1px solid ${cores.border}`, borderRadius:"12px", padding:"16px", maxHeight:isMobile?"280px":"350px", overflowY:"auto" }}>
            <div style={{ color:cores.textFaint, fontSize:"9px", fontFamily:"monospace", letterSpacing:"0.1em", marginBottom:"12px" }}>LOG {logs.length>0&&`(${logs.length})`}</div>
            {logs.length===0?(
              <div style={{ color:cores.textFaint, fontSize:"13px", textAlign:"center", padding:"30px 0" }}>{running?"Aguardando...":"Inicie a IA"}</div>
            ):logs.map(l=>(
              <div key={l.id} style={{ borderLeft:`3px solid ${l.signal==="COMPRA"?"#00e5a0":l.signal==="VENDA"?"#ff4d6d":"#ffd60a"}`, paddingLeft:"10px", marginBottom:"12px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"6px", marginBottom:"4px", flexWrap:"wrap" }}>
                  <span style={{ color:cores.textFaint, fontSize:"10px", fontFamily:"monospace" }}>{l.time}</span>
                  <Badge type={l.signal}/>
                  <span style={{ color:cores.textPrimary, fontWeight:"700", fontSize:"12px" }}>{l.asset}</span>
                </div>
                <p style={{ color:cores.textSecondary, fontSize:"11px", lineHeight:"1.6", margin:0 }}>{l.reasoning}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* ── Modal: Enviar Ordem ── */}
      {showOrderForm && (
        <div
          style={{ position:"fixed", inset:0, background:"#000000aa", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}
          onClick={e=>e.target===e.currentTarget && resetOrderForm()}
        >
          <div style={{ background:cores.card, border:`1px solid ${cores.border}`, borderRadius:"16px", padding:"24px", width:"100%", maxWidth:"380px" }}>
            {orderStep==="form" && (
              <>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"16px" }}>
                  <h3 style={{ color:cores.textPrimary, fontSize:"16px", margin:0 }}>Enviar Ordem — {asset}</h3>
                  <button onClick={resetOrderForm} style={{ background:"none", border:"none", color:cores.textFaint, fontSize:"18px", cursor:"pointer" }}>×</button>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px", marginBottom:"14px" }}>
                  <button onClick={()=>setOrderTipo("compra")}
                    style={{ background:orderTipo==="compra"?"#00e5a022":cores.cardInner, border:`1px solid ${orderTipo==="compra"?"#00e5a0":cores.border}`, color:orderTipo==="compra"?"#00e5a0":cores.textSecondary, borderRadius:"8px", padding:"10px", fontSize:"13px", fontWeight:"700", cursor:"pointer" }}>
                    ▲ Compra
                  </button>
                  <button onClick={()=>setOrderTipo("venda")}
                    style={{ background:orderTipo==="venda"?"#ff4d6d22":cores.cardInner, border:`1px solid ${orderTipo==="venda"?"#ff4d6d":cores.border}`, color:orderTipo==="venda"?"#ff4d6d":cores.textSecondary, borderRadius:"8px", padding:"10px", fontSize:"13px", fontWeight:"700", cursor:"pointer" }}>
                    ▼ Venda
                  </button>
                </div>
                <div style={{ marginBottom:"12px" }}>
                  <label style={{ display:"block", color:cores.textSecondary, fontSize:"11px", marginBottom:"4px" }}>Quantidade</label>
                  <input type="number" value={orderQtd} onChange={e=>setOrderQtd(e.target.value)} placeholder="Ex: 100"
                    style={{ width:"100%", background:cores.cardInner, border:`1px solid ${cores.border}`, color:cores.textPrimary, borderRadius:"8px", padding:"10px 12px", fontSize:"14px", fontFamily:"monospace" }} />
                </div>
                <div style={{ marginBottom:"12px" }}>
                  <label style={{ display:"block", color:cores.textSecondary, fontSize:"11px", marginBottom:"4px" }}>Tipo de preço</label>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px" }}>
                    <button onClick={()=>setOrderPrecoTipo("mercado")}
                      style={{ background:orderPrecoTipo==="mercado"?`${corCategoria}22`:cores.cardInner, border:`1px solid ${orderPrecoTipo==="mercado"?corCategoria:cores.border}`, color:orderPrecoTipo==="mercado"?corCategoria:cores.textSecondary, borderRadius:"8px", padding:"9px", fontSize:"12px", cursor:"pointer" }}>
                      A Mercado
                    </button>
                    <button onClick={()=>setOrderPrecoTipo("limite")}
                      style={{ background:orderPrecoTipo==="limite"?`${corCategoria}22`:cores.cardInner, border:`1px solid ${orderPrecoTipo==="limite"?corCategoria:cores.border}`, color:orderPrecoTipo==="limite"?corCategoria:cores.textSecondary, borderRadius:"8px", padding:"9px", fontSize:"12px", cursor:"pointer" }}>
                      Preço Limite
                    </button>
                  </div>
                </div>
                {orderPrecoTipo==="limite" && (
                  <div style={{ marginBottom:"12px" }}>
                    <label style={{ display:"block", color:cores.textSecondary, fontSize:"11px", marginBottom:"4px" }}>Preço limite (R$)</label>
                    <input type="number" value={orderPrecoLimite} onChange={e=>setOrderPrecoLimite(e.target.value)} placeholder={currentPrice?currentPrice.toFixed(2):""}
                      style={{ width:"100%", background:cores.cardInner, border:`1px solid ${cores.border}`, color:cores.textPrimary, borderRadius:"8px", padding:"10px 12px", fontSize:"14px", fontFamily:"monospace" }} />
                  </div>
                )}
                {alertaPerfilRisco && (
                  <div style={{
                    background: alertaPerfilRisco.nivel==="alto" ? "#ff4d6d15" : "#ffd60a15",
                    border: `1px solid ${alertaPerfilRisco.nivel==="alto" ? "#ff4d6d44" : "#ffd60a44"}`,
                    borderRadius:"8px", padding:"10px", marginBottom:"12px",
                    color: alertaPerfilRisco.nivel==="alto" ? "#ff4d6d" : "#ffd60a",
                    fontSize:"12px", lineHeight:"1.5", fontWeight:"600", display:"flex", gap:"8px"
                  }}>
                    {alertaPerfilRisco.nivel==="alto" ? <Ban size={15} strokeWidth={ICON_STROKE} style={{flexShrink:0, marginTop:"1px"}} /> : <AlertTriangle size={15} strokeWidth={ICON_STROKE} style={{flexShrink:0, marginTop:"1px"}} />}
                    <div>
                      {alertaPerfilRisco.texto}
                      {alertaPerfilRisco.nivel==="alto" && (
                        <label style={{ display:"flex", alignItems:"center", gap:"8px", marginTop:"10px", fontWeight:"400", fontSize:"11px", cursor:"pointer" }}>
                          <input type="checkbox" checked={riscoConfirmado} onChange={e=>setRiscoConfirmado(e.target.checked)} />
                          Entendo o risco e quero continuar mesmo assim
                        </label>
                      )}
                    </div>
                  </div>
                )}
                {orderMsg && (
                  <div style={{ background:"#ff4d6d15", border:"1px solid #ff4d6d44", borderRadius:"8px", padding:"10px", marginBottom:"12px", color:"#ff4d6d", fontSize:"12px", display:"flex", gap:"6px" }}>
                    <AlertTriangle size={13} strokeWidth={ICON_STROKE} style={{flexShrink:0, marginTop:"1px"}} /> {orderMsg}
                  </div>
                )}
                <div style={{ background:"#ffd60a11", border:"1px solid #ffd60a33", borderRadius:"8px", padding:"10px", marginBottom:"14px", color:"#ffd60a", fontSize:"11px", lineHeight:"1.5", display:"flex", gap:"6px" }}>
                  <AlertTriangle size={13} strokeWidth={ICON_STROKE} style={{flexShrink:0, marginTop:"1px"}} />
                  <span>Ordem fica pendente até confirmação de execução. Análise da IA (se usada) pode conter erros e não é recomendação personalizada.</span>
                </div>
                <button
                  disabled={!orderQtd || (orderPrecoTipo==="limite" && !orderPrecoLimite) || (alertaPerfilRisco?.nivel==="alto" && !riscoConfirmado)}
                  onClick={()=>setOrderStep("revisar")}
                  style={{ width:"100%", background: (!orderQtd || (orderPrecoTipo==="limite" && !orderPrecoLimite) || (alertaPerfilRisco?.nivel==="alto" && !riscoConfirmado)) ? "#555" : `linear-gradient(135deg,${corCategoria},#006eff)`, color:"#000", border:"none", borderRadius:"10px", padding:"13px", fontSize:"14px", fontWeight:"700", cursor:"pointer" }}>
                  Revisar Ordem
                </button>
              </>
            )}
            {orderStep==="revisar" && (
              <>
                <h3 style={{ color:cores.textPrimary, fontSize:"16px", marginBottom:"16px" }}>Confirme sua ordem</h3>
                <div style={{ background:cores.cardInner, border:`1px solid ${cores.border}`, borderRadius:"10px", padding:"14px", marginBottom:"16px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:`1px solid ${cores.border}` }}>
                    <span style={{ color:cores.textSecondary, fontSize:"12px" }}>Ativo</span><span style={{ color:cores.textPrimary, fontSize:"12px", fontWeight:"700" }}>{asset}</span>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:`1px solid ${cores.border}` }}>
                    <span style={{ color:cores.textSecondary, fontSize:"12px" }}>Operação</span><span style={{ color:orderTipo==="compra"?"#00e5a0":"#ff4d6d", fontSize:"12px", fontWeight:"700" }}>{orderTipo==="compra"?"▲ COMPRA":"▼ VENDA"}</span>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:`1px solid ${cores.border}` }}>
                    <span style={{ color:cores.textSecondary, fontSize:"12px" }}>Quantidade</span><span style={{ color:cores.textPrimary, fontSize:"12px", fontWeight:"700" }}>{orderQtd}</span>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", padding:"6px 0" }}>
                    <span style={{ color:cores.textSecondary, fontSize:"12px" }}>Preço</span>
                    <span style={{ color:cores.textPrimary, fontSize:"12px", fontWeight:"700" }}>{orderPrecoTipo==="mercado"?"A mercado":`R$ ${orderPrecoLimite}`}</span>
                  </div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px" }}>
                  <button onClick={()=>setOrderStep("form")} disabled={orderLoading}
                    style={{ background:cores.cardInner, border:`1px solid ${cores.border}`, color:cores.textSecondary, borderRadius:"10px", padding:"12px", fontSize:"13px", cursor:"pointer" }}>
                    Voltar
                  </button>
                  <button onClick={enviarOrdem} disabled={orderLoading}
                    style={{ background:orderLoading?"#555":`linear-gradient(135deg,${corCategoria},#006eff)`, color:"#000", border:"none", borderRadius:"10px", padding:"12px", fontSize:"13px", fontWeight:"700", cursor:orderLoading?"not-allowed":"pointer" }}>
                    {orderLoading?"Enviando...":"Confirmar"}
                  </button>
                </div>
              </>
            )}
            {orderStep==="confirmado" && (
              <div style={{ textAlign:"center", padding:"10px 0" }}>
                <CheckCircle2 size={40} strokeWidth={ICON_STROKE} color="#00e5a0" style={{ marginBottom:"12px" }} />
                <h3 style={{ color:cores.textPrimary, fontSize:"16px", marginBottom:"8px" }}>Ordem enviada!</h3>
                <p style={{ color:cores.textSecondary, fontSize:"13px", marginBottom:"20px" }}>
                  Sua ordem de {orderTipo} de {orderQtd} {asset} está <strong style={{color:"#ffd60a"}}>pendente</strong>. Você pode acompanhar o status na tela de Histórico.
                </p>
                <button onClick={resetOrderForm}
                  style={{ width:"100%", background:`linear-gradient(135deg,${corCategoria},#006eff)`, color:"#000", border:"none", borderRadius:"10px", padding:"12px", fontSize:"13px", fontWeight:"700", cursor:"pointer" }}>
                  Fechar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      <div style={{ marginTop:"12px", padding:"10px 14px", background:cores.card, border:"1px solid #ff4d6d22", borderRadius:"10px", display:"flex", alignItems:"center", gap:"6px" }}>
        <AlertTriangle size={12} strokeWidth={ICON_STROKE} color={cores.textSecondary} />
        <span style={{ color:cores.textSecondary, fontSize:"11px" }}>Sistema educacional · Ações · FIIs · ETFs · Cripto · Dados: Brapi</span>
        <Zap size={11} strokeWidth={ICON_STROKE} color={cores.textSecondary} />
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import Dashboard, { useIsMobile } from "./Dashboard";
import Backtesting from "./Backtesting";
import PaperTrading from "./PaperTrading";
import Login from "./Login";
import Chat from "./Chat";
import Alertas from "./Alertas";
import Score from "./Score";
import Relatorio from "./Relatorio";
import Perfil from "./Perfil";
import Home from "./Home";
import Sidebar, { MENU_ITEMS } from "./Sidebar";
import ConfigNotificacoes, { useNotificacoes, registrarSW } from "./Notificacoes";

const PROXY = "https://daytrade-proxy.onrender.com";

const keepProxyAwake = () => {
  const ping = () => fetch(`${PROXY}/health`).catch(() => {});
  ping();
  setInterval(ping, 10 * 60 * 1000);
};

function checkSession() {
  try {
    const stored = sessionStorage.getItem("tradeai_auth");
    if (!stored) return false;
    const { expiry } = JSON.parse(stored);
    if (Date.now() > expiry) { sessionStorage.removeItem("tradeai_auth"); return false; }
    return true;
  } catch { return false; }
}

// Encontra label/icone da página atual para o título do header
function getPageInfo(pageId) {
  for (const section of MENU_ITEMS) {
    const found = section.items.find(i => i.id === pageId);
    if (found) return found;
  }
  return { label: "TradeAI", icon: "⚡" };
}

export default function App() {
  const [autenticado, setAutenticado] = useState(checkSession);
  const [page, setPage] = useState("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [proxyOk, setProxyOk] = useState(null);
  const [proxyWaking, setProxyWaking] = useState(false);
  const [showNotifConfig, setShowNotifConfig] = useState(false);
  const isMobile = useIsMobile();
  const { permissao } = useNotificacoes();

  useEffect(() => {
    if (!autenticado) return;
    keepProxyAwake();
    registrarSW();
    const check = () => {
      fetch(`${PROXY}/health`).then(r => r.json()).then(() => { setProxyOk(true); setProxyWaking(false); }).catch(() => { setProxyOk(false); setProxyWaking(true); });
    };
    check();
    const i = setInterval(check, 15000);
    return () => clearInterval(i);
  }, [autenticado]);

  const handleLogout = () => { sessionStorage.removeItem("tradeai_auth"); setAutenticado(false); };
  if (!autenticado) return <Login onLogin={() => setAutenticado(true)} />;

  const pageInfo = getPageInfo(page);
  const notifColor = permissao === "granted" ? "#00e5a0" : permissao === "denied" ? "#ff4d6d" : "#ffd60a";

  return (
    <div style={{ minHeight: "100vh", background: "#080c14", fontFamily: "'DM Sans','Segoe UI',sans-serif", color: "#e0e6f0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;700&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#333;border-radius:2px}
        select,input,textarea{outline:none}
        .pulse{animation:pulse 2s infinite}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        button{transition:transform 0.08s ease}
        button:active{transform:scale(0.97)}
      `}</style>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} page={page} setPage={setPage} onLogout={handleLogout} />

      {showNotifConfig && (
        <div style={{ position: "fixed", inset: 0, background: "#000000aa", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
          onClick={e => e.target === e.currentTarget && setShowNotifConfig(false)}>
          <ConfigNotificacoes onClose={() => setShowNotifConfig(false)} />
        </div>
      )}

      {/* Header */}
      <div style={{ background: "#0a0f1a", borderBottom: "1px solid #1e2d45", padding: isMobile ? "12px 14px" : "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Botão hambúrguer (3 barras) */}
          <button onClick={() => setSidebarOpen(true)}
            style={{ background: "#0d1320", border: "1px solid #1e2d45", color: "#aaa", borderRadius: "9px", width: "38px", height: "38px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "3px", cursor: "pointer" }}>
            <span style={{ display: "block", width: "16px", height: "2px", background: "#aaa", borderRadius: "1px" }} />
            <span style={{ display: "block", width: "16px", height: "2px", background: "#aaa", borderRadius: "1px" }} />
            <span style={{ display: "block", width: "16px", height: "2px", background: "#aaa", borderRadius: "1px" }} />
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {page === "home" ? (
              <>
                <div style={{ width: "28px", height: "28px", background: "linear-gradient(135deg,#00e5a0,#006eff)", borderRadius: "7px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>⚡</div>
                <div style={{ fontWeight: "700", fontSize: "15px" }}>TRADE<span style={{ color: "#00e5a0" }}>AI</span></div>
              </>
            ) : (
              <>
                <span style={{ fontSize: "18px" }}>{pageInfo.icon}</span>
                <div style={{ fontWeight: "700", fontSize: "15px" }}>{pageInfo.label}</div>
              </>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button onClick={() => setShowNotifConfig(true)} title="Notificações"
            style={{ background: `${notifColor}15`, border: `1px solid ${notifColor}33`, color: notifColor, borderRadius: "8px", padding: "7px 9px", fontSize: "14px", cursor: "pointer" }}>
            {permissao === "granted" ? "🔔" : "🔕"}
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "5px", background: "#0d1320", border: "1px solid #1e2d45", borderRadius: "8px", padding: "7px 10px" }}>
            <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: proxyOk === null ? "#555" : proxyOk ? "#00e5a0" : "#ffd60a" }} className={proxyWaking ? "pulse" : ""} />
            {!isMobile && <span style={{ color: proxyOk ? "#00e5a0" : "#ffd60a", fontSize: "10px", fontFamily: "monospace" }}>{proxyOk ? "ONLINE" : "ACORDANDO..."}</span>}
          </div>
        </div>
      </div>

      {proxyWaking && (
        <div style={{ background: "#ffd60a11", border: "1px solid #ffd60a33", margin: "10px 14px", borderRadius: "10px", padding: "10px 14px", display: "flex", alignItems: "center", gap: "8px" }}>
          <span className="pulse">⏳</span>
          <span style={{ color: "#ffd60a", fontSize: "12px" }}>Servidor acordando... Aguarde até 60 segundos.</span>
        </div>
      )}

      {permissao === "default" && (
        <div style={{ background: "#6af11", border: "1px solid #6af33", margin: "10px 14px", borderRadius: "10px", padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
          <span style={{ color: "#6af", fontSize: "12px" }}>📱 Ative as notificações push para receber alertas no celular!</span>
          <button onClick={() => setShowNotifConfig(true)}
            style={{ background: "#6af22", border: "1px solid #6af55", color: "#6af", borderRadius: "6px", padding: "5px 12px", fontSize: "11px", fontWeight: "700", cursor: "pointer", whiteSpace: "nowrap" }}>
            Ativar
          </button>
        </div>
      )}

      {/* Páginas */}
      <div style={{ display: page === "home" ? "block" : "none" }}><Home setPage={setPage} /></div>
      <div style={{ display: page === "dashboard" ? "block" : "none" }}><Dashboard /></div>
      <div style={{ display: page === "investimentos" ? "block" : "none" }}><InvestimentosPlaceholder setPage={setPage} /></div>
      <div style={{ display: page === "chat" ? "block" : "none" }}><Chat /></div>
      <div style={{ display: page === "score" ? "block" : "none" }}><Score /></div>
      <div style={{ display: page === "alertas" ? "block" : "none" }}><Alertas /></div>
      <div style={{ display: page === "relatorio" ? "block" : "none" }}><Relatorio /></div>
      <div style={{ display: page === "backtesting" ? "block" : "none" }}><Backtesting /></div>
      <div style={{ display: page === "papertrading" ? "block" : "none" }}><PaperTrading /></div>
      <div style={{ display: page === "perfil" ? "block" : "none" }}><Perfil /></div>
    </div>
  );
}

// Placeholder temporário — substituído na próxima etapa pela tela completa de Investimentos
function InvestimentosPlaceholder({ setPage }) {
  return (
    <div style={{ padding: "14px", maxWidth: "600px", margin: "0 auto", textAlign: "center" }}>
      <div style={{ fontSize: "56px", marginTop: "40px", marginBottom: "16px" }}>💼</div>
      <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "10px" }}>Investimentos</h2>
      <p style={{ color: "#666", fontSize: "13px", lineHeight: "1.7", marginBottom: "20px" }}>
        Em breve: Renda Fixa, Tesouro Direto, CDB, LCI/LCA, COE e Previdência Privada — tudo integrado ao seu perfil de investidor.
      </p>
      <div style={{ background: "#0d1320", border: "1px solid #1e2d45", borderRadius: "12px", padding: "16px", marginBottom: "16px", textAlign: "left" }}>
        <div style={{ color: "#444", fontSize: "10px", fontFamily: "monospace", letterSpacing: "0.1em", marginBottom: "10px" }}>PRÓXIMA ATUALIZAÇÃO</div>
        {["Tesouro Selic, IPCA+, Prefixado com simulador", "CDB, LCI, LCA com comparador de taxas", "Alocação automática baseada no seu perfil", "Controle de orçamento por categoria"].map((t, i) => (
          <div key={i} style={{ display: "flex", gap: "8px", padding: "6px 0", color: "#888", fontSize: "12px" }}>
            <span style={{ color: "#00e5a0" }}>•</span> {t}
          </div>
        ))}
      </div>
      <button onClick={() => setPage("home")}
        style={{ background: "#111a27", border: "1px solid #1e2d45", color: "#888", borderRadius: "10px", padding: "12px 24px", fontSize: "13px", cursor: "pointer" }}>
        ← Voltar para Home
      </button>
    </div>
  );
}

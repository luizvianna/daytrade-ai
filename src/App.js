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
import Investimentos from "./Investimentos";
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

function getPageInfo(pageId) {
  for (const section of MENU_ITEMS) {
    const found = section.items.find(i => i.id === pageId);
    if (found) return found;
  }
  return { label: "TradeAI", icon: "⚡" };
}

function PageContent({ page, setPage }) {
  switch (page) {
    case "home":         return <Home setPage={setPage} />;
    case "dashboard":    return <Dashboard />;
    case "investimentos":return <Investimentos setPage={setPage} />;
    case "chat":         return <Chat />;
    case "score":        return <Score />;
    case "alertas":      return <Alertas />;
    case "relatorio":    return <Relatorio />;
    case "backtesting":  return <Backtesting />;
    case "papertrading": return <PaperTrading />;
    case "perfil":       return <Perfil />;
    default:             return <Home setPage={setPage} />;
  }
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
      fetch(`${PROXY}/health`)
        .then(r => r.json())
        .then(() => { setProxyOk(true); setProxyWaking(false); })
        .catch(() => { setProxyOk(false); setProxyWaking(true); });
    };
    check();
    const i = setInterval(check, 15000);
    return () => clearInterval(i);
  }, [autenticado]);

  const handleLogout = () => {
    sessionStorage.removeItem("tradeai_auth");
    setAutenticado(false);
  };

  if (!autenticado) return <Login onLogin={() => setAutenticado(true)} />;

  const pageInfo = getPageInfo(page);
  const notifColor = permissao === "granted" ? "#00e5a0" : permissao === "denied" ? "#ff4d6d" : "#ffd60a";

  return (
    <div style={{ minHeight: "100vh", background: "#080c14", fontFamily: "'DM Sans','Segoe UI',sans-serif", color: "#e0e6f0" }}>


      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        page={page}
        setPage={setPage}
        onLogout={handleLogout}
      />

      {showNotifConfig && (
        <div
          style={{ position: "fixed", inset: 0, background: "#000000aa", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
          onClick={e => e.target === e.currentTarget && setShowNotifConfig(false)}
        >
          <ConfigNotificacoes onClose={() => setShowNotifConfig(false)} />
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ background: "#0a0f1a", borderBottom: "1px solid #1e2d45", padding: isMobile ? "12px 14px" : "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Hambúrguer */}
          <button
            onClick={() => setSidebarOpen(true)}
            style={{ background: "#0d1320", border: "1px solid #1e2d45", borderRadius: "9px", width: "38px", height: "38px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px", padding: 0 }}
          >
            <span style={{ display: "block", width: "16px", height: "2px", background: "#aaa", borderRadius: "1px" }} />
            <span style={{ display: "block", width: "16px", height: "2px", background: "#aaa", borderRadius: "1px" }} />
            <span style={{ display: "block", width: "16px", height: "2px", background: "#aaa", borderRadius: "1px" }} />
          </button>

          {/* Logo / título da página */}
          {page === "home" ? (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "28px", height: "28px", background: "linear-gradient(135deg,#00e5a0,#006eff)", borderRadius: "7px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>⚡</div>
              <span style={{ fontWeight: "700", fontSize: "15px" }}>TRADE<span style={{ color: "#00e5a0" }}>AI</span></span>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "18px" }}>{pageInfo.icon}</span>
              <span style={{ fontWeight: "700", fontSize: "15px" }}>{pageInfo.label}</span>
            </div>
          )}
        </div>

        {/* Direita do header */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button
            onClick={() => setShowNotifConfig(true)}
            style={{ background: `${notifColor}15`, border: `1px solid ${notifColor}33`, color: notifColor, borderRadius: "8px", padding: "7px 9px", fontSize: "14px" }}
          >
            {permissao === "granted" ? "🔔" : "🔕"}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "5px", background: "#0d1320", border: "1px solid #1e2d45", borderRadius: "8px", padding: "7px 10px" }}>
            <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: proxyOk === null ? "#555" : proxyOk ? "#00e5a0" : "#ffd60a" }} className={proxyWaking ? "pulse" : ""} />
            {!isMobile && (
              <span style={{ color: proxyOk ? "#00e5a0" : "#ffd60a", fontSize: "10px", fontFamily: "monospace" }}>
                {proxyOk ? "ONLINE" : "ACORDANDO..."}
              </span>
            )}
          </div>

          <button
            onClick={handleLogout}
            style={{ background: "#ff4d6d15", border: "1px solid #ff4d6d33", color: "#ff4d6d", borderRadius: "8px", padding: "7px 10px", fontSize: "12px", fontWeight: "700" }}
          >
            🔒
          </button>
        </div>
      </div>

      {/* ── Banners ── */}
      {proxyWaking && (
        <div style={{ background: "#ffd60a11", border: "1px solid #ffd60a33", margin: "10px 14px", borderRadius: "10px", padding: "10px 14px", display: "flex", alignItems: "center", gap: "8px" }}>
          <span className="pulse">⏳</span>
          <span style={{ color: "#ffd60a", fontSize: "12px" }}>Servidor acordando... Aguarde até 60 segundos.</span>
        </div>
      )}

      {permissao === "default" && (
        <div style={{ background: "#6af11", border: "1px solid #6af33", margin: "10px 14px", borderRadius: "10px", padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
          <span style={{ color: "#6af", fontSize: "12px" }}>📱 Ative as notificações push para receber alertas no celular!</span>
          <button
            onClick={() => setShowNotifConfig(true)}
            style={{ background: "#6af22", border: "1px solid #6af55", color: "#6af", borderRadius: "6px", padding: "5px 12px", fontSize: "11px", fontWeight: "700", whiteSpace: "nowrap" }}
          >
            Ativar
          </button>
        </div>
      )}

      {/* ── Conteúdo da página ── */}
      <PageContent page={page} setPage={setPage} />
    </div>
  );
}

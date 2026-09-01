import { useState, useEffect } from "react";
import Dashboard, { useIsMobile } from "./Dashboard";
import Backtesting from "./Backtesting";
import PaperTrading from "./PaperTrading";
import Login from "./Login";
import Chat from "./Chat";
import Alertas from "./Alertas";
import Score from "./Score";
import Historico from "./Historico";
import Relatorio from "./Relatorio";
import Perfil from "./Perfil";
import Home from "./Home";
import Investimentos from "./Investimentos";
import Sidebar, { MENU_ITEMS } from "./Sidebar";
import PainelSaude from "./PainelSaude";
import ConfigNotificacoes, { useNotificacoes, registrarSW } from "./Notificacoes";
import { supabase } from "./supabaseClient";
import { Zap } from "lucide-react";


const PROXY = "https://daytrade-proxy.onrender.com";

const keepProxyAwake = () => {
  const ping = () => fetch(`${PROXY}/health`).catch(() => {});
  ping();
  setInterval(ping, 10 * 60 * 1000);
};

function getPageInfo(pageId) {
  for (const section of MENU_ITEMS) {
    const found = section.items.find(i => i.id === pageId);
    if (found) return found;
  }
    return { label: "TradeAI", icon: Zap };
}

function PageContent({ page, setPage, isAdmin, tema, setTema, ativoInicial, limparAtivoInicial, onAbrirAtivo }) {
  switch (page) {
    case "home":         return <Home setPage={setPage} tema={tema} onAbrirAtivo={onAbrirAtivo} />;
    case "dashboard":    return <Dashboard tema={tema} ativoInicial={ativoInicial} limparAtivoInicial={limparAtivoInicial} />;
    case "investimentos":return <Investimentos setPage={setPage} tema={tema} />;
    case "chat":         return <Chat tema={tema} />;
    case "score":        return <Score tema={tema} />;
    case "historico":    return <Historico tema={tema} />;
    case "alertas":      return <Alertas tema={tema} />;
    case "relatorio":    return <Relatorio tema={tema} />;
    case "backtesting":  return <Backtesting tema={tema} />;
    case "papertrading": return <PaperTrading tema={tema} />;
    case "perfil":       return <Perfil tema={tema} setTema={setTema} />;
    case "saudesistema":  return <PainelSaude tema={tema} />;
    default:             return <Home setPage={setPage} />;
  }
}

export default function App() {
  const [autenticado, setAutenticado] = useState(null); // null = ainda checando
  const [page, setPage] = useState("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [proxyOk, setProxyOk] = useState(null);
  const [proxyWaking, setProxyWaking] = useState(false);
  const [showNotifConfig, setShowNotifConfig] = useState(false);
  const [tema, setTema] = useState(() => localStorage.getItem("tradeai_tema") || "escuro");
  const [ativoInicial, setAtivoInicial] = useState(null);
  const abrirAtivoNoDashboard = (ticker) => {
    setAtivoInicial(ticker);
    setPage("dashboard");
  };
  const isMobile = useIsMobile();
  const { permissao } = useNotificacoes();

  useEffect(() => {
    localStorage.setItem("tradeai_tema", tema);
  }, [tema]);

  const [isAdmin, setIsAdmin] = useState(false);

  const buscarIsAdmin = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) { setIsAdmin(false); return; }
    const { data } = await supabase
      .from("usuarios")
      .select("is_admin")
      .eq("id", userData.user.id)
      .maybeSingle();
    setIsAdmin(!!data?.is_admin);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAutenticado(!!data.session);
      if (data.session) buscarIsAdmin();
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAutenticado(!!session);
      if (session) buscarIsAdmin(); else setIsAdmin(false);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (autenticado === null) return null; // ainda checando a sessão, não mostra nada
  if (!autenticado) return <Login onLogin={() => setAutenticado(true)} />;

  const pageInfo = getPageInfo(page);

  const CORES_TEMA = tema === "claro"
    ? { bg: "#F4F7FA", text: "#172033" }
    : { bg: "#070B14", text: "#e0e6f0" };

  return (
    <div style={{ minHeight: "100vh", background: CORES_TEMA.bg, fontFamily: "'DM Sans','Segoe UI',sans-serif", color: CORES_TEMA.text }}>


      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        page={page}
        setPage={setPage}
        onLogout={handleLogout}
        isAdmin={isAdmin}
        tema={tema}
      />

      {showNotifConfig && (
        <div
          style={{ position: "fixed", inset: 0, background: "#000000aa", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
          onClick={e => e.target === e.currentTarget && setShowNotifConfig(false)}
        >
          <ConfigNotificacoes onClose={() => setShowNotifConfig(false)} tema={tema} />
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ background: tema === "claro" ? "#FFFFFF" : "#0a0f1a", borderBottom: `1px solid ${tema === "claro" ? "#E2E8F0" : "#1e2d45"}`, padding: isMobile ? "12px 14px" : "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Hambúrguer */}
          <button
            onClick={() => setSidebarOpen(true)}
            style={{ background: tema === "claro" ? "#F4F7FA" : "#0d1320", border: `1px solid ${tema === "claro" ? "#E2E8F0" : "#1e2d45"}`, borderRadius: "9px", width: "38px", height: "38px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px", padding: 0 }}
          >
            <span style={{ display: "block", width: "16px", height: "2px", background: tema === "claro" ? "#64748B" : "#aaa", borderRadius: "1px" }} />
            <span style={{ display: "block", width: "16px", height: "2px", background: tema === "claro" ? "#64748B" : "#aaa", borderRadius: "1px" }} />
            <span style={{ display: "block", width: "16px", height: "2px", background: tema === "claro" ? "#64748B" : "#aaa", borderRadius: "1px" }} />
          </button>

          {/* Logo / título da página */}
          {page === "home" ? (
            <div key="header-home" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "28px", height: "28px", background: "linear-gradient(135deg,#00e5a0,#006eff)", borderRadius: "7px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>⚡</div>
              <span style={{ fontWeight: "700", fontSize: "15px" }}>TRADE<span style={{ color: "#00e5a0" }}>AI</span></span>
            </div>
          ) : (
            <div key="header-page" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            {pageInfo.icon && <pageInfo.icon size={18} strokeWidth={2.25} />}
              <span style={{ fontWeight: "700", fontSize: "15px" }}>{pageInfo.label}</span>
            </div>
          )}
        </div>

        {/* Direita do header */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "5px", background: tema === "claro" ? "#F4F7FA" : "#0d1320", border: `1px solid ${tema === "claro" ? "#E2E8F0" : "#1e2d45"}`, borderRadius: "8px", padding: "7px 10px" }}>
            <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: proxyOk === null ? "#555" : proxyOk ? "#00e5a0" : "#ffd60a" }} className={proxyWaking ? "pulse" : ""} />
            {!isMobile && (
              <span style={{ color: proxyOk ? "#00e5a0" : "#ffd60a", fontSize: "10px", fontFamily: "monospace" }}>
                {proxyOk ? "ONLINE" : "ACORDANDO..."}
              </span>
            )}
          </div>
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
      <PageContent key={page} page={page} setPage={setPage} isAdmin={isAdmin} tema={tema} setTema={setTema} ativoInicial={ativoInicial} limparAtivoInicial={() => setAtivoInicial(null)} onAbrirAtivo={abrirAtivoNoDashboard} />
    </div>
  );
}

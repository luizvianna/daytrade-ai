import { useEffect } from "react";

export const MENU_ITEMS = [
  { section: "PRINCIPAL", items: [
    { id: "home", label: "Home", icon: "🏠" },
    { id: "dashboard", label: "Bolsa (Daytrade)", icon: "📈" },
    { id: "investimentos", label: "Investimentos", icon: "💼" },
  ]},
  { section: "INTELIGÊNCIA ARTIFICIAL", items: [
    { id: "chat", label: "Bate-papo IA", icon: "💬" },
    { id: "score", label: "Pontuação", icon: "⭐" },
    { id: "historico", label: "Histórico", icon: "📋" },
    { id: "alertas", label: "Alertas", icon: "🔔" },
    { id: "relatorio", label: "Relatório", icon: "📅" },
  ]},
  { section: "FERRAMENTAS", items: [
    { id: "backtesting", label: "Teste retrospectivo", icon: "📊" },
    { id: "papertrading", label: "Paper Trading", icon: "🏦" },
    { id: "perfil", label: "Meu Perfil", icon: "👤" },
  ]},
];

export default function Sidebar({ open, onClose, page, setPage, onLogout }) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(2px)", zIndex: 998,
          opacity: open ? 1 : 0, visibility: open ? "visible" : "hidden",
          transition: "opacity 0.25s ease",
        }}
      />

      {/* Painel lateral */}
      <div style={{
        position: "fixed", top: 0, left: 0, height: "100vh", width: "280px", maxWidth: "82vw",
        background: "#0a0f1a", borderRight: "1px solid #1e2d45", zIndex: 999,
        transform: open ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.28s cubic-bezier(.4,0,.2,1)",
        display: "flex", flexDirection: "column",
        boxShadow: open ? "8px 0 40px rgba(0,0,0,0.5)" : "none",
      }}>
        {/* Header do menu */}
        <div style={{ padding: "20px 18px", borderBottom: "1px solid #1e2d45", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "32px", height: "32px", background: "linear-gradient(135deg,#00e5a0,#006eff)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>⚡</div>
            <div>
              <div style={{ fontWeight: "700", fontSize: "15px", color: "#fff" }}>TRADE<span style={{ color: "#00e5a0" }}>AI</span></div>
              <div style={{ color: "#444", fontSize: "9px", fontFamily: "monospace" }}>MENU PRINCIPAL</div>
            </div>
          </div>
          <button onClick={onClose}
            style={{ background: "#111a27", border: "1px solid #1e2d45", color: "#666", borderRadius: "8px", width: "32px", height: "32px", fontSize: "16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            ×
          </button>
        </div>

        {/* Itens do menu */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 10px" }}>
          {MENU_ITEMS.map(section => (
            <div key={section.section} style={{ marginBottom: "18px" }}>
              <div style={{ color: "#333", fontSize: "10px", fontFamily: "monospace", letterSpacing: "0.12em", padding: "0 10px", marginBottom: "8px" }}>
                {section.section}
              </div>
              {section.items.map(item => {
                const ativo = page === item.id;
                return (
                  <button key={item.id} className="sidebar-item" onClick={() => { setPage(item.id); onClose(); }}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: "12px",
                      background: ativo ? "#00e5a015" : "transparent",
                      border: ativo ? "1px solid #00e5a033" : "1px solid transparent",
                      color: ativo ? "#00e5a0" : "#999",
                      borderRadius: "10px", padding: "11px 12px", marginBottom: "3px",
                      fontSize: "14px", fontWeight: ativo ? "700" : "500", cursor: "pointer",
                      fontFamily: "inherit", textAlign: "left", transition: "all 0.15s",
                    }}>
                    <span style={{ fontSize: "18px", width: "22px", textAlign: "center" }}>{item.icon}</span>
                    {item.label}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 16px", borderTop: "1px solid #1e2d45" }}>
          <button onClick={onLogout}
            style={{ width: "100%", background: "#ff4d6d15", border: "1px solid #ff4d6d33", color: "#ff4d6d", borderRadius: "10px", padding: "11px", fontSize: "13px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            🔒 Sair da conta
          </button>
          <div style={{ color: "#2a2a2a", fontSize: "10px", fontFamily: "monospace", textAlign: "center", marginTop: "10px" }}>
            v2.0 · Dados: Brapi ⚡
          </div>
        </div>
      </div>
    </>
  );
}

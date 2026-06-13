import { useState, useEffect, useCallback } from "react";

// Registra o Service Worker
export async function registrarSW() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    console.log("SW registrado:", reg.scope);
    return reg;
  } catch (e) {
    console.error("Erro ao registrar SW:", e);
    return null;
  }
}

// Solicita permissão de notificação
export async function solicitarPermissao() {
  if (!("Notification" in window)) return "not-supported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  const result = await Notification.requestPermission();
  return result;
}

// Envia notificação via Service Worker
export async function enviarNotificacao({ title, body, tag = "tradeai", icon = "/logo192.png", data = {} }) {
  if (!("serviceWorker" in navigator)) {
    // Fallback: notificação direta
    if (Notification.permission === "granted") {
      new Notification(title, { body, icon, tag });
    }
    return;
  }
  try {
    const reg = await navigator.serviceWorker.ready;
    reg.active?.postMessage({
      type: "SHOW_NOTIFICATION",
      payload: { title, body, icon, tag, data },
    });
  } catch (e) {
    console.error("Erro ao enviar notificação:", e);
  }
}

// Hook principal de notificações
export function useNotificacoes() {
  const [permissao, setPermissao] = useState(Notification?.permission || "default");
  const [swRegistrado, setSwRegistrado] = useState(false);
  const [suportado, setSuportado] = useState(false);

  useEffect(() => {
    setSuportado("Notification" in window && "serviceWorker" in navigator);
    setPermissao(Notification?.permission || "default");

    // Registra SW automaticamente
    registrarSW().then(reg => {
      if (reg) setSwRegistrado(true);
    });
  }, []);

  const ativar = useCallback(async () => {
    const result = await solicitarPermissao();
    setPermissao(result);
    if (result === "granted") {
      await registrarSW();
      setSwRegistrado(true);
      // Notificação de boas-vindas
      setTimeout(() => {
        enviarNotificacao({
          title: "⚡ TradeAI Ativado!",
          body: "Você receberá alertas de preço, sinais da IA e muito mais!",
          tag: "welcome",
        });
      }, 1000);
    }
    return result;
  }, []);

  const notificar = useCallback(async (params) => {
    if (permissao !== "granted") return;
    await enviarNotificacao(params);
  }, [permissao]);

  return { permissao, swRegistrado, suportado, ativar, notificar };
}

// Componente de configuração de notificações
export default function ConfigNotificacoes({ onClose }) {
  const { permissao, swRegistrado, suportado, ativar } = useNotificacoes();
  const [ativando, setAtivando] = useState(false);
  const [testando, setTestando] = useState(false);

  const handleAtivar = async () => {
    setAtivando(true);
    await ativar();
    setAtivando(false);
  };

  const handleTestar = async () => {
    setTestando(true);
    await enviarNotificacao({
      title: "🔔 Teste TradeAI",
      body: "Notificações funcionando! Você receberá alertas de preço e sinais da IA.",
      tag: "test",
    });
    setTimeout(() => setTestando(false), 2000);
  };

  const statusInfo = {
    granted:       { cor: "#00e5a0", icone: "✅", texto: "Notificações ATIVAS" },
    denied:        { cor: "#ff4d6d", icone: "❌", texto: "Notificações BLOQUEADAS" },
    default:       { cor: "#ffd60a", icone: "⚠️", texto: "Notificações não ativadas" },
    "not-supported": { cor: "#555",  icone: "🚫", texto: "Não suportado neste dispositivo" },
  };

  const info = statusInfo[!suportado ? "not-supported" : permissao] || statusInfo.default;

  return (
    <div style={{ background: "#0d1320", border: "1px solid #1e2d45", borderRadius: "14px", padding: "20px", maxWidth: "400px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h3 style={{ fontSize: "15px", fontWeight: "700" }}>📱 Notificações Push</h3>
        {onClose && <button onClick={onClose} style={{ background: "none", border: "none", color: "#444", cursor: "pointer", fontSize: "20px" }}>×</button>}
      </div>

      {/* Status */}
      <div style={{ background: `${info.cor}11`, border: `1px solid ${info.cor}44`, borderRadius: "10px", padding: "12px 14px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ fontSize: "20px" }}>{info.icone}</span>
        <div>
          <div style={{ color: info.cor, fontWeight: "700", fontSize: "13px" }}>{info.texto}</div>
          <div style={{ color: "#555", fontSize: "11px", marginTop: "2px" }}>
            {permissao === "granted" ? `Service Worker: ${swRegistrado ? "✅ registrado" : "⏳ registrando..."}` : "Ative para receber alertas no celular"}
          </div>
        </div>
      </div>

      {/* O que você vai receber */}
      <div style={{ marginBottom: "16px" }}>
        <div style={{ color: "#444", fontSize: "10px", fontFamily: "monospace", letterSpacing: "0.1em", marginBottom: "10px" }}>VOCÊ VAI RECEBER</div>
        {[
          { icone: "🏦", titulo: "Paper Trading", desc: "Quando a IA abrir ou fechar uma operação" },
          { icone: "🔔", titulo: "Alertas de preço", desc: "Quando um ativo atingir seu preço alvo" },
          { icone: "⭐", titulo: "Score de ativos", desc: "Quando o score mudar significativamente" },
          { icone: "📈", titulo: "Sinais da IA", desc: "Oportunidades de compra e venda" },
        ].map((item, i) => (
          <div key={i} style={{ display: "flex", gap: "10px", padding: "8px 0", borderBottom: "1px solid #0d1827" }}>
            <span style={{ fontSize: "16px" }}>{item.icone}</span>
            <div>
              <div style={{ color: "#ccc", fontSize: "12px", fontWeight: "600" }}>{item.titulo}</div>
              <div style={{ color: "#555", fontSize: "11px" }}>{item.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Botões */}
      {!suportado ? (
        <div style={{ background: "#ff4d6d11", border: "1px solid #ff4d6d33", borderRadius: "8px", padding: "10px 14px", color: "#ff4d6d", fontSize: "12px" }}>
          ⚠️ Use o Chrome no Android para notificações push. Safari no iPhone tem suporte limitado.
        </div>
      ) : permissao === "denied" ? (
        <div style={{ background: "#ff4d6d11", border: "1px solid #ff4d6d33", borderRadius: "8px", padding: "10px 14px" }}>
          <div style={{ color: "#ff4d6d", fontSize: "12px", marginBottom: "6px" }}>Notificações bloqueadas no navegador.</div>
          <div style={{ color: "#888", fontSize: "11px" }}>Para ativar: Chrome → ⋮ → Configurações → Notificações → Permitir para este site</div>
        </div>
      ) : permissao === "granted" ? (
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={handleTestar} disabled={testando}
            style={{ flex: 1, background: testando ? "#555" : "#00e5a022", border: "1px solid #00e5a044", color: "#00e5a0", borderRadius: "10px", padding: "12px", fontSize: "13px", fontWeight: "700", cursor: testando ? "not-allowed" : "pointer" }}>
            {testando ? "⏳ Enviando..." : "🔔 Testar Notificação"}
          </button>
        </div>
      ) : (
        <button onClick={handleAtivar} disabled={ativando}
          style={{ width: "100%", background: ativando ? "#555" : "linear-gradient(135deg,#00e5a0,#00b07a)", color: "#000", border: "none", borderRadius: "10px", padding: "13px", fontSize: "14px", fontWeight: "700", cursor: ativando ? "not-allowed" : "pointer" }}>
          {ativando ? "⏳ Ativando..." : "📱 Ativar Notificações"}
        </button>
      )}

      <div style={{ color: "#2a2a2a", fontSize: "10px", textAlign: "center", marginTop: "12px", fontFamily: "monospace" }}>
        Funciona mesmo com o app em segundo plano · Chrome Android
      </div>
    </div>
  );
}

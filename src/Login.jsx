import { useState } from "react";
import { supabase } from "./supabaseClient"; // ajuste o caminho conforme onde você criar esse arquivo

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !senha) { setErro("Preencha email e senha!"); return; }
    setLoading(true);
    setErro("");
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      });
      if (error) {
        setErro("Email ou senha incorretos. Tente novamente.");
        setSenha("");
      } else {
        // supabase.auth já mantém a sessão sozinho (localStorage interno do SDK),
        // não precisa mais do sessionStorage manual
        onLogin(data.user);
      }
    } catch (e) {
      setErro("Erro ao verificar login.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#080c14",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'DM Sans','Segoe UI',sans-serif", padding: "20px"
    }}>

      <div className="card" style={{ width: "100%", maxWidth: "400px" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ width: "64px", height: "64px", background: "linear-gradient(135deg,#00e5a0,#006eff)", borderRadius: "18px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", margin: "0 auto 16px" }}>⚡</div>
          <h1 style={{ fontSize: "28px", fontWeight: "700", color: "#fff", marginBottom: "6px" }}>
            TRADE<span style={{ color: "#00e5a0" }}>AI</span>
          </h1>
          <p style={{ color: "#444", fontSize: "13px", fontFamily: "monospace" }}>SISTEMA DE ANÁLISE B3 · ACESSO PRIVADO</p>
        </div>

        {/* Card de login */}
        <div style={{ background: "#0d1320", border: "1px solid #1e2d45", borderRadius: "16px", padding: "28px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#fff", marginBottom: "6px" }}>Bem-vindo de volta</h2>
          <p style={{ color: "#444", fontSize: "13px", marginBottom: "24px" }}>Entre com seu email e senha para acessar o sistema</p>

          {/* Campo de email */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", color: "#666", fontSize: "12px", marginBottom: "6px", fontFamily: "monospace", letterSpacing: "0.08em" }}>EMAIL</label>
            <input
              className="login-input"
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setErro(""); }}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              placeholder="seu@email.com"
              style={{ width: "100%", background: "#111a27", border: `1px solid ${erro ? "#ff4d6d" : "#1e2d45"}`, color: "#e0e6f0", borderRadius: "10px", padding: "13px 14px", fontSize: "16px", fontFamily: "monospace", outline: "none", transition: "all 0.2s" }}
            />
          </div>

          {/* Campo de senha */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", color: "#666", fontSize: "12px", marginBottom: "6px", fontFamily: "monospace", letterSpacing: "0.08em" }}>SENHA</label>
            <div style={{ position: "relative" }}>
              <input
                className="login-input"
                type={showPassword ? "text" : "password"}
                value={senha}
                onChange={e => { setSenha(e.target.value); setErro(""); }}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                placeholder="••••••••••"
                style={{ width: "100%", background: "#111a27", border: `1px solid ${erro ? "#ff4d6d" : "#1e2d45"}`, color: "#e0e6f0", borderRadius: "10px", padding: "13px 44px 13px 14px", fontSize: "16px", fontFamily: "monospace", outline: "none", transition: "all 0.2s" }}
              />
              <button onClick={() => setShowPassword(s => !s)}
                style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#444", cursor: "pointer", fontSize: "18px", lineHeight: 1 }}>
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {/* Erro */}
          {erro && (
            <div className="shake" style={{ background: "#ff4d6d15", border: "1px solid #ff4d6d44", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px", color: "#ff4d6d", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>⚠️</span> {erro}
            </div>
          )}

          {/* Botão login */}
          <button className="btn-login" onClick={handleLogin} disabled={loading}
            style={{ width: "100%", background: loading ? "#555" : "linear-gradient(135deg,#00e5a0,#00b07a)", color: "#000", border: "none", borderRadius: "10px", padding: "14px", fontSize: "15px", fontWeight: "700", cursor: loading ? "not-allowed" : "pointer", transition: "all 0.2s", marginBottom: "16px" }}>
            {loading ? "⏳ Verificando..." : "🔓 Acessar Sistema"}
          </button>

          {/* Divisor */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <div style={{ flex: 1, height: "1px", background: "#1e2d45" }} />
            <span style={{ color: "#333", fontSize: "11px", fontFamily: "monospace" }}>EM BREVE</span>
            <div style={{ flex: 1, height: "1px", background: "#1e2d45" }} />
          </div>

          {/* Botão Google (em breve) */}
          <button disabled
            style={{ width: "100%", background: "#111a27", border: "1px solid #1e2d45", color: "#444", borderRadius: "10px", padding: "13px", fontSize: "14px", fontWeight: "600", cursor: "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
            <span style={{ fontSize: "18px" }}>🔵</span> Continuar com Google
            <span style={{ background: "#1e2d45", color: "#555", borderRadius: "4px", padding: "2px 6px", fontSize: "10px", fontFamily: "monospace" }}>EM BREVE</span>
          </button>
        </div>

        {/* Rodapé */}
        <p style={{ textAlign: "center", color: "#2a2a2a", fontSize: "11px", marginTop: "20px", fontFamily: "monospace" }}>
          🔒 CONEXÃO SEGURA · ACESSO RESTRITO
        </p>
      </div>
    </div>
  );
}

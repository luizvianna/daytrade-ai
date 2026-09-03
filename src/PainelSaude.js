import { useState, useEffect, useCallback } from "react";
import { authFetch } from "./supabaseClient";
import {
  Activity, RefreshCw, Loader2, CheckCircle2, AlertTriangle,
  Database, LineChart, Bot, KeyRound, XCircle, Lightbulb,
} from "lucide-react";

const PROXY = "https://daytrade-proxy.onrender.com";
const ICON_STROKE = 2.25;

function paleta(tema) {
  if (tema === "claro") {
    return { card: "#FFFFFF", cardInner: "#F4F7FA", border: "#E2E8F0", textPrimary: "#172033", textSecondary: "#64748B", textFaint: "#94A3B8" };
  }
  return { card: "#0d1320", cardInner: "#111a27", border: "#1e2d45", textPrimary: "#fff", textSecondary: "#888", textFaint: "#444" };
}

const LABELS_SERVICO = {
  database: { nome: "Banco de dados (Supabase)", icone: Database },
  brapi: { nome: "Brapi (preços de mercado)", icone: LineChart },
  groq: { nome: "Groq (IA)", icone: Bot },
  supabaseAuth: { nome: "Supabase Auth", icone: KeyRound },
};

export default function PainelSaude({ tema = "escuro" }) {
  const cores = paleta(tema);
  const [checando, setChecando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState("");
  const [ultimaChecagem, setUltimaChecagem] = useState(null);

  const rodarChecagem = useCallback(async () => {
    setChecando(true);
    setErro("");
    try {
      const res = await authFetch(`${PROXY}/api/admin/health`);
      if (res.status === 403) {
        setErro("Acesso restrito a administradores.");
        setResultado(null);
        return;
      }
      const data = await res.json();
      if (data.success) {
        setResultado(data.servicos);
        setUltimaChecagem(new Date());
      } else {
        setErro(data.error || "Erro ao checar sistema.");
      }
    } catch (e) {
      setErro("Erro de conexão ao checar sistema.");
    } finally {
      setChecando(false);
    }
  }, []);

  useEffect(() => { rodarChecagem(); }, [rodarChecagem]);

  const tudoOk = resultado && Object.values(resultado).every(s => s.ok);

  return (
    <div style={{ padding: "14px", maxWidth: "700px", margin: "0 auto" }}>
      <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: "700", color: cores.textPrimary, marginBottom: "4px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Activity size={20} strokeWidth={ICON_STROKE} color="#8b5cf6" /> Painel de Saúde
          </h1>
          <p style={{ color: cores.textFaint, fontSize: "12px" }}>
            {ultimaChecagem ? `Última checagem: ${ultimaChecagem.toLocaleTimeString("pt-BR")}` : "Testando conexões reais, não só se as chaves existem"}
          </p>
        </div>
        <button onClick={rodarChecagem} disabled={checando}
          style={{ background: cores.cardInner, border: `1px solid ${cores.border}`, color: cores.textSecondary, borderRadius: "8px", padding: "8px 14px", fontSize: "12px", cursor: checando ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
          {checando
            ? <><Loader2 size={14} strokeWidth={ICON_STROKE} className="spin" /> Checando...</>
            : <><RefreshCw size={14} strokeWidth={ICON_STROKE} /> Checar agora</>}
        </button>
      </div>

      {resultado && (
        <div style={{ background: tudoOk ? "#00e5a011" : "#ff4d6d11", border: `1px solid ${tudoOk ? "#00e5a033" : "#ff4d6d33"}`, borderRadius: "10px", padding: "12px 14px", marginBottom: "14px", color: tudoOk ? "#00e5a0" : "#ff4d6d", fontSize: "13px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
          {tudoOk ? <CheckCircle2 size={16} strokeWidth={ICON_STROKE} /> : <AlertTriangle size={16} strokeWidth={ICON_STROKE} />}
          {tudoOk ? "Tudo funcionando normalmente" : "Um ou mais serviços com problema"}
        </div>
      )}

      {erro && (
        <div style={{ background: "#ff4d6d15", border: "1px solid #ff4d6d44", borderRadius: "10px", padding: "14px", marginBottom: "14px", color: "#ff4d6d", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }}>
          <AlertTriangle size={16} strokeWidth={ICON_STROKE} /> {erro}
        </div>
      )}

      {checando && !resultado && (
        <div style={{ textAlign: "center", padding: "40px", color: cores.textFaint, display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
          <Loader2 size={28} strokeWidth={ICON_STROKE} className="spin" />
          Testando cada serviço...
        </div>
      )}

      {resultado && Object.entries(resultado).map(([chave, info]) => {
        const label = LABELS_SERVICO[chave] || { nome: chave, icone: Activity };
        const Icone = label.icone;
        const cor = info.ok ? "#00e5a0" : "#ff4d6d";
        return (
          <div key={chave} style={{ background: cores.card, border: `1px solid ${cor}44`, borderRadius: "12px", padding: "16px", marginBottom: "10px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ width: "34px", height: "34px", borderRadius: "9px", background: cores.cardInner, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icone size={18} strokeWidth={ICON_STROKE} color={cores.textSecondary} />
              </span>
              <div>
                <div style={{ color: cores.textPrimary, fontWeight: "700", fontSize: "14px" }}>{label.nome}</div>
                <div style={{ color: cores.textSecondary, fontSize: "12px", marginTop: "2px" }}>{info.detalhe}</div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: cor, fontWeight: "700", fontSize: "13px", display: "flex", alignItems: "center", gap: "4px", justifyContent: "flex-end" }}>
                {info.ok ? <CheckCircle2 size={15} strokeWidth={ICON_STROKE} /> : <XCircle size={15} strokeWidth={ICON_STROKE} />}
                {info.ok ? "OK" : "FALHA"}
              </div>
              {info.tempoMs > 0 && <div style={{ color: cores.textFaint, fontSize: "10px", fontFamily: "monospace" }}>{info.tempoMs}ms</div>}
            </div>
          </div>
        );
      })}

      <div style={{ marginTop: "14px", padding: "12px 14px", background: cores.card, border: `1px solid ${cores.border}`, borderRadius: "10px", display: "flex", gap: "8px" }}>
        <Lightbulb size={14} strokeWidth={ICON_STROKE} color={cores.textFaint} style={{ flexShrink: 0, marginTop: "1px" }} />
        <span style={{ color: cores.textFaint, fontSize: "11px", lineHeight: "1.6" }}>
          Diferente do banner de inicialização do servidor, esses testes fazem uma chamada real a cada serviço — não só conferem se a chave de acesso existe configurada.
        </span>
      </div>
    </div>
  );
}

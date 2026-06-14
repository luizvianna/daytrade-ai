import { useState, useEffect, useCallback } from "react";
import { carregarPerfil } from "./Perfil";

const PROXY = "https://daytrade-proxy.onrender.com";
const STORAGE_KEY = "tradeai_conta";

const ATIVOS_RESUMO = ["PETR4","VALE3","ITUB4","HGLG11","IVVB11","BTC-USD"];

function carregarConta() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {
      saldoConta: 0,
      valorInvestido: 0,
      lancamentosFuturos: 0,
      conectado: false,
      corretora: "",
    };
  } catch { return { saldoConta: 0, valorInvestido: 0, lancamentosFuturos: 0, conectado: false, corretora: "" }; }
}

function salvarConta(conta) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(conta));
}

function fmtMoney(v) {
  return `R$ ${Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function MiniSparkline({ data, color = "#ffd60a", width = 120, height = 36 }) {
  if (!data || data.length < 2) return null;
  const pad = 2;
  const w = width - pad * 2, h = height - pad * 2;
  const minV = Math.min(...data), maxV = Math.max(...data);
  const range = maxV - minV || 1;
  const px = i => pad + (i / (data.length - 1)) * w;
  const py = v => pad + h - ((v - minV) / range) * h;
  const points = data.map((v, i) => `${px(i)},${py(v)}`).join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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

export default function Home({ setPage, onAbrirNotif }) {
  const [conta, setConta] = useState(carregarConta);
  const [perfil, setPerfil] = useState(carregarPerfil());
  const [showEditModal, setShowEditModal] = useState(false);
  const [valoresOcultos, setValoresOcultos] = useState(false);
  const [precos, setPrecos] = useState({});
  const [historico, setHistorico] = useState([]);

  const fetchPrecos = useCallback(async () => {
    try {
      const res = await fetch(`${PROXY}/api/prices?tickers=${ATIVOS_RESUMO.join(",")}`);
      setPrecos(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    fetchPrecos();
    // Simula histórico de patrimônio para o sparkline
    const base = conta.valorInvestido || 10000;
    const hist = Array.from({ length: 12 }, (_, i) => base * (0.94 + Math.random() * 0.1 + i * 0.005));
    setHistorico(hist);
    const i = setInterval(fetchPrecos, 60000);
    return () => clearInterval(i);
  }, [fetchPrecos]);

  const salvarContaInfo = (novaConta) => {
    setConta(novaConta);
    salvarConta(novaConta);
  };

  const patrimonioTotal = (conta.saldoConta || 0) + (conta.valorInvestido || 0);
  const variacaoAno = 0.11; // placeholder até integração real

  const perfilInfo = perfil ? {
    conservador: { nome: "Conservador", icone: "🛡️", cor: "#6af" },
    moderado: { nome: "Moderado", icone: "⚖️", cor: "#ffd60a" },
    arrojado: { nome: "Arrojado", icone: "🚀", cor: "#00e5a0" },
    agressivo: { nome: "Agressivo", icone: "⚡", cor: "#ff9f43" },
  }[perfil.tipoPerfil] : null;

  const oculto = (val) => valoresOcultos ? "••••••" : val;

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
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => setValoresOcultos(v => !v)}
            style={{ background: "#0d1320", border: "1px solid #1e2d45", color: "#666", borderRadius: "10px", width: "38px", height: "38px", fontSize: "16px", cursor: "pointer" }}>
            {valoresOcultos ? "🙈" : "👁️"}
          </button>
        </div>
      </div>

      {/* Card Investimentos (patrimônio) */}
      <div style={{ background: "linear-gradient(135deg,#0d1320,#0a0f1a)", border: "1px solid #1e2d45", borderRadius: "18px", padding: "22px", marginBottom: "14px", position: "relative", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "20px" }}>📊</span>
            <span style={{ color: "#ccc", fontWeight: "700", fontSize: "15px" }}>Investimentos</span>
          </div>
          <MiniSparkline data={historico} color={variacaoAno >= 0 ? "#00e5a0" : "#ff4d6d"} />
        </div>

        <div style={{ color: "#444", fontSize: "11px", marginBottom: "4px" }}>Patrimônio total</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
          <span style={{ color: "#fff", fontSize: "28px", fontWeight: "700", fontFamily: "monospace" }}>{oculto(fmtMoney(patrimonioTotal))}</span>
          <span style={{ color: variacaoAno >= 0 ? "#00e5a0" : "#ff4d6d", fontSize: "13px", fontFamily: "monospace" }}>
            {variacaoAno >= 0 ? "+" : ""}{variacaoAno.toFixed(2)}% no ano
          </span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "16px", borderTop: "1px solid #1e2d45" }}>
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
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <div style={{ color: "#444", fontSize: "10px", marginBottom: "4px" }}>Saldo disponível</div>
            <div style={{ color: "#fff", fontSize: "20px", fontWeight: "700", fontFamily: "monospace" }}>{oculto(fmtMoney(conta.saldoConta))}</div>
          </div>
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
          ☰ Use o menu lateral para acessar todas as ferramentas · Toque em "Editar" para atualizar seus saldos
        </span>
      </div>
    </div>
  );
}

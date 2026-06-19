import { useState, useMemo, useEffect } from "react";
import { carregarPerfil } from "./Perfil";

// Taxas de referência atualizadas (junho/2026) — via busca web
// Selic: 14,50% a.a. | CDI: 14,40% a.a. | IPCA: 4,39% a.a.
const TAXAS_REFERENCIA = {
  selic: 14.50,
  cdi: 14.40,
  ipca: 4.39,
  atualizadoEm: "09/06/2026",
};

const PERFIS_INFO = {
  conservador: { nome: "Conservador", icone: "🛡️", cor: "#6af" },
  moderado: { nome: "Moderado", icone: "⚖️", cor: "#ffd60a" },
  arrojado: { nome: "Arrojado", icone: "🚀", cor: "#00e5a0" },
  agressivo: { nome: "Agressivo", icone: "⚡", cor: "#ff9f43" },
};

// Produtos de renda fixa disponíveis, com explicação
const PRODUTOS_RENDA_FIXA = [
  {
    id: "tesouro_selic",
    nome: "Tesouro Selic",
    icone: "🏛️",
    categoria: "Tesouro Direto",
    risco: "Muito baixo",
    liquidez: "Diária (D+1)",
    taxaBase: TAXAS_REFERENCIA.selic,
    tipoTaxa: "pos", // pós-fixado
    ir: true,
    descricao: "Acompanha a taxa Selic. Ideal para reserva de emergência — liquidez diária e baixíssimo risco.",
  },
  {
    id: "tesouro_ipca",
    nome: "Tesouro IPCA+",
    icone: "📈",
    categoria: "Tesouro Direto",
    risco: "Baixo (no vencimento)",
    liquidez: "D+1, mas com marcação a mercado",
    taxaBase: TAXAS_REFERENCIA.ipca + 6.5, // IPCA + spread médio
    tipoTaxa: "ipca",
    ir: true,
    descricao: "Protege contra inflação + um adicional fixo. Ótimo para objetivos de longo prazo (aposentadoria).",
  },
  {
    id: "tesouro_prefixado",
    nome: "Tesouro Prefixado",
    icone: "🔒",
    categoria: "Tesouro Direto",
    risco: "Baixo (no vencimento)",
    liquidez: "D+1, mas com marcação a mercado",
    taxaBase: TAXAS_REFERENCIA.selic + 0.3,
    tipoTaxa: "pre",
    ir: true,
    descricao: "Taxa de juros fixa contratada hoje. Bom quando se espera queda futura da Selic.",
  },
  {
    id: "cdb",
    nome: "CDB",
    icone: "🏦",
    categoria: "Renda Fixa Privada",
    risco: "Baixo (FGC até R$250k)",
    liquidez: "Varia (diária a vencimento)",
    taxaBase: TAXAS_REFERENCIA.cdi * 1.05, // ~105% CDI médio
    tipoTaxa: "cdi",
    ir: true,
    descricao: "Empréstimo a um banco. Protegido pelo FGC até R$250.000 por CPF/instituição.",
  },
  {
    id: "lci_lca",
    nome: "LCI / LCA",
    icone: "🏠",
    categoria: "Renda Fixa Privada",
    risco: "Baixo (FGC até R$250k)",
    liquidez: "Geralmente com carência",
    taxaBase: TAXAS_REFERENCIA.cdi * 0.92, // ~92% CDI, mas isento de IR
    tipoTaxa: "cdi",
    ir: false,
    descricao: "Isento de Imposto de Renda. Lastreado em crédito imobiliário/agronegócio. Ótimo para perfis conservadores.",
  },
];

function calcularValorFinal(valor, taxaAnual, meses, isento) {
  const taxaMensal = Math.pow(1 + taxaAnual / 100, 1 / 12) - 1;
  const bruto = valor * Math.pow(1 + taxaMensal, meses);
  const rendimento = bruto - valor;

  if (isento) return { bruto, liquido: bruto, ir: 0, aliquotaIR: 0 };

  // Tabela regressiva de IR
  let aliquota;
  if (meses <= 6) aliquota = 22.5;
  else if (meses <= 12) aliquota = 20;
  else if (meses <= 24) aliquota = 17.5;
  else aliquota = 15;

  const ir = rendimento * (aliquota / 100);
  return { bruto, liquido: bruto - ir, ir, aliquotaIR: aliquota };
}

function fmtMoney(v) {
  return `R$ ${Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── Card de alocação por categoria ────────────────────────────────
function AlocacaoCard({ categoria, percentual, valor, cor }) {
  return (
    <div style={{ background: "#111a27", borderRadius: "10px", padding: "12px 14px", marginBottom: "8px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
        <span style={{ color: "#ccc", fontSize: "13px", fontWeight: "600" }}>{categoria}</span>
        <span style={{ color: cor, fontSize: "13px", fontWeight: "700", fontFamily: "monospace" }}>{percentual}%</span>
      </div>
      <div style={{ height: "6px", background: "#1e2d45", borderRadius: "3px", overflow: "hidden", marginBottom: "6px" }}>
        <div style={{ height: "100%", width: `${percentual}%`, background: cor, borderRadius: "3px" }} />
      </div>
      <div style={{ color: "#555", fontSize: "12px", fontFamily: "monospace" }}>{fmtMoney(valor)}</div>
    </div>
  );
}

// ── Card de produto de renda fixa ─────────────────────────────────
function ProdutoCard({ produto, onSimular }) {
  const taxaLabel = {
    pos: `${produto.taxaBase.toFixed(2)}% a.a. (100% da Selic)`,
    ipca: `IPCA + ${(produto.taxaBase - TAXAS_REFERENCIA.ipca).toFixed(2)}% a.a.`,
    pre: `${produto.taxaBase.toFixed(2)}% a.a. (fixo)`,
    cdi: `${((produto.taxaBase / TAXAS_REFERENCIA.cdi) * 100).toFixed(0)}% do CDI (≈${produto.taxaBase.toFixed(2)}% a.a.)`,
  }[produto.tipoTaxa];

  return (
    <div style={{ background: "#0d1320", border: "1px solid #1e2d45", borderRadius: "14px", padding: "16px", marginBottom: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "24px" }}>{produto.icone}</span>
          <div>
            <div style={{ color: "#fff", fontWeight: "700", fontSize: "14px" }}>{produto.nome}</div>
            <div style={{ color: "#555", fontSize: "11px" }}>{produto.categoria}</div>
          </div>
        </div>
        {!produto.ir && (
          <span style={{ background: "#00e5a022", color: "#00e5a0", borderRadius: "6px", padding: "3px 8px", fontSize: "10px", fontWeight: "700" }}>ISENTO IR</span>
        )}
      </div>

      <p style={{ color: "#999", fontSize: "12px", lineHeight: "1.6", marginBottom: "12px" }}>{produto.descricao}</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "12px" }}>
        <div style={{ background: "#111a27", borderRadius: "8px", padding: "8px 10px" }}>
          <div style={{ color: "#444", fontSize: "9px", fontFamily: "monospace" }}>TAXA</div>
          <div style={{ color: "#00e5a0", fontSize: "12px", fontWeight: "700" }}>{taxaLabel}</div>
        </div>
        <div style={{ background: "#111a27", borderRadius: "8px", padding: "8px 10px" }}>
          <div style={{ color: "#444", fontSize: "9px", fontFamily: "monospace" }}>RISCO</div>
          <div style={{ color: "#ccc", fontSize: "12px" }}>{produto.risco}</div>
        </div>
        <div style={{ background: "#111a27", borderRadius: "8px", padding: "8px 10px" }}>
          <div style={{ color: "#444", fontSize: "9px", fontFamily: "monospace" }}>LIQUIDEZ</div>
          <div style={{ color: "#ccc", fontSize: "12px" }}>{produto.liquidez}</div>
        </div>
      </div>

      <button onClick={() => onSimular(produto)}
        style={{ width: "100%", background: "#00e5a015", border: "1px solid #00e5a033", color: "#00e5a0", borderRadius: "8px", padding: "10px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}>
        🧮 Simular Investimento
      </button>
    </div>
  );
}

// ── Modal de simulação ─────────────────────────────────────────────
function SimuladorModal({ produto, onClose }) {
  const [valor, setValor] = useState("1000");
  const [meses, setMeses] = useState("12");

  const valorNum = parseFloat(valor) || 0;
  const mesesNum = parseInt(meses) || 1;

  const resultado = useMemo(() => calcularValorFinal(valorNum, produto.taxaBase, mesesNum, !produto.ir), [valorNum, mesesNum, produto]);
  const rendimentoLiquido = resultado.liquido - valorNum;
  const rentabilidadePct = valorNum > 0 ? (rendimentoLiquido / valorNum) * 100 : 0;

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000aa", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#0d1320", border: "1px solid #1e2d45", borderRadius: "16px", padding: "22px", maxWidth: "420px", width: "100%", maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "20px" }}>{produto.icone}</span> {produto.nome}
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#444", cursor: "pointer", fontSize: "20px" }}>×</button>
        </div>

        <div style={{ marginBottom: "14px" }}>
          <label style={{ display: "block", color: "#666", fontSize: "11px", marginBottom: "5px" }}>Valor a investir (R$)</label>
          <input type="number" value={valor} onChange={e => setValor(e.target.value)}
            style={{ width: "100%", background: "#111a27", border: "1px solid #1e2d45", color: "#e0e6f0", borderRadius: "8px", padding: "12px 14px", fontSize: "16px", fontFamily: "monospace" }} />
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", color: "#666", fontSize: "11px", marginBottom: "5px" }}>Prazo (meses)</label>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {[6, 12, 24, 36, 60, 120].map(m => (
              <button key={m} onClick={() => setMeses(String(m))}
                style={{ background: meses === String(m) ? "#00e5a022" : "#111a27", border: `1px solid ${meses === String(m) ? "#00e5a0" : "#1e2d45"}`, color: meses === String(m) ? "#00e5a0" : "#888", borderRadius: "8px", padding: "6px 12px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}>
                {m < 12 ? `${m}m` : `${m / 12}a`}
              </button>
            ))}
          </div>
          <input type="number" value={meses} onChange={e => setMeses(e.target.value)} placeholder="Ou digite os meses..."
            style={{ width: "100%", marginTop: "8px", background: "#111a27", border: "1px solid #1e2d45", color: "#e0e6f0", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", fontFamily: "monospace" }} />
        </div>

        {/* Resultado */}
        <div style={{ background: "#00e5a011", border: "1px solid #00e5a033", borderRadius: "12px", padding: "16px", marginBottom: "12px" }}>
          <div style={{ color: "#444", fontSize: "10px", fontFamily: "monospace", marginBottom: "8px" }}>VALOR FINAL (LÍQUIDO)</div>
          <div style={{ color: "#00e5a0", fontSize: "26px", fontWeight: "700", fontFamily: "monospace", marginBottom: "4px" }}>{fmtMoney(resultado.liquido)}</div>
          <div style={{ color: "#888", fontSize: "12px" }}>
            Rendimento: <span style={{ color: "#00e5a0" }}>+{fmtMoney(rendimentoLiquido)}</span> ({rentabilidadePct.toFixed(2)}% no período)
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "16px" }}>
          <div style={{ background: "#111a27", borderRadius: "8px", padding: "10px 12px" }}>
            <div style={{ color: "#444", fontSize: "9px", fontFamily: "monospace", marginBottom: "4px" }}>VALOR BRUTO</div>
            <div style={{ color: "#ccc", fontSize: "14px", fontWeight: "700", fontFamily: "monospace" }}>{fmtMoney(resultado.bruto)}</div>
          </div>
          <div style={{ background: "#111a27", borderRadius: "8px", padding: "10px 12px" }}>
            <div style={{ color: "#444", fontSize: "9px", fontFamily: "monospace", marginBottom: "4px" }}>IR ({resultado.aliquotaIR}%)</div>
            <div style={{ color: resultado.ir > 0 ? "#ff4d6d" : "#00e5a0", fontSize: "14px", fontWeight: "700", fontFamily: "monospace" }}>
              {resultado.ir > 0 ? `-${fmtMoney(resultado.ir)}` : "Isento"}
            </div>
          </div>
        </div>

        <div style={{ color: "#333", fontSize: "10px", fontFamily: "monospace", textAlign: "center" }}>
          Taxas de referência atualizadas em {TAXAS_REFERENCIA.atualizadoEm} · Simulação aproximada, sujeita a variação de mercado
        </div>
      </div>
    </div>
  );
}

export default function Investimentos({ setPage }) {
  const [perfil, setPerfil] = useState(null);
  const [simulando, setSimulando] = useState(null);
  const [filtroCategoria, setFiltroCategoria] = useState("Todos");

  useEffect(() => {
    carregarPerfil().then(p => setPerfil(p));
  }, []);

  const perfilInfo = perfil ? PERFIS_INFO[perfil.tipoPerfil] : null;

  const alocacao = perfil?.perfilInfo?.alocacao || perfil?.alocacaoSugerida?.reduce((acc, item) => {
    acc[item.categoria] = item.percentual;
    return acc;
  }, {});

  const capital = perfil?.capital || 0;

  const categorias = ["Todos", "Tesouro Direto", "Renda Fixa Privada"];
  const produtosFiltrados = filtroCategoria === "Todos"
    ? PRODUTOS_RENDA_FIXA
    : PRODUTOS_RENDA_FIXA.filter(p => p.categoria === filtroCategoria);

  // Sem perfil definido
  if (!perfil) {
    return (
      <div style={{ padding: "14px", maxWidth: "600px", margin: "0 auto", textAlign: "center" }}>
        <div style={{ fontSize: "56px", marginTop: "30px", marginBottom: "16px" }}>🧠</div>
        <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "10px" }}>Defina seu perfil primeiro</h2>
        <p style={{ color: "#666", fontSize: "13px", lineHeight: "1.7", marginBottom: "20px" }}>
          Para receber uma alocação personalizada de investimentos, complete o questionário de perfil de investidor.
        </p>
        <button onClick={() => setPage("perfil")}
          style={{ background: "linear-gradient(135deg,#00e5a0,#006eff)", color: "#000", border: "none", borderRadius: "10px", padding: "13px 28px", fontSize: "14px", fontWeight: "700", cursor: "pointer" }}>
          🧠 Fazer Questionário
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "14px", maxWidth: "700px", margin: "0 auto" }}>
      {simulando && <SimuladorModal produto={simulando} onClose={() => setSimulando(null)} />}

      {/* Header */}
      <div style={{ marginBottom: "16px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "4px" }}>💼 <span style={{ color: "#00e5a0" }}>Investimentos</span></h2>
        <p style={{ color: "#444", fontSize: "12px" }}>Renda Fixa, Tesouro Direto e alocação personalizada</p>
      </div>

      {/* Taxas de referência */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "8px", marginBottom: "16px" }}>
        {[
          { label: "SELIC", value: `${TAXAS_REFERENCIA.selic.toFixed(2)}%`, color: "#00e5a0" },
          { label: "CDI", value: `${TAXAS_REFERENCIA.cdi.toFixed(2)}%`, color: "#6af" },
          { label: "IPCA (12m)", value: `${TAXAS_REFERENCIA.ipca.toFixed(2)}%`, color: "#ffd60a" },
        ].map((t, i) => (
          <div key={i} style={{ background: "#0d1320", border: "1px solid #1e2d45", borderRadius: "10px", padding: "10px", textAlign: "center" }}>
            <div style={{ color: "#444", fontSize: "9px", fontFamily: "monospace", marginBottom: "4px" }}>{t.label}</div>
            <div style={{ color: t.color, fontSize: "16px", fontWeight: "700", fontFamily: "monospace" }}>{t.value}</div>
          </div>
        ))}
      </div>
      <div style={{ color: "#333", fontSize: "10px", fontFamily: "monospace", textAlign: "center", marginBottom: "16px" }}>
        Taxas atualizadas em {TAXAS_REFERENCIA.atualizadoEm}
      </div>

      {/* Alocação sugerida pelo perfil */}
      {perfilInfo && alocacao && (
        <div style={{ background: `${perfilInfo.cor}11`, border: `1px solid ${perfilInfo.cor}33`, borderRadius: "14px", padding: "18px", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
            <span style={{ fontSize: "26px" }}>{perfilInfo.icone}</span>
            <div>
              <div style={{ color: "#444", fontSize: "10px", fontFamily: "monospace" }}>ALOCAÇÃO PARA SEU PERFIL</div>
              <div style={{ color: perfilInfo.cor, fontWeight: "700", fontSize: "16px" }}>{perfilInfo.nome}</div>
            </div>
          </div>

          {Object.entries(alocacao).map(([cat, pct]) => (
            <AlocacaoCard key={cat} categoria={cat} percentual={pct} valor={capital * pct / 100} cor={perfilInfo.cor} />
          ))}

          <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: `1px solid ${perfilInfo.cor}22`, display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#888", fontSize: "12px" }}>Capital total considerado</span>
            <span style={{ color: "#fff", fontSize: "13px", fontWeight: "700", fontFamily: "monospace" }}>{fmtMoney(capital)}</span>
          </div>

          <button onClick={() => setPage("perfil")}
            style={{ width: "100%", marginTop: "12px", background: "#111a27", border: "1px solid #1e2d45", color: "#888", borderRadius: "8px", padding: "10px", fontSize: "12px", cursor: "pointer" }}>
            ✏️ Ajustar perfil / capital
          </button>
        </div>
      )}

      {/* Filtro de categorias */}
      <div style={{ display: "flex", gap: "4px", background: "#0d1320", border: "1px solid #1e2d45", borderRadius: "10px", padding: "4px", marginBottom: "14px" }}>
        {categorias.map(cat => (
          <button key={cat} onClick={() => setFiltroCategoria(cat)}
            style={{ flex: 1, background: filtroCategoria === cat ? "#00e5a022" : "transparent", border: filtroCategoria === cat ? "1px solid #00e5a044" : "1px solid transparent", color: filtroCategoria === cat ? "#00e5a0" : "#555", borderRadius: "7px", padding: "8px", fontSize: "11px", fontWeight: "600", cursor: "pointer" }}>
            {cat}
          </button>
        ))}
      </div>

      {/* Lista de produtos */}
      <div style={{ marginBottom: "8px", color: "#444", fontSize: "10px", fontFamily: "monospace", letterSpacing: "0.1em" }}>
        PRODUTOS DISPONÍVEIS ({produtosFiltrados.length})
      </div>
      {produtosFiltrados.map(produto => (
        <ProdutoCard key={produto.id} produto={produto} onSimular={setSimulando} />
      ))}

      <div style={{ padding: "10px 14px", background: "#0d1320", border: "1px solid #1e2d45", borderRadius: "10px", marginTop: "8px" }}>
        <span style={{ color: "#444", fontSize: "11px" }}>
          💡 Simulações são aproximadas e não consideram taxas de custódia. Consulte sua corretora para valores exatos.
        </span>
      </div>
    </div>
  );
}

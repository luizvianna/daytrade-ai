import { useState, useCallback, useEffect } from "react";
import { authFetch, supabase } from "./supabaseClient";

const PROXY = "https://daytrade-proxy.onrender.com";

function paleta(tema) {
  if (tema === "claro") {
    return { card: "#FFFFFF", cardInner: "#F4F7FA", border: "#E2E8F0", textPrimary: "#172033", textSecondary: "#64748B", textFaint: "#94A3B8" };
  }
  return { card: "#0d1320", cardInner: "#111a27", border: "#1e2d45", textPrimary: "#fff", textSecondary: "#888", textFaint: "#444" };
}

const PERGUNTAS = [
  {
    id: 1, categoria: "Objetivo", pergunta: "Qual é seu principal objetivo financeiro?", icone: "🎯",
    opcoes: [
      { texto: "Preservar meu capital e ter segurança", pontos: 1 },
      { texto: "Crescer meu patrimônio gradualmente", pontos: 2 },
      { texto: "Multiplicar meu capital no médio prazo", pontos: 3 },
      { texto: "Maximizar ganhos, aceito altos riscos", pontos: 4 },
    ],
  },
  {
    id: 2, categoria: "Prazo", pergunta: "Por quanto tempo pretende manter seus investimentos?", icone: "📅",
    opcoes: [
      { texto: "Menos de 1 ano (curto prazo)", pontos: 1 },
      { texto: "1 a 3 anos (médio prazo)", pontos: 2 },
      { texto: "3 a 10 anos (longo prazo)", pontos: 3 },
      { texto: "Mais de 10 anos (muito longo prazo)", pontos: 4 },
    ],
  },
  {
    id: 3, categoria: "Risco", pergunta: "Se sua carteira caísse 20% em um mês, o que faria?", icone: "📉",
    opcoes: [
      { texto: "Venderia tudo imediatamente para evitar mais perdas", pontos: 1 },
      { texto: "Ficaria preocupado mas esperaria recuperar", pontos: 2 },
      { texto: "Manteria a calma e aguardaria a recuperação", pontos: 3 },
      { texto: "Compraria mais, pois seria uma oportunidade!", pontos: 4 },
    ],
  },
  {
    id: 4, categoria: "Experiência", pergunta: "Qual é sua experiência com investimentos?", icone: "📚",
    opcoes: [
      { texto: "Nenhuma — nunca investi antes", pontos: 1 },
      { texto: "Básica — só poupança ou CDB", pontos: 2 },
      { texto: "Intermediária — tenho ações e fundos", pontos: 3 },
      { texto: "Avançada — opero regularmente na bolsa", pontos: 4 },
    ],
  },
  {
    id: 5, categoria: "Renda", pergunta: "Qual é sua renda mensal aproximada?", icone: "💰",
    opcoes: [
      { texto: "Até R$ 3.000", pontos: 1 },
      { texto: "R$ 3.000 a R$ 8.000", pontos: 2 },
      { texto: "R$ 8.000 a R$ 20.000", pontos: 3 },
      { texto: "Acima de R$ 20.000", pontos: 4 },
    ],
  },
  {
    id: 6, categoria: "Capital", pergunta: "Qual valor pretende investir inicialmente?", icone: "🏦",
    opcoes: [
      { texto: "Até R$ 1.000", pontos: 1 },
      { texto: "R$ 1.000 a R$ 10.000", pontos: 2 },
      { texto: "R$ 10.000 a R$ 50.000", pontos: 3 },
      { texto: "Acima de R$ 50.000", pontos: 4 },
    ],
  },
  {
    id: 7, categoria: "Reserva", pergunta: "Você tem reserva de emergência (6 meses de gastos)?", icone: "🛡️",
    opcoes: [
      { texto: "Não tenho reserva de emergência", pontos: 1 },
      { texto: "Tenho parcialmente (1-3 meses)", pontos: 2 },
      { texto: "Sim, tenho 6 meses guardados", pontos: 3 },
      { texto: "Sim, tenho mais de 12 meses", pontos: 4 },
    ],
  },
  {
    id: 8, categoria: "Estabilidade", pergunta: "Como está sua situação financeira atual?", icone: "📊",
    opcoes: [
      { texto: "Instável — tenho dívidas e pouca sobra", pontos: 1 },
      { texto: "Regular — consigo pagar as contas", pontos: 2 },
      { texto: "Estável — tenho sobra mensal para investir", pontos: 3 },
      { texto: "Muito boa — tenho patrimônio acumulado", pontos: 4 },
    ],
  },
  {
    id: 9, categoria: "Diversificação", pergunta: "Como prefere diversificar seus investimentos?", icone: "🎲",
    opcoes: [
      { texto: "Prefiro concentrar em renda fixa segura", pontos: 1 },
      { texto: "Misto: renda fixa + alguns fundos", pontos: 2 },
      { texto: "Diversificado: ações, FIIs, renda fixa", pontos: 3 },
      { texto: "Global: ações, cripto, ETFs internacionais", pontos: 4 },
    ],
  },
  {
    id: 10, categoria: "Horizonte", pergunta: "Qual é seu sonho financeiro?", icone: "🌟",
    opcoes: [
      { texto: "Ter uma reserva segura para emergências", pontos: 1 },
      { texto: "Comprar um imóvel ou carro", pontos: 2 },
      { texto: "Conquistar independência financeira", pontos: 3 },
      { texto: "Viver de renda e aposentar mais cedo", pontos: 4 },
    ],
  },
];

export const PERFIS = {
  conservador: {
    nome: "Conservador", icone: "🛡️", cor: "#6af",
    descricao: "Você prioriza segurança e preservação do capital. Prefere retornos menores mas previsíveis, sem sustos.",
    alocacao: { "Renda Fixa": 60, "Tesouro Direto": 20, "FIIs": 10, "Ações": 5, "Cripto": 5 },
    recomendacoes: [
      "Tesouro Selic para liquidez diária",
      "CDB de bancos sólidos (até R$250k coberto pelo FGC)",
      "LCI/LCA para isenção de IR",
      "FIIs de CRI/CRA para renda passiva",
      "Evite ações voláteis e cripto por enquanto",
    ],
  },
  moderado: {
    nome: "Moderado", icone: "⚖️", cor: "#ffd60a",
    descricao: "Você busca equilíbrio entre segurança e crescimento. Aceita alguma volatilidade por retornos melhores.",
    alocacao: { "Renda Fixa": 35, "Tesouro Direto": 15, "FIIs": 20, "Ações": 25, "Cripto": 5 },
    recomendacoes: [
      "50% em renda fixa de qualidade",
      "FIIs diversificados para renda mensal",
      "Ações de empresas sólidas (VALE3, PETR4, ITUB4)",
      "ETFs para diversificação simples",
      "Pequena posição em cripto (máx 5%)",
    ],
  },
  arrojado: {
    nome: "Arrojado", icone: "🚀", cor: "#00e5a0",
    descricao: "Você aceita riscos maiores buscando retornos acima da média. Tem visão de longo prazo e resiliência.",
    alocacao: { "Renda Fixa": 15, "Tesouro Direto": 10, "FIIs": 15, "Ações": 45, "Cripto": 15 },
    recomendacoes: [
      "Foco em ações de crescimento",
      "Small caps com potencial de valorização",
      "FIIs de tijolo e desenvolvimento",
      "ETFs internacionais (IVVB11)",
      "Cripto como hedge e crescimento",
    ],
  },
  agressivo: {
    nome: "Agressivo", icone: "⚡", cor: "#ff9f43",
    descricao: "Você busca maximizar retornos e aceita alta volatilidade. Tem conhecimento avançado e controle emocional.",
    alocacao: { "Renda Fixa": 5, "Tesouro Direto": 5, "FIIs": 10, "Ações": 50, "Cripto": 30 },
    recomendacoes: [
      "Ações de alto crescimento e small caps",
      "Operações de swing trade e curto prazo",
      "Cripto diversificada (BTC, ETH, altcoins)",
      "ETFs setoriais e temáticos",
      "Mínimo em renda fixa (apenas liquidez)",
    ],
  },
};

function getPerfil(pontuacao) {
  if (pontuacao <= 15) return "conservador";
  if (pontuacao <= 25) return "moderado";
  if (pontuacao <= 33) return "arrojado";
  return "agressivo";
}

// ── API calls ao proxy (substitui localStorage) ──────────────
export async function carregarPerfil() {
  try {
    const r = await authFetch(`${PROXY}/api/perfil`);
    const data = await r.json();
    if (data.success && data.data) {
      const p = data.data;
      const perfilInfo = PERFIS[p.tipoPerfil];
      return {
        nome: p.nome,
        tipoPerfil: p.tipoPerfil,
        pontuacao: p.pontuacao,
        capital: p.capital,
        orcamentoMensal: p.orcamentoMensal,
        perfilInfo,
        criadoEm: new Date(p.atualizadoEm).toLocaleDateString("pt-BR"),
        alocacaoSugerida: Object.entries(perfilInfo.alocacao).map(([cat, pct]) => ({
          categoria: cat, percentual: pct,
          valor: ((p.capital || 0) * pct / 100).toFixed(2),
        })),
      };
    }
    return null;
  } catch { return null; }
}

export async function salvarPerfil(perfil) {
  try {
    await authFetch(`${PROXY}/api/perfil`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: perfil.nome,
        tipoPerfil: perfil.tipoPerfil,
        pontuacao: perfil.pontuacao,
        capital: perfil.capital,
        orcamentoMensal: perfil.orcamentoMensal,
        respostas: perfil.respostas,
      }),
    });
  } catch (e) { console.error("Erro ao salvar perfil:", e.message); }
}

function AlocacaoBar({ categoria, percentual, cor, cores }) {
  return (
    <div style={{ marginBottom: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
        <span style={{ color: cores.textSecondary, fontSize: "12px" }}>{categoria}</span>
        <span style={{ color: cor, fontSize: "12px", fontWeight: "700", fontFamily: "monospace" }}>{percentual}%</span>
      </div>
      <div style={{ height: "6px", background: cores.border, borderRadius: "3px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${percentual}%`, background: cor, borderRadius: "3px", transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

function OpcaoButton({ texto, letra, onClick, cores }) {
  const [hover, setHover] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? "#00e5a011" : cores.card,
        border: `1px solid ${hover ? "#00e5a0" : cores.border}`,
        color: hover ? cores.textPrimary : cores.textSecondary,
        borderRadius: "12px", padding: "16px 18px", fontSize: "14px",
        textAlign: "left", cursor: "pointer", lineHeight: "1.5",
        transition: "background 0.15s, border-color 0.15s, color 0.15s",
        width: "100%",
      }}>
      <span style={{ color: "#00e5a0", fontFamily: "monospace", marginRight: "10px" }}>{letra}.</span>
      {texto}
    </button>
  );
}

function ToggleSwitch({ ativo, onToggle, cores }) {
  return (
    <button onClick={onToggle}
      style={{
        width: "44px", height: "24px", borderRadius: "12px", border: "none", cursor: "pointer",
        position: "relative", background: ativo ? "#00e5a0" : cores.border,
        transition: "background 0.2s", padding: 0, flexShrink: 0,
      }}>
      <div style={{
        width: "18px", height: "18px", borderRadius: "50%", background: "#fff",
        position: "absolute", top: "3px", left: ativo ? "23px" : "3px", transition: "left 0.2s",
      }} />
    </button>
  );
}

export default function Perfil({ tema, setTema }) {
  const cores = paleta(tema);
  const [etapa, setEtapa] = useState("loading");
  const [respostas, setRespostas] = useState({});
  const [perguntaAtual, setPerguntaAtual] = useState(0);
  const [resultado, setResultado] = useState(null);
  const [capital, setCapital] = useState("");
  const [orcamentoMensal, setOrcamentoMensal] = useState("");
  const [nome, setNome] = useState("");
  const [analisando, setAnalisando] = useState(false);
  const [perfilSalvo, setPerfilSalvo] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [prefsHome, setPrefsHome] = useState({ mostrarGrafico: true, mostrarAlocacao: true, mostrarTaxas: true });

  // Carrega perfil do banco ao montar
  useEffect(() => {
    carregarPerfil().then(p => {
      setPerfilSalvo(p);
      setEtapa(p ? "ver" : "intro");
    });
    authFetch(`${PROXY}/api/preferencias-home`)
      .then(r => r.json())
      .then(data => { if (data.success) setPrefsHome(data.data); })
      .catch(() => {});
  }, []);

  const alternarPrefHome = async (chave) => {
    const novasPrefs = { ...prefsHome, [chave]: !prefsHome[chave] };
    setPrefsHome(novasPrefs);
    try {
      await authFetch(`${PROXY}/api/preferencias-home`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(novasPrefs),
      });
    } catch (e) { console.error("Erro ao salvar preferências:", e.message); }
  };

  const responder = (pontos) => {
    const novasRespostas = { ...respostas, [perguntaAtual]: pontos };
    setRespostas(novasRespostas);
    if (perguntaAtual < PERGUNTAS.length - 1) {
      setPerguntaAtual(prev => prev + 1);
    } else {
      calcularResultado(novasRespostas);
    }
  };

  const calcularResultado = useCallback((resp) => {
    setAnalisando(true);
    const pontuacao = Object.values(resp).reduce((s, v) => s + v, 0);
    const tipoPerfil = getPerfil(pontuacao);
    const perfilInfo = PERFIS[tipoPerfil];
    const capitalNum = parseFloat(capital) || 0;

    const novoResultado = {
      nome: nome || "Investidor",
      tipoPerfil, pontuacao, perfilInfo,
      capital: capitalNum,
      orcamentoMensal: parseFloat(orcamentoMensal) || 0,
      respostas: resp,
      criadoEm: new Date().toLocaleDateString("pt-BR"),
      alocacaoSugerida: Object.entries(perfilInfo.alocacao).map(([cat, pct]) => ({
        categoria: cat, percentual: pct,
        valor: (capitalNum * pct / 100).toFixed(2),
      })),
    };

    setResultado(novoResultado);
    setEtapa("resultado");
    setAnalisando(false);
  }, [nome, capital, orcamentoMensal]);

  const salvar = async () => {
    setSalvando(true);
    await salvarPerfil(resultado);
    setPerfilSalvo(resultado);
    setSalvando(false);
    setEtapa("ver");
  };

  const reiniciar = () => {
    setEtapa("intro");
    setRespostas({});
    setPerguntaAtual(0);
    setResultado(null);
  };

  const progresso = (perguntaAtual / PERGUNTAS.length) * 100;

  // Loading
  if (etapa === "loading") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "200px" }}>
        <div style={{ color: "#00e5a0", fontSize: "14px" }}>⏳ Carregando perfil...</div>
      </div>
    );
  }

  // Ver perfil salvo
  if (etapa === "ver" && perfilSalvo) {
    const info = PERFIS[perfilSalvo.tipoPerfil];
    return (
      <div style={{ padding: "14px", maxWidth: "700px", margin: "0 auto" }}>
        <div style={{ marginBottom: "16px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "4px" }}>👤 <span style={{ color: info.cor }}>Meu Perfil</span> de Investidor</h2>
          <p style={{ color: cores.textFaint, fontSize: "12px" }}>Atualizado em {perfilSalvo.criadoEm}</p>
        </div>

        <div style={{ background: `${info.cor}11`, border: `2px solid ${info.cor}44`, borderRadius: "16px", padding: "24px", marginBottom: "16px", textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "8px" }}>{info.icone}</div>
          <h3 style={{ color: info.cor, fontSize: "24px", fontWeight: "700", marginBottom: "8px" }}>{perfilSalvo.nome} — {info.nome}</h3>
          <p style={{ color: cores.textSecondary, fontSize: "13px", lineHeight: "1.7" }}>{info.descricao}</p>
          <div style={{ background: `${info.cor}22`, borderRadius: "8px", padding: "8px 16px", marginTop: "12px", display: "inline-block" }}>
            <span style={{ color: info.cor, fontFamily: "monospace", fontSize: "13px" }}>Score: {perfilSalvo.pontuacao}/40 pontos</span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "16px" }}>
          {[
            { label: "CAPITAL TOTAL", value: `R$ ${parseFloat(perfilSalvo.capital || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, color: info.cor },
            { label: "APORTE MENSAL", value: `R$ ${parseFloat(perfilSalvo.orcamentoMensal || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, color: cores.textPrimary },
            { label: "TIPO", value: info.nome.toUpperCase(), color: info.cor },
          ].map((s, i) => (
            <div key={i} style={{ background: cores.card, border: `1px solid ${cores.border}`, borderRadius: "10px", padding: "12px", textAlign: "center" }}>
              <div style={{ color: cores.textFaint, fontSize: "9px", fontFamily: "monospace", marginBottom: "4px" }}>{s.label}</div>
              <div style={{ color: s.color, fontSize: "14px", fontWeight: "700" }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={{ background: cores.card, border: `1px solid ${cores.border}`, borderRadius: "12px", padding: "18px", marginBottom: "14px" }}>
          <div style={{ color: cores.textFaint, fontSize: "10px", fontFamily: "monospace", letterSpacing: "0.1em", marginBottom: "14px" }}>📊 ALOCAÇÃO SUGERIDA</div>
          {Object.entries(info.alocacao).map(([cat, pct]) => (
            <AlocacaoBar key={cat} categoria={cat} percentual={pct} cor={info.cor} cores={cores} />
          ))}
          {perfilSalvo.capital > 0 && (
            <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: `1px solid ${cores.border}` }}>
              <div style={{ color: cores.textFaint, fontSize: "9px", fontFamily: "monospace", marginBottom: "10px" }}>VALORES EM REAIS</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "8px" }}>
                {Object.entries(info.alocacao).map(([cat, pct]) => (
                  <div key={cat} style={{ background: cores.cardInner, borderRadius: "8px", padding: "8px 10px" }}>
                    <div style={{ color: cores.textFaint, fontSize: "10px" }}>{cat}</div>
                    <div style={{ color: info.cor, fontSize: "13px", fontWeight: "700", fontFamily: "monospace" }}>
                      R$ {(perfilSalvo.capital * pct / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ background: cores.card, border: `1px solid ${cores.border}`, borderRadius: "12px", padding: "18px", marginBottom: "14px" }}>
          <div style={{ color: cores.textFaint, fontSize: "10px", fontFamily: "monospace", letterSpacing: "0.1em", marginBottom: "12px" }}>✅ RECOMENDAÇÕES PARA VOCÊ</div>
          {info.recomendacoes.map((r, i) => (
            <div key={i} style={{ display: "flex", gap: "10px", padding: "8px 0", borderBottom: i < info.recomendacoes.length - 1 ? `1px solid ${cores.border}` : "none" }}>
              <span style={{ color: info.cor }}>•</span>
              <span style={{ color: cores.textSecondary, fontSize: "13px", lineHeight: "1.6" }}>{r}</span>
            </div>
          ))}
        </div>

        <button onClick={reiniciar}
          style={{ width: "100%", background: cores.cardInner, border: `1px solid ${cores.border}`, color: cores.textSecondary, borderRadius: "10px", padding: "12px", fontSize: "13px", cursor: "pointer", marginBottom: "8px" }}>
          🔄 Refazer Questionário
        </button>
        <button onClick={() => setEtapa("config")}
          style={{ width: "100%", background: cores.cardInner, border: `1px solid ${cores.border}`, color: cores.textSecondary, borderRadius: "10px", padding: "12px", fontSize: "13px", cursor: "pointer" }}>
          ⚙️ Configurações
        </button>
      </div>
    );
  }

  // Configurações
  if (etapa === "config") {
    return (
      <div style={{ padding: "14px", maxWidth: "600px", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
          <button onClick={() => setEtapa("ver")} style={{ background: "none", border: "none", color: cores.textSecondary, cursor: "pointer", fontSize: "18px" }}>←</button>
          <h2 style={{ fontSize: "20px", fontWeight: "700" }}>⚙️ Configurações</h2>
        </div>

        {/* Tema */}
        <div style={{ background: cores.card, border: `1px solid ${cores.border}`, borderRadius: "12px", padding: "18px", marginBottom: "14px" }}>
          <div style={{ color: cores.textFaint, fontSize: "10px", fontFamily: "monospace", letterSpacing: "0.1em", marginBottom: "12px" }}>APARÊNCIA</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <button onClick={() => setTema && setTema("escuro")}
              style={{ background: tema === "escuro" ? "#00e5a022" : cores.cardInner, border: `1px solid ${tema === "escuro" ? "#00e5a0" : cores.border}`, color: tema === "escuro" ? "#00e5a0" : cores.textSecondary, borderRadius: "10px", padding: "16px", fontSize: "13px", fontWeight: "700", cursor: "pointer" }}>
              🌙 Escuro
            </button>
            <button onClick={() => setTema && setTema("claro")}
              style={{ background: tema === "claro" ? "#00e5a022" : cores.cardInner, border: `1px solid ${tema === "claro" ? "#00e5a0" : cores.border}`, color: tema === "claro" ? "#00e5a0" : cores.textSecondary, borderRadius: "10px", padding: "16px", fontSize: "13px", fontWeight: "700", cursor: "pointer" }}>
              ☀️ Claro
            </button>
          </div>
          <div style={{ color: cores.textFaint, fontSize: "11px", marginTop: "10px", lineHeight: "1.5" }}>
            Por enquanto o tema claro afeta apenas o fundo geral do app — as telas internas ainda estão sendo adaptadas.
          </div>
        </div>

        {/* Personalizar Home */}
        <div style={{ background: cores.card, border: `1px solid ${cores.border}`, borderRadius: "12px", padding: "18px", marginBottom: "14px" }}>
          <div style={{ color: cores.textFaint, fontSize: "10px", fontFamily: "monospace", letterSpacing: "0.1em", marginBottom: "4px" }}>PERSONALIZAR HOME</div>
          <div style={{ color: cores.textFaint, fontSize: "11px", marginBottom: "12px", lineHeight: "1.5" }}>
            Escolha o que aparece na sua tela inicial.
          </div>
          {[
            { chave: "mostrarGrafico", titulo: "Gráfico de rentabilidade", desc: "Card de patrimônio e gráfico do IBOV" },
            { chave: "mostrarAlocacao", titulo: "Alocação ideal vs real", desc: "Comparação com seu perfil de investidor" },
            { chave: "mostrarTaxas", titulo: "Taxas de referência", desc: "Selic, CDI e IPCA em destaque" },
          ].map((item, i, arr) => (
            <div key={item.chave} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < arr.length - 1 ? `1px solid ${cores.border}` : "none" }}>
              <div style={{ paddingRight: "12px" }}>
                <div style={{ color: cores.textPrimary, fontSize: "13px", fontWeight: "600" }}>{item.titulo}</div>
                <div style={{ color: cores.textFaint, fontSize: "11px", marginTop: "2px" }}>{item.desc}</div>
              </div>
              <ToggleSwitch ativo={prefsHome[item.chave]} onToggle={() => alternarPrefHome(item.chave)} cores={cores} />
            </div>
          ))}
        </div>

        {/* Termos e segurança */}
        <div style={{ background: cores.card, border: `1px solid ${cores.border}`, borderRadius: "12px", padding: "18px", marginBottom: "14px" }}>
          <div style={{ color: cores.textFaint, fontSize: "10px", fontFamily: "monospace", letterSpacing: "0.1em", marginBottom: "12px" }}>TERMOS E SEGURANÇA</div>
          <div style={{ color: cores.textSecondary, fontSize: "12px", lineHeight: "1.8" }}>
            <p style={{ marginBottom: "10px" }}>
              <strong style={{ color: cores.textPrimary }}>⚠️ Análises geradas por IA</strong> podem conter erros e não constituem recomendação de investimento personalizada. Consulte um profissional certificado antes de investir.
            </p>
            <p style={{ marginBottom: "10px" }}>
              <strong style={{ color: cores.textPrimary }}>📉 Investimentos envolvem risco</strong>, incluindo a possibilidade de perda do capital investido. Rentabilidade passada não garante rentabilidade futura.
            </p>
            <p style={{ marginBottom: "10px" }}>
              <strong style={{ color: cores.textPrimary }}>🔒 Segurança dos dados:</strong> sua conta usa autenticação criptografada, conexão HTTPS em todas as telas, e seus dados ficam isolados por usuário no banco (Row Level Security).
            </p>
            <p style={{ marginBottom: 0 }}>
              <strong style={{ color: cores.textPrimary }}>💰 Ordens enviadas</strong> ficam pendentes até confirmação de execução via corretora parceira — nenhuma ordem é executada automaticamente sem essa confirmação.
            </p>
          </div>
        </div>

        {/* Sair da conta */}
        <button onClick={() => supabase.auth.signOut()}
          style={{ width: "100%", background: "#ff4d6d15", border: "1px solid #ff4d6d33", color: "#ff4d6d", borderRadius: "10px", padding: "13px", fontSize: "13px", fontWeight: "700", cursor: "pointer" }}>
          🔒 Sair da conta
        </button>
      </div>
    );
  }

  // Intro
  if (etapa === "intro") {
    return (
      <div style={{ padding: "14px", maxWidth: "600px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div style={{ fontSize: "56px", marginBottom: "12px" }}>🧠</div>
          <h2 style={{ fontSize: "22px", fontWeight: "700", marginBottom: "8px" }}>Análise de Perfil de Investidor</h2>
          <p style={{ color: cores.textSecondary, fontSize: "13px", lineHeight: "1.7" }}>Responda 10 perguntas rápidas e a IA vai montar a estratégia de investimento ideal para você.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
          {[
            { icone: "⏱️", titulo: "5 minutos", desc: "para completar" },
            { icone: "🎯", titulo: "10 perguntas", desc: "sobre seu perfil" },
            { icone: "📊", titulo: "Alocação", desc: "personalizada" },
            { icone: "🤖", titulo: "IA ajusta", desc: "todas as análises" },
          ].map((item, i) => (
            <div key={i} style={{ background: cores.card, border: `1px solid ${cores.border}`, borderRadius: "10px", padding: "14px", textAlign: "center" }}>
              <div style={{ fontSize: "24px", marginBottom: "4px" }}>{item.icone}</div>
              <div style={{ color: cores.textPrimary, fontWeight: "700", fontSize: "13px" }}>{item.titulo}</div>
              <div style={{ color: cores.textFaint, fontSize: "11px" }}>{item.desc}</div>
            </div>
          ))}
        </div>

        <div style={{ background: cores.card, border: `1px solid ${cores.border}`, borderRadius: "12px", padding: "18px", marginBottom: "16px" }}>
          <div style={{ color: cores.textFaint, fontSize: "10px", fontFamily: "monospace", letterSpacing: "0.1em", marginBottom: "12px" }}>ANTES DE COMEÇAR</div>
          <div style={{ marginBottom: "10px" }}>
            <label style={{ display: "block", color: cores.textSecondary, fontSize: "11px", marginBottom: "5px" }}>Seu nome (opcional)</label>
            <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Luiz"
              style={{ width: "100%", background: cores.cardInner, border: `1px solid ${cores.border}`, color: cores.textPrimary, borderRadius: "8px", padding: "10px 14px", fontSize: "14px" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label style={{ display: "block", color: cores.textSecondary, fontSize: "11px", marginBottom: "5px" }}>Capital disponível (R$)</label>
              <input type="number" value={capital} onChange={e => setCapital(e.target.value)} placeholder="Ex: 10000"
                style={{ width: "100%", background: cores.cardInner, border: `1px solid ${cores.border}`, color: cores.textPrimary, borderRadius: "8px", padding: "10px 14px", fontSize: "14px" }} />
            </div>
            <div>
              <label style={{ display: "block", color: cores.textSecondary, fontSize: "11px", marginBottom: "5px" }}>Aporte mensal (R$)</label>
              <input type="number" value={orcamentoMensal} onChange={e => setOrcamentoMensal(e.target.value)} placeholder="Ex: 500"
                style={{ width: "100%", background: cores.cardInner, border: `1px solid ${cores.border}`, color: cores.textPrimary, borderRadius: "8px", padding: "10px 14px", fontSize: "14px" }} />
            </div>
          </div>
        </div>

        <button onClick={() => setEtapa("questionario")}
          style={{ width: "100%", background: "linear-gradient(135deg,#00e5a0,#006eff)", color: "#000", border: "none", borderRadius: "12px", padding: "16px", fontSize: "16px", fontWeight: "700", cursor: "pointer" }}>
          🧠 Iniciar Questionário
        </button>
      </div>
    );
  }

  // Questionário
  if (etapa === "questionario") {
    const pergunta = PERGUNTAS[perguntaAtual];
    return (
      <div style={{ padding: "14px", maxWidth: "600px", margin: "0 auto" }}>
        <div style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ color: cores.textFaint, fontSize: "12px" }}>{pergunta.categoria}</span>
            <span style={{ color: cores.textFaint, fontSize: "12px", fontFamily: "monospace" }}>{perguntaAtual + 1}/{PERGUNTAS.length}</span>
          </div>
          <div style={{ height: "4px", background: cores.border, borderRadius: "2px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progresso}%`, background: "linear-gradient(90deg,#00e5a0,#006eff)", borderRadius: "2px", transition: "width 0.3s" }} />
          </div>
        </div>

        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div style={{ fontSize: "44px", marginBottom: "12px" }}>{pergunta.icone}</div>
          <h3 style={{ fontSize: "18px", fontWeight: "700", color: cores.textPrimary, lineHeight: "1.4" }}>{pergunta.pergunta}</h3>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {pergunta.opcoes.map((opcao, i) => (
            <OpcaoButton key={i} texto={opcao.texto} letra={String.fromCharCode(65 + i)} onClick={() => responder(opcao.pontos)} cores={cores} />
          ))}
        </div>

        {perguntaAtual > 0 && (
          <button onClick={() => setPerguntaAtual(prev => prev - 1)}
            style={{ marginTop: "14px", background: "none", border: "none", color: cores.textFaint, cursor: "pointer", fontSize: "13px" }}>
            ← Voltar
          </button>
        )}
        {analisando && <div style={{ textAlign: "center", padding: "20px", color: "#00e5a0" }}>⏳ Calculando seu perfil...</div>}
      </div>
    );
  }

  // Resultado
  if (etapa === "resultado" && resultado) {
    const info = resultado.perfilInfo;
    return (
      <div style={{ padding: "14px", maxWidth: "700px", margin: "0 auto" }}>
        <div style={{ background: `${info.cor}11`, border: `2px solid ${info.cor}44`, borderRadius: "16px", padding: "28px", marginBottom: "16px", textAlign: "center" }}>
          <div style={{ fontSize: "56px", marginBottom: "10px" }}>{info.icone}</div>
          <h2 style={{ color: info.cor, fontSize: "26px", fontWeight: "700", marginBottom: "8px" }}>
            {resultado.nome ? `${resultado.nome}, você é` : "Você é"} {info.nome}!
          </h2>
          <p style={{ color: cores.textSecondary, fontSize: "13px", lineHeight: "1.7", marginBottom: "12px" }}>{info.descricao}</p>
          <div style={{ display: "inline-flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
            <span style={{ background: `${info.cor}22`, color: info.cor, borderRadius: "8px", padding: "4px 12px", fontSize: "12px", fontFamily: "monospace" }}>Score: {resultado.pontuacao}/40</span>
            {resultado.capital > 0 && <span style={{ background: cores.cardInner, color: cores.textSecondary, borderRadius: "8px", padding: "4px 12px", fontSize: "12px", fontFamily: "monospace" }}>Capital: R${parseFloat(resultado.capital).toLocaleString("pt-BR")}</span>}
          </div>
        </div>

        {resultado.capital > 0 && (
          <div style={{ background: cores.card, border: `1px solid ${cores.border}`, borderRadius: "12px", padding: "18px", marginBottom: "14px" }}>
            <div style={{ color: cores.textFaint, fontSize: "10px", fontFamily: "monospace", letterSpacing: "0.1em", marginBottom: "14px" }}>💼 ALOCAÇÃO SUGERIDA PARA VOCÊ</div>
            {resultado.alocacaoSugerida.map(item => (
              <div key={item.categoria} style={{ marginBottom: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ color: cores.textSecondary, fontSize: "12px" }}>{item.categoria}</span>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ color: info.cor, fontSize: "12px", fontWeight: "700", fontFamily: "monospace", marginRight: "8px" }}>{item.percentual}%</span>
                    <span style={{ color: cores.textFaint, fontSize: "11px", fontFamily: "monospace" }}>R$ {parseFloat(item.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
                <div style={{ height: "6px", background: cores.border, borderRadius: "3px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${item.percentual}%`, background: info.cor, borderRadius: "3px" }} />
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ background: cores.card, border: `1px solid ${cores.border}`, borderRadius: "12px", padding: "18px", marginBottom: "14px" }}>
          <div style={{ color: cores.textFaint, fontSize: "10px", fontFamily: "monospace", letterSpacing: "0.1em", marginBottom: "12px" }}>✅ RECOMENDAÇÕES PERSONALIZADAS</div>
          {info.recomendacoes.map((r, i) => (
            <div key={i} style={{ display: "flex", gap: "10px", padding: "8px 0", borderBottom: i < info.recomendacoes.length - 1 ? `1px solid ${cores.border}` : "none" }}>
              <span style={{ color: info.cor }}>•</span>
              <span style={{ color: cores.textSecondary, fontSize: "13px", lineHeight: "1.6" }}>{r}</span>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <button onClick={reiniciar}
            style={{ background: cores.cardInner, border: `1px solid ${cores.border}`, color: cores.textSecondary, borderRadius: "10px", padding: "13px", fontSize: "13px", cursor: "pointer" }}>
            🔄 Refazer
          </button>
          <button onClick={salvar} disabled={salvando}
            style={{ background: salvando ? "#555" : `linear-gradient(135deg,${info.cor},#006eff)`, color: "#000", border: "none", borderRadius: "10px", padding: "13px", fontSize: "14px", fontWeight: "700", cursor: salvando ? "not-allowed" : "pointer" }}>
            {salvando ? "⏳ Salvando..." : "💾 Salvar Perfil"}
          </button>
        </div>
      </div>
    );
  }

  return null;
}

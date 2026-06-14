import { useState, useCallback } from "react";

const STORAGE_KEY = "tradeai_perfil";

const PERGUNTAS = [
  {
    id: 1,
    categoria: "Objetivo",
    pergunta: "Qual é seu principal objetivo financeiro?",
    icone: "🎯",
    opcoes: [
      { texto: "Preservar meu capital e ter segurança", pontos: 1 },
      { texto: "Crescer meu patrimônio gradualmente", pontos: 2 },
      { texto: "Multiplicar meu capital no médio prazo", pontos: 3 },
      { texto: "Maximizar ganhos, aceito altos riscos", pontos: 4 },
    ],
  },
  {
    id: 2,
    categoria: "Prazo",
    pergunta: "Por quanto tempo pretende manter seus investimentos?",
    icone: "📅",
    opcoes: [
      { texto: "Menos de 1 ano (curto prazo)", pontos: 1 },
      { texto: "1 a 3 anos (médio prazo)", pontos: 2 },
      { texto: "3 a 10 anos (longo prazo)", pontos: 3 },
      { texto: "Mais de 10 anos (muito longo prazo)", pontos: 4 },
    ],
  },
  {
    id: 3,
    categoria: "Risco",
    pergunta: "Se sua carteira caísse 20% em um mês, o que faria?",
    icone: "📉",
    opcoes: [
      { texto: "Venderia tudo imediatamente para evitar mais perdas", pontos: 1 },
      { texto: "Ficaria preocupado mas esperaria recuperar", pontos: 2 },
      { texto: "Manteria a calma e aguardaria a recuperação", pontos: 3 },
      { texto: "Compraria mais, pois seria uma oportunidade!", pontos: 4 },
    ],
  },
  {
    id: 4,
    categoria: "Experiência",
    pergunta: "Qual é sua experiência com investimentos?",
    icone: "📚",
    opcoes: [
      { texto: "Nenhuma — nunca investi antes", pontos: 1 },
      { texto: "Básica — só poupança ou CDB", pontos: 2 },
      { texto: "Intermediária — tenho ações e fundos", pontos: 3 },
      { texto: "Avançada — opero regularmente na bolsa", pontos: 4 },
    ],
  },
  {
    id: 5,
    categoria: "Renda",
    pergunta: "Qual é sua renda mensal aproximada?",
    icone: "💰",
    opcoes: [
      { texto: "Até R$ 3.000", pontos: 1 },
      { texto: "R$ 3.000 a R$ 8.000", pontos: 2 },
      { texto: "R$ 8.000 a R$ 20.000", pontos: 3 },
      { texto: "Acima de R$ 20.000", pontos: 4 },
    ],
  },
  {
    id: 6,
    categoria: "Capital",
    pergunta: "Qual valor pretende investir inicialmente?",
    icone: "🏦",
    opcoes: [
      { texto: "Até R$ 1.000", pontos: 1 },
      { texto: "R$ 1.000 a R$ 10.000", pontos: 2 },
      { texto: "R$ 10.000 a R$ 50.000", pontos: 3 },
      { texto: "Acima de R$ 50.000", pontos: 4 },
    ],
  },
  {
    id: 7,
    categoria: "Reserva",
    pergunta: "Você tem reserva de emergência (6 meses de gastos)?",
    icone: "🛡️",
    opcoes: [
      { texto: "Não tenho reserva de emergência", pontos: 1 },
      { texto: "Tenho parcialmente (1-3 meses)", pontos: 2 },
      { texto: "Sim, tenho 6 meses guardados", pontos: 3 },
      { texto: "Sim, tenho mais de 12 meses", pontos: 4 },
    ],
  },
  {
    id: 8,
    categoria: "Estabilidade",
    pergunta: "Como está sua situação financeira atual?",
    icone: "📊",
    opcoes: [
      { texto: "Instável — tenho dívidas e pouca sobra", pontos: 1 },
      { texto: "Regular — consigo pagar as contas", pontos: 2 },
      { texto: "Estável — tenho sobra mensal para investir", pontos: 3 },
      { texto: "Muito boa — tenho patrimônio acumulado", pontos: 4 },
    ],
  },
  {
    id: 9,
    categoria: "Diversificação",
    pergunta: "Como prefere diversificar seus investimentos?",
    icone: "🎲",
    opcoes: [
      { texto: "Prefiro concentrar em renda fixa segura", pontos: 1 },
      { texto: "Misto: renda fixa + alguns fundos", pontos: 2 },
      { texto: "Diversificado: ações, FIIs, renda fixa", pontos: 3 },
      { texto: "Global: ações, cripto, ETFs internacionais", pontos: 4 },
    ],
  },
  {
    id: 10,
    categoria: "Horizonte",
    pergunta: "Qual é seu sonho financeiro?",
    icone: "🌟",
    opcoes: [
      { texto: "Ter uma reserva segura para emergências", pontos: 1 },
      { texto: "Comprar um imóvel ou carro", pontos: 2 },
      { texto: "Conquistar independência financeira", pontos: 3 },
      { texto: "Viver de renda e aposentar mais cedo", pontos: 4 },
    ],
  },
];

const PERFIS = {
  conservador: {
    nome: "Conservador",
    icone: "🛡️",
    cor: "#6af",
    descricao: "Você prioriza segurança e preservação do capital. Prefere retornos menores mas previsíveis, sem sustos.",
    alocacao: {
      "Renda Fixa": 60,
      "Tesouro Direto": 20,
      "FIIs": 10,
      "Ações": 5,
      "Cripto": 5,
    },
    recomendacoes: [
      "Tesouro Selic para liquidez diária",
      "CDB de bancos sólidos (até R$250k coberto pelo FGC)",
      "LCI/LCA para isenção de IR",
      "FIIs de CRI/CRA para renda passiva",
      "Evite ações voláteis e cripto por enquanto",
    ],
  },
  moderado: {
    nome: "Moderado",
    icone: "⚖️",
    cor: "#ffd60a",
    descricao: "Você busca equilíbrio entre segurança e crescimento. Aceita alguma volatilidade por retornos melhores.",
    alocacao: {
      "Renda Fixa": 35,
      "Tesouro Direto": 15,
      "FIIs": 20,
      "Ações": 25,
      "Cripto": 5,
    },
    recomendacoes: [
      "50% em renda fixa de qualidade",
      "FIIs diversificados para renda mensal",
      "Ações de empresas sólidas (VALE3, PETR4, ITUB4)",
      "ETFs para diversificação simples",
      "Pequena posição em cripto (máx 5%)",
    ],
  },
  arrojado: {
    nome: "Arrojado",
    icone: "🚀",
    cor: "#00e5a0",
    descricao: "Você aceita riscos maiores buscando retornos acima da média. Tem visão de longo prazo e resiliência.",
    alocacao: {
      "Renda Fixa": 15,
      "Tesouro Direto": 10,
      "FIIs": 15,
      "Ações": 45,
      "Cripto": 15,
    },
    recomendacoes: [
      "Foco em ações de crescimento",
      "Small caps com potencial de valorização",
      "FIIs de tijolo e desenvolvimento",
      "ETFs internacionais (IVVB11)",
      "Cripto como hedge e crescimento",
    ],
  },
  agressivo: {
    nome: "Agressivo",
    icone: "⚡",
    cor: "#ff9f43",
    descricao: "Você busca maximizar retornos e aceita alta volatilidade. Tem conhecimento avançado e controle emocional.",
    alocacao: {
      "Renda Fixa": 5,
      "Tesouro Direto": 5,
      "FIIs": 10,
      "Ações": 50,
      "Cripto": 30,
    },
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

export function carregarPerfil() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch { return null; }
}

export function salvarPerfil(perfil) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(perfil));
}

function AlocacaoBar({ categoria, percentual, cor }) {
  return (
    <div style={{ marginBottom: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
        <span style={{ color: "#aaa", fontSize: "12px" }}>{categoria}</span>
        <span style={{ color: cor, fontSize: "12px", fontWeight: "700", fontFamily: "monospace" }}>{percentual}%</span>
      </div>
      <div style={{ height: "6px", background: "#1e2d45", borderRadius: "3px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${percentual}%`, background: cor, borderRadius: "3px", transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

// Botão de opção sem manipulação direta do DOM (evita conflito com React)
function OpcaoButton({ texto, letra, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? "#00e5a011" : "#0d1320",
        border: `1px solid ${hover ? "#00e5a0" : "#1e2d45"}`,
        color: hover ? "#fff" : "#ccc",
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

export default function Perfil() {
  const [etapa, setEtapa] = useState("intro"); // intro | questionario | resultado
  const [respostas, setRespostas] = useState({});
  const [perguntaAtual, setPerguntaAtual] = useState(0);
  const [resultado, setResultado] = useState(null);
  const [capital, setCapital] = useState("");
  const [orcamentoMensal, setOrcamentoMensal] = useState("");
  const [nome, setNome] = useState("");
  const [analisando, setAnalisando] = useState(false);
  const [verPerfilSalvo, setVerPerfilSalvo] = useState(true);

  const perfilSalvo = carregarPerfil();

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

    const novoResultado = {
      nome: nome || "Investidor",
      tipoPerfil,
      pontuacao,
      perfilInfo,
      capital: parseFloat(capital) || 0,
      orcamentoMensal: parseFloat(orcamentoMensal) || 0,
      respostas: resp,
      criadoEm: new Date().toLocaleDateString("pt-BR"),
      alocacaoSugerida: Object.entries(perfilInfo.alocacao).map(([cat, pct]) => ({
        categoria: cat,
        percentual: pct,
        valor: ((parseFloat(capital) || 0) * pct / 100).toFixed(2),
      })),
    };

    setResultado(novoResultado);
    setEtapa("resultado");
    setAnalisando(false);
  }, [nome, capital, orcamentoMensal]);

  const salvar = () => {
    salvarPerfil(resultado);
    setVerPerfilSalvo(true);
    setEtapa("intro");
  };

  const reiniciar = () => {
    setEtapa("intro");
    setRespostas({});
    setPerguntaAtual(0);
    setResultado(null);
    setVerPerfilSalvo(false);
  };

  const progresso = (perguntaAtual / PERGUNTAS.length) * 100;

  // Mostra perfil salvo
  if (perfilSalvo && etapa === "intro" && verPerfilSalvo) {
    const info = PERFIS[perfilSalvo.tipoPerfil];
    return (
      <div style={{ padding: "14px", maxWidth: "700px", margin: "0 auto" }}>
        <div style={{ marginBottom: "16px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "4px" }}>👤 <span style={{ color: info.cor }}>Meu Perfil</span> de Investidor</h2>
          <p style={{ color: "#444", fontSize: "12px" }}>Criado em {perfilSalvo.criadoEm}</p>
        </div>

        <div style={{ background: `${info.cor}11`, border: `2px solid ${info.cor}44`, borderRadius: "16px", padding: "24px", marginBottom: "16px", textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "8px" }}>{info.icone}</div>
          <h3 style={{ color: info.cor, fontSize: "24px", fontWeight: "700", marginBottom: "8px" }}>{perfilSalvo.nome} — {info.nome}</h3>
          <p style={{ color: "#bbb", fontSize: "13px", lineHeight: "1.7" }}>{info.descricao}</p>
          <div style={{ background: `${info.cor}22`, borderRadius: "8px", padding: "8px 16px", marginTop: "12px", display: "inline-block" }}>
            <span style={{ color: info.cor, fontFamily: "monospace", fontSize: "13px" }}>Score: {perfilSalvo.pontuacao}/40 pontos</span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "16px" }}>
          {[
            { label: "CAPITAL TOTAL", value: `R$ ${parseFloat(perfilSalvo.capital || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, color: info.cor },
            { label: "APORTE MENSAL", value: `R$ ${parseFloat(perfilSalvo.orcamentoMensal || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, color: "#fff" },
            { label: "TIPO", value: info.nome.toUpperCase(), color: info.cor },
          ].map((s, i) => (
            <div key={i} style={{ background: "#0d1320", border: "1px solid #1e2d45", borderRadius: "10px", padding: "12px", textAlign: "center" }}>
              <div style={{ color: "#444", fontSize: "9px", fontFamily: "monospace", marginBottom: "4px" }}>{s.label}</div>
              <div style={{ color: s.color, fontSize: "14px", fontWeight: "700" }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={{ background: "#0d1320", border: "1px solid #1e2d45", borderRadius: "12px", padding: "18px", marginBottom: "14px" }}>
          <div style={{ color: "#444", fontSize: "10px", fontFamily: "monospace", letterSpacing: "0.1em", marginBottom: "14px" }}>📊 ALOCAÇÃO SUGERIDA</div>
          {Object.entries(info.alocacao).map(([cat, pct]) => (
            <AlocacaoBar key={cat} categoria={cat} percentual={pct} cor={info.cor} />
          ))}
          {perfilSalvo.capital > 0 && (
            <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: "1px solid #1e2d45" }}>
              <div style={{ color: "#444", fontSize: "9px", fontFamily: "monospace", marginBottom: "10px" }}>VALORES EM REAIS</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "8px" }}>
                {Object.entries(info.alocacao).map(([cat, pct]) => (
                  <div key={cat} style={{ background: "#111a27", borderRadius: "8px", padding: "8px 10px" }}>
                    <div style={{ color: "#555", fontSize: "10px" }}>{cat}</div>
                    <div style={{ color: info.cor, fontSize: "13px", fontWeight: "700", fontFamily: "monospace" }}>
                      R$ {(perfilSalvo.capital * pct / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ background: "#0d1320", border: "1px solid #1e2d45", borderRadius: "12px", padding: "18px", marginBottom: "14px" }}>
          <div style={{ color: "#444", fontSize: "10px", fontFamily: "monospace", letterSpacing: "0.1em", marginBottom: "12px" }}>✅ RECOMENDAÇÕES PARA VOCÊ</div>
          {info.recomendacoes.map((r, i) => (
            <div key={i} style={{ display: "flex", gap: "10px", padding: "8px 0", borderBottom: i < info.recomendacoes.length - 1 ? "1px solid #0d1827" : "none" }}>
              <span style={{ color: info.cor, fontSize: "14px" }}>•</span>
              <span style={{ color: "#bbb", fontSize: "13px", lineHeight: "1.6" }}>{r}</span>
            </div>
          ))}
        </div>

        <button onClick={reiniciar}
          style={{ width: "100%", background: "#111a27", border: "1px solid #1e2d45", color: "#888", borderRadius: "10px", padding: "12px", fontSize: "13px", cursor: "pointer" }}>
          🔄 Refazer Questionário
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
          <p style={{ color: "#666", fontSize: "13px", lineHeight: "1.7" }}>Responda 10 perguntas rápidas e a IA vai montar a estratégia de investimento ideal para você — do conservador ao agressivo.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
          {[
            { icone: "⏱️", titulo: "5 minutos", desc: "para completar" },
            { icone: "🎯", titulo: "10 perguntas", desc: "sobre seu perfil" },
            { icone: "📊", titulo: "Alocação", desc: "personalizada" },
            { icone: "🤖", titulo: "IA ajusta", desc: "todas as análises" },
          ].map((item, i) => (
            <div key={i} style={{ background: "#0d1320", border: "1px solid #1e2d45", borderRadius: "10px", padding: "14px", textAlign: "center" }}>
              <div style={{ fontSize: "24px", marginBottom: "4px" }}>{item.icone}</div>
              <div style={{ color: "#fff", fontWeight: "700", fontSize: "13px" }}>{item.titulo}</div>
              <div style={{ color: "#555", fontSize: "11px" }}>{item.desc}</div>
            </div>
          ))}
        </div>

        <div style={{ background: "#0d1320", border: "1px solid #1e2d45", borderRadius: "12px", padding: "18px", marginBottom: "16px" }}>
          <div style={{ color: "#444", fontSize: "10px", fontFamily: "monospace", letterSpacing: "0.1em", marginBottom: "12px" }}>ANTES DE COMEÇAR</div>
          <div style={{ marginBottom: "10px" }}>
            <label style={{ display: "block", color: "#666", fontSize: "11px", marginBottom: "5px" }}>Seu nome (opcional)</label>
            <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Luiz"
              style={{ width: "100%", background: "#111a27", border: "1px solid #1e2d45", color: "#e0e6f0", borderRadius: "8px", padding: "10px 14px", fontSize: "14px" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label style={{ display: "block", color: "#666", fontSize: "11px", marginBottom: "5px" }}>Capital disponível (R$)</label>
              <input type="number" value={capital} onChange={e => setCapital(e.target.value)} placeholder="Ex: 10000"
                style={{ width: "100%", background: "#111a27", border: "1px solid #1e2d45", color: "#e0e6f0", borderRadius: "8px", padding: "10px 14px", fontSize: "14px" }} />
            </div>
            <div>
              <label style={{ display: "block", color: "#666", fontSize: "11px", marginBottom: "5px" }}>Aporte mensal (R$)</label>
              <input type="number" value={orcamentoMensal} onChange={e => setOrcamentoMensal(e.target.value)} placeholder="Ex: 500"
                style={{ width: "100%", background: "#111a27", border: "1px solid #1e2d45", color: "#e0e6f0", borderRadius: "8px", padding: "10px 14px", fontSize: "14px" }} />
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
        {/* Progresso */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ color: "#444", fontSize: "12px" }}>{pergunta.categoria}</span>
            <span style={{ color: "#444", fontSize: "12px", fontFamily: "monospace" }}>{perguntaAtual + 1}/{PERGUNTAS.length}</span>
          </div>
          <div style={{ height: "4px", background: "#1e2d45", borderRadius: "2px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progresso}%`, background: "linear-gradient(90deg,#00e5a0,#006eff)", borderRadius: "2px", transition: "width 0.3s" }} />
          </div>
        </div>

        {/* Pergunta */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div style={{ fontSize: "44px", marginBottom: "12px" }}>{pergunta.icone}</div>
          <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#fff", lineHeight: "1.4" }}>{pergunta.pergunta}</h3>
        </div>

        {/* Opções */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {pergunta.opcoes.map((opcao, i) => (
            <OpcaoButton key={i} texto={opcao.texto} letra={String.fromCharCode(65 + i)} onClick={() => responder(opcao.pontos)} />
          ))}
        </div>

        {perguntaAtual > 0 && (
          <button onClick={() => setPerguntaAtual(prev => prev - 1)}
            style={{ marginTop: "14px", background: "none", border: "none", color: "#444", cursor: "pointer", fontSize: "13px" }}>
            ← Voltar
          </button>
        )}

        {analisando && (
          <div style={{ textAlign: "center", padding: "20px", color: "#00e5a0" }}>⏳ Calculando seu perfil...</div>
        )}
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
          <p style={{ color: "#bbb", fontSize: "13px", lineHeight: "1.7", marginBottom: "12px" }}>{info.descricao}</p>
          <div style={{ display: "inline-flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
            <span style={{ background: `${info.cor}22`, color: info.cor, borderRadius: "8px", padding: "4px 12px", fontSize: "12px", fontFamily: "monospace" }}>Score: {resultado.pontuacao}/40</span>
            {resultado.capital > 0 && <span style={{ background: "#111a27", color: "#aaa", borderRadius: "8px", padding: "4px 12px", fontSize: "12px", fontFamily: "monospace" }}>Capital: R${parseFloat(resultado.capital).toLocaleString("pt-BR")}</span>}
          </div>
        </div>

        {resultado.capital > 0 && (
          <div style={{ background: "#0d1320", border: "1px solid #1e2d45", borderRadius: "12px", padding: "18px", marginBottom: "14px" }}>
            <div style={{ color: "#444", fontSize: "10px", fontFamily: "monospace", letterSpacing: "0.1em", marginBottom: "14px" }}>💼 ALOCAÇÃO SUGERIDA PARA VOCÊ</div>
            {resultado.alocacaoSugerida.map(item => (
              <div key={item.categoria} style={{ marginBottom: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ color: "#aaa", fontSize: "12px" }}>{item.categoria}</span>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ color: info.cor, fontSize: "12px", fontWeight: "700", fontFamily: "monospace", marginRight: "8px" }}>{item.percentual}%</span>
                    <span style={{ color: "#555", fontSize: "11px", fontFamily: "monospace" }}>R$ {parseFloat(item.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
                <div style={{ height: "6px", background: "#1e2d45", borderRadius: "3px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${item.percentual}%`, background: info.cor, borderRadius: "3px" }} />
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ background: "#0d1320", border: "1px solid #1e2d45", borderRadius: "12px", padding: "18px", marginBottom: "14px" }}>
          <div style={{ color: "#444", fontSize: "10px", fontFamily: "monospace", letterSpacing: "0.1em", marginBottom: "12px" }}>✅ RECOMENDAÇÕES PERSONALIZADAS</div>
          {info.recomendacoes.map((r, i) => (
            <div key={i} style={{ display: "flex", gap: "10px", padding: "8px 0", borderBottom: i < info.recomendacoes.length - 1 ? "1px solid #0d1827" : "none" }}>
              <span style={{ color: info.cor }}>•</span>
              <span style={{ color: "#bbb", fontSize: "13px", lineHeight: "1.6" }}>{r}</span>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <button onClick={reiniciar}
            style={{ background: "#111a27", border: "1px solid #1e2d45", color: "#888", borderRadius: "10px", padding: "13px", fontSize: "13px", cursor: "pointer" }}>
            🔄 Refazer
          </button>
          <button onClick={salvar}
            style={{ background: `linear-gradient(135deg,${info.cor},#006eff)`, color: "#000", border: "none", borderRadius: "10px", padding: "13px", fontSize: "14px", fontWeight: "700", cursor: "pointer" }}>
            💾 Salvar Perfil
          </button>
        </div>
      </div>
    );
  }

  return null;
}

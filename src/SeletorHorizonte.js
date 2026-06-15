import { HORIZONTES } from "./ContextoIA";

/**
 * Seletor visual de horizonte temporal (curto/médio/longo prazo).
 * Reutilizável em Chat.js, Score.js, etc.
 *
 * @param {string|null} value - horizonte selecionado ("curto"|"medio"|"longo"|null)
 * @param {function} onChange - chamado com o novo id ao trocar
 * @param {boolean} compact - se true, usa versão mais compacta (ícone + label curto)
 */
export default function SeletorHorizonte({ value, onChange, compact = false }) {
  return (
    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
      {HORIZONTES.map(h => {
        const ativo = value === h.id;
        return (
          <button key={h.id} onClick={() => onChange(ativo ? null : h.id)}
            style={{
              background: ativo ? `${h.cor}22` : "#0d1320",
              border: `1px solid ${ativo ? h.cor : "#1e2d45"}`,
              color: ativo ? h.cor : "#888",
              borderRadius: "20px",
              padding: compact ? "5px 11px" : "7px 14px",
              fontSize: compact ? "11px" : "12px",
              fontWeight: ativo ? "700" : "500",
              cursor: "pointer",
              display: "flex", alignItems: "center", gap: "6px",
              transition: "all 0.15s",
            }}>
            <span>{h.icone}</span>
            <span>{h.label}</span>
            {!compact && <span style={{ opacity: 0.6, fontSize: "10px" }}>({h.sub})</span>}
          </button>
        );
      })}
    </div>
  );
}

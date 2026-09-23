export default function RecentSearches({ items, onSelect, onRemove, onClear }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="gf-recent">
      <div className="gf-recent-header">
        <span className="gf-recent-title">recent searches</span>
        <button className="gf-recent-clear" onClick={onClear} type="button">
          clear
        </button>
      </div>
      <div className="gf-recent-chips">
        {items.map((q) => (
          <span key={q} className="gf-recent-chip">
            <button
              className="gf-recent-chip-btn"
              onClick={() => onSelect(q)}
              type="button"
            >
              {q}
            </button>
            <button
              className="gf-recent-chip-remove"
              onClick={() => onRemove(q)}
              type="button"
              aria-label={`remove ${q} from recent searches`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

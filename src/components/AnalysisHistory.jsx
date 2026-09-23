import { useEffect, useState } from 'react';
import { getAnalyses } from '../lib/analysesApi';

export default function AnalysisHistory({ onClose, onSelect }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    getAnalyses()
      .then((data) => {
        if (mounted) setRecords(data);
      })
      .catch((err) => {
        if (mounted) setError(err.message || 'Could not load history.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="gf-modal-overlay" onClick={onClose}>
      <div className="gf-modal" onClick={(e) => e.stopPropagation()}>
        <div className="gf-modal-header">
          <h3>Analysis History</h3>
          <button className="gf-modal-close" onClick={onClose} type="button">×</button>
        </div>

        {loading && <p className="gf-loading">loading history…</p>}
        {error && <p className="gf-error">{error}</p>}
        {!loading && !error && records.length === 0 && (
          <p className="gf-hint">No saved analyses yet.</p>
        )}

        <div className="gf-history-list">
          {records.map((r) => (
            <button
              key={r.id}
              className="gf-history-item"
              onClick={() => onSelect(r)}
              type="button"
            >
              <span className="gf-history-user">@{r.github_username}</span>
              <span className="gf-history-score">Score: {r.developer_score}</span>
              <span className="gf-history-date">
                {new Date(r.created_at).toLocaleDateString()}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

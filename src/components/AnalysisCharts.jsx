// Chart pieces used in the analysis report. These rely on the .gf-gauge-wrap,
// .gf-breakdown-*, and .gf-lang-* classes already defined in index.css —
// no extra CSS import needed here.

function scoreColor(score) {
  if (score >= 70) return '#3fb950'; // green
  if (score >= 40) return '#e3b341'; // amber
  return '#f85149'; // red
}

const BREAKDOWN_LABELS = {
  popularity: 'Popularity',
  activity: 'Activity',
  consistency: 'Consistency',
  diversity: 'Diversity',
};

export function ScoreGauge({ score }) {
  const size = 84;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score ?? 0));
  const offset = circumference - (clamped / 100) * circumference;
  const color = scoreColor(clamped);

  return (
    <div className="gf-gauge-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1e2a3d"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          fontSize="20"
          fontWeight="700"
          fill="#eef2f8"
          fontFamily="'JetBrains Mono', monospace"
        >
          {Math.round(clamped)}
        </text>
      </svg>
    </div>
  );
}

export function ScoreBreakdown({ breakdown }) {
  const entries = Object.entries(breakdown || {});
  if (entries.length === 0) return null;

  return (
    <div className="gf-breakdown">
      {entries.map(([key, value]) => (
        <div className="gf-breakdown-row" key={key}>
          <span className="gf-breakdown-label">{BREAKDOWN_LABELS[key] || key}</span>
          <span className="gf-breakdown-bar-track">
            <span
              className="gf-breakdown-bar-fill"
              style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
            />
          </span>
          <span className="gf-breakdown-value">{Math.round(value)}</span>
        </div>
      ))}
    </div>
  );
}

export function LanguageChart({ topLanguages }) {
  if (!topLanguages || topLanguages.length === 0) return null;

  return (
    <div className="gf-lang-chart">
      {topLanguages.map((lang) => (
        <div className="gf-lang-row" key={lang.name}>
          <span className="gf-lang-label">{lang.name}</span>
          <span className="gf-lang-bar-track">
            <span
              className="gf-lang-bar-fill"
              style={{ width: `${Math.max(0, Math.min(100, lang.percentage))}%` }}
            />
          </span>
          <span className="gf-lang-value">{Math.round(lang.percentage)}%</span>
        </div>
      ))}
    </div>
  );
}

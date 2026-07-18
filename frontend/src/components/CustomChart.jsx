import React from 'react';

// 1. Donut Chart (SVG)
export const DonutChart = ({ cleanPercent = 100, toxicPercent = 0 }) => {
  const clean = Math.max(0, Math.min(100, cleanPercent));
  const toxic = Math.max(0, Math.min(100, toxicPercent));

  const radius = 50;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;
  
  // Clean portion is drawn first, then toxic portion
  const toxicStroke = (toxic / 100) * circumference;
  const cleanStroke = circumference - toxicStroke;
  
  return (
    <div className="donut-chart-container">
      <svg width="180" height="180" viewBox="0 0 140 140">
        <defs>
          <linearGradient id="cleanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="toxicGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
        </defs>
        
        {/* Track circle */}
        <circle 
          cx="70" 
          cy="70" 
          r={radius} 
          fill="transparent" 
          stroke="var(--border-color)" 
          strokeWidth={strokeWidth} 
        />
        
        {/* Clean arc */}
        <circle 
          cx="70" 
          cy="70" 
          r={radius} 
          fill="transparent" 
          stroke="url(#cleanGrad)" 
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset="0"
          transform="rotate(-90 70 70)"
          strokeLinecap="round"
        />

        {/* Toxic arc */}
        {toxic > 0 && (
          <circle 
            cx="70" 
            cy="70" 
            r={radius} 
            fill="transparent" 
            stroke="url(#toxicGrad)" 
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={cleanStroke}
            transform={`rotate(${(clean / 100) * 360 - 90} 70 70)`}
            strokeLinecap="round"
          />
        )}
        
        {/* Middle text */}
        <text x="70" y="68" textAnchor="middle" fill="var(--text-primary)" fontSize="16" fontWeight="800">
          {clean.toFixed(0)}%
        </text>
        <text x="70" y="86" textAnchor="middle" fill="var(--text-secondary)" fontSize="10" fontWeight="600" letterSpacing="0.5">
          CLEAN CONTENT
        </text>
      </svg>
      
      <div className="donut-legend">
        <div className="legend-item">
          <span className="legend-dot success"></span>
          <span className="legend-txt">Clean ({clean.toFixed(1)}%)</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot danger"></span>
          <span className="legend-txt">Toxic ({toxic.toFixed(1)}%)</span>
        </div>
      </div>
      
      <style>{`
        .donut-chart-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 15px;
        }
        .donut-legend {
          display: flex;
          gap: 20px;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .legend-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }
        .legend-dot.success { background: var(--color-success); }
        .legend-dot.danger { background: var(--color-danger); }
        .legend-txt {
          font-size: 0.85rem;
          color: var(--text-secondary);
          font-weight: 500;
        }
      `}</style>
    </div>
  );
};

// 2. Bar Chart (SVG)
export const BarChart = ({ data = [], labels = [], title = "" }) => {
  const maxVal = Math.max(...data, 1);
  const chartHeight = 150;
  
  return (
    <div style={{ width: '100%' }}>
      {title && <p className="chart-subtitle">{title}</p>}
      <div className="bar-chart-visual">
        {data.map((val, idx) => {
          const barHeight = (val / maxVal) * chartHeight;
          return (
            <div key={idx} className="bar-column">
              <div className="bar-value">{val}</div>
              <div 
                className="bar-rect" 
                style={{ 
                  height: `${barHeight}px`,
                  background: 'linear-gradient(to top, var(--primary), var(--accent))' 
                }} 
              />
              <div className="bar-label">{labels[idx] || ""}</div>
            </div>
          );
        })}
      </div>
      <style>{`
        .chart-subtitle {
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin-bottom: 10px;
          text-align: center;
        }
        .bar-chart-visual {
          display: flex;
          justify-content: space-around;
          align-items: flex-end;
          height: 200px;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 10px;
        }
        .bar-column {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
        }
        .bar-rect {
          width: 24px;
          border-radius: 4px 4px 0 0;
          transition: height 0.5s ease;
          box-shadow: 0 0 10px var(--primary-glow);
        }
        .bar-value {
          font-size: 0.75rem;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .bar-label {
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin-top: 8px;
          text-align: center;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 50px;
        }
      `}</style>
    </div>
  );
};

// 3. Line Chart (SVG)
export const LineChart = ({ data = [], labels = [] }) => {
  const width = 500;
  const height = 180;
  const padding = 30;
  
  const maxVal = Math.max(...data, 1);
  
  // Calculate coordinates
  const points = data.map((val, idx) => {
    const x = padding + (idx / (data.length - 1 || 1)) * (width - 2 * padding);
    const y = height - padding - (val / maxVal) * (height - 2 * padding);
    return { x, y };
  });

  const pathD = points.reduce((acc, p, idx) => {
    return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, "");

  // Create close path for background gradient fill
  const fillD = points.length > 0 
    ? `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z` 
    : "";

  return (
    <div className="line-chart-container">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%">
        <defs>
          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* X Axis grid lines */}
        {points.map((p, idx) => (
          <line 
            key={idx} 
            x1={p.x} 
            y1={padding} 
            x2={p.x} 
            y2={height - padding} 
            stroke="var(--border-color)" 
            strokeDasharray="4 4" 
          />
        ))}

        {/* Area fill */}
        {fillD && <path d={fillD} fill="url(#lineGrad)" />}

        {/* The line itself */}
        {pathD && (
          <path 
            d={pathD} 
            fill="none" 
            stroke="var(--primary)" 
            strokeWidth="3" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
        )}

        {/* Data points dots */}
        {points.map((p, idx) => (
          <g key={idx}>
            <circle cx={p.x} cy={p.y} r="5" fill="var(--accent)" stroke="var(--primary)" strokeWidth="2" />
            <text x={p.x} y={p.y - 10} textAnchor="middle" fill="var(--text-primary)" fontSize="9" fontWeight="700">
              {data[idx]}
            </text>
          </g>
        ))}

        {/* Labels */}
        {points.map((p, idx) => (
          <text key={idx} x={p.x} y={height - 10} textAnchor="middle" fill="var(--text-secondary)" fontSize="9" fontWeight="600">
            {labels[idx]}
          </text>
        ))}
      </svg>
      <style>{`
        .line-chart-container {
          width: 100%;
        }
      `}</style>
    </div>
  );
};

// 4. Confusion Matrix / Agreement Matrix
export const ConfusionMatrixChart = ({ lrToxicCount = 0, dbToxicCount = 0, total = 0, disagreementCount = 0 }) => {
  const agreements = total - disagreementCount;
  
  // Calculate simulated subcounts for a 2x2 table:
  // Actual counts:
  // Agreed Clean (Both < 0.5)
  // Agreed Toxic (Both >= 0.5)
  // Disagreed (LR clean, DB toxic)
  // Disagreed (LR toxic, DB clean)
  
  // We can calculate approximate values based on totals
  const agreedToxic = Math.min(lrToxicCount, dbToxicCount);
  const agreedClean = Math.max(0, agreements - agreedToxic);
  const lrCleanDbToxic = Math.max(0, dbToxicCount - agreedToxic);
  const lrToxicDbClean = Math.max(0, lrToxicCount - agreedToxic);

  return (
    <div className="matrix-container">
      <div className="matrix-label-top">DistilBERT Model (Primary)</div>
      
      <div className="matrix-layout">
        <div className="matrix-label-left">
          <span>TF-IDF + LR Baseline</span>
        </div>
        
        <div className="matrix-grid-2x2">
          {/* Header Row */}
          <div className="matrix-header-cell"></div>
          <div className="matrix-header-cell">Clean (0)</div>
          <div className="matrix-header-cell">Toxic (1)</div>
          
          {/* Row 1: Baseline Clean */}
          <div className="matrix-row-header-cell">Clean (0)</div>
          <div className="matrix-cell agree-cell">
            <span className="matrix-cell-val">{agreedClean}</span>
            <span className="matrix-cell-lbl">Agree Clean</span>
          </div>
          <div className="matrix-cell disagree-cell">
            <span className="matrix-cell-val">{lrCleanDbToxic}</span>
            <span className="matrix-cell-lbl">Disagree</span>
          </div>

          {/* Row 2: Baseline Toxic */}
          <div className="matrix-row-header-cell">Toxic (1)</div>
          <div className="matrix-cell disagree-cell">
            <span className="matrix-cell-val">{lrToxicDbClean}</span>
            <span className="matrix-cell-lbl">Disagree</span>
          </div>
          <div className="matrix-cell agree-cell toxic">
            <span className="matrix-cell-val">{agreedToxic}</span>
            <span className="matrix-cell-lbl">Agree Toxic</span>
          </div>
        </div>
      </div>
      
      <style>{`
        .matrix-container {
          width: 100%;
          max-width: 380px;
          margin: 0 auto;
        }
        .matrix-label-top {
          text-align: center;
          font-weight: 700;
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin-bottom: 8px;
          text-transform: uppercase;
        }
        .matrix-layout {
          display: flex;
        }
        .matrix-label-left {
          writing-mode: vertical-lr;
          transform: rotate(180deg);
          text-align: center;
          font-weight: 700;
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin-right: 12px;
          text-transform: uppercase;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .matrix-grid-2x2 {
          display: grid;
          grid-template-columns: 80px 1fr 1fr;
          grid-template-rows: 35px 100px 100px;
          gap: 6px;
          flex: 1;
        }
        .matrix-header-cell {
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
        .matrix-row-header-cell {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding-right: 10px;
          font-weight: 700;
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
        .matrix-cell {
          border-radius: var(--border-radius-sm);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 10px;
          box-shadow: var(--shadow-sm);
        }
        .matrix-cell.agree-cell {
          background: rgba(16, 185, 129, 0.08);
          border: 1px dashed var(--color-success);
        }
        .matrix-cell.agree-cell.toxic {
          background: rgba(239, 68, 68, 0.08);
          border: 1px dashed var(--color-danger);
        }
        .matrix-cell.disagree-cell {
          background: rgba(245, 158, 11, 0.08);
          border: 1px solid var(--color-warning);
        }
        .matrix-cell-val {
          font-size: 1.6rem;
          font-weight: 800;
        }
        .matrix-cell-lbl {
          font-size: 0.7rem;
          color: var(--text-secondary);
          font-weight: 600;
        }
      `}</style>
    </div>
  );
};

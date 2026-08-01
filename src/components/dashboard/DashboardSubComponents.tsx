/**
 * Dashboard chart primitives, co-authorship network, and SVG export helpers.
 */
import React, { useMemo, useRef, useCallback } from 'react';
import type { TooltipContentProps, TreemapNode } from 'recharts';
import { motion } from 'framer-motion';
import type { AggregatedArticle } from '../../types';
import { DASHBOARD_CHART_COLORS, DASHBOARD_ACCENT } from '../dashboardChartTheme';
import { useTranslation } from '../../hooks/useTranslation';

// ── Palette ───────────────────────────────────────────────────────────────────
const C = [...DASHBOARD_CHART_COLORS, ...DASHBOARD_CHART_COLORS];

// ── SVG Export ────────────────────────────────────────────────────────────────
function exportSVG(ref: React.RefObject<HTMLDivElement | null>, filename: string) {
  const svg = ref.current?.querySelector('svg');
  if (!svg) return;
  const clone = svg.cloneNode(true) as SVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────
export { C };
export const CyberTooltip = ({ active, payload, label }: TooltipContentProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: 'rgba(13,17,23,0.93)',
        border: '1px solid color-mix(in srgb, var(--color-brand-accent) 28%, transparent)',
        borderRadius: 8,
        padding: '8px 12px',
        fontSize: 12,
        backdropFilter: 'blur(10px)',
      }}
    >
      {label != null && (
        <p style={{ color: '#7d8590', marginBottom: 4, fontWeight: 500 }}>{label}</p>
      )}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color ?? C[i % C.length], fontWeight: 600, margin: 0 }}>
          {p.name}: <span style={{ color: '#e6edf3' }}>{p.value}</span>
        </p>
      ))}
    </div>
  );
};

// ── Treemap Cell ──────────────────────────────────────────────────────────────
export const TreemapCell = (props: TreemapNode) => {
  const { x, y, width, height, name, value, index, depth } = props;
  if (!width || !height || depth > 1) return <g />;
  const color = C[index % C.length];
  const showLabel = width > 48 && height > 22;
  return (
    <g>
      <rect
        x={x + 2}
        y={y + 2}
        width={width - 4}
        height={height - 4}
        rx={6}
        style={{ fill: color, fillOpacity: 0.72, stroke: 'rgba(13,17,23,0.55)', strokeWidth: 1.5 }}
      />
      {showLabel && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - (value ? 7 : 0)}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{
              fontSize: Math.min(13, width / 6 + 5),
              fill: '#fff',
              fontWeight: 600,
              pointerEvents: 'none',
            }}
          >
            {name.length > 16 ? name.slice(0, 14) + '…' : name}
          </text>
          {value && (
            <text
              x={x + width / 2}
              y={y + height / 2 + 9}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{ fontSize: 9, fill: 'rgba(255,255,255,0.65)', pointerEvents: 'none' }}
            >
              ×{value}
            </text>
          )}
        </>
      )}
    </g>
  );
};

// ── Force-Directed Co-authorship Network ──────────────────────────────────────
interface NetNode {
  id: string;
  label: string;
  weight: number;
  x: number;
  y: number;
}
interface NetEdge {
  source: string;
  target: string;
  weight: number;
}

function buildCoAuthorGraph(articles: AggregatedArticle[]): { nodes: NetNode[]; edges: NetEdge[] } {
  const authorCount = new Map<string, number>();
  const coCount = new Map<string, number>();
  const SEP = '\x00';

  for (const art of articles) {
    const authors = (art.authors ?? '')
      .split(/,\s*/)
      .map((a) => a.trim())
      .filter((a) => a.length > 1 && a.length < 60);
    for (const a of authors) authorCount.set(a, (authorCount.get(a) ?? 0) + 1);
    for (let i = 0; i < authors.length; i++) {
      for (let j = i + 1; j < authors.length; j++) {
        const key = [authors[i], authors[j]].sort().join(SEP);
        coCount.set(key, (coCount.get(key) ?? 0) + 1);
      }
    }
  }

  const topAuthors = [...authorCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([n]) => n);
  const topSet = new Set(topAuthors);
  const W = 580,
    H = 420;

  const nodes: NetNode[] = topAuthors.map((name, i) => {
    const angle = (i / topAuthors.length) * Math.PI * 2 - Math.PI / 2;
    return {
      id: name,
      label: name,
      weight: authorCount.get(name) ?? 1,
      x: W / 2 + Math.cos(angle) * W * 0.31,
      y: H / 2 + Math.sin(angle) * H * 0.34,
    };
  });

  const edges: NetEdge[] = [];
  for (const [key, weight] of coCount.entries()) {
    const sep = key.indexOf(SEP);
    const a = key.slice(0, sep),
      b = key.slice(sep + 1);
    if (topSet.has(a) && topSet.has(b)) edges.push({ source: a, target: b, weight });
  }

  // Spring-force simulation (mutable working arrays)
  const px = nodes.map((n) => n.x),
    py = nodes.map((n) => n.y);
  const vx = new Float64Array(nodes.length),
    vy = new Float64Array(nodes.length);

  for (let iter = 0; iter < 160; iter++) {
    const fx = new Float64Array(nodes.length),
      fy = new Float64Array(nodes.length);
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = px[j] - px[i],
          dy = py[j] - py[i];
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const f = 2800 / (dist * dist);
        fx[i] -= (f * dx) / dist;
        fy[i] -= (f * dy) / dist;
        fx[j] += (f * dx) / dist;
        fy[j] += (f * dy) / dist;
      }
    }
    for (const e of edges) {
      const si = nodes.findIndex((n) => n.id === e.source);
      const ti = nodes.findIndex((n) => n.id === e.target);
      if (si === -1 || ti === -1) continue;
      const dx = px[ti] - px[si],
        dy = py[ti] - py[si];
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const f = (dist - 120) * 0.025;
      fx[si] += (f * dx) / dist;
      fy[si] += (f * dy) / dist;
      fx[ti] -= (f * dx) / dist;
      fy[ti] -= (f * dy) / dist;
    }
    for (let i = 0; i < nodes.length; i++) {
      vx[i] = (vx[i] + fx[i] + (W / 2 - px[i]) * 0.012) * 0.82;
      vy[i] = (vy[i] + fy[i] + (H / 2 - py[i]) * 0.012) * 0.82;
      px[i] = Math.max(24, Math.min(W - 24, px[i] + vx[i]));
      py[i] = Math.max(24, Math.min(H - 24, py[i] + vy[i]));
    }
  }
  for (let i = 0; i < nodes.length; i++) {
    nodes[i].x = px[i];
    nodes[i].y = py[i];
  }
  return { nodes, edges };
}

export const CoAuthorshipNetwork: React.FC<{ articles: AggregatedArticle[] }> = ({ articles }) => {
  const { t } = useTranslation();
  const { nodes, edges } = useMemo(() => buildCoAuthorGraph(articles), [articles]);
  const svgRef = useRef<SVGSVGElement>(null);

  const handleExport = useCallback(() => {
    if (!svgRef.current) return;
    const blob = new Blob([new XMLSerializer().serializeToString(svgRef.current)], {
      type: 'image/svg+xml',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'co-authorship-network.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  if (nodes.length < 2) {
    return (
      <p className="text-sm text-text-secondary text-center py-10">
        {t('dashboard.network.empty')}
      </p>
    );
  }
  const maxW = Math.max(...nodes.map((n) => n.weight));

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <p className="text-xs text-text-secondary">
          {t('dashboard.network.stats', { authors: nodes.length, links: edges.length })}
        </p>
        <button
          onClick={handleExport}
          className="text-[10px] text-text-secondary hover:text-brand-accent transition-colors px-2 py-1 rounded-md glass-panel border border-border/50"
        >
          {t('dashboard.network.export')}
        </button>
      </div>
      <svg
        ref={svgRef}
        viewBox="0 0 580 420"
        style={{ width: '100%', height: 420, overflow: 'visible' }}
        role="img"
        aria-label={t('dashboard.network.aria')}
      >
        <defs>
          <radialGradient id="ng" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={DASHBOARD_ACCENT} stopOpacity="0.3" />
            <stop offset="100%" stopColor={DASHBOARD_ACCENT} stopOpacity="0" />
          </radialGradient>
        </defs>
        {edges.map((e, i) => {
          const s = nodes.find((n) => n.id === e.source)!;
          const t = nodes.find((n) => n.id === e.target)!;
          return (
            <line
              key={i}
              x1={s.x}
              y1={s.y}
              x2={t.x}
              y2={t.y}
              stroke={DASHBOARD_ACCENT}
              strokeOpacity={Math.min(0.6, 0.12 + e.weight * 0.14)}
              strokeWidth={Math.min(e.weight * 0.8 + 0.5, 3)}
            />
          );
        })}
        {nodes.map((n, i) => {
          const r = Math.max(7, Math.min(18, 5 + (n.weight / maxW) * 13));
          const color = C[i % C.length];
          const shortName = n.label.includes(',')
            ? n.label.split(',')[0].trim()
            : (n.label.split(' ').pop() ?? n.label);
          return (
            <g key={n.id}>
              <circle cx={n.x} cy={n.y} r={r + 5} fill="url(#ng)" />
              <circle
                cx={n.x}
                cy={n.y}
                r={r}
                fill={color}
                fillOpacity={0.82}
                stroke={color}
                strokeWidth={1.5}
              />
              <text x={n.x} y={n.y + r + 11} textAnchor="middle" fontSize="8.5" fill="#7d8590">
                {shortName.length > 14 ? shortName.slice(0, 12) + '…' : shortName}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// ── Chart Card ────────────────────────────────────────────────────────────────
export const ChartCard: React.FC<{
  title: string;
  subtitle?: string;
  exportName?: string;
  chartRef?: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
}> = ({ title, subtitle, exportName, chartRef, children }) => {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="glass-panel rounded-xl p-4 flex flex-col"
    >
      <div className="flex items-start justify-between mb-4 gap-2">
        <div>
          <h3 className="text-sm font-semibold brand-gradient-text">{title}</h3>
          {subtitle && <p className="text-xs text-text-secondary mt-0.5">{subtitle}</p>}
        </div>
        {exportName && chartRef && (
          <button
            onClick={() => exportSVG(chartRef, exportName)}
            className="text-[10px] text-text-secondary hover:text-brand-accent transition-colors flex-shrink-0 px-2 py-1 rounded-md glass-panel border border-border/50"
            title={t('dashboard.export_svg')}
          >
            {t('dashboard.export_svg_short')}
          </button>
        )}
      </div>
      <div ref={chartRef} className="flex-1 min-h-[260px]">
        {children}
      </div>
    </motion.div>
  );
};

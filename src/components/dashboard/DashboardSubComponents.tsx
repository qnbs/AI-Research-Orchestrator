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
const CHART_PALETTE = [...DASHBOARD_CHART_COLORS, ...DASHBOARD_CHART_COLORS];

// ── SVG Export ────────────────────────────────────────────────────────────────
const exportSVG = (ref: React.RefObject<HTMLDivElement | null>, filename: string): void => {
  const svg = ref.current?.querySelector('svg');
  if (!svg) return;
  const clone = svg.cloneNode(true) as SVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// ── Custom Tooltip ────────────────────────────────────────────────────────────
export { CHART_PALETTE };

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
      {payload.map((entry, entryIndex) => (
        <p
          key={`${String(entry.name)}-${entryIndex}`}
          style={{
            color: entry.color ?? CHART_PALETTE[entryIndex % CHART_PALETTE.length],
            fontWeight: 600,
            margin: 0,
          }}
        >
          {entry.name}: <span style={{ color: '#e6edf3' }}>{entry.value}</span>
        </p>
      ))}
    </div>
  );
};

// ── Treemap Cell ──────────────────────────────────────────────────────────────
export const TreemapCell = (props: TreemapNode) => {
  const { x, y, width, height, name, value, index, depth } = props;
  if (!width || !height || depth > 1) return <g />;
  const color = CHART_PALETTE[index % CHART_PALETTE.length];
  const showLabel = width > 48 && height > 22;
  const displayName = name.length > 16 ? `${name.slice(0, 14)}…` : name;
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
            {displayName}
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

const buildCoAuthorGraph = (
  articles: AggregatedArticle[],
): { nodes: NetNode[]; edges: NetEdge[] } => {
  const authorCount = new Map<string, number>();
  const coCount = new Map<string, number>();
  const SEP = '\x00';

  for (const article of articles) {
    const authors = (article.authors ?? '')
      .split(/,\s*/)
      .map((name) => name.trim())
      .filter((name) => name.length > 1 && name.length < 60);
    for (const author of authors) authorCount.set(author, (authorCount.get(author) ?? 0) + 1);
    for (let i = 0; i < authors.length; i++) {
      for (let j = i + 1; j < authors.length; j++) {
        const key = [authors[i], authors[j]].sort().join(SEP);
        coCount.set(key, (coCount.get(key) ?? 0) + 1);
      }
    }
  }

  const topAuthors = [...authorCount.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 15)
    .map(([authorName]) => authorName);
  const topSet = new Set(topAuthors);
  const CANVAS_WIDTH = 580;
  const CANVAS_HEIGHT = 420;

  const nodes: NetNode[] = topAuthors.map((name, index) => {
    const angle = (index / topAuthors.length) * Math.PI * 2 - Math.PI / 2;
    return {
      id: name,
      label: name,
      weight: authorCount.get(name) ?? 1,
      x: CANVAS_WIDTH / 2 + Math.cos(angle) * CANVAS_WIDTH * 0.31,
      y: CANVAS_HEIGHT / 2 + Math.sin(angle) * CANVAS_HEIGHT * 0.34,
    };
  });

  const edges: NetEdge[] = [];
  for (const [key, weight] of coCount.entries()) {
    const sep = key.indexOf(SEP);
    const authorA = key.slice(0, sep);
    const authorB = key.slice(sep + 1);
    if (topSet.has(authorA) && topSet.has(authorB)) {
      edges.push({ source: authorA, target: authorB, weight });
    }
  }

  // Spring-force simulation (mutable working arrays)
  const px = nodes.map((node) => node.x);
  const py = nodes.map((node) => node.y);
  const vx = new Float64Array(nodes.length);
  const vy = new Float64Array(nodes.length);

  for (let iter = 0; iter < 160; iter++) {
    const fx = new Float64Array(nodes.length);
    const fy = new Float64Array(nodes.length);
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = px[j] - px[i];
        const dy = py[j] - py[i];
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = 2800 / (dist * dist);
        fx[i] -= (force * dx) / dist;
        fy[i] -= (force * dy) / dist;
        fx[j] += (force * dx) / dist;
        fy[j] += (force * dy) / dist;
      }
    }
    for (const edge of edges) {
      const sourceIndex = nodes.findIndex((node) => node.id === edge.source);
      const targetIndex = nodes.findIndex((node) => node.id === edge.target);
      if (sourceIndex === -1 || targetIndex === -1) continue;
      const dx = px[targetIndex] - px[sourceIndex];
      const dy = py[targetIndex] - py[sourceIndex];
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = (dist - 120) * 0.025;
      fx[sourceIndex] += (force * dx) / dist;
      fy[sourceIndex] += (force * dy) / dist;
      fx[targetIndex] -= (force * dx) / dist;
      fy[targetIndex] -= (force * dy) / dist;
    }
    for (let i = 0; i < nodes.length; i++) {
      vx[i] = (vx[i] + fx[i] + (CANVAS_WIDTH / 2 - px[i]) * 0.012) * 0.82;
      vy[i] = (vy[i] + fy[i] + (CANVAS_HEIGHT / 2 - py[i]) * 0.012) * 0.82;
      px[i] = Math.max(24, Math.min(CANVAS_WIDTH - 24, px[i] + vx[i]));
      py[i] = Math.max(24, Math.min(CANVAS_HEIGHT - 24, py[i] + vy[i]));
    }
  }
  for (let i = 0; i < nodes.length; i++) {
    nodes[i].x = px[i];
    nodes[i].y = py[i];
  }
  return { nodes, edges };
};

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
    const link = document.createElement('a');
    link.href = url;
    link.download = 'co-authorship-network.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  if (nodes.length < 2) {
    return (
      <p className="text-sm text-text-secondary text-center py-10">
        {t('dashboard.network.empty')}
      </p>
    );
  }
  const maxWeight = Math.max(...nodes.map((node) => node.weight));

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
        {edges.map((edge) => {
          const sourceNode = nodes.find((node) => node.id === edge.source);
          const targetNode = nodes.find((node) => node.id === edge.target);
          if (!sourceNode || !targetNode) return null;
          return (
            <line
              key={`${edge.source}\0${edge.target}`}
              x1={sourceNode.x}
              y1={sourceNode.y}
              x2={targetNode.x}
              y2={targetNode.y}
              stroke={DASHBOARD_ACCENT}
              strokeOpacity={Math.min(0.6, 0.12 + edge.weight * 0.14)}
              strokeWidth={Math.min(edge.weight * 0.8 + 0.5, 3)}
            />
          );
        })}
        {nodes.map((node, nodeIndex) => {
          const radius = Math.max(7, Math.min(18, 5 + (node.weight / maxWeight) * 13));
          const color = CHART_PALETTE[nodeIndex % CHART_PALETTE.length];
          const shortName = node.label.includes(',')
            ? node.label.split(',')[0].trim()
            : (node.label.split(' ').pop() ?? node.label);
          const labelText = shortName.length > 14 ? `${shortName.slice(0, 12)}…` : shortName;
          return (
            <g key={node.id}>
              <circle cx={node.x} cy={node.y} r={radius + 5} fill="url(#ng)" />
              <circle
                cx={node.x}
                cy={node.y}
                r={radius}
                fill={color}
                fillOpacity={0.82}
                stroke={color}
                strokeWidth={1.5}
              />
              <text
                x={node.x}
                y={node.y + radius + 11}
                textAnchor="middle"
                fontSize="8.5"
                fill="#7d8590"
              >
                {labelText}
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

/**
 * Data Dashboard — Interactive Recharts + Scientometric Network Graphs
 *
 * Charts:
 *  1. Publications per Year  — BarChart + Brush (zoom) + SVG export
 *  2. Top 10 Journals        — Horizontal BarChart + Brush + SVG export
 *  3. Article Types          — PieChart + SVG export
 *  4. Open Access Ratio      — PieChart + SVG export
 *  5. Source Distribution    — PieChart (PubMed vs arXiv)
 *  6. Keyword Clusters       — Recharts Treemap + SVG export
 *  7. Co-authorship Network  — Custom SVG force-directed graph + export
 */
import React, { useMemo, useRef, useCallback, useId } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Brush, PieChart, Pie, Cell, Treemap,
} from 'recharts';
import { motion } from 'framer-motion';
import type { KnowledgeBaseFilter, AggregatedArticle } from '../types';
import type { View } from '../contexts/UIContext';
import { EmptyState } from './EmptyState';
import { DocumentPlusIcon } from './icons/DocumentPlusIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { useKnowledgeBase } from '../contexts/KnowledgeBaseContext';

// ── Palette ───────────────────────────────────────────────────────────────────
const C = [
  '#38bdf8', '#a78bfa', '#34d399', '#fb923c', '#f472b6',
  '#facc15', '#60a5fa', '#e879f9', '#f87171', '#4ade80',
];

interface DashboardViewProps {
  onFilterChange: (f: Partial<KnowledgeBaseFilter>) => void;
  onViewChange: (v: View) => void;
}

// ── SVG Export ────────────────────────────────────────────────────────────────
function exportSVG(ref: React.RefObject<HTMLDivElement | null>, filename: string) {
  const svg = ref.current?.querySelector('svg');
  if (!svg) return;
  const clone = svg.cloneNode(true) as SVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────
const CyberTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(13,17,23,0.93)', border: '1px solid rgba(56,189,248,0.22)',
      borderRadius: 8, padding: '8px 12px', fontSize: 12, backdropFilter: 'blur(10px)',
    }}>
      {label != null && <p style={{ color: '#7d8590', marginBottom: 4, fontWeight: 500 }}>{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color ?? C[i % C.length], fontWeight: 600, margin: 0 }}>
          {p.name}: <span style={{ color: '#e6edf3' }}>{p.value}</span>
        </p>
      ))}
    </div>
  );
};

// ── Treemap Cell ──────────────────────────────────────────────────────────────
const TreemapCell = (props: any) => {
  const { x, y, width, height, name, value, index, depth } = props;
  if (!width || !height || depth > 1) return <g />;
  const color = C[index % C.length];
  const showLabel = width > 48 && height > 22;
  return (
    <g>
      <rect x={x + 2} y={y + 2} width={width - 4} height={height - 4} rx={6}
        style={{ fill: color, fillOpacity: 0.72, stroke: 'rgba(13,17,23,0.55)', strokeWidth: 1.5 }} />
      {showLabel && (
        <>
          <text x={x + width / 2} y={y + height / 2 - (value ? 7 : 0)}
            textAnchor="middle" dominantBaseline="middle"
            style={{ fontSize: Math.min(13, width / 6 + 5), fill: '#fff', fontWeight: 600, pointerEvents: 'none' }}>
            {name.length > 16 ? name.slice(0, 14) + '…' : name}
          </text>
          {value && (
            <text x={x + width / 2} y={y + height / 2 + 9}
              textAnchor="middle" dominantBaseline="middle"
              style={{ fontSize: 9, fill: 'rgba(255,255,255,0.65)', pointerEvents: 'none' }}>
              ×{value}
            </text>
          )}
        </>
      )}
    </g>
  );
};

// ── Force-Directed Co-authorship Network ──────────────────────────────────────
interface NetNode { id: string; label: string; weight: number; x: number; y: number }
interface NetEdge { source: string; target: string; weight: number }

function buildCoAuthorGraph(articles: AggregatedArticle[]): { nodes: NetNode[]; edges: NetEdge[] } {
  const authorCount = new Map<string, number>();
  const coCount = new Map<string, number>();
  const SEP = '\x00';

  for (const art of articles) {
    const authors = (art.authors ?? '').split(/,\s*/).map(a => a.trim()).filter(a => a.length > 1 && a.length < 60);
    for (const a of authors) authorCount.set(a, (authorCount.get(a) ?? 0) + 1);
    for (let i = 0; i < authors.length; i++) {
      for (let j = i + 1; j < authors.length; j++) {
        const key = [authors[i], authors[j]].sort().join(SEP);
        coCount.set(key, (coCount.get(key) ?? 0) + 1);
      }
    }
  }

  const topAuthors = [...authorCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([n]) => n);
  const topSet = new Set(topAuthors);
  const W = 580, H = 420;

  const nodes: NetNode[] = topAuthors.map((name, i) => {
    const angle = (i / topAuthors.length) * Math.PI * 2 - Math.PI / 2;
    return { id: name, label: name, weight: authorCount.get(name) ?? 1, x: W / 2 + Math.cos(angle) * W * 0.31, y: H / 2 + Math.sin(angle) * H * 0.34 };
  });

  const edges: NetEdge[] = [];
  for (const [key, weight] of coCount.entries()) {
    const sep = key.indexOf(SEP);
    const a = key.slice(0, sep), b = key.slice(sep + 1);
    if (topSet.has(a) && topSet.has(b)) edges.push({ source: a, target: b, weight });
  }

  // Spring-force simulation (mutable working arrays)
  const px = nodes.map(n => n.x), py = nodes.map(n => n.y);
  const vx = new Float64Array(nodes.length), vy = new Float64Array(nodes.length);

  for (let iter = 0; iter < 160; iter++) {
    const fx = new Float64Array(nodes.length), fy = new Float64Array(nodes.length);
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = px[j] - px[i], dy = py[j] - py[i];
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const f = 2800 / (dist * dist);
        fx[i] -= f * dx / dist; fy[i] -= f * dy / dist;
        fx[j] += f * dx / dist; fy[j] += f * dy / dist;
      }
    }
    for (const e of edges) {
      const si = nodes.findIndex(n => n.id === e.source);
      const ti = nodes.findIndex(n => n.id === e.target);
      if (si === -1 || ti === -1) continue;
      const dx = px[ti] - px[si], dy = py[ti] - py[si];
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const f = (dist - 120) * 0.025;
      fx[si] += f * dx / dist; fy[si] += f * dy / dist;
      fx[ti] -= f * dx / dist; fy[ti] -= f * dy / dist;
    }
    for (let i = 0; i < nodes.length; i++) {
      vx[i] = (vx[i] + fx[i] + (W / 2 - px[i]) * 0.012) * 0.82;
      vy[i] = (vy[i] + fy[i] + (H / 2 - py[i]) * 0.012) * 0.82;
      px[i] = Math.max(24, Math.min(W - 24, px[i] + vx[i]));
      py[i] = Math.max(24, Math.min(H - 24, py[i] + vy[i]));
    }
  }
  for (let i = 0; i < nodes.length; i++) { nodes[i].x = px[i]; nodes[i].y = py[i]; }
  return { nodes, edges };
}

const CoAuthorshipNetwork: React.FC<{ articles: AggregatedArticle[] }> = ({ articles }) => {
  const { nodes, edges } = useMemo(() => buildCoAuthorGraph(articles), [articles]);
  const svgRef = useRef<SVGSVGElement>(null);

  const handleExport = useCallback(() => {
    if (!svgRef.current) return;
    const blob = new Blob([new XMLSerializer().serializeToString(svgRef.current)], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'co-authorship-network.svg';
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }, []);

  if (nodes.length < 2) {
    return <p className="text-sm text-text-secondary text-center py-10">Not enough multi-author articles for a network visualization.</p>;
  }
  const maxW = Math.max(...nodes.map(n => n.weight));

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <p className="text-xs text-text-secondary">{nodes.length} authors · {edges.length} co-authorship links</p>
        <button onClick={handleExport} className="text-[10px] text-text-secondary hover:text-brand-accent transition-colors px-2 py-1 rounded-md glass-panel border border-border/50">↓ Export SVG</button>
      </div>
      <svg ref={svgRef} viewBox="0 0 580 420" style={{ width: '100%', height: 420, overflow: 'visible' }}
        role="img" aria-label="Co-authorship network graph">
        <defs>
          <radialGradient id="ng" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
          </radialGradient>
        </defs>
        {edges.map((e, i) => {
          const s = nodes.find(n => n.id === e.source)!;
          const t = nodes.find(n => n.id === e.target)!;
          return <line key={i} x1={s.x} y1={s.y} x2={t.x} y2={t.y}
            stroke="#38bdf8" strokeOpacity={Math.min(0.6, 0.12 + e.weight * 0.14)} strokeWidth={Math.min(e.weight * 0.8 + 0.5, 3)} />;
        })}
        {nodes.map((n, i) => {
          const r = Math.max(7, Math.min(18, 5 + (n.weight / maxW) * 13));
          const color = C[i % C.length];
          const shortName = n.label.includes(',') ? n.label.split(',')[0].trim() : (n.label.split(' ').pop() ?? n.label);
          return (
            <g key={n.id}>
              <circle cx={n.x} cy={n.y} r={r + 5} fill="url(#ng)" />
              <circle cx={n.x} cy={n.y} r={r} fill={color} fillOpacity={0.82} stroke={color} strokeWidth={1.5} />
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
const ChartCard: React.FC<{
  title: string; subtitle?: string; exportName?: string;
  chartRef?: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
}> = ({ title, subtitle, exportName, chartRef, children }) => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
    className="glass-panel rounded-xl p-4 flex flex-col">
    <div className="flex items-start justify-between mb-4 gap-2">
      <div>
        <h3 className="text-sm font-semibold brand-gradient-text">{title}</h3>
        {subtitle && <p className="text-xs text-text-secondary mt-0.5">{subtitle}</p>}
      </div>
      {exportName && chartRef && (
        <button onClick={() => exportSVG(chartRef, exportName)}
          className="text-[10px] text-text-secondary hover:text-brand-accent transition-colors flex-shrink-0 px-2 py-1 rounded-md glass-panel border border-border/50"
          title="Export chart as SVG">
          ↓ SVG
        </button>
      )}
    </div>
    <div ref={chartRef} className="flex-1 min-h-[260px]">{children}</div>
  </motion.div>
);

// ── Main Dashboard ────────────────────────────────────────────────────────────
const DashboardViewComponent: React.FC<DashboardViewProps> = ({ onFilterChange, onViewChange }) => {
  const { getArticles } = useKnowledgeBase();
  const articles = useMemo(() => getArticles('all'), [getArticles]);

  const refYears = useRef<HTMLDivElement>(null);
  const refJournals = useRef<HTMLDivElement>(null);
  const refTypes = useRef<HTMLDivElement>(null);
  const refOA = useRef<HTMLDivElement>(null);
  const refSource = useRef<HTMLDivElement>(null);
  const refKeywords = useRef<HTMLDivElement>(null);
  const id = { y: useId(), j: useId(), t: useId(), o: useId(), s: useId(), k: useId() };

  const data = useMemo(() => {
    if (!articles.length) return null;

    const yearMap = new Map<string, number>();
    for (const a of articles) if (a.pubYear) yearMap.set(a.pubYear, (yearMap.get(a.pubYear) ?? 0) + 1);
    const years = [...yearMap.entries()].sort(([a], [b]) => parseInt(a) - parseInt(b)).map(([year, count]) => ({ year, count }));

    const journalMap = new Map<string, number>();
    for (const a of articles) if (a.journal) journalMap.set(a.journal, (journalMap.get(a.journal) ?? 0) + 1);
    const journals = [...journalMap.entries()].sort(([, a], [, b]) => b - a).slice(0, 10)
      .map(([name, count]) => ({ name: name.length > 30 ? name.slice(0, 28) + '…' : name, fullName: name, count }));

    const typeMap = new Map<string, number>();
    for (const a of articles) { const t = a.articleType || 'Other'; typeMap.set(t, (typeMap.get(t) ?? 0) + 1); }
    const types = [...typeMap.entries()].sort(([, a], [, b]) => b - a).map(([name, value]) => ({ name, value }));

    const oaCount = articles.filter(a => a.isOpenAccess).length;
    const oa = [{ name: 'Open Access', value: oaCount }, { name: 'Closed Access', value: articles.length - oaCount }];

    const arxivCount = articles.filter(a => (a.pmid ?? '').startsWith('arxiv:')).length;
    const source = [{ name: 'PubMed', value: articles.length - arxivCount }, { name: 'arXiv', value: arxivCount }].filter(s => s.value > 0);

    const kwMap = new Map<string, number>();
    for (const a of articles)
      for (const kw of (a.keywords ?? [])) {
        const k = kw.trim().toLowerCase();
        if (k.length > 2 && k.length < 40) kwMap.set(k, (kwMap.get(k) ?? 0) + 1);
      }
    const keywords = [...kwMap.entries()].sort(([, a], [, b]) => b - a).slice(0, 40).map(([name, value]) => ({ name, value }));

    return { years, journals, types, oa, source, keywords };
  }, [articles]);

  if (!data) {
    return (
      <div className="h-[calc(100vh-200px)]">
        <EmptyState
          icon={<DatabaseIcon className="h-24 w-24" />}
          title="Dashboard is Empty"
          message="Save reports from the Orchestrator tab to start building your knowledge base and visualizing your data."
          action={{ text: 'Start Research', onClick: () => onViewChange('orchestrator'), icon: <DocumentPlusIcon className="h-5 w-5" /> }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8 animate-fadeIn">
      <div className="text-center">
        <h1 className="text-4xl font-bold brand-gradient-text">Data Dashboard</h1>
        <p className="mt-1.5 text-sm text-text-secondary">
          {articles.length.toLocaleString()} articles · interactive charts with zoom &amp; SVG export
        </p>
      </div>

      {/* Row 1: Years + Journals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title="Publications per Year" subtitle="Drag brush below to zoom" exportName="publications-per-year.svg" chartRef={refYears}>
          <ResponsiveContainer width="100%" height={270}>
            <BarChart data={data.years} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(125,133,144,0.1)" />
              <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#7d8590' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#7d8590' }} />
              <Tooltip content={<CyberTooltip />} />
              <Bar dataKey="count" name="Articles" radius={[4, 4, 0, 0]}>
                {data.years.map((_, i) => <Cell key={i} fill={C[0]} fillOpacity={0.82} />)}
              </Bar>
              {data.years.length > 8 && <Brush dataKey="year" height={18} stroke={C[0]} fill="rgba(56,189,248,0.08)" travellerWidth={6} />}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top 10 Journals" subtitle="Click bar to filter Knowledge Base" exportName="top-journals.svg" chartRef={refJournals}>
          <ResponsiveContainer width="100%" height={270}>
            <BarChart data={data.journals} layout="vertical" margin={{ top: 4, right: 24, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(125,133,144,0.1)" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#7d8590' }} />
              <YAxis type="category" dataKey="name" width={115} tick={{ fontSize: 9, fill: '#7d8590' }} />
              <Tooltip content={<CyberTooltip />} />
              <Bar dataKey="count" name="Articles" radius={[0, 4, 4, 0]}
                onClick={(d: any) => { onFilterChange({ selectedJournals: [d.fullName ?? d.name] }); onViewChange('knowledgeBase'); }}>
                {data.journals.map((_, i) => <Cell key={i} fill={C[1]} fillOpacity={0.82} />)}
              </Bar>
              {data.journals.length > 6 && <Brush dataKey="name" height={14} stroke={C[1]} fill="rgba(167,139,250,0.08)" travellerWidth={6} />}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 2: Article Types + OA + Source */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <ChartCard title="Article Types" subtitle="Click to filter" exportName="article-types.svg" chartRef={refTypes}>
          <ResponsiveContainer width="100%" height={270}>
            <PieChart>
              <Pie data={data.types} dataKey="value" nameKey="name" cx="50%" cy="50%"
                innerRadius={55} outerRadius={96} paddingAngle={3}
                label={({ percent }) => (percent ?? 0) > 0.06 ? `${((percent ?? 0) * 100).toFixed(0)}%` : ''}
                labelLine={{ stroke: 'rgba(125,133,144,0.4)' }}
                onClick={(d: any) => { onFilterChange({ selectedArticleTypes: [d.name] }); onViewChange('knowledgeBase'); }}>
                {data.types.map((_, i) => <Cell key={i} fill={C[i % C.length]} fillOpacity={0.82} stroke="transparent" />)}
              </Pie>
              <Tooltip content={<CyberTooltip />} />
              <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 10, color: '#7d8590' }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Open Access Ratio" exportName="open-access.svg" chartRef={refOA}>
          <ResponsiveContainer width="100%" height={270}>
            <PieChart>
              <Pie data={data.oa} dataKey="value" nameKey="name" cx="50%" cy="50%"
                innerRadius={55} outerRadius={96} paddingAngle={4}
                label={({ percent }) => `${((percent ?? 0) * 100).toFixed(1)}%`}
                labelLine={{ stroke: 'rgba(125,133,144,0.4)' }}>
                <Cell fill="#34d399" fillOpacity={0.85} stroke="transparent" />
                <Cell fill="#7d8590" fillOpacity={0.5} stroke="transparent" />
              </Pie>
              <Tooltip content={<CyberTooltip />} />
              <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 10, color: '#7d8590' }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Source Distribution" subtitle="PubMed vs arXiv preprints" exportName="source-distribution.svg" chartRef={refSource}>
          <ResponsiveContainer width="100%" height={270}>
            <PieChart>
              <Pie data={data.source} dataKey="value" nameKey="name" cx="50%" cy="50%"
                innerRadius={55} outerRadius={96} paddingAngle={4}
                label={({ percent }) => `${((percent ?? 0) * 100).toFixed(1)}%`}
                labelLine={{ stroke: 'rgba(125,133,144,0.4)' }}>
                <Cell fill="#38bdf8" fillOpacity={0.85} stroke="transparent" />
                <Cell fill="#a78bfa" fillOpacity={0.85} stroke="transparent" />
              </Pie>
              <Tooltip content={<CyberTooltip />} />
              <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 10, color: '#7d8590' }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 3: Keyword Clusters */}
      {data.keywords.length > 0 && (
        <ChartCard title="Keyword Clusters" subtitle={`${data.keywords.length} keywords — cell size = frequency`} exportName="keyword-clusters.svg" chartRef={refKeywords}>
          <ResponsiveContainer width="100%" height={340}>
            <Treemap data={data.keywords} dataKey="value" nameKey="name" aspectRatio={4 / 3} content={<TreemapCell />} />
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Row 4: Co-authorship Network */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}
        className="glass-panel rounded-xl p-4">
        <div className="mb-4">
          <h3 className="text-sm font-semibold brand-gradient-text">Co-authorship Network</h3>
          <p className="text-xs text-text-secondary mt-0.5">Node size = article count · edge thickness = shared publications</p>
        </div>
        <CoAuthorshipNetwork articles={articles} />
      </motion.div>

      {/* Screen-reader data tables */}
      <div className="sr-only" aria-label="Data tables for accessibility">
        <table><caption>Publications per year</caption>
          <thead><tr><th>Year</th><th>Articles</th></tr></thead>
          <tbody>{data.years.map(r => <tr key={r.year}><td>{r.year}</td><td>{r.count}</td></tr>)}</tbody>
        </table>
        <table><caption>Top journals</caption>
          <thead><tr><th>Journal</th><th>Articles</th></tr></thead>
          <tbody>{data.journals.map(r => <tr key={r.name}><td>{r.name}</td><td>{r.count}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
};

export default DashboardViewComponent;

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import Card from '../../components/ui/Card'
import type { SOAPNote } from '../../lib/types'

interface PainTrendChartProps {
  notes: SOAPNote[]
}

// SVG coordinate space; the element scales responsively via viewBox
const W = 640
const H = 200
const M = { top: 14, right: 20, bottom: 26, left: 30 }
const INNER_W = W - M.left - M.right
const INNER_H = H - M.top - M.bottom

const SERIES_COLOR = '#3d9cd6' // validated ≥3:1 against the white card surface

/**
 * Single-series line chart of reported pain scale (0–10) by session date.
 * The SOAP Notes tab holds the full values as text, serving as the table view.
 */
export default function PainTrendChart({ notes }: PainTrendChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const points = notes
    .filter(n => n.pain_scale !== undefined && n.pain_scale !== null)
    .sort((a, b) => a.session_date.localeCompare(b.session_date))
    .map(n => ({ date: n.session_date, pain: n.pain_scale as number }))

  if (points.length < 2) return null

  const t0 = parseISO(points[0].date).getTime()
  const t1 = parseISO(points[points.length - 1].date).getTime()
  const xFor = (date: string) =>
    t1 === t0 ? M.left + INNER_W / 2 : M.left + ((parseISO(date).getTime() - t0) / (t1 - t0)) * INNER_W
  const yFor = (pain: number) => M.top + (1 - pain / 10) * INNER_H

  const coords = points.map(p => ({ x: xFor(p.date), y: yFor(p.pain), ...p }))
  const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ')

  const first = points[0]
  const last = points[points.length - 1]
  const delta = last.pain - first.pain
  const trendText =
    delta < 0 ? `Down ${Math.abs(delta)} points since first session` :
    delta > 0 ? `Up ${delta} points since first session` :
    'Unchanged since first session'

  const active = activeIndex !== null ? coords[activeIndex] : null

  return (
    <Card className="lg:col-span-2">
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Pain Trend</h3>
          <p className="text-xs text-gray-500 mt-0.5">Reported pain scale (0–10) per session · {points.length} sessions</p>
        </div>
        <p className={`text-xs font-medium ${delta < 0 ? 'text-green-600' : delta > 0 ? 'text-red-600' : 'text-gray-500'}`}>
          {trendText}
        </p>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto block"
          role="img"
          aria-label={`Pain trend line chart: ${points.map(p => `${format(parseISO(p.date), 'MMM d')} pain ${p.pain}`).join(', ')}`}
          onMouseLeave={() => setActiveIndex(null)}
        >
          {/* Gridlines + y labels */}
          {[0, 2, 4, 6, 8, 10].map(v => (
            <g key={v}>
              <line x1={M.left} x2={W - M.right} y1={yFor(v)} y2={yFor(v)} stroke="#f3f4f6" strokeWidth="1" />
              <text x={M.left - 8} y={yFor(v) + 3.5} textAnchor="end" fontSize="10" fill="#9ca3af">{v}</text>
            </g>
          ))}

          {/* x labels: first and last session */}
          <text x={coords[0].x} y={H - 8} textAnchor="start" fontSize="10" fill="#6b7280">
            {format(parseISO(first.date), 'MMM d, yyyy')}
          </text>
          <text x={coords[coords.length - 1].x} y={H - 8} textAnchor="end" fontSize="10" fill="#6b7280">
            {format(parseISO(last.date), 'MMM d, yyyy')}
          </text>

          {/* Crosshair for the hovered session */}
          {active && (
            <line x1={active.x} x2={active.x} y1={M.top} y2={M.top + INNER_H} stroke="#d1d5db" strokeWidth="1" strokeDasharray="3 3" />
          )}

          {/* Series line */}
          <path d={path} fill="none" stroke={SERIES_COLOR} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

          {/* Markers: 8px with a 2px surface ring */}
          {coords.map((c, i) => (
            <circle
              key={c.date + i}
              cx={c.x}
              cy={c.y}
              r={activeIndex === i ? 5 : 4}
              fill={SERIES_COLOR}
              stroke="#ffffff"
              strokeWidth="2"
            />
          ))}

          {/* Direct label on the latest value only */}
          <text
            x={coords[coords.length - 1].x}
            y={Math.max(coords[coords.length - 1].y - 10, 10)}
            textAnchor="middle"
            fontSize="11"
            fontWeight="600"
            fill="#374151"
          >
            {last.pain}
          </text>

          {/* Hover hit targets, larger than the marks */}
          {coords.map((c, i) => (
            <circle
              key={`hit-${c.date}-${i}`}
              cx={c.x}
              cy={c.y}
              r="14"
              fill="transparent"
              onMouseEnter={() => setActiveIndex(i)}
            />
          ))}
        </svg>

        {/* Tooltip */}
        {active && (
          <div
            className="absolute pointer-events-none bg-white border border-gray-200 shadow-lg rounded-lg px-2.5 py-1.5 text-xs -translate-x-1/2 -translate-y-full"
            style={{ left: `${(active.x / W) * 100}%`, top: `${((active.y - 12) / H) * 100}%` }}
          >
            <p className="text-gray-500">{format(parseISO(active.date), 'MMM d, yyyy')}</p>
            <p className="font-semibold text-gray-900">Pain {active.pain}/10</p>
          </div>
        )}
      </div>
    </Card>
  )
}

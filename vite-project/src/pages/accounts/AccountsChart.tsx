import { useState } from 'react'
import Card from '../../components/ui/Card'
import { formatCurrency } from '../../lib/format'

export interface MonthlyMoney {
  /** Short display label, e.g. "Mar" */
  label: string
  collections: number
  expenses: number
}

interface AccountsChartProps {
  months: MonthlyMoney[]
}

// Palette validated with the dataviz checker against the white card surface
const COLLECTIONS_COLOR = '#3d9cd6'
const EXPENSES_COLOR = '#d97706'

const W = 640
const H = 240
const M = { top: 16, right: 12, bottom: 26, left: 48 }
const INNER_W = W - M.left - M.right
const INNER_H = H - M.top - M.bottom

/** Rect with only the top corners rounded — bars stay flat on the baseline. */
function roundedTopRect(x: number, y: number, w: number, h: number, r: number): string {
  const radius = Math.min(r, h, w / 2)
  return [
    `M${x},${y + h}`,
    `V${y + radius}`,
    `Q${x},${y} ${x + radius},${y}`,
    `H${x + w - radius}`,
    `Q${x + w},${y} ${x + w},${y + radius}`,
    `V${y + h}`,
    'Z',
  ].join(' ')
}

function niceCeil(value: number): number {
  if (value <= 0) return 1000
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)))
  for (const step of [1, 2, 5, 10]) {
    if (value <= step * magnitude) return step * magnitude
  }
  return 10 * magnitude
}

function compactRupees(value: number): string {
  if (value >= 100000) return `₹${(value / 100000).toFixed(value % 100000 === 0 ? 0 : 1)}L`
  if (value >= 1000) {
    const thousands = value / 1000
    return `₹${Number.isInteger(thousands) ? thousands : thousands.toFixed(1)}k`
  }
  return `₹${value}`
}

export default function AccountsChart({ months }: AccountsChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const hasData = months.some(m => m.collections > 0 || m.expenses > 0)
  const maxValue = niceCeil(Math.max(...months.map(m => Math.max(m.collections, m.expenses)), 0))
  const yFor = (value: number) => M.top + (1 - value / maxValue) * INNER_H

  const groupWidth = INNER_W / months.length
  const barWidth = Math.min(26, (groupWidth - 24) / 2)
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => f * maxValue)

  return (
    <Card>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Collections vs Expenses</h3>
          <p className="text-xs text-gray-500 mt-0.5">Last {months.length} months</p>
        </div>
        {/* Legend — identity via colored dot, text in text tokens */}
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLLECTIONS_COLOR }} />
            Collections
          </span>
          <span className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: EXPENSES_COLOR }} />
            Expenses
          </span>
        </div>
      </div>

      {!hasData ? (
        <p className="text-sm text-gray-500 text-center py-12">
          No payments or expenses recorded yet — this chart fills in as money moves.
        </p>
      ) : (
        <div className="relative">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-auto block"
            role="img"
            aria-label={`Monthly collections versus expenses: ${months.map(m => `${m.label} collected ${formatCurrency(m.collections)}, spent ${formatCurrency(m.expenses)}`).join('; ')}`}
            onMouseLeave={() => setActiveIndex(null)}
          >
            {/* Gridlines + y labels */}
            {ticks.map(tick => (
              <g key={tick}>
                <line x1={M.left} x2={W - M.right} y1={yFor(tick)} y2={yFor(tick)} stroke="#f3f4f6" strokeWidth="1" />
                <text x={M.left - 8} y={yFor(tick) + 3.5} textAnchor="end" fontSize="10" fill="#9ca3af">
                  {compactRupees(tick)}
                </text>
              </g>
            ))}

            {months.map((month, i) => {
              const groupX = M.left + i * groupWidth
              const center = groupX + groupWidth / 2
              // 2px surface gap between the pair of bars
              const collectionsX = center - barWidth - 1
              const expensesX = center + 1
              return (
                <g key={month.label + i}>
                  {activeIndex === i && (
                    <rect x={groupX + 2} y={M.top} width={groupWidth - 4} height={INNER_H} fill="#f9fafb" rx="6" />
                  )}
                  {month.collections > 0 && (
                    <path d={roundedTopRect(collectionsX, yFor(month.collections), barWidth, INNER_H - (yFor(month.collections) - M.top), 4)} fill={COLLECTIONS_COLOR} />
                  )}
                  {month.expenses > 0 && (
                    <path d={roundedTopRect(expensesX, yFor(month.expenses), barWidth, INNER_H - (yFor(month.expenses) - M.top), 4)} fill={EXPENSES_COLOR} />
                  )}
                  <text x={center} y={H - 8} textAnchor="middle" fontSize="10" fill="#6b7280">
                    {month.label}
                  </text>
                  {/* Hover hit target covers the whole group */}
                  <rect
                    x={groupX}
                    y={M.top}
                    width={groupWidth}
                    height={INNER_H}
                    fill="transparent"
                    onMouseEnter={() => setActiveIndex(i)}
                  />
                </g>
              )
            })}

            {/* Baseline */}
            <line x1={M.left} x2={W - M.right} y1={M.top + INNER_H} y2={M.top + INNER_H} stroke="#e5e7eb" strokeWidth="1" />
          </svg>

          {activeIndex !== null && (
            <div
              className="absolute pointer-events-none bg-white border border-gray-200 shadow-lg rounded-lg px-3 py-2 text-xs -translate-x-1/2"
              style={{
                left: `${((M.left + (activeIndex + 0.5) * groupWidth) / W) * 100}%`,
                top: '4px',
              }}
            >
              <p className="font-semibold text-gray-900 mb-1">{months[activeIndex].label}</p>
              <p className="flex items-center gap-1.5 text-gray-600">
                <span className="w-2 h-2 rounded-full" style={{ background: COLLECTIONS_COLOR }} />
                Collected: <span className="font-semibold text-gray-900">{formatCurrency(months[activeIndex].collections)}</span>
              </p>
              <p className="flex items-center gap-1.5 text-gray-600">
                <span className="w-2 h-2 rounded-full" style={{ background: EXPENSES_COLOR }} />
                Spent: <span className="font-semibold text-gray-900">{formatCurrency(months[activeIndex].expenses)}</span>
              </p>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

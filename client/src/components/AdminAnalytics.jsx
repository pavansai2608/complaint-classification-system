import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import apiClient from '../api/client'
import LoadingSpinner from './LoadingSpinner'

// One colour for every chart: each chart shows "how many", so the bar length
// carries the meaning and the axis label says which bar is which.
const MARK_COLOR = 'var(--color-inverse)'
const AXIS_TICK = { fill: 'var(--color-muted-foreground)', fontSize: 12 }
const GRID_COLOR = 'var(--color-border)'
const TOOLTIP_STYLE = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  fontSize: 13,
}
const HOVER_BAND = { fill: 'var(--color-surface-sunken)' }

// "2026-11-05" -> "5 Nov". The server groups days in UTC, so format in UTC too.
function formatDay(date) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
}

// A titled card holding one chart, plus the same numbers as a table so they
// can be read without the chart (screen readers, copy and paste).
function ChartCard({ title, note, labelHeading, rows, wide, children }) {
  return (
    <section className={wide ? 'chart-card chart-card-wide' : 'chart-card'}>
      <h2>{title}</h2>
      {note && <p className="chart-note">{note}</p>}
      <div className="chart-plot" aria-hidden="true">
        {children}
      </div>
      <details className="chart-table">
        <summary>Show as table</summary>
        <table>
          <caption>{title}</caption>
          <thead>
            <tr>
              <th scope="col">{labelHeading}</th>
              <th scope="col">Complaints</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                <td>{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  )
}

function AdminAnalytics() {
  const [analytics, setAnalytics] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    apiClient
      .get('/api/admin/analytics')
      .then((res) => {
        if (!cancelled) setAnalytics(res.data)
      })
      .catch(() => {
        if (!cancelled) setError('Could not load the charts. Please try again.')
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
    return (
      <p className="form-error" role="alert">
        {error}
      </p>
    )
  }

  if (!analytics) return <LoadingSpinner label="Loading charts..." />

  const { byCategory, byPriority, daily } = analytics

  if (byCategory.length === 0) {
    return <p className="chart-empty">No complaints yet. Charts appear here once the first one comes in.</p>
  }

  const dailyRows = daily.map((day) => ({ label: formatDay(day.date), count: day.count }))

  return (
    <div className="admin-charts">
      <ChartCard title="Complaints by category" labelHeading="Category" rows={byCategory}>
        {/* Horizontal bars, so long category names have room on the left. */}
        <ResponsiveContainer width="100%" height={Math.max(180, byCategory.length * 34 + 40)}>
          <BarChart data={byCategory} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid horizontal={false} stroke={GRID_COLOR} />
            <XAxis type="number" allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey="label"
              width={130}
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip cursor={HOVER_BAND} contentStyle={TOOLTIP_STYLE} />
            <Bar
              dataKey="count"
              name="Complaints"
              fill={MARK_COLOR}
              barSize={14}
              radius={[0, 4, 4, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Complaints by priority" labelHeading="Priority" rows={byPriority}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={byPriority} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid vertical={false} stroke={GRID_COLOR} />
            <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
            <Tooltip cursor={HOVER_BAND} contentStyle={TOOLTIP_STYLE} />
            <Bar
              dataKey="count"
              name="Complaints"
              fill={MARK_COLOR}
              barSize={28}
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="New complaints per day"
        note="Last 14 days"
        labelHeading="Day"
        rows={dailyRows}
        wide
      >
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={dailyRows} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
            <CartesianGrid vertical={false} stroke={GRID_COLOR} />
            <XAxis
              dataKey="label"
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
              minTickGap={16}
              padding={{ left: 12, right: 12 }}
            />
            <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Line
              type="linear"
              dataKey="count"
              name="Complaints"
              stroke={MARK_COLOR}
              strokeWidth={2}
              dot={{ r: 3, fill: MARK_COLOR }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}

export default AdminAnalytics

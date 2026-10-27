
import { useEffect, useState } from 'react'
import './App.css'

const API_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:8000'

function formatNumber(value) {
  if (value == null || !Number.isFinite(Number(value))) return '—'

  return Number(value).toLocaleString('en-GB', {
    maximumFractionDigits: 1,
  })
}

function App() {
  const [analysis, setAnalysis] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [activePage, setActivePage] = useState('Overview')

  useEffect(() => {
    let cancelled = false

    async function loadAnalysis() {
      try {
        setLoading(true)
        setError('')

        const response = await fetch(`${API_URL}/api/wind-analysis`)

        if (!response.ok) {
          throw new Error(`Backend returned status ${response.status}`)
        }

        const result = await response.json()

        if (!cancelled) {
          setAnalysis(result)
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            'Unable to load wind analysis. Check that the backend is running.'
          )
        }

        console.error('Wind analysis request failed:', err)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadAnalysis()

    return () => {
      cancelled = true
    }
  }, [])

  const metrics = analysis?.metrics
  const rows = analysis?.data || []

  const actualAverage = rows.length
    ? rows.reduce((sum, row) => sum + Number(row.actual), 0) /
      rows.length
    : null

  const forecastAverage = rows.length
    ? rows.reduce((sum, row) => sum + Number(row.forecast), 0) /
      rows.length
    : null

  const maxGeneration = Math.max(
    1,
    ...rows.map((row) =>
      Math.max(Number(row.actual), Number(row.forecast))
    )
  )

  const averageAbsoluteError = rows.length
    ? rows.reduce(
        (sum, row) => sum + Math.abs(Number(row.error)),
        0
      ) / rows.length
    : null

  const averageBias = rows.length
    ? rows.reduce((sum, row) => sum + Number(row.error), 0) /
      rows.length
    : null

  function renderChart() {
    if (!rows.length) {
      return <p className="status-message">No chart data available.</p>
    }

    const chartWidth = 900
    const chartHeight = 300
    const leftPadding = 65
    const rightPadding = 10
    const topPadding = 20
    const bottomPadding = 20
    const plotWidth = chartWidth - leftPadding - rightPadding
    const plotHeight = chartHeight - topPadding - bottomPadding

    function pointFor(value, index) {
      const x =
        leftPadding +
        (index / Math.max(rows.length - 1, 1)) * plotWidth

      const y =
        topPadding +
        (1 - Number(value) / maxGeneration) * plotHeight

      return `${x},${y}`
    }

    return (
      <>
        <div className="chart-container">
          <svg
            className="generation-chart"
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            role="img"
            aria-label="Hourly actual and forecast wind generation in January 2026"
            preserveAspectRatio="none"
          >
            {[0, 1, 2, 3, 4].map((line) => {
              const y = topPadding + (line / 4) * plotHeight
              const value = maxGeneration * (1 - line / 4)

              return (
                <g key={line}>
                  <line
                    x1={leftPadding}
                    y1={y}
                    x2={chartWidth - rightPadding}
                    y2={y}
                    className="chart-grid-line"
                  />
                  <text
                    x={leftPadding - 8}
                    y={y - 5}
                    textAnchor="end"
                    className="chart-axis-label"
                  >
                    {formatNumber(value)}
                  </text>
                </g>
              )
            })}

            <polyline
              className="actual-line"
              points={rows
                .map((row, index) =>
                  pointFor(row.actual, index)
                )
                .join(' ')}
            />

            <polyline
              className="forecast-line"
              points={rows
                .map((row, index) =>
                  pointFor(row.forecast, index)
                )
                .join(' ')}
            />
          </svg>
        </div>

        <div className="chart-dates">
          <span>Jan 1</span>
          <span>Jan 8</span>
          <span>Jan 15</span>
          <span>Jan 22</span>
          <span>Jan 31</span>
        </div>
      </>
    )
  }

  function renderOverview() {
    return (
      <>
        <section className="intro">
          <h2>Day-ahead purchasing insights</h2>
          <p>
            Understand available wind generation forecasts and evaluate
            their accuracy before making electricity purchasing decisions.
          </p>
        </section>

        <section className="metrics">
          <article className="metric-card">
            <p>Average Actual Generation</p>
            <h2>{formatNumber(actualAverage)} MW</h2>
            <span>Hourly average · January 2026</span>
          </article>

          <article className="metric-card">
            <p>Average Forecast Generation</p>
            <h2>{formatNumber(forecastAverage)} MW</h2>
            <span>
              {metrics.matchedIntervals} matched hourly intervals
            </span>
          </article>

          <article className="metric-card">
            <p>Mean Absolute Error</p>
            <h2>{formatNumber(metrics.mae)} MW</h2>
            <span>
              MAPE: {formatNumber(metrics.mapePercent)}%
            </span>
          </article>
        </section>

        <section className="data-panel">
          <div className="panel-heading">
            <div>
              <h2>Forecast vs. Actual Generation</h2>
              <p>Hourly wind generation · January 2026 · UTC</p>
            </div>

            <div className="chart-legend">
              <span><i className="legend-actual" /> Actual</span>
              <span><i className="legend-forecast" /> Forecast</span>
            </div>
          </div>

          {renderChart()}

          <p className="methodology-note">
            Forecast cutoff assumption: 09:30 UTC on the day before
            delivery. Actual generation is aggregated from half-hourly
            intervals to hourly averages for comparison with forecast data.
          </p>
        </section>

        <section className="data-panel">
          <h2>Analysis coverage</h2>

          <div className="coverage-stats">
            <p>
              Matched intervals:{' '}
              <strong>{metrics.matchedIntervals}</strong>
            </p>
            <p>
              Coverage:{' '}
              <strong>{formatNumber(metrics.coveragePercent)}%</strong>
            </p>
            <p>
              Forecast source: <strong>{analysis.source}</strong>
            </p>
          </div>
        </section>
      </>
    )
  }

  function renderForecasts() {
    return (
      <>
        <section className="intro">
          <h2>Wind Forecasts</h2>
          <p>
            Explore hourly wind forecasts selected using the documented
            day-ahead publication cutoff.
          </p>
        </section>

        <section className="metrics">
          <article className="metric-card">
            <p>Forecast Records</p>
            <h2>{formatNumber(rows.length)}</h2>
            <span>Matched hourly records</span>
          </article>

          <article className="metric-card">
            <p>Average Forecast</p>
            <h2>{formatNumber(forecastAverage)} MW</h2>
            <span>January 2026</span>
          </article>

          <article className="metric-card">
            <p>Forecast Publication Cutoff</p>
            <h2>09:30 UTC</h2>
            <span>Day before delivery · Assumption</span>
          </article>
        </section>

        <section className="data-panel">
          <h2>Hourly Forecast Records</h2>
          <p>Forecast values and publication timestamps from Elexon BMRS.</p>

          <div className="table-container">
            <table className="forecast-table">
              <thead>
                <tr>
                  <th>Delivery time (UTC)</th>
                  <th>Forecast (MW)</th>
                  <th>Published (UTC)</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => (
                  <tr key={row.startTime}>
                    <td>
                      {new Date(row.startTime).toLocaleString('en-GB', {
                        timeZone: 'UTC',
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td>{formatNumber(row.forecast)}</td>
                    <td>
                      {row.forecastPublishTime
                        ? new Date(
                            row.forecastPublishTime
                          ).toLocaleString('en-GB', {
                            timeZone: 'UTC',
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </>
    )
  }

  function renderAccuracy() {
    return (
      <>
        <section className="intro">
          <h2>Forecast Accuracy</h2>
          <p>
            Compare forecast generation against observed generation and
            examine the magnitude and direction of prediction errors.
          </p>
        </section>

        <section className="metrics">
          <article className="metric-card">
            <p>Mean Absolute Error (MAE)</p>
            <h2>{formatNumber(metrics.mae)} MW</h2>
            <span>Average absolute error</span>
          </article>

          <article className="metric-card">
            <p>Mean Absolute Percentage Error</p>
            <h2>{formatNumber(metrics.mapePercent)}%</h2>
            <span>Non-zero actual intervals</span>
          </article>

          <article className="metric-card">
            <p>Mean Forecast Bias</p>
            <h2>{formatNumber(averageBias)} MW</h2>
            <span>
              {averageBias > 0
                ? 'Forecasts are higher on average'
                : averageBias < 0
                  ? 'Forecasts are lower on average'
                  : 'No average bias'}
            </span>
          </article>
        </section>

        <section className="data-panel">
          <h2>Error Analysis</h2>
          <p>
            Positive errors indicate over-forecasting; negative errors
            indicate under-forecasting.
          </p>

          <div className="table-container">
            <table className="forecast-table">
              <thead>
                <tr>
                  <th>Delivery time (UTC)</th>
                  <th>Actual (MW)</th>
                  <th>Forecast (MW)</th>
                  <th>Error (MW)</th>
                  <th>Absolute error (MW)</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => (
                  <tr key={row.startTime}>
                    <td>
                      {new Date(row.startTime).toLocaleString('en-GB', {
                        timeZone: 'UTC',
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td>{formatNumber(row.actual)}</td>
                    <td>{formatNumber(row.forecast)}</td>
                    <td className={row.error > 0 ? 'error-positive' : row.error < 0 ? 'error-negative' : ''}>
                      {formatNumber(row.error)}
                    </td>
                    <td>{formatNumber(row.absoluteError)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="methodology-note">
            Average absolute error calculated from the matched hourly
            records: {formatNumber(averageAbsoluteError)} MW. These results
            remain subject to validation of the forecast-selection
            methodology.
          </p>
        </section>
      </>
    )
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <h2>Gridbricks</h2>
        <p className="sidebar-label">ENERGY ANALYTICS</p>

        {['Overview', 'Wind Forecasts', 'Forecast Accuracy'].map((page) => (
          <button
            key={page}
            type="button"
            className={`nav-item ${activePage === page ? 'active' : ''}`}
            aria-current={activePage === page ? 'page' : undefined}
            onClick={() => setActivePage(page)}
          >
            {page}
          </button>
        ))}
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">UK POWER MARKET</p>
            <h1>Wind Generation Intelligence</h1>
          </div>
          <span className="period">JANUARY 2026</span>
        </header>

        {loading && (
          <p className="status-message">Loading January wind analysis…</p>
        )}

        {error && (
          <div className="error-message" role="alert">
            {error}
            <button
              type="button"
              onClick={() => window.location.reload()}
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && metrics && (
          <>
            {activePage === 'Overview' && renderOverview()}
            {activePage === 'Wind Forecasts' && renderForecasts()}
            {activePage === 'Forecast Accuracy' && renderAccuracy()}
          </>
        )}

        {!loading && !error && !metrics && (
          <p className="status-message">
            The backend returned no analysis metrics.
          </p>
        )}

        <footer>Data source: Elexon BMRS · January 2026</footer>
      </main>
    </div>
  )
}

export default App

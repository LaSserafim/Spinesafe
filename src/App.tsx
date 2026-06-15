import { useState, useEffect, useRef, useCallback } from 'react'
import { Chart, registerables } from 'chart.js'
import { PhysicsScene } from './components/PhysicsScene'
import { motion } from 'framer-motion'

Chart.register(...registerables)

/* ── Types ── */
interface ReportRow {
  subject: string
  angle: string
  duration: number
  torque: string
  eqLoad: string
  score: number
  riskCategory: string
}

/* ══════════════════════════════════════════════════════════
   App — single-page React shell for SpineSafe
   All section content is identical to the original HTML.
   Only the human visualizations are upgraded to Three.js.
   ══════════════════════════════════════════════════════════ */

function App() {
  /* ── State ── */
  const [angle, setAngle] = useState(0)
  const [reportData, setReportData] = useState<ReportRow[]>([])
  const [showResults, setShowResults] = useState(false)

  /* ── Refs ── */
  const chartCanvasRef = useRef<HTMLCanvasElement>(null)
  const chartInstanceRef = useRef<Chart | null>(null)

  /* ── Derived physics (slider section) ── */
  const F = 50
  const d_m = (0.025 * angle) / 100
  const torque = F * d_m
  const load = 5 + (angle / 60) * 22

  let riskText = 'LOW RISK'
  let riskBg = 'rgba(0, 212, 170, 0.1)'
  let riskColor = 'var(--teal)'
  if (angle >= 40) {
    riskText = 'HIGH RISK'
    riskBg = 'rgba(239, 68, 68, 0.1)'
    riskColor = 'var(--red)'
  } else if (angle >= 15) {
    riskText = 'MEDIUM RISK'
    riskBg = 'rgba(245, 158, 11, 0.1)'
    riskColor = 'var(--amber)'
  }

  /* ── Scroll-reveal observer ── */
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible')
            obs.unobserve(e.target)
          }
        })
      },
      { threshold: 0.1 },
    )
    document.querySelectorAll('.animate-on-scroll').forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  /* ── Chart.js initialisation ── */
  useEffect(() => {
    if (!chartCanvasRef.current) return
    chartInstanceRef.current?.destroy()

    const ctx = chartCanvasRef.current.getContext('2d')
    if (!ctx) return

    chartInstanceRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Subject A', 'Subject B', 'Subject C', 'Subject D', 'Subject E'],
        datasets: [
          {
            label: 'Avg Head Angle (°)',
            data: [15, 42, 28, 55, 12],
            backgroundColor: '#15253F',
            yAxisID: 'y',
            borderRadius: 4,
          },
          {
            label: 'Peak Torque (Nm)',
            data: [0.18, 0.52, 0.35, 0.68, 0.15],
            backgroundColor: '#00D4AA',
            yAxisID: 'y1',
            borderRadius: 4,
          },
          {
            label: 'Posture Score (0-100)',
            data: [88, 45, 62, 25, 92],
            backgroundColor: '#F3F4F6',
            borderColor: '#9CA3AF',
            borderWidth: 1,
            yAxisID: 'y',
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { font: { family: "'Inter', sans-serif" } } },
          tooltip: {
            mode: 'index',
            intersect: false,
            titleFont: { family: "'Space Grotesk', sans-serif" },
            bodyFont: { family: "'Inter', sans-serif" },
          },
        },
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: { display: true, text: 'Degrees / Score', font: { family: "'Inter', sans-serif", size: 12 } },
            grid: { color: 'rgba(0,0,0,0.05)' },
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: { display: true, text: 'Torque (Nm)', font: { family: "'Inter', sans-serif", size: 12 } },
            grid: { drawOnChartArea: false },
          },
        },
      },
    })

    return () => { chartInstanceRef.current?.destroy() }
  }, [])

  /* ── Report calculator ── */
  const calculateReport = useCallback(() => {
    const subjects = ['a', 'b', 'c', 'd', 'e'] as const
    const data: ReportRow[] = []

    subjects.forEach((s) => {
      const aEl = document.getElementById(`angle-${s}`) as HTMLInputElement | null
      const dEl = document.getElementById(`duration-${s}`) as HTMLInputElement | null
      const a = parseFloat(aEl?.value || '0')
      const d = parseInt(dEl?.value || '0', 10)

      const rad = (a * Math.PI) / 180
      const t = 50 * Math.sin(rad) * 0.1
      const eq = t / (9.81 * 0.1)
      const sc = Math.max(0, Math.floor(100 - a * 1.5))

      let risk = 'Low'
      if (a > 45) risk = 'Critical'
      else if (a > 30) risk = 'High'
      else if (a > 15) risk = 'Moderate'

      data.push({
        subject: `Subject ${s.toUpperCase()}`,
        angle: a.toFixed(1),
        duration: d,
        torque: t.toFixed(2),
        eqLoad: eq.toFixed(2),
        score: sc,
        riskCategory: risk,
      })
    })

    setReportData(data)
    setShowResults(true)
  }, [])

  /* ── CSV download ── */
  const downloadCsv = useCallback(() => {
    if (reportData.length === 0) return
    const hdr = ['Subject','Angle (°)','Duration (min)','Torque (Nm)','Eq. Load (kg)','Score (/100)','Risk Category']
    const rows = [hdr.join(',')]
    reportData.forEach((r) =>
      rows.push(`${r.subject},${r.angle},${r.duration},${r.torque},${r.eqLoad},${r.score},${r.riskCategory}`),
    )
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'spinesafe_report.csv'
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [reportData])

  /* ── Helpers ── */
  const riskRowClass = (r: string) => {
    switch (r) {
      case 'Low':      return 'row-risk-low'
      case 'Moderate': return 'row-risk-moderate'
      case 'High':     return 'row-risk-high'
      case 'Critical': return 'row-risk-critical'
      default:         return ''
    }
  }

  /* ══════════════════════════════════════════════════════
     JSX — every section preserved exactly from original
     ══════════════════════════════════════════════════════ */
  return (
    <>
      {/* ─── Navigation ─── */}
      <nav>
        <div className="logo">
          <svg viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
          </svg>
          SpineSafe
        </div>
        <div className="nav-label">Research Initiative</div>
      </nav>

      {/* ─── Section 1: Hero ─── */}
      <motion.section 
        className="hero bg-navy"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="container hero-content">
          <h1>Your posture is applying 27kg of pressure to your spine.</h1>
          <p>
            An open-source biomechanics tool leveraging AI to track, calculate, and prevent
            cervical spine degradation in students and desk workers.
          </p>
        </div>
      </motion.section>

      {/* ─── Section 2: The Problem ─── */}
      <motion.section 
        id="problem" 
        className="bg-white"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.6 }}
      >
        <div className="container">
          <div className="text-center">
            <h2 className="section-title">An Epidemic of Spinal Stress</h2>
            <p className="section-subtitle">
              Modern sedentary lifestyles and poor workstation ergonomics have triggered a surge
              in musculoskeletal disorders.
            </p>
          </div>
          <div className="stats-grid">
            <div className="stat-card animate-on-scroll">
              <div className="stat-number">27kg</div>
              <h3>Equivalent Spinal Load</h3>
              <p>
                A simple 60° forward head tilt increases the gravitational force on the cervical
                spine by over 5x.
              </p>
            </div>
            <div className="stat-card animate-on-scroll" style={{ transitionDelay: '100ms' }}>
              <div className="stat-number">80%</div>
              <h3>Prevalence Rate</h3>
              <p>
                Percentage of adults who will experience significant lower back or neck pain
                during their career.
              </p>
            </div>
            <div className="stat-card animate-on-scroll" style={{ transitionDelay: '200ms' }}>
              <div className="stat-number">15%</div>
              <h3>Annual Increase</h3>
              <p>
                Rise in reported musculoskeletal disorders among students globally since 2020.
              </p>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ─── Section 3: How It Works ─── */}
      <motion.section 
        id="how-it-works" 
        className="bg-navy"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.6 }}
      >
        <div className="container">
          <div className="text-center">
            <h2 className="section-title text-teal">How SpineSafe Works</h2>
            <p className="section-subtitle">
              No proprietary hardware. No invasive sensors. Just pure computer vision and physics.
            </p>
          </div>
          <div className="steps-grid">
            <div className="step-card animate-on-scroll">
              <div className="step-number">01</div>
              <svg className="step-icon" viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="14" rx="2" />
                <path d="M12 14a3 3 0 100-6 3 3 0 000 6z" />
                <path d="M12 4v2" />
              </svg>
              <h3>Webcam Capture</h3>
              <p>
                SpineSafe requires nothing more than a standard 720p webcam. Your video stream is
                processed entirely locally on your machine for privacy.
              </p>
            </div>
            <div className="step-card animate-on-scroll" style={{ transitionDelay: '100ms' }}>
              <div className="step-number">02</div>
              <svg className="step-icon" viewBox="0 0 24 24">
                <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" />
                <path d="M9 12l2 2 4-4" />
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
              </svg>
              <h3>Landmark AI</h3>
              <p>
                Using MediaPipe pose estimation, the system identifies key biomechanical markers:
                the tragus of the ear and the C7 vertebra.
              </p>
            </div>
            <div className="step-card animate-on-scroll" style={{ transitionDelay: '200ms' }}>
              <div className="step-number">03</div>
              <svg className="step-icon" viewBox="0 0 24 24">
                <path d="M3 3v18h18" />
                <path d="M7 14l5-5 4 4 5-5" />
              </svg>
              <h3>Physics Engine</h3>
              <p>
                The 2D coordinate delta is fed into our physics engine. It calculates the
                mechanical torque applied to your cervical spine in real-time.
              </p>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ─── Section 4: The Physics (Interactive) ─── */}
      <motion.section 
        id="physics" 
        className="bg-gray"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.6 }}
      >
        <div className="container">
          <div className="text-center">
            <h2 className="section-title">The Physics of Posture</h2>
            <p className="section-subtitle">
              Experiment with the slider below to see how forward head posture exponentially
              increases cervical stress.
            </p>
          </div>
          <div className="physics-container">
            <div 
              className="physics-3d-canvas"
              style={{ width: '100%', height: '65vh', minHeight: '600px', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
            >
              <PhysicsScene angle={angle} />
            </div>

            {/* Controls & Metrics — unchanged */}
            <motion.div 
              className="controls-wrapper glass-panel"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <div className="slider-container">
                <div className="slider-header">
                  <label htmlFor="angle-slider">Forward Head Angle (θ)</label>
                  <span id="angle-val">{angle.toFixed(1)}°</span>
                </div>
                <input
                  type="range"
                  id="angle-slider"
                  className="slider"
                  min="0"
                  max="60"
                  step="0.1"
                  value={angle}
                  onChange={(e) => setAngle(parseFloat(e.target.value))}
                />
              </div>
              <div className="metrics-grid">
                <div className="metric-card">
                  <div>
                    <div className="metric-label">Neck Torque (τ)</div>
                    <div className="metric-val" id="torque-val">
                      {torque.toFixed(2)} Nm
                    </div>
                  </div>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" color="var(--gray-400)">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                </div>
                <div className="metric-card">
                  <div>
                    <div className="metric-label">Equivalent Spinal Load</div>
                    <div className="metric-val" id="load-val">
                      {load.toFixed(1)} kg
                    </div>
                  </div>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" color="var(--gray-400)">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </div>
                <div className="metric-card" style={{ marginTop: '1rem', border: 'none', background: 'transparent', padding: 0 }}>
                  <div className="metric-label" style={{ paddingLeft: '0.5rem' }}>Risk Assessment</div>
                  <div className="risk-badge" id="risk-badge" style={{ backgroundColor: riskBg, color: riskColor }}>
                    {riskText}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* ─── Section 5: Results & Efficiency ─── */}
      <motion.section 
        id="results" 
        className="bg-white"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.6 }}
      >
        <div className="container">
          <div className="text-center">
            <h2 className="section-title">Clinical Validation Cohort</h2>
            <p className="section-subtitle">
              Sample data from 5 anonymous test subjects evaluating posture decay over a 4-hour
              desk session.
            </p>
          </div>
          <motion.div 
            className="chart-container glass-panel"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6 }}
          >
            <canvas ref={chartCanvasRef} id="resultsChart" />
          </motion.div>
        </div>
      </motion.section>

      {/* ─── Section 6: Our Mission ─── */}
      <motion.section 
        id="mission" 
        className="bg-navy"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.6 }}
      >
        <div className="container text-center">
          <h2 className="section-title">Empowering Global Ergonomics</h2>
          <p className="section-subtitle" style={{ color: 'var(--gray-400)' }}>
            SpineSafe is an NGO-led initiative dedicated to making preventative biomechanical
            analysis accessible. We believe that protecting spinal health shouldn&apos;t require an
            expensive clinical setup, particularly in developing regions.
          </p>
          <div className="mission-cards">
            <div className="mission-card">
              <h4>0 Hardware</h4>
              <p>Functions completely via any standard web browser and a low-resolution camera.</p>
            </div>
            <div className="mission-card">
              <h4>100% Open Source</h4>
              <p>Our code and mathematical models are freely available for researchers globally.</p>
            </div>
            <div className="mission-card">
              <h4>5-Minute Setup</h4>
              <p>Instant deployment in schools, offices, and remote clinics without IT support.</p>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ─── Section 7: Generate Your Report ─── */}
      <motion.section 
        id="report-generator" 
        className="bg-gray"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.6 }}
      >
        <div className="container">
          <div className="text-center">
            <h2 className="section-title">Generate Your Report</h2>
            <p className="section-subtitle">
              Input session data to compute biomechanical metrics and export the clinical report.
            </p>
          </div>
          <motion.div 
            className="report-card glass-panel"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6 }}
          >
            <form id="report-form" className="report-form">
              <div className="form-header">
                <div>Subject</div>
                <div>Avg Head Angle (0-60°)</div>
                <div>Session Duration (1-60 min)</div>
              </div>
              {(['a', 'b', 'c', 'd', 'e'] as const).map((s, i) => (
                <div className="form-row" key={s}>
                  <div className="subject-label">Subject {s.toUpperCase()}</div>
                  <input
                    type="number"
                    id={`angle-${s}`}
                    min="0"
                    max="60"
                    defaultValue={[15, 42, 28, 55, 12][i]}
                    required
                    className="form-input"
                  />
                  <input
                    type="number"
                    id={`duration-${s}`}
                    min="1"
                    max="60"
                    defaultValue={[30, 45, 60, 20, 15][i]}
                    required
                    className="form-input"
                  />
                </div>
              ))}
              <div className="form-actions text-center">
                <button type="button" id="btn-calculate" className="btn btn-primary" onClick={calculateReport}>
                  Calculate Report
                </button>
              </div>
            </form>

            {showResults && (
              <div id="report-results" className="results-container">
                <div style={{ overflowX: 'auto' }}>
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Subject</th>
                        <th>Angle (°)</th>
                        <th>Duration (min)</th>
                        <th>Torque (Nm)</th>
                        <th>Eq. Load (kg)</th>
                        <th>Score (/100)</th>
                        <th>Risk Category</th>
                      </tr>
                    </thead>
                    <tbody id="report-tbody">
                      {reportData.map((row) => (
                        <tr key={row.subject} className={riskRowClass(row.riskCategory)}>
                          <td><strong>{row.subject}</strong></td>
                          <td>{row.angle}</td>
                          <td>{row.duration}</td>
                          <td>{row.torque}</td>
                          <td>{row.eqLoad}</td>
                          <td>{row.score}</td>
                          <td className="risk-badge-text">{row.riskCategory}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="form-actions text-center" style={{ marginTop: '2rem' }}>
                  <button type="button" id="btn-download-csv" className="btn btn-secondary" onClick={downloadCsv}>
                    Download Report as CSV
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </motion.section>

      {/* ─── Footer ─── */}
      <footer>
        <div className="container">
          <div className="footer-logo">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="var(--teal)">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
            </svg>
            SpineSafe
          </div>
          <p>An open research initiative for preventative biomechanics.</p>
          <p>
            Contact: <a href="mailto:research@spinesafe-ngo.org">research@spinesafe-ngo.org</a>
          </p>
        </div>
      </footer>
    </>
  )
}

export default App

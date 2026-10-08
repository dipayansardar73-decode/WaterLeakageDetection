"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bell,
  Check,
  ChevronDown,
  CircleGauge,
  Droplets,
  Gauge,
  MapPin,
  Pause,
  Play,
  Radio,
  RefreshCw,
  ShieldCheck,
  Waves,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Scenario = "normal" | "minor" | "major";

type ScenarioData = {
  label: string;
  status: string;
  confidence: number;
  location: string;
  segment: string;
  pressure: number[];
  flow: number[];
};

const SAMPLE_INTERVAL_MS = 1500;

const scenarios: Record<Scenario, ScenarioData> = {
  normal: {
    label: "Normal flow",
    status: "Network stable",
    confidence: 12,
    location: "No leak detected",
    segment: "—",
    pressure: [3.82, 3.77, 3.71, 3.64, 3.58, 3.51],
    flow: [18.4, 18.2, 18.1, 17.9, 17.8, 17.7],
  },
  minor: {
    label: "Minor leak",
    status: "Review recommended",
    confidence: 76,
    location: "Near School Road",
    segment: "S3 → S4",
    pressure: [3.82, 3.76, 3.69, 3.28, 3.18, 3.1],
    flow: [18.4, 18.2, 18.0, 15.6, 15.3, 15.1],
  },
  major: {
    label: "Major leak",
    status: "Critical leak detected",
    confidence: 94,
    location: "School Road, Ward 04",
    segment: "S3 → S4",
    pressure: [3.82, 3.75, 3.68, 2.44, 2.27, 2.18],
    flow: [18.4, 18.2, 18.0, 11.5, 10.9, 10.6],
  },
};

const sensors = [
  { id: "S1", place: "Pump House", distance: 0 },
  { id: "S2", place: "Market", distance: 0.8 },
  { id: "S3", place: "Crossing", distance: 1.6 },
  { id: "S4", place: "School Road", distance: 2.4 },
  { id: "S5", place: "Health Centre", distance: 3.2 },
  { id: "S6", place: "End Point", distance: 4.0 },
];

const expectedPressure = sensors.map((_, index) =>
  Number((3.82 - index * 0.061).toFixed(2)),
);

function formatTime(date: Date) {
  return date.toLocaleTimeString("en-IN", { hour12: false });
}

function sampleReadings(base: number[], tick: number, scale: number) {
  return base.map((value, index) => {
    const oscillation = Math.sin(tick * 0.82 + index * 1.17) * scale;
    const secondary = Math.cos(tick * 0.31 + index * 0.73) * scale * 0.35;
    return Number((value + oscillation + secondary).toFixed(2));
  });
}

function MetricCard({
  icon,
  label,
  value,
  note,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  note: string;
  danger?: boolean;
}) {
  return (
    <div className={`metric-card ${danger ? "metric-danger" : ""}`}>
      <div className="metric-icon">{icon}</div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <span>{note}</span>
      </div>
    </div>
  );
}

export default function Home() {
  const [scenario, setScenario] = useState<Scenario>("major");
  const [tick, setTick] = useState(421);
  const [isStreaming, setIsStreaming] = useState(true);
  const [updated, setUpdated] = useState("--:--:--");

  const base = scenarios[scenario];
  const isLeak = scenario !== "normal";

  useEffect(() => {
    if (!isStreaming) return;
    const timer = window.setInterval(() => {
      setTick((current) => current + 1);
      setUpdated(formatTime(new Date()));
    }, SAMPLE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [isStreaming]);

  const pressure = useMemo(
    () => sampleReadings(base.pressure, tick, scenario === "normal" ? 0.018 : 0.035),
    [base.pressure, scenario, tick],
  );
  const flow = useMemo(
    () => sampleReadings(base.flow, tick + 9, scenario === "normal" ? 0.06 : 0.13),
    [base.flow, scenario, tick],
  );

  const loss = Math.max(0, Number((flow[0] - flow[5]).toFixed(1)));
  const confidence = Math.max(
    0,
    Math.min(99, Math.round(base.confidence + Math.sin(tick * 0.45) * 2)),
  );

  const chartData = useMemo(
    () =>
      sensors.map((sensor, index) => ({
        sensor: sensor.id,
        expected: expectedPressure[index],
        pressure: pressure[index],
        flow: flow[index],
      })),
    [pressure, flow],
  );

  const refresh = () => {
    setTick((current) => current + 1);
    setUpdated(formatTime(new Date()));
  };

  useEffect(() => {
    const lifecycle = new AbortController();
    const modelContext = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: unknown,
            options?: { signal?: AbortSignal },
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!modelContext?.registerTool) return () => lifecycle.abort();

    void Promise.resolve(
      modelContext.registerTool(
        {
          name: "set_leak_demo_scenario",
          title: "Set leak demo scenario",
          description:
            "Switch the visible Water Leakage Detection Systems dashboard between normal flow, minor leak, and major leak mock-data scenarios.",
          inputSchema: {
            type: "object",
            properties: {
              scenario: { type: "string", enum: ["normal", "minor", "major"] },
            },
            required: ["scenario"],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          execute(input: unknown) {
            const value = (input as { scenario?: string })?.scenario;
            if (value !== "normal" && value !== "minor" && value !== "major") {
              throw new Error("Scenario must be normal, minor, or major.");
            }
            setScenario(value);
            setTick((current) => current + 1);
            return {
              scenario: value,
              status: scenarios[value].status,
              confidence: scenarios[value].confidence,
              segment: scenarios[value].segment,
            };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Droplets size={22} /></div>
          <div><strong>Water Leakage</strong><span>Detection Systems</span></div>
        </div>
        <nav aria-label="Primary navigation">
          <a className="nav-active" href="#overview"><CircleGauge size={19} /> Overview</a>
          <a href="#network"><Waves size={19} /> Pipeline network</a>
          <a href="#sensors"><Radio size={19} /> Sensor health</a>
          <a href="#method"><Activity size={19} /> Detection method</a>
        </nav>
        <div className="sidebar-status">
          <div className="online-row"><span className={`online-dot ${isStreaming ? "streaming" : ""}`} /> {isStreaming ? "Gateway streaming" : "Stream paused"}</div>
          <p>6 of 6 sensors reporting</p>
          <span>Sample #{tick} · every {SAMPLE_INTERVAL_MS / 1000}s</span>
          <span>Updated {updated}</span>
        </div>
        <div className="research-note"><ShieldCheck size={18} /><div><strong>Prototype mode</strong><span>Continuous mock data</span></div></div>
      </aside>

      <section className="workspace" id="overview">
        <header className="topbar">
          <div><p className="eyebrow">WARD 04 · MUNICIPAL WATER NETWORK</p><h1>Distribution overview</h1></div>
          <div className="top-actions">
            <div className={`live-status ${isStreaming ? "is-live" : "is-paused"}`}><span />{isStreaming ? `LIVE · SAMPLE ${tick}` : "PAUSED"}</div>
            <label className="scenario-select">
              <span>Demo scenario</span>
              <select value={scenario} onChange={(event) => { setScenario(event.target.value as Scenario); setTick((current) => current + 1); }} aria-label="Choose demo scenario">
                <option value="normal">Normal flow</option>
                <option value="minor">Minor leak</option>
                <option value="major">Major leak</option>
              </select>
              <ChevronDown size={15} />
            </label>
            <button className="stream-button" onClick={() => setIsStreaming((current) => !current)} aria-label={isStreaming ? "Pause live data" : "Resume live data"}>
              {isStreaming ? <Pause size={16} /> : <Play size={16} />}{isStreaming ? "Pause" : "Resume"}
            </button>
            <button className="icon-button" onClick={refresh} aria-label="Generate next sensor sample"><RefreshCw size={18} /></button>
            <button className="icon-button notification" aria-label="Notifications"><Bell size={18} /><span /></button>
            <div className="avatar">DS</div>
          </div>
        </header>

        <div className={`alert-strip ${isLeak ? "alert-danger" : "alert-safe"}`}>
          <div className="alert-icon">{isLeak ? <AlertTriangle size={22} /> : <Check size={22} />}</div>
          <div className="alert-copy">
            <strong>{base.status}</strong>
            <span>{isLeak ? `${base.segment} · ${base.location} · ${confidence}% confidence` : "Pressure and flow residuals are within the expected range."}</span>
          </div>
          <span className="alert-time">Latest sample {updated}</span>
          {isLeak && <button onClick={() => document.getElementById("network")?.scrollIntoView({ behavior: "smooth" })}>View location</button>}
        </div>

        <section className="metrics-grid" aria-label="Key network metrics">
          <MetricCard icon={<Gauge size={20} />} label="Inlet pressure" value={`${pressure[0].toFixed(2)} bar`} note="Live sensor S1" />
          <MetricCard icon={<Gauge size={20} />} label="Outlet pressure" value={`${pressure[5].toFixed(2)} bar`} note={isLeak ? "Below expected baseline" : "Normal operating range"} danger={scenario === "major"} />
          <MetricCard icon={<Waves size={20} />} label="Flow imbalance" value={`${loss.toFixed(1)} L/s`} note={isLeak ? "Estimated water loss" : "Within tolerance"} danger={scenario === "major"} />
          <MetricCard icon={<MapPin size={20} />} label="Likely location" value={base.segment} note={base.location} danger={scenario === "major"} />
        </section>

        <div className="dashboard-grid">
          <section className="panel network-panel" id="network">
            <div className="panel-heading">
              <div><p className="eyebrow">LIVE MODEL · SAMPLE {tick}</p><h2>Pressure along the pipeline</h2></div>
              <div className="legend"><span><i className="expected-line" /> Expected</span><span><i className="actual-line" /> Measured</span></div>
            </div>
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 700, height: 218 }}>
                <LineChart data={chartData} margin={{ top: 12, right: 16, left: -14, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#e4e6e8" strokeDasharray="4 4" />
                  <XAxis dataKey="sensor" tickLine={false} axisLine={false} tick={{ fill: "#72787d", fontSize: 12 }} dy={8} />
                  <YAxis domain={[2, 4]} tickLine={false} axisLine={false} tick={{ fill: "#72787d", fontSize: 12 }} tickFormatter={(value) => `${value.toFixed(1)}`} />
                  <Tooltip contentStyle={{ borderRadius: 4, border: "1px solid #d5d8da", boxShadow: "0 6px 18px rgba(20,24,27,.08)", fontSize: 13 }} formatter={(value) => [`${Number(value).toFixed(2)} bar`]} />
                  <Line type="monotone" dataKey="expected" stroke="#9aa1a6" strokeWidth={2} strokeDasharray="6 6" dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="pressure" stroke={isLeak ? "#b54738" : "#38434a"} strokeWidth={3} dot={{ r: 4, fill: "#fff", strokeWidth: 3 }} activeDot={{ r: 6 }} animationDuration={500} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="pipeline" aria-label="Pipeline sensor map">
              <div className="pipe-track" />
              {sensors.map((sensor, index) => {
                const afterLeak = isLeak && index >= 3;
                return <div className="sensor" key={sensor.id}><div className={`sensor-node ${afterLeak ? "sensor-warning" : ""}`}><Radio size={14} /></div><strong>{sensor.id}</strong><span>{sensor.place}</span><small>{sensor.distance.toFixed(1)} km</small></div>;
              })}
              {isLeak && <div className="leak-marker"><Droplets size={17} /><b>LIKELY LEAK</b></div>}
            </div>
          </section>

          <section className="panel confidence-panel">
            <div className="panel-heading"><div><p className="eyebrow">DETECTION RESULT</p><h2>Leak confidence</h2></div></div>
            <div className={`confidence-ring ${isLeak ? "ring-danger" : "ring-safe"}`} style={{ "--score": `${confidence * 3.6}deg` } as React.CSSProperties}>
              <div><strong>{confidence}%</strong><span>confidence</span></div>
            </div>
            <div className="confidence-details">
              <div><span>Pressure residual</span><strong>{isLeak ? "High" : "Low"}</strong></div>
              <div><span>Flow imbalance</span><strong>{loss.toFixed(1)} L/s</strong></div>
              <div><span>Model agreement</span><strong>{isLeak ? "3 / 3" : "0 / 3"}</strong></div>
            </div>
          </section>
        </div>

        <div className="bottom-grid">
          <section className="panel" id="sensors">
            <div className="panel-heading"><div><p className="eyebrow">FIELD DEVICES · UPDATED {updated}</p><h2>Sensor readings</h2></div><span className="healthy-badge"><span /> 6 reporting</span></div>
            <div className="table-wrap"><table><thead><tr><th>Station</th><th>Pressure</th><th>Flow</th><th>Residual</th><th>Status</th></tr></thead><tbody>
              {sensors.map((sensor, index) => {
                const residual = Math.abs(expectedPressure[index] - pressure[index]);
                const critical = residual > 0.55;
                return <tr key={sensor.id}><td><strong>{sensor.id}</strong><span>{sensor.place}</span></td><td className="live-value">{pressure[index].toFixed(2)} bar</td><td className="live-value">{flow[index].toFixed(1)} L/s</td><td className={critical ? "text-danger" : ""}>{residual.toFixed(2)} bar</td><td><span className={`status-pill ${critical ? "status-alert" : "status-ok"}`}>{critical ? "Anomaly" : "Normal"}</span></td></tr>;
              })}
            </tbody></table></div>
          </section>

          <section className="panel method-panel" id="method">
            <div className="panel-heading"><div><p className="eyebrow">HOW IT WORKS</p><h2>Detection pipeline</h2></div></div>
            <ol className="method-list">
              <li><span>01</span><div><strong>Read sensors</strong><p>Pressure and flow are sampled at fixed pipeline intervals.</p></div></li>
              <li><span>02</span><div><strong>Build baseline</strong><p>Expected pressure drop is estimated for normal demand.</p></div></li>
              <li><span>03</span><div><strong>Score residuals</strong><p>Sudden pressure loss plus flow imbalance creates an anomaly score.</p></div></li>
              <li><span>04</span><div><strong>Localise segment</strong><p>The first sharp residual change identifies the likely pipe section.</p></div></li>
            </ol>
            <div className="formula"><span>Leak score</span><code>0.6 × ΔP + 0.4 × ΔQ</code></div>
          </section>
        </div>

        <footer><span>Water Leakage Detection Systems · Research prototype</span><span>Continuous mock stream · 1.5 second sampling</span></footer>
      </section>
    </main>
  );
}

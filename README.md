# Water Leakage Detection Systems

A live-looking, interview-ready research prototype for detecting and localising leakage in a village or municipal water-distribution pipeline using pressure and flow sensor patterns.

The application continuously generates deterministic mock telemetry every 1.5 seconds, updates the network dashboard, calculates pressure residuals and inlet-outlet flow imbalance, and identifies the most likely leaking pipe segment.

> **Important:** This repository is an engineering prototype built with synthetic data. It demonstrates the software architecture and analytical method; it is not a certified field leak detector.

## Live application

The production Vercel URL is added here after deployment.

## Problem statement

Roadside pipe leaks can continue for hours because the local panchayat or municipality may not know that a leak has started. Usually someone must notice the water loss and report it manually. A monitoring system can shorten that delay by displaying abnormal pressure and flow patterns in the control office.

This project asks:

1. Can regularly spaced pressure and flow sensors detect an abnormal hydraulic condition?
2. Can the software narrow the problem to the segment between two sensors?
3. Can the result be communicated to a municipal operator through a simple desktop dashboard?

## Proposed solution

The monitored pipe is divided into segments by virtual sensor stations:

```text
Pump House       Market        Crossing       School Road    Health Centre   End Point
   S1 ----------- S2 ----------- S3 ------------- S4 ------------ S5 ----------- S6
                                         suspected leak
```

During normal operation, pressure decreases gradually because of friction and elevation. A significant leak creates two useful signals:

- a pressure profile that drops more sharply than the expected baseline;
- a difference between inlet flow and downstream flow.

The dashboard combines those signals into a transparent leak-confidence score and identifies the segment where the largest sudden pressure change begins.

## Main features

- Continuous mock sensor stream with a 1.5-second sampling interval
- Live sample counter and last-updated timestamp
- Pause, resume and manual next-sample controls
- Three demonstration scenarios: normal flow, minor leak and major leak
- Expected-versus-measured pressure chart
- Inlet pressure, outlet pressure and estimated flow-loss metrics
- Likely leak-segment localisation
- Per-sensor pressure, flow, residual and health table
- Explainable confidence score rather than an unexplained black-box output
- Responsive layout for desktop, tablet and mobile
- Separate Python analysis prototype using NumPy, Pandas and Scikit-learn
- WebMCP action for programmatically selecting a demo scenario in supported browsers

## Technology stack

### Frontend

- React 19
- TypeScript
- Next.js 16
- Recharts
- Lucide React
- CSS with responsive media queries

### Data and analysis

- Python 3
- NumPy
- Pandas
- Scikit-learn Isolation Forest
- CSV-based mock sensor snapshot

### Development and deployment

- Git and GitHub
- npm
- ESLint
- Vercel

## Repository structure

```text
.
├── analysis/
│   ├── leak_detection.py       # Python detection and localisation prototype
│   └── requirements.txt        # Python analysis dependencies
├── app/
│   ├── globals.css             # Complete responsive dashboard styling
│   ├── layout.tsx              # Metadata and application shell
│   └── page.tsx                # Live dashboard and mock-stream logic
├── data/
│   └── mock_sensor_readings.csv
├── public/
│   └── favicon.svg
├── package.json
└── README.md
```

## How the continuous mock stream works

The browser starts a timer using `setInterval`. Every 1.5 seconds it:

1. increments the sample number;
2. records the current local time;
3. generates small deterministic oscillations around the selected scenario baseline;
4. recalculates pressure residuals and flow imbalance;
5. updates the chart, metric cards, confidence gauge and sensor table.

The telemetry is deterministic rather than purely random. Sine and cosine functions create small realistic-looking changes while ensuring the selected scenario remains recognisable and reproducible.

Simplified mock signal:

```text
measured value = scenario baseline
               + sin(sample × frequency + sensor phase) × amplitude
               + cos(sample × secondary frequency + sensor phase) × smaller amplitude
```

This approach is useful for demonstrations because:

- values visibly change like a live process;
- the dashboard does not jump unrealistically;
- normal data remains normal;
- leak data continues to show the intended anomaly;
- the demo requires no external sensor or backend.

The **Pause** button stops automatic sampling. **Resume** restarts it. The refresh button generates one immediate sample.

## Detection methodology

### 1. Expected pressure profile

The prototype stores the expected pressure at each sensor under normal operation.

```text
P_expected(i)
```

In a field system, this baseline could come from:

- historical leak-free measurements;
- an EPANET or calibrated hydraulic model;
- pressure-loss equations using pipe diameter, length and roughness;
- demand patterns for different times of day.

### 2. Pressure residual

For every sensor:

```text
pressure residual(i) = P_expected(i) - P_measured(i)
```

A large positive residual means measured pressure is significantly below the expected value.

### 3. Flow imbalance

The simplified mass-balance signal is:

```text
flow imbalance = inlet flow - downstream flow
```

A persistent positive difference may indicate water leaving the monitored pipe before reaching the final sensor. In a real network, legitimate consumption and branch connections must be modelled before treating this as leakage.

### 4. Combined score

The demonstration explains its score using a weighted combination:

```text
leak score = 0.6 × normalised pressure residual
           + 0.4 × normalised flow imbalance
```

Pressure receives slightly more weight because the project focuses on identifying where the hydraulic profile changes.

### 5. Segment localisation

The program calculates the pressure difference between consecutive sensors. The segment before the largest unexpected drop is returned as the likely leak segment.

For the major-leak demonstration:

```text
S1 -> S2: gradual change
S2 -> S3: gradual change
S3 -> S4: sharp pressure drop  <-- suspected segment
S4 -> S5: downstream low pressure
S5 -> S6: downstream low pressure
```

The system therefore reports **S3 → S4 near School Road**.

### 6. Secondary ML check

`analysis/leak_detection.py` uses Isolation Forest on pressure residual and segment pressure-drop features. It is included as a secondary anomaly check, not as the only decision rule.

If Scikit-learn is unavailable, the Python script falls back to a statistical threshold so the basic analysis remains runnable.

## Scenario definitions

### Normal flow

- pressure decreases gradually;
- inlet and outlet flows are close;
- residuals stay within tolerance;
- no leak segment is reported.

### Minor leak

- pressure falls after S3;
- moderate flow imbalance appears;
- the system recommends inspection;
- confidence is lower than the major-leak case.

### Major leak

- a sharp pressure drop begins between S3 and S4;
- downstream flow is substantially lower;
- the dashboard displays a critical alert;
- the most likely location is School Road, Ward 04.

## Run locally

### Requirements

- Node.js 22 or newer
- npm
- Python 3.10 or newer for the optional analysis script

### Install the web application

```bash
git clone https://github.com/dipayansardar73-decode/WaterLeakageDetection.git
cd WaterLeakageDetection
npm install
```

### Start development mode

```bash
npm run dev
```

Open `http://localhost:3000`.

### Production build

```bash
npm run build
npm start
```

### Lint

```bash
npm run lint
```

## Run the Python prototype

Create and activate a virtual environment if desired, then install the analysis dependencies:

```bash
python3 -m pip install -r analysis/requirements.txt
python3 analysis/leak_detection.py
```

Example output:

```text
Water Leakage Detection Systems analysis
leak_detected: True
confidence_percent: 99.0
estimated_flow_loss_lps: 7.8
likely_segment: S3 -> S4
downstream_place: School Road
anomalous_sensors: ['S4']
```

## CSV schema

`data/mock_sensor_readings.csv` contains:

| Column | Meaning | Unit |
| --- | --- | --- |
| `sensor` | Sensor identifier | - |
| `distance_km` | Distance from inlet | km |
| `place` | Nearby landmark | - |
| `expected_pressure_bar` | Leak-free baseline pressure | bar |
| `measured_pressure_bar` | Demonstration measurement | bar |
| `flow_lps` | Flow rate | litres/second |

## Vercel deployment

The repository is configured as a standard Next.js project.

### Dashboard method

1. Import this GitHub repository into Vercel.
2. Keep the framework preset as **Next.js**.
3. Keep the root directory as `.`.
4. Use `npm run build` as the build command.
5. Deploy.

No environment variables or external database are required for this mock-data version.

### CLI method

```bash
npx vercel link
npx vercel --prod
```

## From prototype to a field system

The current browser generates mock readings. A real deployment would replace that generator with an ingestion service.

Possible architecture:

```text
Pressure/flow sensors
        ↓
ESP32 or industrial data logger
        ↓  LoRaWAN / NB-IoT / 4G / Wi-Fi
MQTT broker or HTTPS ingestion API
        ↓
Time-series database
        ↓
Hydraulic baseline + anomaly model
        ↓
Municipal dashboard and alerts
```

Recommended production components:

- pressure transducers at selected junctions;
- electromagnetic or ultrasonic flow meters;
- timestamp synchronisation;
- local buffering during connectivity loss;
- sensor-health and calibration records;
- an API for validated telemetry;
- a time-series database;
- demand-aware and elevation-aware hydraulic baselines;
- alert acknowledgement and maintenance-ticket workflows.

## Engineering assumptions

- The demonstration pipe is represented as one linear main.
- Sensor distances are known.
- The expected pressure profile is already calibrated.
- Flow leaving the monitored main is treated as loss for the mock scenario.
- All sensor timestamps are synchronised.
- Sensor error is represented by small oscillations only.
- The leak occurs between adjacent sensors rather than at a sensor itself.

## Limitations

- A pressure drop alone does not prove leakage.
- Changes in demand can resemble a leak.
- Pump switching can create pressure transients.
- Valve operation can create a similar pressure pattern.
- Elevation differences change static pressure.
- Pipe diameter, roughness and ageing affect normal head loss.
- An inaccurate or drifting sensor can create a false alarm.
- Two sensors identify a suspicious segment, not an exact excavation point.
- The confidence percentage is a prototype score and is not statistically calibrated.
- A linear pipe is simpler than a looped municipal distribution network.
- The present application does not ingest real IoT data.

## Validation plan for real deployment

1. Install calibrated sensors on a controlled test section.
2. Record normal operation across different demand periods.
3. Create controlled leaks at known positions and discharge rates.
4. Measure detection rate, localisation error and false-alarm rate.
5. Tune residual thresholds and scoring weights.
6. Compare results with a calibrated hydraulic model.
7. Test sensor failure, communication loss and pump events.
8. Repeat the experiment on different pipe materials and diameters.

Useful evaluation metrics:

- precision and recall for leak alarms;
- false alarms per day;
- mean time to detection;
- segment-localisation accuracy;
- estimated-versus-measured leak flow error;
- system uptime and packet-delivery rate.

## Security and operational considerations

A production municipal system should include:

- authenticated devices;
- encrypted communication;
- per-device credentials;
- validation of impossible sensor values;
- rate limiting and replay protection;
- role-based access for operators;
- audit logs for alerts and acknowledgements;
- backups and data-retention rules;
- clear separation between monitoring and valve-control systems.

## Interview explanation

### 30-second version

“I noticed a continuously leaking roadside pipe in my village and asked how the panchayat could know about it without waiting for a complaint. I modelled the pipe as monitored segments. The software compares live pressure and flow readings with a normal baseline, detects an abnormal residual and localises the problem to the segment where the largest pressure change begins. I built a continuous mock stream and React dashboard, plus a Python analysis prototype.”

### Technical version

“The frontend produces a new deterministic sensor sample every 1.5 seconds. For each station I calculate the difference between expected and measured pressure. I also calculate inlet-versus-outlet flow imbalance. A weighted score communicates severity, while the largest adjacent pressure drop identifies the likely segment. An Isolation Forest in the Python prototype provides a secondary anomaly signal. In production I would replace the mock generator with MQTT or an HTTP ingestion API and calibrate the baseline against field measurements or EPANET.”

## Questions an interviewer may ask

### Why are both pressure and flow needed?

Pressure provides spatial information about where hydraulic behaviour changes. Flow balance estimates whether water is disappearing from the monitored section. Combining them is more informative than either signal alone.

### Can the project find the exact hole?

Not with widely spaced pressure sensors alone. It can identify the suspicious segment. Exact localisation may require closer spacing, transient-pressure analysis, acoustic correlation or field inspection.

### Why use machine learning?

Machine learning can learn normal multivariable behaviour and detect patterns that fixed thresholds miss. However, this prototype keeps the main rule transparent and uses Isolation Forest only as supporting evidence.

### Why not call every pressure drop a leak?

Pressure changes may come from demand, valves, pumps, elevation or sensor faults. A practical system needs persistence checks, contextual data and a calibrated hydraulic baseline.

### How would you connect real sensors?

An ESP32 or industrial logger would transmit timestamped measurements through LoRaWAN, NB-IoT, cellular or Wi-Fi to an MQTT broker or HTTPS API. A backend service would validate and store the readings before the dashboard consumes them.

## Future roadmap

- Replace mock telemetry with MQTT or REST ingestion
- Store time-series history
- Add EPANET-based hydraulic simulation
- Model elevation and pipe roughness
- Add demand forecasting by hour and day
- Add sensor calibration and offline-status detection
- Add map-based network topology
- Add alert acknowledgement and work orders
- Evaluate acoustic sensors for exact localisation
- Train and validate models using controlled leak experiments

## Author

**Dipayan Sardar**

Civil Engineering and Data Science undergraduate

Jadavpur University and IIT Madras

## License

This repository is intended for educational, research and demonstration use. Add a formal open-source license before redistributing it as a reusable package.

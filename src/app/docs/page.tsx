import { Header } from "@/components/layout/Header";

// ---------------------------------------------------------------------------
// Inline components
// ---------------------------------------------------------------------------

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="text-lg font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">
        {title}
      </h2>
      <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
        {children}
      </div>
    </section>
  );
}

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <pre className="my-2 rounded-lg bg-gray-50 border border-gray-100 px-4 py-3 text-xs font-mono text-gray-800 overflow-x-auto whitespace-pre-wrap">
      {children}
    </pre>
  );
}

function Ref({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-gray-400 italic">{children}</p>;
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-gray-50">
            {headers.map((h) => (
              <th key={h} className="text-left px-3 py-2 text-gray-600 font-medium border border-gray-100">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-gray-50">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2 text-gray-700 border border-gray-100">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DocsPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">

          <div className="mb-10">
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
              Training Science
            </h1>
            <p className="mt-2 text-sm text-gray-500 max-w-xl">
              Every metric in Kilometer is grounded in peer-reviewed exercise physiology.
              This page explains the models, their assumptions, and their limitations.
            </p>
          </div>

          {/* Table of contents */}
          <nav className="mb-10 rounded-xl border border-gray-100 bg-white px-6 py-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Contents</p>
            <ol className="space-y-1.5 text-sm text-violet-700 list-decimal list-inside">
              {[
                ["training-load", "Training Load Models"],
                ["pmc", "Fitness · Fatigue · Form (CTL / ATL / TSB)"],
                ["vo2max", "VO₂max Estimation"],
                ["critical-speed", "Critical Speed & Race Prediction"],
                ["intensity-domains", "Exercise Intensity Domains"],
                ["limitations", "Limitations & Caveats"],
              ].map(([id, label]) => (
                <li key={id}>
                  <a href={`#${id}`} className="hover:underline">{label}</a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="space-y-12">

            {/* 1 — Training Load */}
            <Section id="training-load" title="1. Training Load Models">
              <p>
                Training load quantifies the physiological stress of a session.
                Kilometer selects the most accurate model available given your heart rate profile.
              </p>

              <h3 className="font-semibold text-gray-800 mt-4">1a. Banister TRIMP (priority 1)</h3>
              <p>
                Used when <strong>HR max and HR rest</strong> are configured.
                The exponential term captures the non-linear metabolic cost of high-intensity work —
                doubling heart rate reserve more than doubles the stress.
              </p>
              <Formula>{`TRIMP = duration_min × HRr × 0.64 × e^(1.92 × HRr)

HRr = (avgHR − HRrest) / (HRmax − HRrest)   ← Karvonen heart rate reserve`}</Formula>
              <Ref>Banister E.W. (1991). Modelling elite athletic performance. In Physiological Testing of Elite Athletes, pp. 403-424. Human Kinetics.</Ref>

              <h3 className="font-semibold text-gray-800 mt-4">1b. Linear hrTSS (priority 2)</h3>
              <p>
                Used when <strong>average HR is available</strong> but HR max / rest are not.
                Anchored to lactate threshold HR (LTHR): a 1-hour effort at exactly LTHR scores 100.
              </p>
              <Formula>{`hrTSS = duration_hours × (avgHR / LTHR) × 100

Default LTHR = 170 bpm if not configured.`}</Formula>
              <Ref>Manzi V. et al. (2009). Dose-response relationship of autonomic nervous system responses to individualised training impulse in marathon runners. Am J Physiology 296(6):H1733-H1740.</Ref>

              <h3 className="font-semibold text-gray-800 mt-4">1c. Duration fallback (priority 3)</h3>
              <p>
                When no HR data exist, load is estimated assuming a moderate aerobic effort
                of 60 TSS/hour — equivalent to a comfortable easy run.
                This is the least accurate model and improves as soon as HR data are available.
              </p>
              <Formula>{`load = duration_hours × 60`}</Formula>
            </Section>

            {/* 2 — PMC */}
            <Section id="pmc" title="2. Fitness · Fatigue · Form (CTL / ATL / TSB)">
              <p>
                The <strong>Performance Manager Chart (PMC)</strong> tracks three derived signals
                from your daily training load using the Banister impulse-response model.
                Each is an exponentially weighted moving average (EWMA) of a different time constant.
              </p>

              <Table
                headers={["Signal", "Name", "Time constant", "Interpretation"]}
                rows={[
                  ["CTL", "Chronic Training Load", "42 days", "Fitness — the long-term training stimulus your body has adapted to"],
                  ["ATL", "Acute Training Load",   "7 days",  "Fatigue — the recent accumulated stress not yet recovered from"],
                  ["TSB", "Training Stress Balance", "derived", "Form = CTL − ATL; positive = fresh, negative = fatigued"],
                ]}
              />

              <Formula>{`CTL_today = CTL_yesterday + (load_today − CTL_yesterday) / 42
ATL_today = ATL_yesterday + (load_today − ATL_yesterday) / 7
TSB_today = CTL_today − ATL_today`}</Formula>

              <p>
                The time constants (42 and 7 days) are the decay rates of each filter.
                A rest day shifts CTL and ATL toward zero, with ATL falling faster.
                This widens TSB — the fitness-fatigue model predicts best performance when
                TSB is positive (recently tapered) but CTL remains high.
              </p>

              <Table
                headers={["TSB zone", "Range", "Meaning"]}
                rows={[
                  ["Peak",       "TSB > 10",         "Optimal race window — fitness high, fatigue low"],
                  ["Fresh",      "0 < TSB ≤ 10",     "Ready for quality work"],
                  ["Neutral",    "−10 < TSB ≤ 0",    "Sustainable training load"],
                  ["Fatigued",   "−30 < TSB ≤ −10",  "Prime adaptation zone — monitor recovery"],
                  ["Overreached","TSB ≤ −30",         "Reduce load — injury risk elevated"],
                ]}
              />

              <Ref>Morton R.H., Fitz-Clarke J.R. & Banister E.W. (1990). Modeling human performance in running. Journal of Applied Physiology 69(3):1171-1177.</Ref>
              <Ref>Coggan A.R. (2003). Training and racing with a power meter. Peaks Coaching Group. [popularised CTL/ATL/TSB nomenclature in endurance sports]</Ref>
            </Section>

            {/* 3 — VO2max */}
            <Section id="vo2max" title="3. VO₂max Estimation">
              <p>
                VO₂max (mL/kg/min) is estimated from submaximal running efforts using two
                established equations chained together.
              </p>

              <h3 className="font-semibold text-gray-800 mt-4">Step 1 — Oxygen cost of running (ACSM)</h3>
              <p>
                The American College of Sports Medicine equation converts running speed
                into the metabolic oxygen requirement:
              </p>
              <Formula>{`VO₂_run = 0.2 × speed_m/min + 3.5   (mL/kg/min)`}</Formula>
              <Ref>ACSM (2010). Guidelines for Exercise Testing and Prescription, 8th ed. Lippincott Williams & Wilkins.</Ref>

              <h3 className="font-semibold text-gray-800 mt-4">Step 2 — %HRR ≈ %VO₂max (Swain)</h3>
              <p>
                At submaximal intensities, the fraction of heart rate reserve (%HRR) closely
                approximates the fraction of VO₂max being used:
              </p>
              <Formula>{`%HRR = (avgHR − HRrest) / (HRmax − HRrest)
VO₂max = VO₂_run / %HRR`}</Formula>
              <Ref>Swain D.P. et al. (1994). Target HR for the development of cardiovascular fitness. Med Sci Sports Exerc 26(1):112-116.</Ref>

              <h3 className="font-semibold text-gray-800 mt-4">Reliability window</h3>
              <p>
                The estimate is only calculated when HRR is between 40% and 97%.
                Below 40% the relationship is too imprecise; above 97% the runner is near
                max HR and the linear approximation breaks down.
                Activities shorter than 10 minutes are excluded.
              </p>

              <h3 className="font-semibold text-gray-800 mt-4">EWMA trend (28-day)</h3>
              <p>
                Raw per-activity estimates are noisy (GPS drift, unusual pacing, temperature).
                A time-decayed EWMA filters this noise into a stable trend — analogous to how
                Garmin tracks VO₂max as a persistent state rather than a per-run observation.
              </p>
              <Formula>{`α = 1 − exp(−Δdays / 28)
EWMA_today = EWMA_prev + α × (vo2max_today − EWMA_prev)

Long gaps → larger α → faster adaptation to new observations.`}</Formula>
            </Section>

            {/* 4 — Critical Speed */}
            <Section id="critical-speed" title="4. Critical Speed & Race Prediction">
              <p>
                Critical Speed (CS) is the highest running speed that can be sustained
                without eventual exhaustion — the asymptote of the speed-duration hyperbola.
                It is the running equivalent of Critical Power in cycling.
              </p>
              <p>
                Paired with <strong>D&apos;</strong> (D-prime, metres) — the finite anaerobic
                buffer available above CS — the model predicts finishing times at any distance
                and explains why surges above CS are unsustainable for long.
              </p>

              <h3 className="font-semibold text-gray-800 mt-4">The hyperbolic model</h3>
              <Formula>{`Hyperbolic form:
  t_lim = D' / (v − CS)          ← time to exhaustion at speed v > CS

Linear form (used for regression):
  d = CS × t + D'                 ← distance = speed × time + buffer

Race prediction:
  t_pred = (d − D') / CS         ← predicted time for target distance d`}</Formula>

              <h3 className="font-semibold text-gray-800 mt-4">How Kilometer estimates CS</h3>
              <p>
                Rather than requiring dedicated time trials, CS is derived from the
                <strong> Pareto front</strong> of your recorded activities: the subset of runs
                where no other run covered more distance in less time.
                These represent near-maximal pacing at each duration.
              </p>
              <p>
                Only activities between <strong>3 and 50 minutes</strong> are considered —
                shorter efforts are too anaerobic, longer races involve pacing conservatism
                that causes underestimation of CS.
                OLS regression is applied to the (time, distance) pairs; the model is shown
                only when R² ≥ 0.85 and CS falls within physiological bounds (2.5 – 6.5 m/s).
              </p>

              <Table
                headers={["Typical D' (metres)", "CS approximation", "Notes"]}
                rows={[
                  ["100 – 200 m", "Recreational",  "≈ 30-min race pace"],
                  ["200 – 350 m", "Club runner",   "≈ 10 km race pace for many athletes"],
                  ["350 – 600 m", "Elite",         "Larger buffer from higher anaerobic capacity"],
                ]}
              />

              <Ref>Monod H. & Scherrer J. (1965). The work capacity of a synergic muscular group. Ergonomics 8:329-338.</Ref>
              <Ref>Hill D.W. (1993). The critical power concept: a review. Sports Medicine 16(4):237-254.</Ref>
              <Ref>Poole D.C. et al. (2016). Critical power: an important fatigue threshold in exercise physiology. Med Sci Sports Exerc 48(11):2320-2334.</Ref>
              <Ref>PMC7664951 — Calculation of CS from raw training data in recreational marathon runners.</Ref>
            </Section>

            {/* 5 — Intensity domains */}
            <Section id="intensity-domains" title="5. Exercise Intensity Domains">
              <p>
                Exercise physiologists divide running intensity into domains defined by
                distinct physiological responses rather than arbitrary percentages.
              </p>

              <Formula>{`SLOW ──── LT1 ──── MODERATE ──── CS/MLSS ──── SEVERE ──── vVO₂max ──── EXTREME

LT1   (Lactate Threshold 1): first lactate inflection — marathon effort for trained runners
CS    (Critical Speed):       highest truly sustainable speed; ~30-min race pace
MLSS  (Maximal Lactate Steady State): lab measure, ~4-12% slower than CS
vVO₂max: speed that first elicits VO₂max; 4-8 min effort duration`}</Formula>

              <Table
                headers={["Domain", "Boundaries", "Characteristics"]}
                rows={[
                  ["Moderate", "Below LT1",       "VO₂ and lactate fully stable; sustainable indefinitely"],
                  ["Heavy",    "LT1 → CS",        "Elevated but stable lactate; sustainable for long periods"],
                  ["Severe",   "CS → vVO₂max",    "VO₂ climbs to VO₂max; exhaustion inevitable; interval training zone"],
                  ["Extreme",  "Above vVO₂max",   "VO₂max not achieved before exhaustion; sprint territory"],
                ]}
              />

              <p>
                CS is a more precise threshold than MLSS (determined without invasive blood draws)
                and is higher than MLSS by 4–12% — research from Jones et al. (2021) shows VO₂
                is not truly stable at MLSS in well-trained runners, confirming CS as the better
                metabolic boundary.
              </p>
              <Ref>Vanhatalo A., Jones A.M. & Burnley M. (2011). Application of critical power in sport. IJSPP 6(1):128-136.</Ref>
              <Ref>Jones A.M. et al. (2021). Steady-state VO₂ above MLSS: evidence that CS better represents maximal metabolic steady state. PMC8505327.</Ref>
            </Section>

            {/* 6 — Limitations */}
            <Section id="limitations" title="6. Limitations & Caveats">
              <p>All models are approximations. Key limitations to keep in mind:</p>

              <ul className="list-disc list-inside space-y-2 mt-2">
                <li>
                  <strong>HR-based VO₂max</strong> is a submaximal estimate. Accuracy is
                  highest during steady-state efforts at 40–90% HRR. GPS pace noise, heat,
                  caffeine, altitude, and cardiac drift all introduce error.
                </li>
                <li>
                  <strong>Training load models</strong> (TRIMP, hrTSS) do not capture
                  strength training, sleep, nutrition, or life stress — all of which affect
                  recovery. CTL/ATL/TSB describes the stimulus, not your actual readiness.
                </li>
                <li>
                  <strong>Critical Speed</strong> assumes pacing is maximal. GPS watches
                  have ±1–3% distance error per run; accumulated over many activities this
                  can shift CS meaningfully. The model also does not account for elevation,
                  terrain, or weather.
                </li>
                <li>
                  <strong>Race predictions</strong> from the CS model assume a flat course
                  run at maximal sustainable effort. They are most accurate for distances
                  where the model has supporting data (typically 3–50 min efforts).
                  Marathon predictions carry the most uncertainty.
                </li>
                <li>
                  <strong>Individual variation</strong> is large. The empirical constants
                  in Banister TRIMP (0.64, 1.92) were fit to a small group of male athletes.
                  Your optimal training load and recovery may differ.
                </li>
              </ul>

              <p className="mt-4">
                Use these metrics as directional signals, not absolute truth.
                Consistent trends over weeks matter more than any single data point.
              </p>
            </Section>

          </div>

          <p className="mt-16 text-xs text-gray-300 text-center">
            Kilometer · self-hosted running analytics
          </p>
        </div>
      </main>
    </>
  );
}

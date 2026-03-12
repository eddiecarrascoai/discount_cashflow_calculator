import { useState, useMemo } from "react";
import financials from "../server/data/companies-financials.json";

const COMPANIES = financials.tickers;

const formatNum = (n, decimals = 1) => {
  if (Math.abs(n) >= 1e12) return (n / 1e12).toFixed(decimals) + "T";
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(decimals) + "B";
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(decimals) + "M";
  return n.toFixed(decimals);
};

const formatDollar = (n) => {
  if (Math.abs(n) >= 1e9) return "$" + (n / 1e9).toFixed(1) + "B";
  if (Math.abs(n) >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M";
  return "$" + n.toFixed(2);
};

function computeDCF(fcf, growthNear, growthTerminal, discountRate, years = 10) {
  const projections = [];
  let totalPV = 0;
  const transitionYear = 5;

  for (let i = 1; i <= years; i++) {
    let growthRate;
    if (i <= transitionYear) {
      growthRate = growthNear / 100;
    } else {
      const fade = (i - transitionYear) / (years - transitionYear);
      growthRate = ((growthNear / 100) * (1 - fade) + (growthTerminal / 100) * fade);
    }
    const prevFCF = i === 1 ? fcf : projections[i - 2].fcf;
    const currentFCF = prevFCF * (1 + growthRate);
    const pv = currentFCF / Math.pow(1 + discountRate / 100, i);
    totalPV += pv;
    projections.push({ year: i, fcf: currentFCF, pv, growthRate: growthRate * 100 });
  }

  const terminalFCF = projections[years - 1].fcf * (1 + growthTerminal / 100);
  const terminalValue = terminalFCF / (discountRate / 100 - growthTerminal / 100);
  const pvTerminal = terminalValue / Math.pow(1 + discountRate / 100, years);
  const intrinsicValue = totalPV + pvTerminal;

  return { projections, totalPV, terminalValue, pvTerminal, intrinsicValue };
}

function getSignal(price, iv, marginOfSafety) {
  const buyBelow = iv * (1 - marginOfSafety / 100);
  if (price <= buyBelow) return { label: "BUY", color: "#6bcf7f", bg: "rgba(107,207,127,0.12)", border: "rgba(107,207,127,0.3)", icon: "▲", reasoning: "Trading below intrinsic value with margin of safety. Favorable risk/reward." };
  if (price <= iv) return { label: "HOLD", color: "#e8c872", bg: "rgba(232,200,114,0.08)", border: "rgba(232,200,114,0.25)", icon: "■", reasoning: "Within fair value range but insufficient margin of safety to initiate or add." };
  if (price <= iv * 1.15) return { label: "AVOID", color: "#cf8f4f", bg: "rgba(207,143,79,0.1)", border: "rgba(207,143,79,0.25)", icon: "▼", reasoning: "Slightly above intrinsic value. Wait for a pullback or reassess growth assumptions." };
  return { label: "AVOID", color: "#cf6b6b", bg: "rgba(207,107,107,0.1)", border: "rgba(207,107,107,0.25)", icon: "▼", reasoning: "Trading materially above intrinsic value. Market is pricing in optimistic growth that offers no margin of safety." };
}

function SignalBadge({ signal, size = "normal" }) {
  const isSmall = size === "small";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: isSmall ? 3 : 5,
      padding: isSmall ? "2px 6px" : "4px 10px",
      borderRadius: 4,
      fontSize: isSmall ? 8 : 11,
      fontWeight: 700,
      fontFamily: "'JetBrains Mono', monospace",
      color: signal.color,
      background: signal.bg,
      border: `1px solid ${signal.border}`,
      letterSpacing: 1,
    }}>
      <span style={{ fontSize: isSmall ? 6 : 8 }}>{signal.icon}</span>
      {signal.label}
    </span>
  );
}

function SliderInput({ label, value, onChange, min, max, step = 0.1, suffix = "%" }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: "#8a8a8e", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: 1 }}>{label}</span>
        <span style={{ fontSize: 13, color: "#e8c872", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{value.toFixed(1)}{suffix}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: "#e8c872", height: 4, cursor: "pointer" }}
      />
    </div>
  );
}

function CompanyCard({ company, isSelected, onClick, signal }) {
  const marketCap = company.price * company.sharesOut;
  const fcfYield = ((company.fcfTTM / marketCap) * 100);
  return (
    <button
      onClick={onClick}
      style={{
        background: isSelected ? "rgba(232,200,114,0.08)" : "rgba(255,255,255,0.02)",
        border: isSelected ? "1px solid rgba(232,200,114,0.4)" : "1px solid rgba(255,255,255,0.06)",
        borderRadius: 8,
        padding: "12px 14px",
        cursor: "pointer",
        textAlign: "left",
        transition: "all 0.2s",
        width: "100%",
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700, color: isSelected ? "#e8c872" : "#d4d4d4", letterSpacing: 0.5 }}>{company.ticker}</span>
        {signal && <SignalBadge signal={signal} size="small" />}
      </div>
      <div style={{ fontSize: 10, color: "#6a6a6e", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{company.name}</div>
      <div style={{ marginTop: 6, display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ fontSize: 10, color: "#8a8a8e", fontFamily: "'JetBrains Mono', monospace" }}>${company.price}</span>
        <span style={{ fontSize: 10, color: fcfYield > 5 ? "#6bcf7f" : fcfYield > 3 ? "#e8c872" : "#cf6b6b", fontFamily: "'JetBrains Mono', monospace" }}>{fcfYield.toFixed(1)}% yld</span>
      </div>
    </button>
  );
}

// Signal logic now handled by getSignal + SignalBadge

export default function DCFCalculator() {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [discountRate, setDiscountRate] = useState(10.0);
  const [nearGrowth, setNearGrowth] = useState(8.0);
  const [termGrowth, setTermGrowth] = useState(3.0);
  const [marginOfSafety, setMarginOfSafety] = useState(25);

  const company = COMPANIES[selectedIdx];
  const marketCap = company.price * company.sharesOut;
  const fcfYield = (company.fcfTTM / marketCap) * 100;

  const dcf = useMemo(() =>
    computeDCF(company.fcfTTM, nearGrowth, termGrowth, discountRate),
    [company.fcfTTM, nearGrowth, termGrowth, discountRate]
  );

  const intrinsicPerShare = (dcf.intrinsicValue / company.sharesOut).toFixed(2);
  const safePrice = (intrinsicPerShare * (1 - marginOfSafety / 100)).toFixed(2);
  const upside = ((intrinsicPerShare - company.price) / company.price * 100).toFixed(1);
  const marginFromCurrent = ((intrinsicPerShare - company.price) / intrinsicPerShare * 100).toFixed(1);

  const avgFCF = company.fcf4yr.reduce((a, b) => a + b, 0) / company.fcf4yr.length;
  const normalizedDCF = useMemo(() =>
    computeDCF(avgFCF, nearGrowth, termGrowth, discountRate),
    [avgFCF, nearGrowth, termGrowth, discountRate]
  );
  const normalizedPerShare = (normalizedDCF.intrinsicValue / company.sharesOut).toFixed(2);

  const currentSignal = getSignal(company.price, parseFloat(intrinsicPerShare), marginOfSafety);

  const companySignals = useMemo(() =>
    COMPANIES.map((c) => {
      const d = computeDCF(c.fcfTTM, nearGrowth, termGrowth, discountRate);
      const iv = d.intrinsicValue / c.sharesOut;
      return getSignal(c.price, iv, marginOfSafety);
    }),
    [nearGrowth, termGrowth, discountRate, marginOfSafety]
  );

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0c0c0e",
      color: "#d4d4d4",
      fontFamily: "'Georgia', 'Times New Roman', serif",
      padding: "24px 16px",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ maxWidth: 1100, margin: "0 auto", marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 400, color: "#e8c872", margin: 0, letterSpacing: 1 }}>
              DISCOUNTED CASH FLOW ANALYZER
            </h1>
            <p style={{ fontSize: 11, color: "#6a6a6e", margin: "4px 0 0", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: 1.5 }}>
              Value Investing Framework · Hohn · Li Lu · Spier
            </p>
          </div>
          <div style={{ fontSize: 10, color: "#6a6a6e", fontFamily: "'JetBrains Mono', monospace", textAlign: "right" }}>
            <div>DATA AS OF MAR 2026</div>
            <div style={{ color: "#8a8a8e" }}>9 COMPANIES · 10YR PROJECTIONS</div>
          </div>
        </div>
        <div style={{ height: 1, background: "linear-gradient(90deg, #e8c872, transparent)", marginTop: 14 }} />
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Company Selector */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 8,
          marginBottom: 24,
        }}>
          {COMPANIES.map((c, i) => (
            <CompanyCard key={c.ticker} company={c} isSelected={i === selectedIdx} onClick={() => setSelectedIdx(i)} signal={companySignals[i]} />
          ))}
        </div>

        {/* Signal Summary Bar */}
        {(() => {
          const buys = companySignals.filter(s => s.label === "BUY").length;
          const holds = companySignals.filter(s => s.label === "HOLD").length;
          const avoids = companySignals.filter(s => s.label === "AVOID").length;
          return (
            <div style={{
              display: "flex", gap: 16, marginBottom: 20, padding: "10px 16px",
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 8, alignItems: "center", flexWrap: "wrap",
            }}>
              <span style={{ fontSize: 10, color: "#6a6a6e", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, fontWeight: 600 }}>SIGNAL SUMMARY</span>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "#6bcf7f" }} />
                <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "#6bcf7f", fontWeight: 700 }}>{buys} BUY</span>
              </div>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "#e8c872" }} />
                <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "#e8c872", fontWeight: 700 }}>{holds} HOLD</span>
              </div>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "#cf6b6b" }} />
                <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "#cf6b6b", fontWeight: 700 }}>{avoids} AVOID</span>
              </div>
              <span style={{ fontSize: 9, color: "#4a4a4e", fontFamily: "'JetBrains Mono', monospace", marginLeft: "auto" }}>
                @ {discountRate}% WACC · {nearGrowth}% growth · {marginOfSafety}% MoS
              </span>
            </div>
          );
        })()}

        {/* Main Content Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

          {/* LEFT: Company Profile + Assumptions */}
          <div style={{ minWidth: 0 }}>
            {/* Company Header */}
            <div style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 10,
              padding: 20,
              marginBottom: 16,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 28, color: "#e8c872", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>
                    {company.ticker}
                  </h2>
                  <div style={{ fontSize: 13, color: "#8a8a8e", marginTop: 2 }}>{company.name}</div>
                  <div style={{ fontSize: 10, color: "#6a6a6e", fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>{company.sector}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 28, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: "#d4d4d4" }}>
                    ${company.price}
                  </div>
                  <div style={{ fontSize: 10, color: "#6a6a6e", fontFamily: "'JetBrains Mono', monospace" }}>CURRENT PRICE</div>
                </div>
              </div>

              <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "14px 0" }} />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                {[
                  { label: "MARKET CAP", value: formatDollar(marketCap * 1e6) },
                  { label: (company.cashFlowMetric || "FCF") + " (TTM)", value: formatDollar(company.fcfTTM * 1e6) },
                  { label: (company.cashFlowMetric || "FCF") + " YIELD", value: fcfYield.toFixed(1) + "%" },
                  { label: "SHARES OUT", value: formatNum(company.sharesOut * 1e6) },
                  { label: (company.cashFlowMetric || "FCF") + "/SHARE", value: "$" + (company.fcfTTM / company.sharesOut).toFixed(2) },
                  { label: "4YR " + (company.cashFlowMetric || "FCF") + " CAGR", value: company.fcfGrowth4yr.toFixed(1) + "%" },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div style={{ fontSize: 9, color: "#6a6a6e", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 14, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: "#d4d4d4" }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Economic Moat */}
            <div style={{
              background: "rgba(232,200,114,0.03)",
              border: "1px solid rgba(232,200,114,0.12)",
              borderRadius: 10,
              padding: 16,
              marginBottom: 16,
            }}>
              <div style={{ fontSize: 10, color: "#e8c872", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1.5, marginBottom: 8, fontWeight: 600 }}>
                ECONOMIC MOAT ASSESSMENT
              </div>
              <p style={{ fontSize: 12.5, lineHeight: 1.6, color: "#b0b0b4", margin: 0 }}>
                {company.moat}
              </p>
            </div>

            {/* Analyst Notes */}
            <div style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 10,
              padding: 16,
              marginBottom: 16,
            }}>
              <div style={{ fontSize: 10, color: "#8a8a8e", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1.5, marginBottom: 8, fontWeight: 600 }}>
                VALUE INVESTOR NOTES
              </div>
              <p style={{ fontSize: 12.5, lineHeight: 1.6, color: "#b0b0b4", margin: 0 }}>
                {company.notes}
              </p>
            </div>

            {/* DCF Assumptions */}
            <div style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 10,
              padding: 20,
            }}>
              <div style={{ fontSize: 10, color: "#8a8a8e", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1.5, marginBottom: 14, fontWeight: 600 }}>
                DCF ASSUMPTIONS
              </div>
              <SliderInput label="Discount Rate (WACC)" value={discountRate} onChange={setDiscountRate} min={6} max={15} />
              <SliderInput label="Near-Term FCF Growth (Yr 1-5)" value={nearGrowth} onChange={setNearGrowth} min={-5} max={25} />
              <SliderInput label="Terminal Growth Rate" value={termGrowth} onChange={setTermGrowth} min={1} max={5} />
              <SliderInput label="Margin of Safety" value={marginOfSafety} onChange={setMarginOfSafety} min={10} max={50} />

              <div style={{ marginTop: 10, padding: "10px 12px", background: "rgba(107,207,127,0.06)", borderRadius: 6, border: "1px solid rgba(107,207,127,0.15)" }}>
                <div style={{ fontSize: 9, color: "#6bcf7f", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, marginBottom: 4 }}>FRAMEWORK REMINDER</div>
                <div style={{ fontSize: 11, color: "#8a8a8e", lineHeight: 1.5 }}>
                  Hohn: Concentrated, activist, demand capital efficiency. Li Lu: Buy wonderful businesses at fair prices, hold forever. Spier: Checklist discipline, avoid leverage, stay within circle of competence.
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Valuation Results */}
          <div style={{ minWidth: 0 }}>
            {/* Verdict */}
            <div style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 10,
              padding: 20,
              marginBottom: 16,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 10, color: "#8a8a8e", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1.5, marginBottom: 6 }}>INTRINSIC VALUE / SHARE</div>
                  <div style={{ fontSize: 36, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: "#e8c872" }}>
                    ${intrinsicPerShare}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <SignalBadge signal={currentSignal} />
                  <div style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", marginTop: 8, color: parseFloat(upside) > 0 ? "#6bcf7f" : "#cf6b6b" }}>
                    {upside > 0 ? "+" : ""}{upside}% vs current
                  </div>
                </div>
              </div>

              {/* Signal Reasoning */}
              <div style={{
                padding: "10px 12px", marginBottom: 14,
                background: currentSignal.bg,
                border: `1px solid ${currentSignal.border}`,
                borderRadius: 6,
              }}>
                <div style={{ fontSize: 9, color: currentSignal.color, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, marginBottom: 4, fontWeight: 700 }}>
                  {currentSignal.icon} {currentSignal.label} SIGNAL — REASONING
                </div>
                <div style={{ fontSize: 11, color: "#b0b0b4", lineHeight: 1.5 }}>
                  {currentSignal.reasoning}
                  {currentSignal.label === "BUY" && " At $" + company.price + ", the stock trades below the buy-below price of $" + safePrice + " (IV $" + intrinsicPerShare + " less " + marginOfSafety + "% margin of safety)."}
                  {currentSignal.label === "HOLD" && " Current price of $" + company.price + " is below IV of $" + intrinsicPerShare + " but above the buy-below threshold of $" + safePrice + "."}
                  {currentSignal.label === "AVOID" && " At $" + company.price + ", the stock trades above the intrinsic value estimate of $" + intrinsicPerShare + ". No margin of safety exists at this price."}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ padding: 12, background: "rgba(232,200,114,0.05)", borderRadius: 6, border: "1px solid rgba(232,200,114,0.1)" }}>
                  <div style={{ fontSize: 9, color: "#e8c872", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, marginBottom: 4 }}>BUY BELOW (w/ MoS)</div>
                  <div style={{ fontSize: 22, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: "#6bcf7f" }}>${safePrice}</div>
                  <div style={{ fontSize: 10, color: "#6a6a6e", fontFamily: "'JetBrains Mono', monospace" }}>
                    {marginOfSafety}% margin of safety
                  </div>
                </div>
                <div style={{ padding: 12, background: "rgba(255,255,255,0.03)", borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize: 9, color: "#8a8a8e", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, marginBottom: 4 }}>NORMALIZED IV</div>
                  <div style={{ fontSize: 22, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: "#d4d4d4" }}>${normalizedPerShare}</div>
                  <div style={{ fontSize: 10, color: "#6a6a6e", fontFamily: "'JetBrains Mono', monospace" }}>
                    5yr avg FCF: {formatDollar(avgFCF * 1e6)}
                  </div>
                </div>
              </div>

              {/* Visual bar */}
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 9, color: "#6a6a6e", fontFamily: "'JetBrains Mono', monospace", marginBottom: 6, letterSpacing: 1 }}>PRICE vs INTRINSIC VALUE</div>
                <div style={{ position: "relative", height: 32, background: "rgba(255,255,255,0.04)", borderRadius: 6, overflow: "hidden" }}>
                  {(() => {
                    const maxVal = Math.max(company.price, parseFloat(intrinsicPerShare), parseFloat(safePrice)) * 1.15;
                    const priceW = (company.price / maxVal) * 100;
                    const ivW = (parseFloat(intrinsicPerShare) / maxVal) * 100;
                    const safeW = (parseFloat(safePrice) / maxVal) * 100;
                    return (
                      <>
                        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: ivW + "%", background: "rgba(107,207,127,0.12)", borderRadius: 6 }} />
                        <div style={{ position: "absolute", left: safeW + "%", top: 0, height: "100%", width: 2, background: "#6bcf7f" }} />
                        <div style={{ position: "absolute", left: priceW + "%", top: 0, height: "100%", width: 2, background: "#cf6b6b" }} />
                        <div style={{ position: "absolute", left: priceW + "%", top: 4, fontSize: 8, color: "#cf6b6b", fontFamily: "'JetBrains Mono', monospace", transform: "translateX(-50%)" }}>PRICE</div>
                        <div style={{ position: "absolute", left: safeW + "%", bottom: 4, fontSize: 8, color: "#6bcf7f", fontFamily: "'JetBrains Mono', monospace", transform: "translateX(-50%)" }}>BUY</div>
                        <div style={{ position: "absolute", left: ivW + "%", top: 4, fontSize: 8, color: "#e8c872", fontFamily: "'JetBrains Mono', monospace", transform: "translateX(-50%)" }}>IV</div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Value Composition */}
            <div style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 10,
              padding: 20,
              marginBottom: 16,
            }}>
              <div style={{ fontSize: 10, color: "#8a8a8e", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1.5, marginBottom: 12, fontWeight: 600 }}>
                VALUE COMPOSITION
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 9, color: "#6a6a6e", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, marginBottom: 2 }}>PV OF FCF (YR 1-10)</div>
                  <div style={{ fontSize: 15, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: "#d4d4d4" }}>{formatDollar(dcf.totalPV * 1e6)}</div>
                  <div style={{ fontSize: 10, color: "#6a6a6e", fontFamily: "'JetBrains Mono', monospace" }}>
                    {((dcf.totalPV / dcf.intrinsicValue) * 100).toFixed(0)}% of total
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: "#6a6a6e", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, marginBottom: 2 }}>PV OF TERMINAL</div>
                  <div style={{ fontSize: 15, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: "#d4d4d4" }}>{formatDollar(dcf.pvTerminal * 1e6)}</div>
                  <div style={{ fontSize: 10, color: "#6a6a6e", fontFamily: "'JetBrains Mono', monospace" }}>
                    {((dcf.pvTerminal / dcf.intrinsicValue) * 100).toFixed(0)}% of total
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: "#6a6a6e", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, marginBottom: 2 }}>TOTAL ENTERPRISE</div>
                  <div style={{ fontSize: 15, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: "#e8c872" }}>{formatDollar(dcf.intrinsicValue * 1e6)}</div>
                  <div style={{ fontSize: 10, color: "#6a6a6e", fontFamily: "'JetBrains Mono', monospace" }}>
                    implied value
                  </div>
                </div>
              </div>

              {/* Terminal value bar */}
              <div style={{ marginTop: 12 }}>
                <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ width: ((dcf.totalPV / dcf.intrinsicValue) * 100) + "%", background: "#e8c872" }} />
                  <div style={{ width: ((dcf.pvTerminal / dcf.intrinsicValue) * 100) + "%", background: "rgba(232,200,114,0.35)" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                  <span style={{ fontSize: 9, color: "#e8c872", fontFamily: "'JetBrains Mono', monospace" }}>FCF YEARS 1-10</span>
                  <span style={{ fontSize: 9, color: "rgba(232,200,114,0.6)", fontFamily: "'JetBrains Mono', monospace" }}>TERMINAL VALUE</span>
                </div>
              </div>
            </div>

            {/* 10-Year Projection Table */}
            <div style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 10,
              padding: 20,
              marginBottom: 16,
            }}>
              <div style={{ fontSize: 10, color: "#8a8a8e", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1.5, marginBottom: 12, fontWeight: 600 }}>
                10-YEAR FCF PROJECTION
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      <th style={{ textAlign: "left", padding: "6px 8px", color: "#6a6a6e", fontWeight: 500, fontSize: 9, letterSpacing: 1 }}>YR</th>
                      <th style={{ textAlign: "right", padding: "6px 8px", color: "#6a6a6e", fontWeight: 500, fontSize: 9, letterSpacing: 1 }}>GROWTH</th>
                      <th style={{ textAlign: "right", padding: "6px 8px", color: "#6a6a6e", fontWeight: 500, fontSize: 9, letterSpacing: 1 }}>FCF</th>
                      <th style={{ textAlign: "right", padding: "6px 8px", color: "#6a6a6e", fontWeight: 500, fontSize: 9, letterSpacing: 1 }}>PV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dcf.projections.map((p) => (
                      <tr key={p.year} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                        <td style={{ padding: "5px 8px", color: "#8a8a8e" }}>{p.year}</td>
                        <td style={{ padding: "5px 8px", textAlign: "right", color: p.growthRate > nearGrowth * 0.8 ? "#6bcf7f" : "#e8c872" }}>{p.growthRate.toFixed(1)}%</td>
                        <td style={{ padding: "5px 8px", textAlign: "right", color: "#d4d4d4" }}>{formatDollar(p.fcf * 1e6)}</td>
                        <td style={{ padding: "5px 8px", textAlign: "right", color: "#8a8a8e" }}>{formatDollar(p.pv * 1e6)}</td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: "1px solid rgba(232,200,114,0.2)" }}>
                      <td colSpan="2" style={{ padding: "6px 8px", color: "#e8c872", fontSize: 10 }}>TERMINAL</td>
                      <td style={{ padding: "6px 8px", textAlign: "right", color: "#e8c872" }}>{formatDollar(dcf.terminalValue * 1e6)}</td>
                      <td style={{ padding: "6px 8px", textAlign: "right", color: "#e8c872" }}>{formatDollar(dcf.pvTerminal * 1e6)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Comparative Overview */}
            <div style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 10,
              padding: 20,
            }}>
              <div style={{ fontSize: 10, color: "#8a8a8e", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1.5, marginBottom: 12, fontWeight: 600 }}>
                PORTFOLIO OVERVIEW — ALL COMPANIES
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      <th style={{ textAlign: "left", padding: "5px 6px", color: "#6a6a6e", fontWeight: 500, fontSize: 8, letterSpacing: 1 }}>TICKER</th>
                      <th style={{ textAlign: "center", padding: "5px 6px", color: "#6a6a6e", fontWeight: 500, fontSize: 8, letterSpacing: 1 }}>SIGNAL</th>
                      <th style={{ textAlign: "right", padding: "5px 6px", color: "#6a6a6e", fontWeight: 500, fontSize: 8, letterSpacing: 1 }}>PRICE</th>
                      <th style={{ textAlign: "right", padding: "5px 6px", color: "#6a6a6e", fontWeight: 500, fontSize: 8, letterSpacing: 1 }}>IV</th>
                      <th style={{ textAlign: "right", padding: "5px 6px", color: "#6a6a6e", fontWeight: 500, fontSize: 8, letterSpacing: 1 }}>BUY BELOW</th>
                      <th style={{ textAlign: "right", padding: "5px 6px", color: "#6a6a6e", fontWeight: 500, fontSize: 8, letterSpacing: 1 }}>UPSIDE</th>
                      <th style={{ textAlign: "right", padding: "5px 6px", color: "#6a6a6e", fontWeight: 500, fontSize: 8, letterSpacing: 1 }}>FCF YLD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COMPANIES.map((c, idx) => {
                      const d = computeDCF(c.fcfTTM, nearGrowth, termGrowth, discountRate);
                      const iv = d.intrinsicValue / c.sharesOut;
                      const buyBelow = iv * (1 - marginOfSafety / 100);
                      const up = ((iv - c.price) / c.price * 100);
                      const fy = (c.fcfTTM / (c.price * c.sharesOut)) * 100;
                      const sig = companySignals[idx];
                      return (
                        <tr
                          key={c.ticker}
                          style={{
                            borderBottom: "1px solid rgba(255,255,255,0.03)",
                            background: c.ticker === company.ticker ? "rgba(232,200,114,0.05)" : "transparent",
                            cursor: "pointer",
                          }}
                          onClick={() => setSelectedIdx(idx)}
                        >
                          <td style={{ padding: "5px 6px", color: c.ticker === company.ticker ? "#e8c872" : "#d4d4d4", fontWeight: 600 }}>{c.ticker}</td>
                          <td style={{ padding: "5px 6px", textAlign: "center" }}><SignalBadge signal={sig} size="small" /></td>
                          <td style={{ padding: "5px 6px", textAlign: "right", color: "#8a8a8e" }}>${c.price}</td>
                          <td style={{ padding: "5px 6px", textAlign: "right", color: "#d4d4d4" }}>${iv.toFixed(0)}</td>
                          <td style={{ padding: "5px 6px", textAlign: "right", color: c.price <= buyBelow ? "#6bcf7f" : "#6a6a6e" }}>${buyBelow.toFixed(0)}</td>
                          <td style={{ padding: "5px 6px", textAlign: "right", color: up > 0 ? "#6bcf7f" : "#cf6b6b", fontWeight: 600 }}>{up > 0 ? "+" : ""}{up.toFixed(0)}%</td>
                          <td style={{ padding: "5px 6px", textAlign: "right", color: fy > 5 ? "#6bcf7f" : fy > 3 ? "#e8c872" : "#8a8a8e" }}>{fy.toFixed(1)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 28, padding: "16px 0", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <p style={{ fontSize: 10, color: "#4a4a4e", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.6, margin: 0 }}>
            DISCLAIMER: This is an analytical tool, not investment advice. DCF models are highly sensitive to assumptions. FCF figures use TTM or most recent annual data.
            For JPM and BRK.B, net income / operating earnings are used as FCF proxies. All figures in USD millions unless noted.
            SIGNAL METHODOLOGY: BUY = price below intrinsic value minus margin of safety (genuine discount). HOLD = price between buy-below and IV (fair but not cheap enough to add). AVOID = price above IV (no margin of safety, wait for pullback).
            "Price is what you pay. Value is what you get." — Warren Buffett
          </p>
        </div>
      </div>
    </div>
  );
}

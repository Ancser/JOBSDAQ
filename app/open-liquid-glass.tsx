"use client";

import { useMemo, useState, type CSSProperties } from "react";

type ProductMode = "wealth" | "payments" | "risk";

const PRODUCT_MODES: Array<{
  id: ProductMode;
  label: string;
  eyebrow: string;
  title: string;
  balance: string;
  change: string;
  detail: string;
  accent: string;
}> = [
  {
    id: "wealth",
    label: "Wealth",
    eyebrow: "HOUSEHOLD PORTFOLIO",
    title: "One calm view of every account.",
    balance: "$184,920.48",
    change: "+$2,418.60",
    detail: "Across brokerage, retirement, and cash",
    accent: "#8cf3ff",
  },
  {
    id: "payments",
    label: "Payments",
    eyebrow: "TREASURY OPERATIONS",
    title: "Make the approval state impossible to miss.",
    balance: "$42,800.00",
    change: "3 pending",
    detail: "Vendor payments awaiting review",
    accent: "#b7ff9f",
  },
  {
    id: "risk",
    label: "Risk",
    eyebrow: "LIVE CONTROL SURFACE",
    title: "Show exposure before the user commits.",
    balance: "0.74×",
    change: "Within limit",
    detail: "Portfolio leverage after staged order",
    accent: "#d6b4ff",
  },
];

const CHART_POINTS = [34, 42, 38, 57, 49, 66, 62, 74, 70, 82, 79, 92];

const APPLICATION_PATTERNS = [
  {
    index: "01",
    title: "Risk allocation",
    source: "Fluid Slider",
    copy: "Velocity and resistance make a high-impact financial control feel deliberate without slowing expert users.",
  },
  {
    index: "02",
    title: "Approval state",
    source: "Tactile Switch",
    copy: "Compression, color, and a persistent label communicate consent through more than one visual cue.",
  },
  {
    index: "03",
    title: "Product navigation",
    source: "Drag Dock",
    copy: "The glass selector preserves spatial context as users move between wealth, payments, and risk.",
  },
  {
    index: "04",
    title: "Context focus",
    source: "Precision Lens",
    copy: "Local magnification highlights a decision surface while the surrounding financial context remains visible.",
  },
];

export default function OpenLiquidGlassPage() {
  const [mode, setMode] = useState<ProductMode>("wealth");
  const [risk, setRisk] = useState(38);
  const [autoRebalance, setAutoRebalance] = useState(true);
  const [motionReduced, setMotionReduced] = useState(false);
  const [actionState, setActionState] = useState<"idle" | "staged">("idle");

  const active = useMemo(
    () => PRODUCT_MODES.find((item) => item.id === mode) ?? PRODUCT_MODES[0],
    [mode],
  );

  const allocationLabel =
    risk < 30 ? "Conservative" : risk < 60 ? "Balanced" : "Aggressive";
  const riskPosition = ((risk - 5) / (90 - 5)) * 100;

  return (
    <main
      className={`olg-page page-view ${motionReduced ? "olg-reduced-motion" : ""}`}
      style={{ "--olg-accent": active.accent } as CSSProperties}
    >
      <section className="olg-hero">
        <div className="olg-hero-copy">
          <div className="olg-overline">
            <span>INTERACTION SYSTEM / 2026</span>
            <i />
            <span>DESIGN + ENGINEERING</span>
          </div>
          <h1>
            open<span>LiquidGlass</span>
          </h1>
          <p className="olg-hero-lede">
            A motion and optics system translated from component experiments
            into decision-safe interfaces for investing, banking, and treasury
            products.
          </p>
          <div className="olg-hero-actions">
            <a href="#applied-product">Try the product prototype</a>
            <a
              className="olg-secondary-link"
              href="https://github.com/Ancser/ancserAPX"
              target="_blank"
              rel="noreferrer"
            >
              View ancserAPX source ↗
            </a>
          </div>
          <dl className="olg-proof-strip">
            <div>
              <dt>ORIGIN</dt>
              <dd>Liquid Optics Component Lab</dd>
            </div>
            <div>
              <dt>APPLIED TO</dt>
              <dd>Wealth · payments · risk</dd>
            </div>
            <div>
              <dt>BUILT WITH</dt>
              <dd>React · CSS · interaction physics</dd>
            </div>
          </dl>
        </div>

        <div
          className="olg-hero-study"
          role="img"
          aria-label="Optical interaction study showing a refractive glass lens, motion orbits, and the principle that motion should explain state."
        >
          <div className="olg-study-grid" aria-hidden="true" />
          <div className="olg-orbit olg-orbit-one" aria-hidden="true" />
          <div className="olg-orbit olg-orbit-two" aria-hidden="true" />
          <div className="olg-lens">
            <span>REFRACTION</span>
            <strong>0.92×</strong>
            <small>SPRING 520 / 34</small>
          </div>
          <div className="olg-study-caption">
            <span>OPTICAL KERNEL</span>
            <strong>Motion should explain state.</strong>
          </div>
        </div>
      </section>

      <section className="olg-product-section" id="applied-product">
        <header className="olg-section-heading">
          <div>
            <span className="olg-section-index">01 / APPLIED PRODUCT</span>
            <h2>From component study to financial workflow</h2>
          </div>
          <p>
            Every effect has a job: orient the user, expose risk, or confirm an
            irreversible action.
          </p>
        </header>

        <div className="olg-product-frame">
          <nav className="olg-product-tabs" aria-label="Financial product mode">
            <span className="olg-product-brand">
              <i />
              OPEN / FINANCE
            </span>
            <div className="olg-segment">
              {PRODUCT_MODES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={mode === item.id ? "active" : ""}
                  aria-pressed={mode === item.id}
                  onClick={() => {
                    setMode(item.id);
                    setActionState("idle");
                  }}
                >
                  {item.label}
                </button>
              ))}
              <span
                className="olg-segment-glass"
                style={{
                  transform: `translateX(${PRODUCT_MODES.findIndex((item) => item.id === mode) * 100}%)`,
                }}
                aria-hidden="true"
              />
            </div>
            <span className="olg-avatar" aria-label="Deyu Huang">
              DH
            </span>
          </nav>

          <div className="olg-product-grid">
            <section className="olg-account-panel">
              <div className="olg-account-heading">
                <span>{active.eyebrow}</span>
                <span className="olg-account-more" aria-hidden="true">···</span>
              </div>
              <h3>{active.balance}</h3>
              <div className="olg-account-change">
                <strong>{active.change}</strong>
                <span>{active.detail}</span>
              </div>

              <div
                className="olg-chart"
                role="img"
                aria-label={`Twelve-period ${mode} account trend ending at ${active.balance}. ${active.title}`}
              >
                {CHART_POINTS.map((point, index) => (
                  <span
                    key={`${point}-${index}`}
                    style={{ height: `${point}%` }}
                    className={index === CHART_POINTS.length - 1 ? "current" : ""}
                  />
                ))}
                <div className="olg-chart-label">
                  <span>12 PERIOD VIEW</span>
                  <strong>{active.title}</strong>
                </div>
              </div>

              <div className="olg-account-metrics">
                <div>
                  <span>AVAILABLE</span>
                  <strong>{mode === "payments" ? "$118.4K" : "$26.2K"}</strong>
                </div>
                <div>
                  <span>STATUS</span>
                  <strong>{mode === "risk" ? "CONTROLLED" : "SYNCED"}</strong>
                </div>
                <div>
                  <span>UPDATED</span>
                  <strong>JUST NOW</strong>
                </div>
              </div>
            </section>

            <aside className="olg-control-panel">
              <div className="olg-control-heading">
                <span>DECISION CONTROL</span>
                <strong>{allocationLabel}</strong>
              </div>

              <label className="olg-risk-control">
                <span>
                  <strong>Risk allocation</strong>
                  <output>{risk}%</output>
                </span>
                <div className="olg-range-shell">
                  <input
                    type="range"
                    min="5"
                    max="90"
                    value={risk}
                    onChange={(event) => {
                      setRisk(Number(event.target.value));
                      setActionState("idle");
                    }}
                    aria-label="Risk allocation"
                  />
                  <i style={{ width: `${riskPosition}%` }} aria-hidden="true" />
                  <b style={{ left: `${riskPosition}%` }} aria-hidden="true" />
                </div>
                <small>
                  Preview the effect before any order or transfer is committed.
                </small>
              </label>

              <button
                className={`olg-toggle-row ${autoRebalance ? "on" : ""}`}
                type="button"
                role="switch"
                aria-checked={autoRebalance}
                onClick={() => {
                  setAutoRebalance((current) => !current);
                  setActionState("idle");
                }}
              >
                <span>
                  <strong>Auto rebalance</strong>
                  <small>Keep target weights within 5%</small>
                </span>
                <i>
                  <b />
                </i>
              </button>

              <div className="olg-impact-card">
                <span>ESTIMATED IMPACT</span>
                <div>
                  <strong>{risk > 60 ? "Elevated" : "Within plan"}</strong>
                  <em>{autoRebalance ? "Guardrail active" : "Manual review"}</em>
                </div>
                <p>
                  The interface separates preview, validation, and commitment
                  so visual delight never hides financial consequence.
                </p>
              </div>

              <button
                className={`olg-primary-action ${actionState === "staged" ? "is-staged" : ""}`}
                type="button"
                onClick={() =>
                  setActionState((current) =>
                    current === "idle" ? "staged" : "idle",
                  )
                }
              >
                <span>
                  {actionState === "staged"
                    ? "Preview staged — review details"
                    : "Preview allocation"}
                </span>
                <i>{actionState === "staged" ? "✓" : "→"}</i>
              </button>
              <p className="olg-live-status" aria-live="polite">
                {actionState === "staged"
                  ? "No transaction was submitted. This is a reversible prototype state."
                  : "Interactive prototype — no financial transaction is performed."}
              </p>
            </aside>
          </div>
        </div>
      </section>

      <section className="olg-pattern-section">
        <header className="olg-section-heading">
          <div>
            <span className="olg-section-index">02 / TRANSLATION MAP</span>
            <h2>Each optical experiment becomes a product pattern</h2>
          </div>
          <p>
            The gallery is the research environment. These patterns are the
            production-facing result.
          </p>
        </header>
        <div className="olg-pattern-grid">
          {APPLICATION_PATTERNS.map((pattern) => (
            <article key={pattern.index}>
              <span>{pattern.index}</span>
              <div>
                <small>{pattern.source}</small>
                <h3>{pattern.title}</h3>
                <p>{pattern.copy}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="olg-system-section">
        <div className="olg-system-copy">
          <span className="olg-section-index">03 / MOTION CONTRACT</span>
          <h2>Expressive, but bounded by trust.</h2>
          <p>
            Finance interfaces need clarity before spectacle. openLiquidGlass
            uses motion to reveal cause and effect, then yields to reduced
            motion, keyboard input, labels, and persistent state.
          </p>
          <button
            type="button"
            className={motionReduced ? "active" : ""}
            aria-pressed={motionReduced}
            onClick={() => setMotionReduced((current) => !current)}
          >
            <span>Reduced motion preview</span>
            <strong>{motionReduced ? "ON" : "OFF"}</strong>
          </button>
        </div>
        <div className="olg-system-spec">
          <div>
            <span>SPRING</span>
            <strong>520 / 34</strong>
            <small>stiffness / damping</small>
          </div>
          <div>
            <span>INPUT</span>
            <strong>Pointer + key</strong>
            <small>touch, mouse, keyboard</small>
          </div>
          <div>
            <span>FEEDBACK</span>
            <strong>3 layers</strong>
            <small>shape, color, text</small>
          </div>
          <div>
            <span>SAFETY</span>
            <strong>Preview first</strong>
            <small>reversible before commit</small>
          </div>
        </div>
      </section>

      <section className="olg-case-study">
        <div>
          <span>PROBLEM</span>
          <p>
            Component demos can look impressive while failing to prove product
            thinking.
          </p>
        </div>
        <div>
          <span>DECISION</span>
          <p>
            Apply the same optics and spring logic to workflows with real
            consequence: allocation, approval, and risk.
          </p>
        </div>
        <div>
          <span>RESULT</span>
          <p>
            A single portfolio artifact connecting UI research, UX rationale,
            accessibility, and production React implementation.
          </p>
        </div>
      </section>

      <footer className="olg-footer">
        <div>
          <span>OPENLIQUIDGLASS / DEYU HUANG</span>
          <strong>Designed for financial products. Built to explain decisions.</strong>
        </div>
        <div>
          <a
            href="https://github.com/Ancser/ancserAPX"
            target="_blank"
            rel="noreferrer"
          >
            ancserAPX ↗
          </a>
          <a
            href="https://github.com/Ancser/ancserTPX"
            target="_blank"
            rel="noreferrer"
          >
            ancserTPX ↗
          </a>
        </div>
      </footer>
    </main>
  );
}

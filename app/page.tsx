"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import OpenLiquidGlassPage from "./open-liquid-glass";

type PageId =
  | "market"
  | "heatmap"
  | "portfolio"
  | "application"
  | "open-liquid-glass";
type HeatMode = "skills" | "roles";
type DataStatus = "loading" | "live" | "fallback";

type HistoryPoint = {
  period: string;
  value: number;
  volume: number;
};

type MarketItem = {
  id: string;
  name: string;
  ticker: string;
  category: string;
  price: number;
  premium: number;
  exposure: number;
  grossExposure: number;
  jobs: number;
  employers: number;
  medianSalary: number;
  confidence: "B" | "C" | "WATCH";
  state: "priced" | "watch";
  history: HistoryPoint[];
  topRoles: string[];
  coSkills: string[];
};

type MarketSnapshot = {
  asOf: string;
  sourceUpdatedAt: string;
  jobsScanned: number;
  salariedJobs: number;
  matchedJobs: number;
  skills: MarketItem[];
  roles: MarketItem[];
};

type GreenhousePayRange = {
  min_cents?: number;
  max_cents?: number;
  currency_type?: string;
};

type GreenhouseJob = {
  id: number;
  internal_job_id?: number;
  title: string;
  content?: string;
  first_published?: string;
  updated_at?: string;
  absolute_url?: string;
  pay_input_ranges?: GreenhousePayRange[];
};

type GreenhouseResponse = {
  jobs?: GreenhouseJob[];
};

type NormalizedJob = {
  id: number;
  title: string;
  role: string;
  salary: number;
  minSalary: number;
  maxSalary: number;
  skills: string[];
  firstPublished: string;
  updatedAt: string;
};

type SkillDefinition = {
  id: string;
  name: string;
  ticker: string;
  category: string;
  patterns: RegExp[];
};

type ApplicationStatus = "DRAFT" | "READY" | "SENT";

type ApplicationExperience = {
  kind: "EXPERIENCE" | "PROJECT";
  title: string;
  meta: string;
  bullets: string[];
};

type ApplicationRecord = {
  id: string;
  company: string;
  companyMark: string;
  role: string;
  location: string;
  updatedAt: string;
  status: ApplicationStatus;
  match: number;
  channel: string;
  headline: string;
  summary: string;
  focus: string[];
  experiences: ApplicationExperience[];
  skillGroups: Array<{ label: string; value: string }>;
  experiments: Array<{
    name: string;
    problem: string;
    approach: string;
    evaluation: string;
    gap: string;
  }>;
  promoted: string;
  deferred: string;
  rationale: string;
};

const SOURCE_URL =
  "https://boards-api.greenhouse.io/v1/boards/figma/jobs?content=true&pay_transparency=true";

const SKILL_DEFINITIONS: SkillDefinition[] = [
  {
    id: "sql",
    name: "SQL",
    ticker: "SQL",
    category: "DATA",
    patterns: [/\bSQL\b/i],
  },
  {
    id: "llm",
    name: "LLM",
    ticker: "LLM",
    category: "AI",
    patterns: [/\bLLMs?\b/i, /large language models?/i],
  },
  {
    id: "python",
    name: "Python",
    ticker: "PY",
    category: "LANG",
    patterns: [/\bPython\b/i],
  },
  {
    id: "distributed-systems",
    name: "Distributed Systems",
    ticker: "DIST",
    category: "SYSTEMS",
    patterns: [/distributed systems?/i],
  },
  {
    id: "typescript",
    name: "TypeScript",
    ticker: "TS",
    category: "LANG",
    patterns: [/\bTypeScript\b/i],
  },
  {
    id: "machine-learning",
    name: "Machine Learning",
    ticker: "ML",
    category: "AI",
    patterns: [/machine learning/i, /\bML models?\b/i],
  },
  {
    id: "generative-ai",
    name: "Generative AI",
    ticker: "GENAI",
    category: "AI",
    patterns: [/generative AI/i, /\bGenAI\b/i],
  },
  {
    id: "aws",
    name: "AWS",
    ticker: "AWS",
    category: "CLOUD",
    patterns: [/\bAWS\b/i, /Amazon Web Services/i],
  },
  {
    id: "react",
    name: "React",
    ticker: "REACT",
    category: "WEB",
    patterns: [/\bReact(?:\.js|JS)?\b/i],
  },
  {
    id: "cpp",
    name: "C++",
    ticker: "CPP",
    category: "LANG",
    patterns: [/\bC\+\+\b/i],
  },
  {
    id: "ruby",
    name: "Ruby",
    ticker: "RUBY",
    category: "LANG",
    patterns: [/\bRuby\b/i],
  },
  {
    id: "prompt-engineering",
    name: "Prompt Engineering",
    ticker: "PROMPT",
    category: "AI",
    patterns: [
      /prompt engineering/i,
      /prompt engineers?/i,
      /prompt improvements?/i,
      /system prompts?/i,
    ],
  },
  {
    id: "javascript",
    name: "JavaScript",
    ticker: "JS",
    category: "LANG",
    patterns: [/\bJavaScript\b/i],
  },
  {
    id: "pytorch",
    name: "PyTorch",
    ticker: "TORCH",
    category: "AI",
    patterns: [/\bPyTorch\b/i],
  },
  {
    id: "tensorflow",
    name: "TensorFlow",
    ticker: "TF",
    category: "AI",
    patterns: [/\bTensorFlow\b/i],
  },
  {
    id: "jax",
    name: "JAX",
    ticker: "JAX",
    category: "AI",
    patterns: [/\bJAX\b/],
  },
  {
    id: "reinforcement-learning",
    name: "Reinforcement Learning",
    ticker: "RL",
    category: "AI",
    patterns: [/reinforcement learning/i, /\bRLHF\b/i, /\bDPO\b/, /\bPPO\b/],
  },
  {
    id: "java",
    name: "Java",
    ticker: "JAVA",
    category: "LANG",
    patterns: [/\bJava\b(?!Script)/i],
  },
  {
    id: "hugging-face",
    name: "Hugging Face",
    ticker: "HF",
    category: "AI",
    patterns: [/Hugging\s*Face/i, /\bHuggingFace\b/i],
  },
];

const FALLBACK_ROWS = [
  ["SQL", 13, 244000, 1708550, 2918000],
  ["LLM", 12, 251000, 1705295, 3044000],
  ["Python", 17, 264500, 1176295, 4123500],
  ["Distributed Systems", 9, 264500, 980617, 2527000],
  ["TypeScript", 11, 264500, 826583, 2858500],
  ["Machine Learning", 7, 264500, 571879, 1793000],
  ["Generative AI", 5, 264500, 559679, 1322000],
  ["AWS", 6, 264500, 505117, 1576000],
  ["React", 6, 264500, 416900, 1559500],
  ["C++", 7, 264500, 410829, 1794000],
  ["Ruby", 6, 264500, 354717, 1545500],
  ["Prompt Engineering", 3, 251000, 123745, 713500],
  ["JavaScript", 2, 231250, 102400, 462500],
  ["PyTorch", 2, 264500, 68129, 529000],
  ["TensorFlow", 1, 264500, 44083, 264500],
  ["JAX", 1, 264500, 24045, 264500],
  ["Reinforcement Learning", 1, 264500, 24045, 264500],
  ["Java", 1, 264500, 24045, 264500],
  ["Hugging Face", 1, 264500, 24045, 264500],
] as const;

const FALLBACK_SKILLS: MarketItem[] = FALLBACK_ROWS.map(
  ([name, jobs, salary, exposure, grossExposure]) => {
    const definition =
      SKILL_DEFINITIONS.find((item) => item.name === name) ??
      SKILL_DEFINITIONS[0];
    const price = (salary / 244000) * 100;
    return {
      id: definition.id,
      name,
      ticker: definition.ticker,
      category: definition.category,
      price,
      premium: price - 100,
      exposure,
      grossExposure,
      jobs,
      employers: 1,
      medianSalary: salary,
      confidence: jobs >= 10 ? "B" : jobs >= 3 ? "C" : "WATCH",
      state: jobs >= 3 ? "priced" : "watch",
      history: [],
      topRoles: [],
      coSkills: [],
    };
  },
);

const FALLBACK_SNAPSHOT: MarketSnapshot = {
  asOf: "2026-07-17",
  sourceUpdatedAt: "2026-07-17T17:22:27.000Z",
  jobsScanned: 169,
  salariedJobs: 110,
  matchedJobs: 45,
  skills: FALLBACK_SKILLS,
  roles: [],
};

const PAGE_LABELS: Array<{ id: PageId; label: string }> = [
  { id: "market", label: "Market" },
  { id: "heatmap", label: "Heat Map" },
  { id: "portfolio", label: "Portfolio" },
  { id: "application", label: "Application" },
  { id: "open-liquid-glass", label: "openLiquidGlass" },
];

const APPLICATIONS: ApplicationRecord[] = [
  {
    id: "tiktok-product-design",
    company: "TikTok",
    companyMark: "TT",
    role: "Product Designer Graduate",
    location: "San Jose, CA",
    updatedAt: "JUL 28, 2026",
    status: "DRAFT",
    match: 82,
    channel: "DIRECT",
    headline: "Interaction-focused designer who prototypes the behavior behind clear, responsive products",
    summary:
      "UC Davis computer science graduate combining interaction design, real-time graphics, and production-minded front-end implementation. Builds motion systems that clarify hierarchy, state, and feedback instead of treating animation as decoration.",
    focus: ["INTERACTION DESIGN", "MOTION", "PROTOTYPING", "ACCESSIBILITY"],
    experiences: [
      {
        kind: "PROJECT",
        title: "openLiquidGlass - Interactive Product System",
        meta: "React, TypeScript, CSS | 2026",
        bullets: [
          "Translated liquid-glass motion studies into an interactive product system with purposeful focus, navigation, control, and state-transition patterns.",
          "Built reduced-motion behavior, redundant state cues, keyboard-friendly controls, and responsive layouts into the prototype.",
        ],
      },
      {
        kind: "PROJECT",
        title: "Sakura Train Particle System",
        meta: "GLSL, DirectX | 2025",
        bullets: [
          "Designed a real-time falling-sakura scene and tuned randomized velocity, drift, rotation, and physics parameters to create organic, non-repeating motion.",
        ],
      },
      {
        kind: "PROJECT",
        title: "Farm Frenzy - 3-Day Game Jam",
        meta: "Unity3D, C# | 2024",
        bullets: [
          "Designed and delivered a playable 3D farm simulation with crop, inventory, store, movement, and time-based feedback loops in three days.",
        ],
      },
    ],
    skillGroups: [
      { label: "DESIGN", value: "Interaction states, motion systems, visual hierarchy, responsive UI" },
      { label: "BUILD", value: "React, TypeScript, JavaScript, HTML/CSS, Git" },
      { label: "MOTION", value: "GLSL, DirectX/HLSL, Unity3D, particle systems" },
    ],
    experiments: [
      {
        name: "Interaction translation",
        problem: "Turn an expressive component gallery into a coherent product experience.",
        approach: "Map each motion behavior to navigation, focus, consent, or feedback.",
        evaluation: "The result is a working multi-state prototype, not a static visual study.",
        gap: "Formal user-testing results are not yet available.",
      },
      {
        name: "Motion comfort",
        problem: "Preserve hierarchy for users who reduce or avoid motion.",
        approach: "Provide a visible reduced-motion control and remove nonessential transitions.",
        evaluation: "Every primary state remains legible without animated movement.",
        gap: "The prototype still needs external accessibility testing.",
      },
    ],
    promoted: "openLiquidGlass, Sakura Train, Farm Frenzy and interaction-system decisions",
    deferred: "Trading-model details stay in the fact bank but do not lead a general product-design application.",
    rationale:
      "This version leads with observable design behavior and implementation evidence. It does not claim formal UX research, shipped consumer scale, or Figma expertise that has not yet been documented.",
  },
  {
    id: "midpoint-quant-developer",
    company: "Midpoint Markets",
    companyMark: "MM",
    role: "Quantitative Developer",
    location: "San Francisco, CA",
    updatedAt: "JUL 28, 2026",
    status: "DRAFT",
    match: 88,
    channel: "CAMPUS",
    headline: "Systems-minded engineer building live trading, research, and risk-control infrastructure",
    summary:
      "Computer science and statistics graduate with hands-on experience shipping automated trading systems, comparing strategy variants, and translating research logic into controlled execution software.",
    focus: ["PYTHON", "C++", "BACKTESTING", "RISK CONTROLS"],
    experiences: [
      {
        kind: "PROJECT",
        title: "ancserTPX - Live Algorithmic Futures Trading Platform",
        meta: "Python | 2026 - Present",
        bullets: [
          "Architected and deployed a futures execution engine with shadow, paper, and live modes, structured stop-loss controls, and scaled take-profit handling.",
          "Built a backtesting engine and monitoring dashboard using Calmar ratio, maximum drawdown, and risk-reward ratio to compare strategy behavior before deployment.",
        ],
      },
      {
        kind: "PROJECT",
        title: "ancserAPX - Factor-Based Equity Trading Platform",
        meta: "Python | 2025 - Present",
        bullets: [
          "Built an automated platform spanning a 10-equity portfolio with an ML factor-research pipeline and SVD-based signal extraction.",
          "Produced version-controlled backtest visualizations and a web dashboard for comparing strategy variants and tracking results.",
        ],
      },
      {
        kind: "PROJECT",
        title: "Legislative Bill Passage Classifier",
        meta: "Machine Learning Coursework",
        bullets: [
          "Implemented a decision-tree classifier in Google Colab to predict legislative bill-passage outcomes.",
        ],
      },
    ],
    skillGroups: [
      { label: "CORE", value: "Python, C++, Java, SQL, data structures, algorithms" },
      { label: "RESEARCH", value: "SVD factor models, decision trees, pandas, NumPy" },
      { label: "CONTROL", value: "Backtesting, Calmar ratio, drawdown, paper/live modes" },
    ],
    experiments: [
      {
        name: "Strategy validation",
        problem: "Compare strategy variants before live execution.",
        approach: "Backtest with Calmar ratio, maximum drawdown, and risk-reward ratio.",
        evaluation: "Results are visualized in a monitoring dashboard.",
        gap: "Return, test period, and benchmark values are not stated.",
      },
      {
        name: "Factor research",
        problem: "Extract signals for an automated equity portfolio.",
        approach: "Use SVD-based factor extraction across 10 equities.",
        evaluation: "Strategy variants are compared through versioned backtests.",
        gap: "No alpha or Sharpe-ratio claim is added.",
      },
    ],
    promoted: "ancserTPX, ancserAPX, statistics minor and systems coursework",
    deferred: "LLM tooling stays visible as an engineering method, but no longer leads the narrative.",
    rationale:
      "This version foregrounds execution modes, research validation, risk controls, and systems fundamentals. Every metric comes from the master resume; no simulated returns or latency claims are added.",
  },
  {
    id: "onepay-design-engineer",
    company: "OnePay",
    companyMark: "OP",
    role: "Design Engineer",
    location: "Remote, United States",
    updatedAt: "JUL 28, 2026",
    status: "DRAFT",
    match: 90,
    channel: "DIRECT",
    headline: "Design engineer turning expressive interaction physics into calm, trustworthy financial controls",
    summary:
      "UC Davis computer science graduate combining financial-system development, interaction design, and real-time motion. Built openLiquidGlass to demonstrate how tactile visual behavior can support comprehension, consent, and safety in wealth, payments, and risk workflows.",
    focus: ["DESIGN ENGINEERING", "FINTECH UX", "REACT", "MOTION SYSTEMS"],
    experiences: [
      {
        kind: "PROJECT",
        title: "openLiquidGlass - Financial Interaction Case Study",
        meta: "React, TypeScript, CSS | 2026",
        bullets: [
          "Applied four liquid-glass component behaviors to real financial patterns: risk allocation, approval state, product navigation, and contextual focus.",
          "Separated staged previews from committed actions and added reduced-motion behavior, redundant state cues, and responsive layouts.",
        ],
      },
      {
        kind: "PROJECT",
        title: "ancserTPX - Live Algorithmic Futures Trading Platform",
        meta: "Python, Web UI | 2026 - Present",
        bullets: [
          "Built a monitoring dashboard for a system with shadow, paper, and live modes so traders can compare risk and strategy behavior before execution.",
        ],
      },
      {
        kind: "PROJECT",
        title: "Sakura Train Particle System",
        meta: "GLSL, DirectX | 2025",
        bullets: [
          "Tuned randomized velocity, drift, rotation, and physics parameters to produce organic, non-repeating real-time motion.",
        ],
      },
    ],
    skillGroups: [
      { label: "PRODUCT", value: "Financial controls, interaction states, responsive UI, accessibility" },
      { label: "FRONTEND", value: "React, TypeScript, JavaScript, HTML/CSS, Git" },
      { label: "MOTION", value: "GLSL, DirectX/HLSL, Unity3D, particle systems" },
    ],
    experiments: [
      {
        name: "Safe financial motion",
        problem: "Use rich motion without making high-impact actions feel ambiguous.",
        approach: "Reserve elasticity for exploration and use explicit copy plus stable states around commitment.",
        evaluation: "The allocation control produces a preview and clearly states that no transaction occurs.",
        gap: "External usability-test evidence is still needed.",
      },
      {
        name: "Component-to-product mapping",
        problem: "Avoid a portfolio that is only a collection of visual effects.",
        approach: "Explain the source behavior, the financial use case, and the interaction contract together.",
        evaluation: "Four experiments are connected to three working financial product modes.",
        gap: "Performance and Core Web Vitals have not yet been published.",
      },
    ],
    promoted: "openLiquidGlass, ancserTPX dashboard, motion engineering and accessibility decisions",
    deferred: "Deep factor-model details remain available for engineering interviews but do not lead the design-engineering story.",
    rationale:
      "This version connects the candidate's strongest domains—finance, interactive systems, and graphics—through a working product case study while being explicit about the user-research and performance evidence still missing.",
  },
  {
    id: "stripe-financial-app",
    company: "Stripe",
    companyMark: "ST",
    role: "Full-Stack Engineer, Dashboard Foundation",
    location: "San Francisco, CA",
    updatedAt: "JUL 28, 2026",
    status: "DRAFT",
    match: 86,
    channel: "DIRECT",
    headline: "Product engineer building observable financial workflows from data layer to decision surface",
    summary:
      "Computer science and statistics graduate with hands-on experience building automated trading systems, research dashboards, and operational workflows. Comfortable connecting backend state, quantitative evaluation, and user-facing controls.",
    focus: ["FULL-STACK PRODUCT", "FINANCIAL SYSTEMS", "PYTHON", "WEB UI"],
    experiences: [
      {
        kind: "PROJECT",
        title: "ancserTPX - Live Algorithmic Futures Trading Platform",
        meta: "Python | 2026 - Present",
        bullets: [
          "Built a futures execution system with shadow, paper, and live modes, structured stop-loss controls, scaled take-profit handling, and a monitoring dashboard.",
          "Supported deployment and debugging across multiple trader environments while maintaining version-controlled implementation history.",
        ],
      },
      {
        kind: "PROJECT",
        title: "ancserAPX - Factor-Based Equity Trading Platform",
        meta: "Python, Web UI | 2025 - Present",
        bullets: [
          "Built a 10-equity research pipeline with SVD-based factor extraction and a web dashboard for comparing versioned backtest results.",
        ],
      },
      {
        kind: "EXPERIENCE",
        title: "Workflow Automation - Double Jo Massage",
        meta: "Google Apps Script | 2024",
        bullets: [
          "Replaced manual bookkeeping and payroll entry with an end-to-end spreadsheet workflow for non-technical managers and staff.",
        ],
      },
    ],
    skillGroups: [
      { label: "BACKEND", value: "Python, SQL, Java, data structures, automation" },
      { label: "FRONTEND", value: "React, TypeScript, JavaScript, HTML/CSS" },
      { label: "QUALITY", value: "Git, backtesting, staged execution, monitoring" },
    ],
    experiments: [
      {
        name: "Staged execution",
        problem: "Validate behavior before a financial system reaches live execution.",
        approach: "Separate shadow, paper, and live operating modes and monitor each transition.",
        evaluation: "The platform supports deployment without treating every test as a real trade.",
        gap: "Uptime, latency, and transaction-volume metrics are not documented.",
      },
      {
        name: "Dashboard comparison",
        problem: "Make strategy differences visible before selection.",
        approach: "Version backtests and expose risk and performance measures in a web dashboard.",
        evaluation: "Variants can be reviewed through a consistent comparison surface.",
        gap: "No external customer-adoption metric is claimed.",
      },
    ],
    promoted: "ancserTPX, ancserAPX and operational workflow automation",
    deferred: "Graphics projects remain as supporting interaction evidence but do not lead a full-stack finance application.",
    rationale:
      "This version emphasizes financial state, controlled execution, dashboard delivery, and support across real environments. It avoids unsupported scale, latency, and revenue claims.",
  },
  {
    id: "upstart-bank-platform",
    company: "Upstart",
    companyMark: "UP",
    role: "Software Engineer I, Upstart Bank",
    location: "Remote, United States",
    updatedAt: "JUL 28, 2026",
    status: "DRAFT",
    match: 79,
    channel: "DIRECT",
    headline: "Careful software engineer designing traceable workflows for money, records, and operational decisions",
    summary:
      "UC Davis computer science graduate with a statistics minor and experience automating bookkeeping, maintaining inventory systems, and building financial software with explicit staged modes and risk controls.",
    focus: ["PLATFORM ENGINEERING", "DATA INTEGRITY", "RISK CONTROLS", "OPERATIONS"],
    experiences: [
      {
        kind: "PROJECT",
        title: "ancserTPX - Controlled Trading Execution",
        meta: "Python | 2026 - Present",
        bullets: [
          "Implemented separate shadow, paper, and live modes with structured stop-loss and scaled take-profit controls.",
          "Built backtest and monitoring views around Calmar ratio, maximum drawdown, and risk-reward ratio.",
        ],
      },
      {
        kind: "EXPERIENCE",
        title: "Workflow Automation - Double Jo Massage",
        meta: "Google Apps Script | 2024",
        bullets: [
          "Automated bookkeeping and payroll-entry workflows while keeping the interface usable for non-technical staff.",
        ],
      },
      {
        kind: "EXPERIENCE",
        title: "Systems and Inventory Support - Acme Express",
        meta: "2023",
        bullets: [
          "Supported operational systems and inventory records in a business environment where accurate state and handoffs mattered.",
        ],
      },
    ],
    skillGroups: [
      { label: "ENGINEERING", value: "Python, Java, C++, SQL, algorithms, Git" },
      { label: "DATA", value: "pandas, NumPy, scikit-learn, statistical analysis" },
      { label: "OPERATIONS", value: "Workflow automation, inventory records, user support" },
    ],
    experiments: [
      {
        name: "Risk-gated modes",
        problem: "Prevent untested strategy changes from moving directly into live operation.",
        approach: "Make shadow and paper execution explicit stages before live use.",
        evaluation: "The system exposes operating mode and risk behavior for review.",
        gap: "This is trading-platform evidence, not prior banking employment.",
      },
      {
        name: "Human-readable automation",
        problem: "Reduce repetitive financial entry without hiding the workflow from staff.",
        approach: "Keep the process inside a familiar spreadsheet interface and automate repetitive steps.",
        evaluation: "Managers and staff can operate the resulting workflow without a custom technical console.",
        gap: "Time-saved and error-rate measurements were not recorded.",
      },
    ],
    promoted: "Risk controls, bookkeeping automation, inventory systems and quantitative coursework",
    deferred: "Advanced visual motion is available in the portfolio but stays secondary to integrity and operational reliability.",
    rationale:
      "This version makes the banking transfer explicit: careful state transitions, record accuracy, and operational usability. It does not imply prior bank employment or regulated-production experience.",
  },
];

const DEFAULT_PORTFOLIO_IDS = ["python", "sql", "typescript"];
const DEFAULT_PROFICIENCY = {
  python: 78,
  sql: 70,
  typescript: 52,
};

function readStoredPortfolio() {
  if (typeof window === "undefined") {
    return {
      ids: DEFAULT_PORTFOLIO_IDS,
      proficiency: DEFAULT_PROFICIENCY,
    };
  }
  try {
    const saved = window.localStorage.getItem("jobsdaq-portfolio");
    if (!saved) throw new Error("No saved portfolio");
    const parsed = JSON.parse(saved) as {
      ids?: string[];
      proficiency?: Record<string, number>;
    };
    return {
      ids: Array.isArray(parsed.ids) ? parsed.ids : DEFAULT_PORTFOLIO_IDS,
      proficiency: parsed.proficiency ?? DEFAULT_PROFICIENCY,
    };
  } catch {
    return {
      ids: DEFAULT_PORTFOLIO_IDS,
      proficiency: DEFAULT_PROFICIENCY,
    };
  }
}

function readStoredApplicationId() {
  if (typeof window === "undefined") return APPLICATIONS[0].id;
  try {
    const saved = window.localStorage.getItem("jobsdaq-selected-application");
    return saved && APPLICATIONS.some((item) => item.id === saved)
      ? saved
      : APPLICATIONS[0].id;
  } catch {
    return APPLICATIONS[0].id;
  }
}

const compactMoney = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function confidenceFor(count: number): MarketItem["confidence"] {
  if (count >= 10) return "B";
  if (count >= 3) return "C";
  return "WATCH";
}

function roleFamily(title: string) {
  const value = title.toLowerCase();
  if (
    /machine learning|applied scientist|\bai\b|research scientist|prompt/.test(
      value,
    )
  )
    return "AI / ML";
  if (/data scientist|data analyst|analytics|data engineer/.test(value))
    return "Data";
  if (/security|trust|privacy|fraud/.test(value)) return "Security";
  if (/designer|design|researcher/.test(value)) return "Design / Research";
  if (/product manager|product lead/.test(value)) return "Product";
  if (/sales|account executive|marketing|growth|customer/.test(value))
    return "GTM";
  if (/engineer|developer|infrastructure|platform/.test(value))
    return "Software";
  if (/people|recruit|legal|finance|operations|workplace/.test(value))
    return "Operations";
  return "Other";
}

function plainTextFromHtml(value: string) {
  let decoded = value;
  for (let pass = 0; pass < 2; pass += 1) {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = decoded;
    decoded = textarea.value;
  }
  const parsed = new DOMParser().parseFromString(decoded, "text/html");
  return parsed.body.textContent ?? "";
}

function salaryFromJob(job: GreenhouseJob) {
  const ranges = (job.pay_input_ranges ?? []).filter(
    (range) =>
      range.currency_type === "USD" &&
      typeof range.min_cents === "number" &&
      typeof range.max_cents === "number" &&
      range.min_cents > 0 &&
      range.max_cents >= range.min_cents,
  );
  if (!ranges.length) return null;
  const minSalary = median(ranges.map((range) => (range.min_cents ?? 0) / 100));
  const maxSalary = median(ranges.map((range) => (range.max_cents ?? 0) / 100));
  return {
    minSalary,
    maxSalary,
    salary: (minSalary + maxSalary) / 2,
  };
}

function periodLabel(value: string) {
  if (!value) return "UNKNOWN";
  return value.slice(0, 7);
}

function topCounts(values: string[], limit = 3) {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([value]) => value);
}

function buildHistory(
  jobs: NormalizedJob[],
  roleMedians: Map<string, number>,
): HistoryPoint[] {
  const byPeriod = new Map<string, number[]>();
  jobs.forEach((job) => {
    const baseline = roleMedians.get(job.role) || job.salary;
    const normalized = (job.salary / baseline) * 100;
    const period = periodLabel(job.firstPublished);
    const bucket = byPeriod.get(period) ?? [];
    bucket.push(normalized);
    byPeriod.set(period, bucket);
  });
  return [...byPeriod.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, values]) => ({
      period,
      value: median(values),
      volume: values.length,
    }));
}

function buildLiveSnapshot(response: GreenhouseResponse): MarketSnapshot {
  const incoming = response.jobs ?? [];
  const deduped = new Map<number, GreenhouseJob>();
  incoming.forEach((job) => {
    const identity = job.internal_job_id ?? job.id;
    if (!deduped.has(identity)) deduped.set(identity, job);
  });

  const normalized: NormalizedJob[] = [...deduped.values()]
    .map((job) => {
      const pay = salaryFromJob(job);
      if (!pay) return null;
      const text = `${job.title} ${plainTextFromHtml(job.content ?? "")}`;
      const skills = SKILL_DEFINITIONS.filter((definition) =>
        definition.patterns.some((pattern) => pattern.test(text)),
      ).map((definition) => definition.name);
      return {
        id: job.id,
        title: job.title,
        role: roleFamily(job.title),
        ...pay,
        skills,
        firstPublished: job.first_published ?? "",
        updatedAt: job.updated_at ?? "",
      };
    })
    .filter((job): job is NormalizedJob => Boolean(job));

  const roleBuckets = new Map<string, number[]>();
  normalized.forEach((job) => {
    const bucket = roleBuckets.get(job.role) ?? [];
    bucket.push(job.salary);
    roleBuckets.set(job.role, bucket);
  });
  const roleMedians = new Map(
    [...roleBuckets.entries()].map(([role, salaries]) => [
      role,
      median(salaries),
    ]),
  );
  const overallMedian = median(normalized.map((job) => job.salary));

  const skills = SKILL_DEFINITIONS.map((definition) => {
    const matching = normalized.filter((job) =>
      job.skills.includes(definition.name),
    );
    if (!matching.length) return null;
    const normalizedPrices = matching.map((job) => {
      const baseline = roleMedians.get(job.role) || job.salary;
      return (job.salary / baseline) * 100;
    });
    const price = median(normalizedPrices);
    const exposure = matching.reduce(
      (total, job) =>
        total + job.salary / Math.max(1, job.skills.length),
      0,
    );
    const grossExposure = matching.reduce(
      (total, job) => total + job.salary,
      0,
    );
    const coSkills = topCounts(
      matching.flatMap((job) =>
        job.skills.filter((skill) => skill !== definition.name),
      ),
      4,
    );
    return {
      id: definition.id,
      name: definition.name,
      ticker: definition.ticker,
      category: definition.category,
      price,
      premium: price - 100,
      exposure,
      grossExposure,
      jobs: matching.length,
      employers: 1,
      medianSalary: median(matching.map((job) => job.salary)),
      confidence: confidenceFor(matching.length),
      state: matching.length >= 3 ? "priced" : "watch",
      history: buildHistory(matching, roleMedians),
      topRoles: topCounts(matching.map((job) => job.title), 3),
      coSkills,
    } satisfies MarketItem;
  })
    .filter((item): item is MarketItem => Boolean(item))
    .sort((a, b) => b.exposure - a.exposure);

  const roles = [...roleBuckets.keys()]
    .map((role) => {
      const matching = normalized.filter((job) => job.role === role);
      const roleMedian = median(matching.map((job) => job.salary));
      const price = overallMedian ? (roleMedian / overallMedian) * 100 : 100;
      return {
        id: `role-${role.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        name: role,
        ticker: role
          .split(/\s|\//)
          .filter(Boolean)
          .map((part) => part[0])
          .join("")
          .slice(0, 5)
          .toUpperCase(),
        category: "ROLE",
        price,
        premium: price - 100,
        exposure: matching.reduce((total, job) => total + job.salary, 0),
        grossExposure: matching.reduce(
          (total, job) => total + job.salary,
          0,
        ),
        jobs: matching.length,
        employers: 1,
        medianSalary: roleMedian,
        confidence: confidenceFor(matching.length),
        state: matching.length >= 3 ? "priced" : "watch",
        history: buildHistory(matching, roleMedians),
        topRoles: topCounts(matching.map((job) => job.title), 3),
        coSkills: topCounts(matching.flatMap((job) => job.skills), 4),
      } satisfies MarketItem;
    })
    .sort((a, b) => b.exposure - a.exposure);

  const sourceUpdatedAt = [...deduped.values()]
    .map((job) => job.updated_at ?? "")
    .sort()
    .at(-1);

  return {
    asOf: new Date().toISOString().slice(0, 10),
    sourceUpdatedAt: sourceUpdatedAt ?? new Date().toISOString(),
    jobsScanned: incoming.length,
    salariedJobs: normalized.length,
    matchedJobs: normalized.filter((job) => job.skills.length > 0).length,
    skills,
    roles,
  };
}

function formatPeriod(period: string) {
  const [year, month] = period.split("-");
  if (!year || !month) return period;
  return `${year.slice(2)}.${month}`;
}

function ValueChart({ item }: { item: MarketItem }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const frame = frameRef.current;
    if (!canvas || !frame) return;

    const draw = () => {
      const width = Math.max(320, frame.clientWidth);
      const height = Math.max(260, frame.clientHeight);
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.scale(dpr, dpr);
      context.clearRect(0, 0, width, height);

      const left = 54;
      const right = 24;
      const top = 30;
      const bottom = 46;
      const chartWidth = width - left - right;
      const chartHeight = height - top - bottom;

      context.strokeStyle = "rgba(100,220,255,.07)";
      context.lineWidth = 1;
      context.font =
        "10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
      context.fillStyle = "#556178";
      for (let row = 0; row <= 4; row += 1) {
        const y = top + (chartHeight * row) / 4;
        context.beginPath();
        context.moveTo(left, y);
        context.lineTo(width - right, y);
        context.stroke();
      }
      for (let column = 0; column <= 6; column += 1) {
        const x = left + (chartWidth * column) / 6;
        context.beginPath();
        context.moveTo(x, top);
        context.lineTo(x, height - bottom);
        context.stroke();
      }

      const points = item.history;
      if (!points.length) {
        context.fillStyle = "#556178";
        context.font =
          "12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
        context.fillText(
          "FETCHING ACTIVE-POSTING COHORTS FROM GREENHOUSE…",
          left + 18,
          top + chartHeight / 2,
        );
        return;
      }

      const values = points.map((point) => point.value);
      const minValue = Math.min(...values, 96);
      const maxValue = Math.max(...values, 104);
      const padding = Math.max(2, (maxValue - minValue) * 0.2);
      const min = minValue - padding;
      const max = maxValue + padding;
      const xFor = (index: number) =>
        left +
        (points.length === 1
          ? chartWidth / 2
          : (chartWidth * index) / (points.length - 1));
      const yFor = (value: number) =>
        top + chartHeight - ((value - min) / (max - min)) * chartHeight;

      const maxVolume = Math.max(...points.map((point) => point.volume), 1);
      points.forEach((point, index) => {
        const barWidth = Math.max(
          5,
          Math.min(20, chartWidth / Math.max(points.length, 1) - 7),
        );
        const barHeight = (point.volume / maxVolume) * 38;
        context.fillStyle = "rgba(100,220,255,.12)";
        context.fillRect(
          xFor(index) - barWidth / 2,
          height - bottom - barHeight,
          barWidth,
          barHeight,
        );
      });

      const positive = item.premium >= 0;
      const lineColor = positive ? "#00e5a0" : "#ff4060";
      const gradient = context.createLinearGradient(0, top, 0, height - bottom);
      gradient.addColorStop(
        0,
        positive ? "rgba(0,229,160,.24)" : "rgba(255,64,96,.24)",
      );
      gradient.addColorStop(1, "rgba(8,9,13,0)");

      context.beginPath();
      points.forEach((point, index) => {
        const x = xFor(index);
        const y = yFor(point.value);
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.lineTo(xFor(points.length - 1), height - bottom);
      context.lineTo(xFor(0), height - bottom);
      context.closePath();
      context.fillStyle = gradient;
      context.fill();

      context.beginPath();
      points.forEach((point, index) => {
        const x = xFor(index);
        const y = yFor(point.value);
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.strokeStyle = lineColor;
      context.lineWidth = 2;
      context.stroke();

      points.forEach((point, index) => {
        const x = xFor(index);
        const y = yFor(point.value);
        context.fillStyle = "#08090d";
        context.strokeStyle = lineColor;
        context.lineWidth = 2;
        context.beginPath();
        context.arc(x, y, 3.5, 0, Math.PI * 2);
        context.fill();
        context.stroke();
        if (
          points.length <= 7 ||
          index === 0 ||
          index === points.length - 1 ||
          index % 2 === 0
        ) {
          context.fillStyle = "#556178";
          context.textAlign = "center";
          context.fillText(formatPeriod(point.period), x, height - 18);
        }
      });

      context.textAlign = "right";
      context.fillStyle = "#556178";
      for (let row = 0; row <= 4; row += 1) {
        const value = max - ((max - min) * row) / 4;
        const y = top + (chartHeight * row) / 4;
        context.fillText(value.toFixed(0), left - 10, y + 3);
      }
      context.textAlign = "left";
    };

    draw();
    const handleResize = () => window.requestAnimationFrame(draw);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [item]);

  return (
    <div className="value-chart" ref={frameRef}>
      <div className="chart-watermark">{item.ticker} / COHORT</div>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`${item.name} active posting cohort salary index`}
      />
      <div className="chart-live-label">
        <span className="status-dot ok" />
        ACTIVE POSTING COHORTS
      </div>
    </div>
  );
}

type TreemapRect = {
  item: MarketItem;
  x: number;
  y: number;
  width: number;
  height: number;
};

function binaryTreemap(
  items: MarketItem[],
  x: number,
  y: number,
  width: number,
  height: number,
): TreemapRect[] {
  if (!items.length) return [];
  if (items.length === 1) return [{ item: items[0], x, y, width, height }];
  const total = items.reduce((sum, item) => sum + item.exposure, 0);
  let running = 0;
  let split = 1;
  let smallestGap = Number.POSITIVE_INFINITY;
  for (let index = 1; index < items.length; index += 1) {
    running += items[index - 1].exposure;
    const gap = Math.abs(total / 2 - running);
    if (gap < smallestGap) {
      smallestGap = gap;
      split = index;
    }
  }
  const first = items.slice(0, split);
  const second = items.slice(split);
  const firstTotal = first.reduce((sum, item) => sum + item.exposure, 0);
  const ratio = total ? firstTotal / total : 0.5;
  if (width >= height) {
    const firstWidth = width * ratio;
    return [
      ...binaryTreemap(first, x, y, firstWidth, height),
      ...binaryTreemap(second, x + firstWidth, y, width - firstWidth, height),
    ];
  }
  const firstHeight = height * ratio;
  return [
    ...binaryTreemap(first, x, y, width, firstHeight),
    ...binaryTreemap(second, x, y + firstHeight, width, height - firstHeight),
  ];
}

function Treemap({
  items,
  onSelect,
}: {
  items: MarketItem[];
  onSelect?: (item: MarketItem) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const update = () => {
      const next = {
        width: container.clientWidth,
        height: container.clientHeight,
      };
      setSize((current) =>
        current.width === next.width && current.height === next.height
          ? current
          : next,
      );
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const rectangles = useMemo(
    () =>
      binaryTreemap(
        [...items].sort((a, b) => b.exposure - a.exposure),
        0,
        0,
        size.width,
        size.height,
      ),
    [items, size],
  );

  return (
    <div className="treemap" ref={containerRef}>
      {rectangles.map(({ item, x, y, width, height }) => {
        const positive = item.premium >= 0;
        const intensity = Math.min(0.54, 0.16 + Math.abs(item.premium) / 55);
        const background = positive
          ? `rgba(0, 229, 160, ${intensity})`
          : `rgba(255, 64, 96, ${intensity})`;
        const compact = width < 130 || height < 80;
        const tiny = width < 80 || height < 52;
        return (
          <button
            className={`treemap-tile ${item.state === "watch" ? "is-watch" : ""}`}
            key={item.id}
            style={{
              left: x + 2,
              top: y + 2,
              width: Math.max(0, width - 4),
              height: Math.max(0, height - 4),
              background,
            }}
            onClick={() => onSelect?.(item)}
            title={`${item.name}: ${compactMoney.format(item.exposure)} allocated wage exposure, ${item.jobs} postings`}
          >
            <span className="tile-name">{item.name}</span>
            {!tiny && (
              <span className="tile-price">
                {item.price.toFixed(1)}
                <span className={positive ? "positive" : "negative"}>
                  {positive ? "+" : ""}
                  {item.premium.toFixed(1)}%
                </span>
              </span>
            )}
            {!compact && (
              <span className="tile-meta">
                {compactMoney.format(item.exposure)} · {item.jobs} POSTS ·{" "}
                {item.confidence}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "positive" | "negative" | "neutral";
}) {
  return (
    <div className={`metric-card ${tone}`}>
      <span className="metric-label">{label}</span>
      <span className="metric-value">{value}</span>
      <span className="metric-detail">{detail}</span>
    </div>
  );
}

function ApplicationPage({
  selectedId,
  onSelect,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const application =
    APPLICATIONS.find((item) => item.id === selectedId) ?? APPLICATIONS[0];

  return (
    <main className="application-page page-view">
      <aside className="application-history">
        <div className="application-history-head">
          <div className="panel-title">APPLICATION HISTORY</div>
          <span className="application-demo-label">SEEDED DEMO</span>
          <h2>One fact bank.<br />A version for every role.</h2>
          <p>
            Each record freezes a job-specific narrative while keeping the
            claims from the source resume unchanged.
          </p>
        </div>

        <div className="application-history-stats" aria-label="Application summary">
          <div><strong>{APPLICATIONS.length}</strong><span>VERSIONS</span></div>
          <div><strong>{APPLICATIONS.filter((item) => item.status === "READY").length}</strong><span>READY</span></div>
          <div><strong>0</strong><span>NEW FACTS</span></div>
        </div>

        <div className="application-records" aria-label="Saved application versions">
          {APPLICATIONS.map((item) => (
            <button
              key={item.id}
              className={`application-record ${item.id === application.id ? "selected" : ""}`}
              onClick={() => onSelect(item.id)}
              aria-pressed={item.id === application.id}
            >
              <span className="application-company-mark">{item.companyMark}</span>
              <span className="application-record-copy">
                <span className="application-record-meta">
                  <strong>{item.company}</strong>
                  <em className={`application-status status-${item.status.toLowerCase()}`}>
                    {item.status}
                  </em>
                </span>
                <span className="application-record-role">{item.role}</span>
                <span className="application-record-foot">
                  {item.updatedAt} <i /> MATCH {item.match}%
                </span>
              </span>
            </button>
          ))}
        </div>

        <section className="application-policy">
          <span className="card-kicker">FACT-SAFE TAILORING</span>
          <h2>Rewrite the angle, not the evidence.</h2>
          <ol>
            <li><span>01</span> Lock projects, dates, tools, and metrics.</li>
            <li><span>02</span> Reorder evidence against the job signals.</li>
            <li><span>03</span> Mark missing proof instead of inventing it.</li>
          </ol>
          <p>Seeded records are draft profiles and do not imply a real submission.</p>
        </section>
      </aside>

      <section className="application-workbench">
        <div className="application-toolbar">
          <div>
            <span className="application-toolbar-kicker">APPLICATION PREVIEW / REVISION 01</span>
            <strong>{application.company} / {application.role}</strong>
          </div>
          <div className="application-toolbar-actions">
            <span>FACTS LOCKED</span>
            <button onClick={() => window.print()}>PRINT / SAVE PDF</button>
          </div>
        </div>

        <div className="application-canvas">
          <article className="application-paper" aria-label={`${application.company} ${application.role} application preview`}>
            <header className="application-paper-header">
              <div>
                <span className="paper-overline">TARGETED APPLICATION</span>
                <h1>Deyu Huang</h1>
                <p>{application.headline}</p>
              </div>
              <address>
                Concord, California<br />
                ancser.social@gmail.com<br />
                (510) 361-6008<br />
                linkedin.com/in/ancser
              </address>
            </header>

            <section className="application-target-strip">
              <div>
                <span>TARGET COMPANY</span>
                <strong>{application.company}</strong>
              </div>
              <div className="application-target-role">
                <span>ROLE</span>
                <strong>{application.role}</strong>
              </div>
              <div>
                <span>LOCATION</span>
                <strong>{application.location}</strong>
              </div>
              <div>
                <span>VERSION</span>
                <strong>{application.updatedAt}</strong>
              </div>
            </section>

            <div className="application-paper-grid">
              <div className="application-document-main">
                <section className="paper-section application-positioning">
                  <div className="paper-section-heading">
                    <span>01</span><h2>Positioning</h2>
                  </div>
                  <p>{application.summary}</p>
                </section>

                <section className="paper-section">
                  <div className="paper-section-heading">
                    <span>02</span><h2>Selected Evidence</h2>
                  </div>
                  <div className="application-experience-list">
                    {application.experiences.map((experience) => (
                      <article className="application-experience" key={experience.title}>
                        <div className="application-experience-title">
                          <div>
                            <span>{experience.kind}</span>
                            <h3>{experience.title}</h3>
                          </div>
                          <em>{experience.meta}</em>
                        </div>
                        <ul>
                          {experience.bullets.map((bullet) => (
                            <li key={bullet}>{bullet}</li>
                          ))}
                        </ul>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="paper-section application-education">
                  <div className="paper-section-heading">
                    <span>03</span><h2>Education</h2>
                  </div>
                  <div>
                    <strong>University of California, Davis</strong>
                    <span>B.S. Computer Science / Minor in Statistics / Jun 2026</span>
                    <p>Algorithms, Machine Learning, Computer Architecture, Operating Systems, Computer Graphics, Networks, Data Structures, Statistics</p>
                  </div>
                </section>
              </div>

              <aside className="application-document-notes">
                <section>
                  <span className="paper-side-label">ROLE SIGNALS</span>
                  <div className="application-focus-list">
                    {application.focus.map((item) => <strong key={item}>{item}</strong>)}
                  </div>
                </section>

                <section>
                  <span className="paper-side-label">SKILL EVIDENCE</span>
                  {application.skillGroups.map((group) => (
                    <div className="application-skill-group" key={group.label}>
                      <strong>{group.label}</strong><p>{group.value}</p>
                    </div>
                  ))}
                </section>

                <section className="application-experiment-ledger">
                  <span className="paper-side-label">EXPERIMENT LEDGER</span>
                  {application.experiments.map((experiment) => (
                    <details key={experiment.name} open>
                      <summary>{experiment.name}</summary>
                      <dl>
                        <div><dt>PROBLEM</dt><dd>{experiment.problem}</dd></div>
                        <div><dt>APPROACH</dt><dd>{experiment.approach}</dd></div>
                        <div><dt>EVIDENCE</dt><dd>{experiment.evaluation}</dd></div>
                        <div className="application-gap"><dt>GAP</dt><dd>{experiment.gap}</dd></div>
                      </dl>
                    </details>
                  ))}
                </section>

                <section className="application-why-card">
                  <span className="paper-side-label">WHY THIS VERSION</span>
                  <div><strong>PROMOTED</strong><p>{application.promoted}</p></div>
                  <div><strong>DEFERRED</strong><p>{application.deferred}</p></div>
                  <div><strong>LOGIC</strong><p>{application.rationale}</p></div>
                </section>
              </aside>
            </div>

            <footer className="application-paper-footer">
              <span>CANONICAL SOURCE / DEYU_HUANG_RESUME_DM.PDF</span>
              <span>{application.channel} / {application.status} / FIT {application.match}%</span>
            </footer>
          </article>
        </div>
      </section>
    </main>
  );
}

export default function Home() {
  const [page, setPage] = useState<PageId>("market");
  const [heatMode, setHeatMode] = useState<HeatMode>("skills");
  const [snapshot, setSnapshot] =
    useState<MarketSnapshot>(FALLBACK_SNAPSHOT);
  const [dataStatus, setDataStatus] = useState<DataStatus>("loading");
  const [selectedId, setSelectedId] = useState("python");
  const [query, setQuery] = useState("");
  const [portfolioIds, setPortfolioIds] = useState<string[]>(
    () => readStoredPortfolio().ids,
  );
  const [proficiency, setProficiency] = useState<Record<string, number>>(
    () => readStoredPortfolio().proficiency,
  );
  const [selectedApplicationId, setSelectedApplicationId] =
    useState(readStoredApplicationId);

  const loadLiveData = useCallback(async () => {
    setDataStatus("loading");
    try {
      const response = await fetch(SOURCE_URL, {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error(`Greenhouse returned ${response.status}`);
      const payload = (await response.json()) as GreenhouseResponse;
      const live = buildLiveSnapshot(payload);
      if (!live.skills.length) throw new Error("No priced skills found");
      setSnapshot(live);
      setDataStatus("live");
      setSelectedId((current) =>
        live.skills.some((skill) => skill.id === current)
          ? current
          : live.skills[0].id,
      );
    } catch {
      setSnapshot(FALLBACK_SNAPSHOT);
      setDataStatus("fallback");
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadLiveData();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [loadLiveData]);

  useEffect(() => {
    window.localStorage.setItem(
      "jobsdaq-portfolio",
      JSON.stringify({ ids: portfolioIds, proficiency }),
    );
  }, [portfolioIds, proficiency]);

  const selected =
    snapshot.skills.find((skill) => skill.id === selectedId) ??
    snapshot.skills[0];

  const filteredSkills = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return snapshot.skills;
    return snapshot.skills.filter((skill) =>
      `${skill.name} ${skill.ticker} ${skill.category}`
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [query, snapshot.skills]);

  const heatItems = heatMode === "skills" ? snapshot.skills : snapshot.roles;

  const portfolioSkills = snapshot.skills.filter((skill) =>
    portfolioIds.includes(skill.id),
  );
  const portfolioExposure = portfolioSkills.reduce(
    (total, skill) => total + skill.exposure,
    0,
  );
  const weightedPortfolioPrice = portfolioSkills.length
    ? portfolioSkills.reduce((total, skill) => {
        const weight = proficiency[skill.id] ?? 50;
        return total + skill.price * weight;
      }, 0) /
      portfolioSkills.reduce(
        (total, skill) => total + (proficiency[skill.id] ?? 50),
        0,
      )
    : 0;
  const referenceSalary = portfolioSkills.length
    ? portfolioSkills.reduce(
        (total, skill) => total + skill.medianSalary,
        0,
      ) / portfolioSkills.length
    : 0;

  const complementNames = new Set(
    portfolioSkills.flatMap((skill) => skill.coSkills),
  );
  const nextMove =
    snapshot.skills
      .filter(
        (skill) =>
          !portfolioIds.includes(skill.id) && complementNames.has(skill.name),
      )
      .sort((a, b) => b.exposure - a.exposure)[0] ??
    snapshot.skills
      .filter((skill) => !portfolioIds.includes(skill.id))
      .sort((a, b) => b.jobs - a.jobs)[0];

  const togglePortfolio = (id: string) => {
    setPortfolioIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  const selectFromHeatmap = (item: MarketItem) => {
    if (heatMode !== "skills") return;
    setSelectedId(item.id);
    setPage("market");
  };

  const selectApplication = (id: string) => {
    setSelectedApplicationId(id);
    window.localStorage.setItem("jobsdaq-selected-application", id);
  };

  if (!selected) return null;

  return (
    <div className="app-shell">
      <header className="header">
        <button className="brand" onClick={() => setPage("market")}>
          <span>ancser</span>JOBSDAQ
          <small>0.1 DEMO</small>
        </button>
        <nav className="header-tabs" aria-label="Primary navigation">
          {PAGE_LABELS.map((item) => (
            <button
              key={item.id}
              className={`tab ${page === item.id ? "active" : ""}`}
              onClick={() => setPage(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="header-right">
          <div className="data-state">
            <span
              className={`status-dot ${
                dataStatus === "loading"
                  ? "loading"
                  : dataStatus === "live"
                    ? "ok"
                    : "err"
              }`}
            />
            <span>
              {dataStatus === "loading"
                ? "SYNCING"
                : dataStatus === "live"
                  ? "FIGMA LIVE"
                  : "SNAPSHOT"}
            </span>
          </div>
          <span className="as-of">AS OF {snapshot.asOf}</span>
        </div>
      </header>

      {page === "market" && (
        <div className="market-layout page-view">
          <aside className="sidebar">
            <div className="panel market-search-panel">
              <div className="panel-title">SKILL UNIVERSE</div>
              <label className="search-field">
                <span>⌕</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="SEARCH TICKER / SKILL"
                  aria-label="Search skills"
                />
              </label>
              <div className="universe-meta">
                <span>{snapshot.skills.length} ASSETS</span>
                <span>TECH · FIGMA</span>
              </div>
            </div>

            <div className="skill-list" role="list">
              {filteredSkills.map((skill) => (
                <button
                  role="listitem"
                  key={skill.id}
                  className={`skill-row ${
                    skill.id === selected.id ? "selected" : ""
                  }`}
                  onClick={() => setSelectedId(skill.id)}
                >
                  <span className="ticker-block">
                    <strong>{skill.ticker}</strong>
                    <small>{skill.category}</small>
                  </span>
                  <span className="skill-name">
                    {skill.name}
                    {skill.state === "watch" && <em>WATCH</em>}
                  </span>
                  <span className="skill-quote">
                    <strong>{skill.price.toFixed(1)}</strong>
                    <small
                      className={
                        skill.premium >= 0 ? "positive" : "negative"
                      }
                    >
                      {skill.premium >= 0 ? "+" : ""}
                      {skill.premium.toFixed(1)}%
                    </small>
                  </span>
                </button>
              ))}
            </div>

            <div className="panel source-panel">
              <div className="panel-title">DATA FEED</div>
              <div className="source-line">
                <span>PROVIDER</span>
                <strong>GREENHOUSE API</strong>
              </div>
              <div className="source-line">
                <span>EMPLOYER</span>
                <strong>FIGMA</strong>
              </div>
              <div className="source-line">
                <span>OPEN POSTS</span>
                <strong>{snapshot.jobsScanned}</strong>
              </div>
              <div className="source-line">
                <span>PAY RANGES</span>
                <strong>{snapshot.salariedJobs}</strong>
              </div>
              <a href={SOURCE_URL} target="_blank" rel="noreferrer">
                PUBLIC GET · NO API KEY ↗
              </a>
            </div>
          </aside>

          <main className="market-content">
            <section className="quote-header">
              <div>
                <div className="eyebrow">
                  {selected.category} / {selected.ticker}
                  <span
                    className={`confidence-badge ${
                      selected.state === "watch" ? "watch" : ""
                    }`}
                  >
                    {selected.confidence}
                  </span>
                </div>
                <h1>{selected.name}</h1>
                <p>
                  FIGMA ACTIVE POSTINGS · ROLE-FAMILY ADJUSTED SNAPSHOT INDEX
                </p>
              </div>
              <div className="quote-price">
                <span>{selected.price.toFixed(1)}</span>
                <strong
                  className={selected.premium >= 0 ? "positive" : "negative"}
                >
                  {selected.premium >= 0 ? "+" : ""}
                  {selected.premium.toFixed(1)}%
                </strong>
              </div>
            </section>

            <section className="metrics-grid">
              <MetricCard
                label="Salary Index"
                value={selected.price.toFixed(1)}
                detail="100 = same Figma role-family median"
                tone={selected.premium >= 0 ? "positive" : "negative"}
              />
              <MetricCard
                label="Allocated Wage Exposure"
                value={compactMoney.format(selected.exposure)}
                detail="salary midpoint ÷ detected skills"
              />
              <MetricCard
                label="Median Listed Salary"
                value={compactMoney.format(selected.medianSalary)}
                detail="annual base salary midpoint"
              />
              <MetricCard
                label="Coverage"
                value={`${selected.jobs} POSTS`}
                detail={`1 employer · confidence ${selected.confidence}`}
              />
            </section>

            <section className="chart-panel">
              <div className="chart-toolbar">
                <div>
                  <span className="chart-title">VALUE / ACTIVE COHORT TAPE</span>
                  <span className="chart-subtitle">
                    GROUPED BY FIRST_PUBLISHED · CURRENT SURVIVORS ONLY
                  </span>
                </div>
                <div className="timeframe">
                  <button className="active">1M</button>
                  <button disabled>1W</button>
                  <button disabled>1D</button>
                </div>
              </div>
              <ValueChart item={selected} />
            </section>

            <section className="market-bottom">
              <div className="bottom-card">
                <div className="panel-title">PRICE FORMATION</div>
                <p>
                  Price is the median salary midpoint divided by the median of
                  comparable Figma role families. This demo controls role mix,
                  but not level, location, or employer concentration.
                </p>
                <div className="formula">
                  PRICE = MEDIAN(SALARY ÷ ROLE MEDIAN) × 100
                </div>
              </div>
              <div className="bottom-card">
                <div className="panel-title">TOP POSTING COHORTS</div>
                {selected.topRoles.length ? (
                  <ul>
                    {selected.topRoles.map((role) => (
                      <li key={role}>{role}</li>
                    ))}
                  </ul>
                ) : (
                  <p>Live source details are loading.</p>
                )}
              </div>
              <div className="bottom-card">
                <div className="panel-title">CO-SKILLS</div>
                <div className="chip-cloud">
                  {(selected.coSkills.length
                    ? selected.coSkills
                    : ["LIVE", "SOURCE", "PENDING"]
                  ).map((skill) => (
                    <span key={skill}>{skill}</span>
                  ))}
                </div>
                <p className="small-note">
                  Co-occurrence is evidence of a bundle, not proof that one
                  skill caused the salary.
                </p>
              </div>
            </section>
          </main>
        </div>
      )}

      {page === "heatmap" && (
        <main className="heat-page page-view">
          <section className="heat-header">
            <div>
              <div className="eyebrow">JOBSDAQ MARKET MAP / FIGMA SNAPSHOT</div>
              <h1>Where disclosed wage exposure concentrates</h1>
              <p>
                AREA = ALLOCATED ANNUAL SALARY EXPOSURE · COLOR = SNAPSHOT
                PRICE SPREAD VS BENCHMARK
              </p>
            </div>
            <div className="segmented-control" aria-label="Heat map universe">
              <button
                className={heatMode === "skills" ? "active" : ""}
                onClick={() => setHeatMode("skills")}
              >
                SKILLS
              </button>
              <button
                className={heatMode === "roles" ? "active" : ""}
                onClick={() => setHeatMode("roles")}
                disabled={!snapshot.roles.length}
              >
                ROLES
              </button>
            </div>
          </section>

          <section className="heat-stats">
            <div>
              <span>VISIBLE EXPOSURE</span>
              <strong>
                {compactMoney.format(
                  heatItems.reduce((sum, item) => sum + item.exposure, 0),
                )}
              </strong>
            </div>
            <div>
              <span>PRICED ASSETS</span>
              <strong>
                {heatItems.filter((item) => item.state === "priced").length}
              </strong>
            </div>
            <div>
              <span>WATCH / LOW SAMPLE</span>
              <strong>
                {heatItems.filter((item) => item.state === "watch").length}
              </strong>
            </div>
            <div className="legend">
              <span className="legend-negative">BELOW</span>
              <i />
              <span className="legend-positive">ABOVE</span>
            </div>
          </section>

          <section className="treemap-frame">
            {heatItems.length ? (
              <Treemap items={heatItems} onSelect={selectFromHeatmap} />
            ) : (
              <div className="empty-state">SYNCING ROLE UNIVERSE…</div>
            )}
          </section>

          <section className="method-strip">
            <article>
              <strong>01 / WHY SPLIT THE SALARY?</strong>
              <p>
                Each posting&apos;s midpoint is divided equally across detected
                skills, so the heat-map areas remain additive. It is a display
                attribution, not causal value creation.
              </p>
            </article>
            <article>
              <strong>02 / ATTENTION ≠ PRICE</strong>
              <p>
                Search, social and news discussion are a separate Attention
                layer. They never enter wage exposure or the price index.
              </p>
            </article>
            <article>
              <strong>03 / PROMPT ENGINEERING</strong>
              <p>
                It appears when job text asks for the skill, even without a
                “Prompt Engineer” title. Low samples remain on WATCH.
              </p>
            </article>
          </section>
        </main>
      )}

      {page === "portfolio" && (
        <main className="portfolio-page page-view">
          <aside className="portfolio-builder">
            <div className="panel-title">PERSONAL SKILLS</div>
            <p className="builder-intro">
              Select what you can already use. This portfolio stays on this
              device.
            </p>
            <div className="portfolio-selector">
              {snapshot.skills.map((skill) => {
                const checked = portfolioIds.includes(skill.id);
                return (
                  <label
                    className={`portfolio-option ${checked ? "checked" : ""}`}
                    key={skill.id}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => togglePortfolio(skill.id)}
                    />
                    <span>
                      <strong>{skill.name}</strong>
                      <small>
                        {skill.ticker} · {skill.jobs} POSTS
                      </small>
                    </span>
                    <em>{checked ? "HELD" : "ADD"}</em>
                  </label>
                );
              })}
            </div>
          </aside>

          <section className="portfolio-content">
            <div className="portfolio-hero">
              <div>
                <div className="eyebrow">PERSONAL HUMAN-CAPITAL BOOK</div>
                <h1>My Skill Portfolio</h1>
                <p>
                  A market reference for skill allocation — not a promise of
                  personal salary.
                </p>
              </div>
              <div className="portfolio-score">
                <span>PORTFOLIO INDEX</span>
                <strong>{weightedPortfolioPrice.toFixed(1)}</strong>
              </div>
            </div>

            <section className="metrics-grid portfolio-metrics">
              <MetricCard
                label="Held Skills"
                value={`${portfolioSkills.length}`}
                detail={`${snapshot.skills.length - portfolioSkills.length} outside the book`}
              />
              <MetricCard
                label="Referenced Exposure"
                value={compactMoney.format(portfolioExposure)}
                detail="overlap-aware demo allocation"
                tone="positive"
              />
              <MetricCard
                label="Reference Salary"
                value={referenceSalary ? compactMoney.format(referenceSalary) : "—"}
                detail="average listed midpoint, not expected pay"
              />
              <MetricCard
                label="Universe Coverage"
                value={`${Math.round(
                  (portfolioSkills.length / Math.max(snapshot.skills.length, 1)) *
                    100,
                )}%`}
                detail="of this Figma skill universe"
              />
            </section>

            <section className="portfolio-grid">
              <div className="holdings-panel">
                <div className="panel-heading-row">
                  <div className="panel-title">HOLDINGS / PROFICIENCY</div>
                  <span>{portfolioSkills.length} POSITIONS</span>
                </div>
                {portfolioSkills.length ? (
                  portfolioSkills.map((skill) => (
                    <div className="holding-row" key={skill.id}>
                      <div className="holding-symbol">{skill.ticker}</div>
                      <div className="holding-main">
                        <div>
                          <strong>{skill.name}</strong>
                          <span>
                            {skill.price.toFixed(1)} ·{" "}
                            {compactMoney.format(skill.exposure)}
                          </span>
                        </div>
                        <label>
                          <span>PROFICIENCY</span>
                          <input
                            type="range"
                            min="10"
                            max="100"
                            value={proficiency[skill.id] ?? 50}
                            onChange={(event) =>
                              setProficiency((current) => ({
                                ...current,
                                [skill.id]: Number(event.target.value),
                              }))
                            }
                          />
                          <em>{proficiency[skill.id] ?? 50}%</em>
                        </label>
                      </div>
                      <button onClick={() => togglePortfolio(skill.id)}>
                        REMOVE
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    ADD AT LEAST ONE SKILL TO BUILD THE BOOK.
                  </div>
                )}
              </div>

              <aside className="portfolio-insights">
                <div className="next-move-card">
                  <span className="card-kicker">NEXT COMPLEMENT</span>
                  {nextMove ? (
                    <>
                      <h2>{nextMove.name}</h2>
                      <div className="next-quote">
                        <strong>{nextMove.price.toFixed(1)}</strong>
                        <span>
                          {nextMove.jobs} POSTS ·{" "}
                          {compactMoney.format(nextMove.exposure)}
                        </span>
                      </div>
                      <p>
                        Suggested from co-skill overlap first, then current
                        posting breadth. Learning cost is not yet modeled.
                      </p>
                      <button onClick={() => togglePortfolio(nextMove.id)}>
                        ADD TO PORTFOLIO
                      </button>
                    </>
                  ) : (
                    <p>You already hold the visible universe.</p>
                  )}
                </div>

                <div className="taxonomy-card">
                  <span className="card-kicker">EXPANSION UNIVERSE</span>
                  <h3>Roles and skills stay separate</h3>
                  <div className="taxonomy-row">
                    <strong>ROLE</strong>
                    <span>Prompt Engineer · Truck Driver · Warehouse Worker</span>
                  </div>
                  <div className="taxonomy-row">
                    <strong>SKILL</strong>
                    <span>Prompt Engineering · Route Planning · Inventory Control</span>
                  </div>
                  <div className="taxonomy-row">
                    <strong>LICENSE / TOOL</strong>
                    <span>CDL-A · HazMat · Forklift · WMS · RF Scanner</span>
                  </div>
                  <p>
                    Logistics needs a separate hourly-pay benchmark and source
                    basket; it should not be compared directly with SF tech
                    salaries.
                  </p>
                </div>
              </aside>
            </section>
          </section>
        </main>
      )}

      {page === "application" && (
        <ApplicationPage
          selectedId={selectedApplicationId}
          onSelect={selectApplication}
        />
      )}

      {page === "open-liquid-glass" && <OpenLiquidGlassPage />}

      {page !== "application" && page !== "open-liquid-glass" && (
      <button
        className="refresh-button"
        onClick={loadLiveData}
        disabled={dataStatus === "loading"}
        aria-label="Refresh Greenhouse data"
      >
        {dataStatus === "loading" ? "SYNC…" : "↻"}
      </button>
      )}
    </div>
  );
}

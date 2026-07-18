"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type PageId = "market" | "heatmap" | "portfolio";
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
];

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

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

export default function Home() {
  const [page, setPage] = useState<PageId>("market");
  const [heatMode, setHeatMode] = useState<HeatMode>("skills");
  const [snapshot, setSnapshot] =
    useState<MarketSnapshot>(FALLBACK_SNAPSHOT);
  const [dataStatus, setDataStatus] = useState<DataStatus>("loading");
  const [selectedId, setSelectedId] = useState("python");
  const [query, setQuery] = useState("");
  const [portfolioIds, setPortfolioIds] = useState<string[]>([
    "python",
    "sql",
    "typescript",
  ]);
  const [proficiency, setProficiency] = useState<Record<string, number>>({
    python: 78,
    sql: 70,
    typescript: 52,
  });

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
    loadLiveData();
  }, [loadLiveData]);

  useEffect(() => {
    const saved = window.localStorage.getItem("jobsdaq-portfolio");
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as {
        ids?: string[];
        proficiency?: Record<string, number>;
      };
      if (Array.isArray(parsed.ids)) setPortfolioIds(parsed.ids);
      if (parsed.proficiency) setProficiency(parsed.proficiency);
    } catch {
      // Keep the safe default portfolio.
    }
  }, []);

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

      <button
        className="refresh-button"
        onClick={loadLiveData}
        disabled={dataStatus === "loading"}
        aria-label="Refresh Greenhouse data"
      >
        {dataStatus === "loading" ? "SYNC…" : "↻"}
      </button>
    </div>
  );
}

# JOBSDAQ

JOBSDAQ is a minimal “market for human skills” demo. It turns public job
postings with disclosed pay ranges into:

- a skill quote and active-posting cohort chart;
- a stock-style wage-exposure heat map;
- a device-local personal skill portfolio;
- a job-specific application preview with saved role variants;
- an explicit separation between roles, skills, licenses, and tools.

The visual shell reuses the layout language of `ancserTPX`: a centered top-bar
page switcher, dark terminal palette, quote cards, and chart-first workspace.
Its trading logic and application-specific JavaScript are not copied.

## Live demo source

The browser reads Figma's public Greenhouse Job Board feed:

```text
https://boards-api.greenhouse.io/v1/boards/figma/jobs?content=true&pay_transparency=true
```

The feed currently exposes job title, body, first-published and updated dates,
public job URL, and structured `pay_input_ranges`. Public GET requests do not
need an API key. JOBSDAQ keeps a small derived fallback snapshot so the
visualization still renders if the upstream request is unavailable.

This is intentionally labeled **Figma single-employer snapshot**. It is a
data-pipeline and UI proof of concept, not a market-wide index.

## Calculation used by this MVP

For each job:

```text
salary midpoint = (minimum disclosed base salary + maximum) / 2
allocated skill wage exposure = salary midpoint / detected skill count
```

For each skill:

```text
heat-map area = Σ allocated skill wage exposure
price index = median(salary midpoint / Figma role-family median) × 100
```

The split makes heat-map areas additive, but it is only a transparent display
heuristic. It does not claim each skill caused that share of salary. A real
market index needs multi-employer history and a regularized wage model that
controls role, seniority, location, industry, and time.

See [docs/index-methodology.md](docs/index-methodology.md) for the full product
and data design.

## Local development

```bash
npm install
npm run dev
```

The personal portfolio is stored in `localStorage`; the demo has no account,
database, or secret API key.

## Application preview

The Application page uses a canonical-facts approach: dates, projects,
technologies, and resume metrics remain locked, while each role version can
reorder evidence and align terminology. The seeded AI product, trading systems,
and graphics profiles are demo drafts derived from the supplied resume and do
not imply that an application was submitted. Missing metrics are shown as
evidence gaps rather than invented claims. Only the selected record id is stored
locally; the source PDF itself is not bundled into the deployed site.

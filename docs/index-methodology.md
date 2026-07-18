# JOBSDAQ index methodology — MVP

## 1. Keep roles and skills separate

JOBSDAQ has two related but distinct instruments:

- **Role ticker:** standardized listed pay for a job family, such as Prompt
  Engineer, Truck Driver, or Warehouse Worker.
- **Skill ticker:** the pay association of an explicit requirement across
  comparable roles, such as Prompt Engineering, CDL-A, route planning,
  inventory control, forklift operation, or WMS.

Licenses, tools, tasks, and broad capabilities should retain type tags. CDL-A
and a forklift certificate are not the same entity type as route planning or
inventory control.

## 2. What the heat map means

The production-preferred map is overlapping salary exposure:

```text
exposure(skill) = Σ listed salary midpoint for postings mentioning skill
```

Because one posting may mention many skills, overlapping exposure cannot be
summed across tiles. For a conventional additive treemap, this MVP instead
uses:

```text
allocated exposure(skill)
  = Σ salary midpoint(job) / detected skill count(job)
```

The equal split prevents one salary from creating ten salaries in the display.
It is an attribution convention, not a causal estimate of what each skill
produced.

Future versions can weight title skills, required skills, preferred skills, and
incidental mentions differently. Those weights must be published and
versioned.

## 3. Skill price

The current single-employer demo uses a partial adjustment:

```text
price(skill)
  = median(salary midpoint / role-family median) × 100
```

An index of 108 means the current postings that explicitly mention the skill
have salary midpoints about 8% above their Figma role-family benchmark. It does
not mean learning the skill causes an 8% raise.

The intended market-wide model is:

```text
log(listed salary)
  = role × seniority × location × time
  + employer and industry effects
  + regularized skill effects
  + error
```

Highly co-occurring skills must be shrunk toward a broader bundle. If PyTorch
cannot be statistically separated from an AI training stack, JOBSDAQ should
price the bundle or mark PyTorch as low confidence instead of publishing false
precision.

## 4. Discussion is an independent signal

Search volume, social posts, news, GitHub activity, and course enrollments form
an **Attention** layer. They do not enter:

- listed wage exposure;
- skill price;
- data confidence.

Attention can later be tested as a leading indicator of demand. Keeping it
separate prevents a short-lived meme from becoming a fake salary increase.

## 5. Prompt Engineering

“Prompt Engineer” is a role; “Prompt Engineering” is a skill. The skill can
appear in applied-science, software, product, design, and marketing jobs even
when no open role uses the exact title.

The Figma snapshot demonstrates this distinction: current salaried postings
mention prompt engineering while the board does not need a standalone Prompt
Engineer title. Low sample counts remain `WATCH`; they are not forced into a
smooth price history.

## 6. Truck drivers and warehouse workers

They belong in the same product, but not in the same unadjusted salary basket.
The logistics universe needs:

- hourly wages and overtime normalization;
- shift, geography, union, and full-time/contract controls;
- employee driver versus owner-operator separation;
- role entities such as local driver, long-haul driver, warehouse associate,
  and inventory controller;
- skills and credentials such as CDL-A, HazMat, tanker, cold chain, forklift,
  WMS, RF scanner, SAP, inventory control, and route planning.

Owner-operator revenue cannot be treated as employee wages. San Francisco tech
base salary cannot be directly compared with warehouse hourly pay without a
role-specific benchmark.

## 7. Directly accessible data

| Source | Key required | Useful fields | Main limitation |
| --- | --- | --- | --- |
| Greenhouse Job Board API | No for public GET | Body, title, dates, location, and sometimes structured pay | Board tokens must be curated; no history endpoint |
| Lever Postings API | No for public postings | Body, categories, and sometimes salary range | Salary coverage and third-party browser CORS vary |
| Employer career pages / JobPosting JSON-LD | Usually no | Employer-authored role and pay | Terms, robots, rate limits, and layout vary |
| O*NET Web Services / downloadable DB | Free registration or download | Occupation and technology-skill taxonomy | Not a real-time vacancy tape |
| BLS OEWS | No key for tables; API registration optional | Occupation and geography wage anchors | Annual and occupation-level, not individual skills |

Public accessibility is not a universal republication license. Prefer
documented APIs, retain source URLs, store derived metrics rather than mirrored
job bodies, obey source terms and rate limits, and sanitize any third-party
HTML before display.

## 8. History and K-lines

Greenhouse supplies current open postings, not a historical tape. Its
`first_published` field supports the demo's **active-posting cohort chart**, but
that chart has survivor bias and is not a historical index.

A production K-line requires immutable daily snapshots:

- Open: first valid model quote in the period;
- High/Low: highest/lowest model quote in the period;
- Close: final valid quote;
- Volume: deduplicated postings or inferred hiring FTE;
- uncertainty: a separate confidence band, not the candle wick.

The system must preserve the real-time data version used by every backtest.

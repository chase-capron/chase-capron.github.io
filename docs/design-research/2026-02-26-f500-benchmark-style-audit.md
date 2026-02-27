# Fortune 500 Web Redesign Research + Current Site Audit

Date: 2026-02-26  
Repo: `chase-capron.github.io`  
Scope: Benchmark modern enterprise homepage patterns, then audit the current site against those patterns.

## 1) Benchmark Summary (Patterns Worth Borrowing)

### Benchmark set reviewed
- Apple (`apple.com`)
- IBM (`ibm.com/us-en`)
- Salesforce (`salesforce.com`)
- Cisco (`cisco.com`)
- NVIDIA (`nvidia.com/en-us`)
- JPMorganChase (`jpmorganchase.com`)
- Accenture (`accenture.com/us-en`)
- Walmart Corporate (`corporate.walmart.com`)
- Supporting systems/guidance: Fluent 2, WCAG 2.2

### 10 concrete patterns to borrow

1. **Layered global navigation (primary + utility + contextual)**
   - Seen across Apple, Cisco, Salesforce, JPMorganChase.
   - Pattern: persistent top nav, utility actions (support/login/contact), and category-level wayfinding.
   - Why it works: fast orientation for first-time visitors and direct routing for return visitors.

2. **Hero with dual CTA hierarchy (explore + conversion)**
   - Seen across IBM, Salesforce, Cisco, NVIDIA.
   - Pattern: one primary CTA (“Start/See demo”) + one secondary CTA (“Learn more/Read report”).
   - Why it works: supports both high-intent and exploratory visitors.

3. **Trust strip near the fold**
   - Seen across Salesforce, IBM, Cisco, JPMorganChase.
   - Pattern: customer logos, recognitions, quantitative proof points, or named case studies immediately after hero.
   - Why it works: validates credibility before deeper scrolling.

4. **Story modules framed as outcomes (not features)**
   - Seen across IBM, NVIDIA, Accenture, Walmart Corporate.
   - Pattern: card/case-study modules using measurable outcomes and industry context.
   - Why it works: enterprise buyers evaluate business impact first.

5. **Card system with strict visual grammar**
   - Seen across Apple, Cisco, NVIDIA, IBM.
   - Pattern: consistent card anatomy (eyebrow/title/support copy/meta/action), stable radii/shadows, and predictable hover behavior.
   - Why it works: increases scan speed and reduces cognitive load.

6. **Type scale using fluid display + stable body rhythm**
   - Seen across Apple, IBM, NVIDIA.
   - Pattern: fluid headline scaling (`clamp`) with restrained body sizes and clear line-length limits.
   - Why it works: premium feel without sacrificing readability.

7. **Spacing rhythm tokenized to a small scale**
   - Seen in mature enterprise systems (Fluent/Carbon-style discipline, visibly reflected in top brands).
   - Pattern: repeatable spacing steps (e.g., 4/8/12/16/24/32/48/64), not ad hoc values.
   - Why it works: creates coherence and lowers maintenance cost.

8. **Motion used as guidance, with explicit reduction paths**
   - Seen across Apple/NVIDIA/Cisco interactions.
   - Pattern: subtle reveal/parallax/marquees only when they aid hierarchy; respect `prefers-reduced-motion`.
   - Why it works: perceived polish without accessibility penalty.

9. **CTA architecture by intent stage**
   - Seen across Salesforce/Cisco/JPMorganChase.
   - Pattern: top-of-page soft conversion (learn/explore), mid-page hard conversion (contact/demo), footer utility conversion (careers/support/newsletter).
   - Why it works: aligns action asks with user readiness.

10. **Accessibility as first-class IA, not bolt-on**
   - Seen in enterprise baselines + WCAG 2.2 framing.
   - Pattern: skip links, keyboard-operable menus, visible focus, semantic landmarks/headings, sufficient contrast, and clear link purpose.
   - Why it works: improves UX quality for everyone and reduces legal/brand risk.

---

## 2) Current Site Gap Analysis (`index.html`, `styles.css`, `app.js`)

### What is already strong
- Strong visual identity and cohesive dark theme.
- Good project density (tiles + cards) and useful freshness indicators.
- Motion controls already account for reduced-motion in both CSS and JS.
- Accessibility foundations present: skip link, semantic sections, focus-visible styles.

### Key gaps versus enterprise benchmark patterns

1. **Navigation depth is too shallow for enterprise-style discoverability**
   - Current: only `Home` + `Projects` in primary nav.
   - Gap: missing section-level wayfinding and utility actions (Contact/Resume/LinkedIn/GitHub grouped intentionally).

2. **Hero has one main CTA, limited funnel strategy**
   - Current: repeated `View Projects` CTA.
   - Gap: no secondary intent path (e.g., “Read case studies”, “Contact”, “Download resume”).

3. **No dedicated trust/social-proof block near top**
   - Current: strong project content but no explicit credibility module.
   - Gap: missing proof elements (stats, recognitions, outcomes, testimonials, partner logos, press mentions).

4. **Project cards emphasize topics more than measurable outcomes**
   - Current: mostly capability descriptions.
   - Gap: limited outcome framing (time saved, reliability gains, automation impact).

5. **Card system is visually rich but not unified to one strict enterprise grammar**
   - Current: multiple card families (tiles, project cards, hardware cards, callout) with different behaviors.
   - Gap: hierarchy is understandable, but interaction and density rules can be standardized further.

6. **Typography hierarchy can be tightened for enterprise scan patterns**
   - Current: strong display headline, but some sections use similar visual weights.
   - Gap: needs crisper differentiation between section title, support text, metadata, and action text.

7. **Spacing rhythm is partly systemized, partly ad hoc**
   - Current: many one-off pixel values across components.
   - Gap: formal spacing scale and layout tokens would improve consistency and speed future redesign work.

8. **CTA architecture across page lifecycle is underdeveloped**
   - Current: project exploration is clear; conversion pathways are sparse.
   - Gap: no staged CTA map for explore → trust → contact/collab.

9. **Accessibility depth can improve beyond baseline**
   - Current: good fundamentals.
   - Gap: validate heading order consistency, link purpose clarity for repeated labels, and contrast on all tinted surfaces under WCAG 2.2 AA checks.

---

## 3) Prioritized Design Direction

## P0 (first pass: highest leverage)
1. **Re-architect homepage IA + nav**
   - Add clear section anchors and utility actions (Projects, About, Hardware, Outcomes, Contact).
   - Preserve lightweight feel but improve enterprise discoverability.

2. **Refactor hero into dual-CTA pattern**
   - Primary: `View Case Studies` (or equivalent project proof).
   - Secondary: `Get in Touch` / `Download Resume`.

3. **Add trust module directly below hero**
   - Include 3–5 hard proof points (automation count, uptime, systems shipped, etc.) + short logos/badges strip where valid.

## P1 (second pass: conversion and credibility)
4. **Rewrite project summaries as outcomes**
   - Add structured mini-metrics: problem, intervention, measurable result.

5. **Unify card design grammar**
   - Define one card spec with variants (feature, case study, utility) using consistent spacing, metadata, and action placement.

6. **Install a formal type/spacing token system**
   - Document scales and normalize one-off values.

## P2 (third pass: polish and resilience)
7. **Refine motion strategy**
   - Keep subtle reveal/marquee only where it supports comprehension; reduce decorative motion load.

8. **Deepen accessibility QA pass**
   - Run manual keyboard flow + WCAG 2.2 AA contrast and link-purpose audits page-wide.

9. **Define CTA ladder across full page**
   - Top: explore, middle: proof, bottom: conversion/contact.

---

## Recommended Immediate Output for Task 2/5+ continuity
- Create a **design token sheet** (`type`, `space`, `radius`, `shadow`, `motion`) before visual comping.
- Draft a **wireframe-level homepage v2** that includes: layered nav, dual-CTA hero, trust strip, outcome-led case studies.
- Keep existing brand personality, but shift structure toward enterprise scan/conversion patterns.

---

## Notes / method constraints
- `web_search` tool unavailable in this environment (missing Brave API key), so research was performed via direct live page retrieval/scrape of benchmark sites and design-system docs.
- Some domains apply bot filtering/rate limits; benchmark pattern extraction focused on successfully retrieved enterprise pages listed above.

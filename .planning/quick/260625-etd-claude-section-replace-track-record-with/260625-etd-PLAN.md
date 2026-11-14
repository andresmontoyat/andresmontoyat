---
phase: 260625-etd
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/data/claude.json
  - src/components/Claude.js
  - src/components/Claude.test.js
autonomous: true
requirements: [VIS-AI-CARDS]
must_haves:
  truths:
    - "Claude section shows an AI-capabilities block (4 cards) where the Track-record proof block used to be"
    - "Track-record proof block (label, heading, counters) no longer renders"
    - "Each AI card leads with its title (no numeric id) and shows a description"
    - "Section order is Pitch → values → AI capabilities → services → apps → stack"
    - "Both EN and ES render correctly via the language toggle"
    - "npx vitest run is GREEN"
  artifacts:
    - path: "src/data/claude.json"
      provides: "aiLabel + aiCapabilities[4]; no proofLabel/proofHeading/counters"
      contains: "aiCapabilities"
    - path: "src/components/Claude.js"
      provides: "CapabilityCard component + AI-capabilities render block; no ProofBlock"
      contains: "CapabilityCard"
    - path: "src/components/Claude.test.js"
      provides: "aiCapabilities assertion; no counters/proof assertions"
      contains: "aiCapabilities"
  key_links:
    - from: "src/components/Claude.js"
      to: "src/data/claude.json"
      via: "data.aiLabel + data.aiCapabilities.map → CapabilityCard"
      pattern: "data\\.aiCapabilities"
---

<objective>
Replace the "Track record" proof block in the Claude section with a 4-card AI-capabilities block. This is an APPROVED design change — content is locked, do NOT re-litigate.

Purpose: Lead with concrete AI-engineering capabilities (agentic, RAG, evals, AI-assisted delivery) instead of self-referential toolkit counters.
Output: Updated claude.json data, Claude.js render + new CapabilityCard component, updated Claude.test.js. `npx vitest run` GREEN.
</objective>

<execution_context>
</execution_context>

<context>
@src/data/claude.json
@src/components/Claude.js
@src/components/Claude.test.js

<interfaces>
<!-- pick() helper already present in Claude.js — use it, do not redefine: -->
<!-- function pick(field, lang) { if (typeof field === 'string') return field; return field?.[lang] ?? field?.en ?? '' } -->

<!-- servicesLabel <p> className to mirror for aiLabel (Claude.js ~126): -->
<!-- "text-accent font-mono text-xs uppercase tracking-widest mt-12" -->

<!-- ValueCard container className to reuse for CapabilityCard (Claude.js ~39): -->
<!-- "bg-surface border border-border rounded-xl p-6 hover:border-accent transition-colors" -->
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update claude.json data (remove proof keys, add AI capabilities)</name>
  <files>src/data/claude.json</files>
  <action>
DELETE the three keys: `proofLabel`, `proofHeading`, and the entire `counters` array (lines 20-24 and 66-74 in the current file).

ADD key `aiLabel` = `{ "en": "AI engineering", "es": "Ingeniería AI" }`. Place it logically near `servicesLabel` (it labels a section the same way).

ADD array `aiCapabilities` with EXACTLY 4 objects, shape `{ id, title: {en,es}, desc: {en,es} }`, in this exact order and with these exact strings:
  1. id "agentic" — title en "Agentic workflows" / es "Flujos agénticos"; desc en "Multi-agent orchestration — custom agents and tool-use, discuss→plan→execute→verify pipelines that ship real code." / es "Orquestación multiagente: agentes propios y uso de herramientas, pipelines discutir→planear→ejecutar→verificar que entregan código real."
  2. id "rag" — title en "RAG & retrieval" / es "RAG y recuperación"; desc en "Spring AI + Qdrant vector search, embeddings and hybrid retrieval over your domain data." / es "Spring AI + Qdrant, búsqueda vectorial, embeddings y recuperación híbrida sobre los datos de tu dominio."
  3. id "evals" — title en "LLM evals & guardrails" / es "Evals y guardrails de LLM"; desc en "Eval harnesses, rubrics and output validation so AI features ship measured, not vibes." / es "Arneses de evaluación, rúbricas y validación de salidas para que las features de AI se midan, no se intuyan."
  4. id "delivery" — title en "AI-assisted delivery" / es "Entrega asistida por AI"; desc en "Production-grade output — hexagonal, tested, observable. The agent writes, the gates hold." / es "Salida lista para producción: hexagonal, testeada, observable. El agente escribe, los gates sostienen."

Keep all other keys (label, h2*, subLead, cta*, servicesLabel, values, services, apps, stackChips) intact. Maintain 2-space indentation and the file's existing JSON formatting idiom.
  </action>
  <verify>
    <automated>node -e "const d=require('./src/data/claude.json'); if(d.proofLabel||d.proofHeading||d.counters) throw new Error('proof keys still present'); if(!d.aiLabel||d.aiCapabilities.length!==4) throw new Error('aiCapabilities missing'); d.aiCapabilities.forEach(c=>{if(!c.id||!c.title.en||!c.title.es||!c.desc.en||!c.desc.es) throw new Error('bad shape')}); console.log('OK')"</automated>
  </verify>
  <done>proofLabel/proofHeading/counters removed; aiLabel present; aiCapabilities has exactly 4 bilingual {id,title,desc} objects in the specified order.</done>
</task>

<task type="auto">
  <name>Task 2: Swap ProofBlock for AI-capabilities block in Claude.js</name>
  <files>src/components/Claude.js</files>
  <action>
DELETE the `ProofBlock` function component (lines ~47-62) entirely.

DELETE its render call `<ProofBlock lang={lang} />` (line ~125).

DEFINE a new `CapabilityCard` component near the other card components (e.g. right after `ValueCard`). It receives `{ capability, lang }` and reuses ValueCard's container className `bg-surface border border-border rounded-xl p-6 hover:border-accent transition-colors`. It leads with the TITLE — NO numeric id: render `h3` with className `text-text font-extrabold text-lg` for the title, then a `p` with className `text-muted text-base mt-2 leading-relaxed` for the desc. Use the existing `pick(field, lang)` helper for both. No semicolons (airbnb/eslint).

In the EXACT slot the deleted `<ProofBlock />` occupied (between the values grid and the servicesLabel `<p>`), ADD the AI-capabilities block:
  - A label `<p>` using `pick(data.aiLabel, lang)` with the SAME className the servicesLabel `<p>` uses: `text-accent font-mono text-xs uppercase tracking-widest mt-12`.
  - A grid `<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">` mapping `data.aiCapabilities` to `<CapabilityCard key={c.id} capability={c} lang={lang} />`.

Section order must remain: PitchHero → values grid → [AI capabilities block] → servicesLabel → services grid → apps grid → StackStrip.
  </action>
  <verify>
    <automated>node -e "const s=require('fs').readFileSync('./src/components/Claude.js','utf8'); if(/ProofBlock/.test(s)) throw new Error('ProofBlock still referenced'); if(!/CapabilityCard/.test(s)||!/data\.aiCapabilities/.test(s)||!/data\.aiLabel/.test(s)) throw new Error('AI block missing'); console.log('OK')"</automated>
  </verify>
  <done>ProofBlock fully removed; CapabilityCard defined and rendered over data.aiCapabilities with aiLabel; section order unchanged; no semicolons.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Update Claude.test.js assertions</name>
  <files>src/components/Claude.test.js</files>
  <behavior>
    - REMOVE/REPLACE the "renders proof block with 7 counters" test (refs Track record, proofHeading, counters, 37/81/86, custom agents/orchestrations).
    - REMOVE counter refs from the "translates ... when lang=es" test (drop `subagents propios` counter-label assertion; keep pitch/values/tag assertions). Note: `subagents propios` also appears in apps desc — but it was asserted via counter label; ensure the test no longer depends on counters.
    - REMOVE the `counters` loop and `data.counters` refs from the schema-sanity test.
    - ADD a test asserting `data.aiCapabilities` has length 4 and each item has bilingual `title.en/title.es` + `desc.en/desc.es` (typeof string).
    - Keep all other tests (section id, pitch hero, value cards, services+apps, stackChips) intact.
  </behavior>
  <action>
Edit src/components/Claude.test.js:

1. Replace the `it('renders proof block with 7 counters (EN)', ...)` block (lines ~50-60) with an AI-capabilities test:
   `it('renders all 4 AI capability cards (EN)', () => { renderWithLang('en'); expect(data.aiCapabilities).toHaveLength(4); expect(screen.getByText('Agentic workflows')).toBeInTheDocument(); expect(screen.getByText('RAG & retrieval')).toBeInTheDocument(); expect(screen.getByText('LLM evals & guardrails')).toBeInTheDocument(); expect(screen.getByText('AI-assisted delivery')).toBeInTheDocument(); })`

2. In `it('translates pitch + values + counters when lang=es', ...)`: rename to drop "counters", remove the `expect(screen.getByText('subagents propios'))` line. Optionally add `expect(screen.getByText('Flujos agénticos')).toBeInTheDocument()` to cover ES capability rendering. Keep the other ES assertions.

3. In the schema-sanity test: remove the entire `for (const c of data.counters) {...}` loop. ADD a `for (const cap of data.aiCapabilities) { expect(typeof cap.id).toBe('string'); expect(typeof cap.title.en).toBe('string'); expect(typeof cap.title.es).toBe('string'); expect(typeof cap.desc.en).toBe('string'); expect(typeof cap.desc.es).toBe('string'); }` loop. Update the test name string to drop "counters".

No semicolons not required in test file (existing tests use none); match the file's existing no-semicolon style.
  </action>
  <verify>
    <automated>npx vitest run src/components/Claude.test.js</automated>
  </verify>
  <done>No assertions reference counters/proofHeading/proofLabel/Track record/appsShipped/"renders proof"; aiCapabilities length-4 + bilingual shape asserted; full file GREEN.</done>
</task>

</tasks>

<verification>
Run `npx vitest run` — ALL tests GREEN (Vite + Vitest; NEVER `npm test`/craco). The Claude section renders Pitch → values → AI capabilities (4 cards) → services → apps → stack, with no Track-record/counters block, in both EN and ES.
</verification>

<success_criteria>
- claude.json: proofLabel/proofHeading/counters removed; aiLabel + aiCapabilities[4] added with exact spec strings.
- Claude.js: ProofBlock removed; CapabilityCard added; AI-capabilities block rendered in the same slot; section order preserved; no semicolons.
- Claude.test.js: counter/proof assertions removed; aiCapabilities test added; all other tests intact.
- `npx vitest run` GREEN.
</success_criteria>

<output>
Create `.planning/quick/260625-etd-claude-section-replace-track-record-with/260625-etd-SUMMARY.md` when done.
</output>

---
phase: quick-260625-dvq
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/data/claude.json
  - src/components/Claude.test.js
autonomous: true
requirements: [VIS-05]

must_haves:
  truths:
    - "The Claude section renders 5 featured-app cards (was 3): ci-templates, gsd, spring-ai-qdrant-mcp, caveman, claude-kanban"
    - "Both new cards render bilingual EN/ES content via the existing pick() helper"
    - "vitest suite is GREEN with updated count assertions"
  artifacts:
    - path: "src/data/claude.json"
      provides: "5-entry apps array with caveman + claude-kanban appended in existing shape"
      contains: "\"id\": \"caveman\""
    - path: "src/components/Claude.test.js"
      provides: "Count assertions bumped 3 -> 5"
      contains: "toHaveLength(5)"
  key_links:
    - from: "src/components/Claude.js"
      to: "src/data/claude.json"
      via: "data.apps.map (line 135) — generic render, NO edit needed"
      pattern: "data\\.apps\\.map"
---

<objective>
Append 2 featured-app cards (caveman, claude-kanban) to the `apps` array in src/data/claude.json so the Claude section displays 5 cards instead of 3, and bump the hardcoded count assertions in Claude.test.js. This closes VIS-05 (caveman + claude-kanban deferred from the AI section).

Purpose: Surface two additional Claude Code plugin projects in the portfolio's AI Engineering section.
Output: Updated claude.json (5 apps), updated Claude.test.js (5-count assertions), green vitest run.
</objective>

<execution_context>
</execution_context>

<context>
@.planning/STATE.md

<interfaces>
<!-- Existing app object shape (from src/data/claude.json apps[], lines 117-148). -->
<!-- New entries MUST match exactly: id, name{en,es}, tag{en,es}, desc{en,es}, stack[]. -->

Each `apps[]` entry:
- id: string
- name: { en: string, es: string }
- tag: { en: string, es: string }
- desc: { en: string, es: string }
- stack: string[]

Renderer (src/components/Claude.js, lines 134-138) — GENERIC, no change needed:
  data.apps.map((a) => <FeaturedAppCard key={a.id} app={a} lang={lang} />)
FeaturedAppCard reads app.name, app.tag, app.desc via pick(field, lang), and app.stack.map.

Test schema-sanity loop (Claude.test.js lines 112-117) iterates ALL apps and asserts
typeof a.id === string, a.name.en === string, a.tag.es === string, Array.isArray(a.stack).
Both new entries satisfy this automatically.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Append caveman + claude-kanban to apps array in claude.json</name>
  <files>src/data/claude.json</files>
  <action>
In src/data/claude.json, append two new objects to the END of the `apps` array (currently 3 entries: ci-templates, gsd, spring-ai-qdrant-mcp; the array closes at line 148). Add a comma after the spring-ai-qdrant-mcp object's closing brace, then add the two entries below. Match the existing object shape EXACTLY (id, name{en,es}, tag{en,es}, desc{en,es}, stack[]). Use 2-space indentation per .editorconfig, no trailing comma after the final entry, plain-text strings only (NO HTML — this is the data layer).

Entry A:
  - id: "caveman"
  - name: { en: "caveman", es: "caveman" }
  - tag: { en: "CLAUDE CODE PLUGIN", es: "PLUGIN CLAUDE CODE" }
  - desc.en: "Terse-output skill for Claude Code — compresses responses to high-signal fragments (drops articles, filler, hedging) while preserving all technical substance. Configurable levels (lite/full/ultra), auto-disables for security warnings and irreversible actions."
  - desc.es: "Skill de salida concisa para Claude Code — comprime las respuestas a fragmentos de alta señal (elimina artículos, relleno y rodeos) preservando toda la sustancia técnica. Niveles configurables (lite/full/ultra), se autodesactiva ante advertencias de seguridad y acciones irreversibles."
  - stack: ["claude-code", "skills", "hooks", "plugin"]

Entry B:
  - id: "claude-kanban"
  - name: { en: "claude-kanban", es: "claude-kanban" }
  - tag: { en: "CLAUDE CODE PLUGIN", es: "PLUGIN CLAUDE CODE" }
  - desc.en: "Visual kanban board for Claude Code — track tasks across todo/doing/done columns during agentic sessions, keeping multi-step work organized inside the CLI."
  - desc.es: "Tablero kanban visual para Claude Code — sigue tareas a través de las columnas todo/doing/done durante sesiones agénticas, manteniendo el trabajo multi-paso organizado dentro de la CLI."
  - stack: ["claude-code", "kanban", "cli", "plugin"]

Closes VIS-05.
  </action>
  <verify>
    <automated>node -e "const d=require('./src/data/claude.json'); const a=d.apps; if(a.length!==5) throw new Error('expected 5 apps, got '+a.length); const ids=a.map(x=>x.id); for(const id of ['caveman','claude-kanban']){ if(!ids.includes(id)) throw new Error('missing '+id);} for(const x of a){ if(typeof x.name.en!=='string'||typeof x.name.es!=='string'||typeof x.tag.en!=='string'||typeof x.tag.es!=='string'||typeof x.desc.en!=='string'||typeof x.desc.es!=='string'||!Array.isArray(x.stack)) throw new Error('shape mismatch on '+x.id);} console.log('OK 5 apps, shapes valid');"</automated>
  </verify>
  <done>apps array has 5 entries; caveman and claude-kanban present with full bilingual name/tag/desc and stack[]; JSON parses; every entry matches the existing shape.</done>
</task>

<task type="auto">
  <name>Task 2: Bump count assertions in Claude.test.js and verify component needs no change</name>
  <files>src/components/Claude.test.js</files>
  <action>
In src/components/Claude.test.js, update the two hardcoded "3 apps" references in the test at lines 62-72:
  - Line 62: change the `it(...)` description "renders all 5 services + 3 featured apps (EN)" to "renders all 5 services + 5 featured apps (EN)".
  - Line 68: change `expect(data.apps).toHaveLength(3)` to `expect(data.apps).toHaveLength(5)`.

Do NOT touch any other assertion. The existing `getByText('GSD framework')` / `getAllByText('ci-templates')` / `getAllByText('spring-ai-qdrant-mcp')` checks (lines 69-71) stay valid — the new cards add to, not replace, the originals. The schema-sanity loop (lines 112-117) iterates all apps generically and needs no count change.

Confirm there are no other occurrences of the old apps count: search the test for `toHaveLength(3)` and `3 featured` and verify only the two above exist.

Verify-only (NO edit): src/components/Claude.js renders `data.apps.map` (line 135) generically — it requires no change. Do not edit Claude.js.
  </action>
  <verify>
    <automated>rg -n "toHaveLength\(3\)|3 featured" src/components/Claude.test.js && echo "FAIL: stale count remains" && exit 1; rg -n "toHaveLength\(5\)|5 featured apps" src/components/Claude.test.js</automated>
  </verify>
  <done>Test description says "5 featured apps"; `toHaveLength(5)` present; no `toHaveLength(3)` or "3 featured" remains; Claude.js untouched.</done>
</task>

<task type="auto">
  <name>Task 3: Run vitest suite green</name>
  <files>src/components/Claude.test.js</files>
  <action>
Run the full Vitest suite to confirm the data + test changes are consistent end-to-end. This repo migrated CRA -> Vite/Vitest; use `npx vitest run` (do NOT use `npm test`/craco). All tests must pass, including the Claude section's 5-app render and the bilingual ES rendering of the new cards.
  </action>
  <verify>
    <automated>npx vitest run</automated>
  </verify>
  <done>`npx vitest run` exits 0 with all tests passing; Claude section tests assert 5 apps and render caveman + claude-kanban.</done>
</task>

</tasks>

<verification>
- `node -e` parse check: claude.json apps has 5 entries with valid shapes.
- `npx vitest run` is GREEN.
- Claude.js unchanged (generic `data.apps.map` already handles N cards).
</verification>

<success_criteria>
- src/data/claude.json `apps` array contains 5 entries: ci-templates, gsd, spring-ai-qdrant-mcp, caveman, claude-kanban.
- Both new entries are fully bilingual (en/es for name, tag, desc) with a stack[] array.
- Claude.test.js asserts `toHaveLength(5)` and the "5 featured apps" description.
- `npx vitest run` passes with no failures.
- VIS-05 closed.
</success_criteria>

<output>
Create `.planning/quick/260625-dvq-vis-05-add-caveman-claude-kanban-feature/260625-dvq-SUMMARY.md` when done.
</output>

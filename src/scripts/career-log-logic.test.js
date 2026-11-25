// @vitest-environment node
import { describe, expect, it } from 'vitest'
import experience from '../data/experience.json'
import careerLog from '../data/career-log.json'
import {
  achievements, blame, buildJobs, candidates, complete, diffJobs, dispatch, find, graph, grepJobs,
  parseAt, sha, slug, strings, suggest, text,
} from './career-log-logic.js'

const NOW = new Date(2026, 10, 14)
const jobsFor = (lang) => buildJobs(experience.entries, lang, NOW)
const jobs = jobsFor('es')
const env = (lang = 'es') => ({
  lang,
  t: strings(careerLog.ui, lang),
  now: NOW,
  contact: { email: 'andresmontoyat@gmail.com', linkedin: 'linkedin.com/in/x', github: 'github.com/andresmontoyat' },
})
const session = () => ({ jobs, hist: [], last: null })
const run = (line, s = session(), e = env()) => { s.hist.push(line); return dispatch(line, s, e) }
const flat = (res) => res.lines.map(text).join('\n')

describe('dates and ids', () => {
  it('should parse a month and year into a fractional year', () => {
    expect(parseAt('May 2016', NOW)).toBeCloseTo(2016 + 4 / 12)
  })

  it('should resolve Present to the current date', () => {
    expect(parseAt('Present', NOW)).toBeCloseTo(2026 + 10 / 12)
  })

  it('should slug a company to its first word without accents or parentheses', () => {
    expect(slug('Castor SAS (antes Mercurio)')).toBe('castor')
    expect(slug('k4s - Klever for Solutions')).toBe('k4s')
  })

  it('should hash a company to a stable 7 char sha', () => {
    expect(sha('Tul')).toMatch(/^[0-9a-f]{7}$/)
    expect(sha('Tul')).toBe(sha('Tul'))
  })
})

describe('buildJobs', () => {
  it('should keep visible entries only, newest first', () => {
    const visible = experience.entries.filter((e) => e.visible !== false)
    expect(jobs).toHaveLength(visible.length)
    expect(jobs[0].co).toBe('Intermedia')
    expect(jobs.at(-1).id).toBe('castor')
    expect(jobs.some((j) => j.co === 'CODERIO')).toBe(false)
  })

  it('should localize title, date, metric and bullets', () => {
    expect(jobs[0].d).toBe('Ago 2026 — Presente')
    expect(jobsFor('en')[0].d).toBe('Aug 2026 — Present')
    expect(jobs[1].m).toBe('8 personas a cargo · 3 frontend, 3 backend, 2 QA')
    expect(jobsFor('en')[1].b[0]).toMatch(/^Lead an 8-person team/)
  })

  it('should flag leadership roles', () => {
    expect(find(jobs, 'soldife').lead).toBe(true)
    expect(find(jobs, 'tul').lead).toBe(false)
  })

  it('should put a job that overlaps the one above on the side branch', () => {
    expect(find(jobs, 'blerify').lane).toBe(1)
    expect(find(jobs, 'f2x').lane).toBe(0)
    expect(find(jobs, 'tul').lane).toBe(0)
  })
})

describe('graph', () => {
  it('should draw one dot per job and a branch per side-lane job', () => {
    const g = graph(jobs)
    expect(g.dots).toHaveLength(jobs.length)
    expect(g.branches).toHaveLength(jobs.filter((j) => j.lane).length)
    expect(g.height).toBe(jobs.length * 52)
  })
})

describe('queries', () => {
  it('should find a job by id, sha prefix or company text', () => {
    expect(find(jobs, 'tata').co).toBe('Tata Consultancy Services')
    expect(find(jobs, jobs[2].sha.slice(0, 4))).toBe(jobs[2])
    expect(find(jobs, 'klever').id).toBe('k4s')
  })

  it('should grep jobs by tech, case insensitive', () => {
    const hits = grepJobs(jobs, 'KAFKA')
    expect(hits.length).toBeGreaterThan(1)
    expect(hits.every((j) => j.tech.some((t) => /kafka/i.test(t)))).toBe(true)
  })

  it('should diff gained, dropped and kept techs between two jobs', () => {
    const d = diffJobs(find(jobs, 'tul'), find(jobs, 'soldife'))
    expect(d.o.id).toBe('tul')
    expect(d.n.id).toBe('soldife')
    expect(d.gained).toContain('React')
    expect(d.dropped).toContain('CloudWatch')
    expect(d.kept).toContain('Java')
    expect(d.promoted).toBe(true)
    expect(d.yrs).toBe(4.1)
  })

  it('should order a diff oldest to newest whatever the argument order', () => {
    expect(diffJobs(find(jobs, 'soldife'), find(jobs, 'tul')).o.id).toBe('tul')
  })

  it('should blame the oldest job that used a tech', () => {
    const b = blame(jobs, 'rabbitmq')
    expect(b.first.id).toBe('software')
    expect(b.tech).toBe('RabbitMQ')
    expect(b.hits.at(-1).id).toBe('intermedia')
  })
})

describe('completion', () => {
  const cands = candidates(jobs, NOW)

  it('should complete commands, companies, techs and years', () => {
    expect(complete(cands, 'git shor')).toBe('git shortlog')
    expect(complete(cands, 'git show bl')).toBe('git show blerify')
    expect(complete(cands, 'grep kaf')).toBe('grep kafka')
    expect(complete(cands, 'git checkout 200')).toBe('git checkout 2007')
  })

  it('should return nothing for an exact or unknown input', () => {
    expect(complete(cands, 'clear')).toBeUndefined()
    expect(complete(cands, 'zzz')).toBeUndefined()
    expect(complete(cands, '')).toBeUndefined()
  })
})

describe('dispatch', () => {
  it('should list every command in help', () => {
    const out = flat(run('help'))
    expect(out).toContain('git blame')
    expect(out).toContain('download cv')
    expect(out).toContain('sudo')
  })

  it('should type git log and make every row clickable', () => {
    const res = run('git log')
    expect(res.typed).toBe(true)
    expect(res.lines).toHaveLength(jobs.length)
    expect(res.lines[0][0].run).toBe('git show intermedia')
  })

  it('should keep only leadership roles with --lead', () => {
    expect(run('git log --lead').lines).toHaveLength(jobs.filter((j) => j.lead).length)
  })

  it('should show a commit with its stack as grep links', () => {
    const res = run('git show tul')
    expect(res.select).toBe('tul')
    expect(flat(res)).toContain('feat: Backend Developer @ Tul')
    expect(res.lines.flat().some((seg) => seg.run === 'grep kafka')).toBe(true)
    expect(res.ctx.kind).toBe('show')
  })

  it('should mark HEAD on the newest commit', () => {
    expect(flat(run('git show intermedia'))).toContain('(HEAD → main)')
  })

  it('should fail politely on an unknown company', () => {
    expect(flat(run('git show nasa'))).toContain("fatal: no existe 'nasa'")
  })

  it('should diff two companies and promote to leadership', () => {
    const res = run('git diff tul..soldife')
    const out = flat(res)
    expect(out).toContain('diff --career a/tul b/soldife')
    expect(out).toContain('⬆ paso a liderazgo')
    expect(out).toContain('+ React')
    expect(out).toContain('- CloudWatch')
    expect(res.select).toBe('soldife')
  })

  it('should diff against the previous job when given one company', () => {
    const s = session()
    run('git show tul', s)
    expect(flat(run('git diff', { ...s, last: find(jobs, 'tul') }))).toContain('a/k4s b/tul')
  })

  it('should grep and ask the skill decks to highlight', () => {
    const res = run('grep kafka')
    expect(res.highlight).toBe('kafka')
    expect(flat(res)).toMatch(/\d+ commits · \d+ años/)
  })

  it('should report a grep with no hits', () => {
    expect(flat(run('grep cobol'))).toContain("sin resultados para 'cobol'")
  })

  it('should blame and highlight', () => {
    const res = run('git blame rabbitmq')
    expect(flat(res)).toContain('← primera vez')
    expect(res.highlight).toBe('rabbitmq')
  })

  it('should check out a year', () => {
    const out = flat(run('git checkout 2014'))
    expect(out).toContain('HEAD detached at 2014')
    expect(out).toContain('Tata Consultancy Services')
    expect(flat(run('git checkout 1999'))).toContain('aún no empezaba')
  })

  it('should summarize with shortlog using the 18+ years claim', () => {
    const out = flat(run('git shortlog'))
    expect(out).toContain(`(${jobs.length} commits)`)
    expect(out).toContain('19 años')
    expect(out).toContain('primer commit: Castor SAS (antes Mercurio) (2007)')
  })

  it('should print the README with 18+ years', () => {
    expect(flat(run('cat README.md'))).toContain('18+ años')
    expect(flat(run('cat README.md', session(), env('en')))).toContain('18+ years')
  })

  it('should link the CV per locale', () => {
    const es = run('download cv').lines.flat().find((seg) => seg.href)
    const en = run('curl cv', session(), env('en')).lines.flat().find((seg) => seg.href)
    expect(es.href).toBe('/CarlosMontoya_CV_ES.pdf')
    expect(en.href).toBe('/CarlosMontoya_CV_EN.pdf')
    expect(en.t).toBe('Download CV (EN, PDF)')
  })

  it('should print contact without a phone', () => {
    const out = flat(run('contact'))
    expect(out).toContain('andresmontoyat@gmail.com')
    expect(out).not.toMatch(/phone|tel/i)
  })

  it('should list history as runnable lines', () => {
    const s = session()
    run('whoami', s)
    const res = run('history', s)
    expect(res.lines[0].find((seg) => seg.run).run).toBe('whoami')
  })

  it('should clear', () => {
    expect(run('clear').clear).toBe(true)
  })

  it('should suggest the nearest command on a typo', () => {
    const res = run('git shwo tul')
    expect(flat(res)).toContain('comando no encontrado: git.')
    expect(res.lines[0].some((seg) => seg.run === 'git show')).toBe(true)
  })

  it('should answer sudo hire carlos', () => {
    expect(flat(run('sudo hire carlos', session(), env('en')))).toContain('Permission granted')
  })

  it('should list companies as directories', () => {
    expect(flat(run('ls'))).toContain('soldife/')
  })
})

describe('suggest', () => {
  it('should always offer download cv', () => {
    ;['start', 'cv'].forEach((kind) => expect(suggest({ kind }, jobs)).toContain('download cv'))
  })

  it('should follow a git show with the neighbours and a diff', () => {
    const list = suggest({ kind: 'show', j: find(jobs, 'tul') }, jobs)
    expect(list).toContain('git diff k4s..tul')
    expect(list).toContain('git show k4s')
    expect(list).toContain('git show blerify')
    expect(list.length).toBeLessThanOrEqual(6)
  })
})

describe('achievements', () => {
  it('should award each achievement on its trigger', () => {
    expect(achievements('sudo hire carlos', 'sudo hire carlos', 1)).toEqual(['recruiter'])
    expect(achievements('git diff', 'git diff', 2)).toEqual(['diff'])
    expect(achievements('git blame', 'git blame java', 2)).toEqual(['blame'])
    expect(achievements('git checkout', 'git checkout 2007', 2)).toEqual(['archaeologist'])
    expect(achievements('git show', 'git show castor', 5)).toEqual(['curious', 'archaeologist'])
  })
})

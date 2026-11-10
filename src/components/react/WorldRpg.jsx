import React, { useEffect, useRef, useState } from 'react'

// Props-based React island (locale via prop, matching CareerGame/Experience islands) — the
// World RPG top-down explorer. Ships as a click-to-load cover so the game engine (rAF loop,
// audio, sprite loading, canvas rendering) never enters the initial bundle or executes until
// the visitor opts in. On click it dynamically imports src/game/worldRpg.js + the experience
// data, mounts a <canvas>, and starts the game. Touch users get an on-screen D-pad + interact
// button wired directly to the exposed `state.input.press(kind, down)` (see worldRpg.js) —
// state.input is the same object the keyboard writes to, so touch and keyboard drive identical
// movement state. The `state.intro` cutscene is skipped outright under prefers-reduced-motion.

const COPY = {
  en: {
    play: '▶ Explore my career world',
    hint: 'Arrows/WASD move · E interact · L language',
    up: 'Move up',
    down: 'Move down',
    left: 'Move left',
    right: 'Move right',
    action: 'Interact',
    mute: 'Mute',
    unmute: 'Unmute',
  },
  es: {
    play: '▶ Explora mi mundo de carrera',
    hint: 'Flechas/WASD mover · E interactuar · L idioma',
    up: 'Mover arriba',
    down: 'Mover abajo',
    left: 'Mover a la izquierda',
    right: 'Mover a la derecha',
    action: 'Interactuar',
    mute: 'Silenciar',
    unmute: 'Activar sonido',
  },
}

// Same two hidden sites the game-dev.astro QA harness used — Konami-revealed sideProjects,
// not part of experience.json (kept out of the accessible timeline on purpose).
const SIDE_PROJECTS = [
  {
    id: 'mryoker',
    co: 'Mr. Yoker',
    title: { en: 'Indie', es: 'Indie' },
    date: { en: 'side project', es: 'proyecto propio' },
    metric: null,
    tech: ['Astro'],
  },
  {
    id: 'codehunters',
    co: 'Codehunters',
    title: { en: 'Indie', es: 'Indie' },
    date: { en: 'side project', es: 'proyecto propio' },
    metric: null,
    tech: ['React'],
  },
]

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function isTouchDevice() {
  return typeof navigator !== 'undefined' && (navigator.maxTouchPoints || 0) > 0
}

// ROOT CAUSE of the "too zoomed / blurry" bug: a <canvas> never given explicit width/height
// attributes defaults its drawing BUFFER to 300x150, no matter how big CSS stretches it on
// screen — so the game rendered into 300x150 and the browser upscaled that ~3x, and
// worldRpg.js's camera (which reads canvas.width/height) thought the viewport was 300x150,
// showing only a handful of tiles. This sizes the buffer to the canvas's actual CSS-displayed
// size (via getBoundingClientRect) scaled by devicePixelRatio, so retina screens still render
// at native resolution, and stamps the un-multiplied CSS size onto canvas.logicalWidth/
// logicalHeight so the camera + HUD (scene2d.js's viewportOf) use logical px, not the
// dpr-multiplied buffer. Resizing canvas.width/height resets ALL context state (transform,
// imageSmoothingEnabled), so both must be reapplied every call — including on window resize.
function sizeCanvasBuffer(canvas) {
  const rect = canvas.getBoundingClientRect()
  const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1
  canvas.width = Math.max(1, Math.round(rect.width * dpr))
  canvas.height = Math.max(1, Math.round(rect.height * dpr))
  canvas.logicalWidth = rect.width
  canvas.logicalHeight = rect.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  // Keep the upscaled 16px sprite art crisp/pixelated rather than blurred by bilinear filtering.
  ctx.imageSmoothingEnabled = false
}

function PadButton({ innerRef, label, glyph, className }) {
  return (
    <button
      ref={innerRef}
      type="button"
      aria-label={label}
      className={`w-12 h-12 rounded-full border border-border bg-bg/80 text-lg text-text flex items-center justify-center touch-none select-none hover:border-accent active:bg-accent/20 ${className}`}
    >
      {glyph}
    </button>
  )
}

function TouchControls({ copy, upRef, downRef, leftRef, rightRef, actionRef }) {
  return (
    <div className="absolute bottom-4 inset-x-4 flex items-end justify-between sm:hidden">
      <div className="relative w-40 h-28">
        <PadButton innerRef={upRef} label={copy.up} glyph="▲" className="absolute top-0 left-1/2 -translate-x-1/2" />
        <PadButton innerRef={leftRef} label={copy.left} glyph="◀" className="absolute bottom-0 left-0" />
        <PadButton innerRef={rightRef} label={copy.right} glyph="▶" className="absolute bottom-0 right-0" />
        <PadButton innerRef={downRef} label={copy.down} glyph="▼" className="absolute bottom-0 left-1/2 -translate-x-1/2" />
      </div>
      <PadButton innerRef={actionRef} label={copy.action} glyph="A" className="w-14! h-14!" />
    </div>
  )
}

export default function WorldRpg({ locale }) {
  const lang = locale
  const [started, setStarted] = useState(false)
  const [muted, setMuted] = useState(false)
  // Tracks the in-game language, which can flip independently of the `locale` prop via the
  // in-game L shortcut (see worldRpg.js's onLanguage callback) — keeps cover copy, D-pad
  // aria-labels, and the mute label in sync with what the player actually toggled to.
  const [uiLang, setUiLang] = useState(locale)
  const copy = COPY[uiLang] || COPY.en
  const canvasRef = useRef(null)
  const gameRef = useRef(null)
  const upRef = useRef(null)
  const downRef = useRef(null)
  const leftRef = useRef(null)
  const rightRef = useRef(null)
  const actionRef = useRef(null)

  useEffect(() => {
    if (!started) return undefined
    let cancelled = false
    let unbindTouch = null
    let detachResize = null

    async function mount() {
      const [{ createWorldRpg, canControl }, { default: experience }, { default: placements },
        { default: clips }, { default: authoredTiles }, { default: interactables }] = await Promise.all([
        import('../../game/worldRpg.js'),
        import('../../data/experience.json'),
        import('../../data/placements.json'),
        import('../../data/clips.json'),
        import('../../game/world/authored/career.tiles.json'),
        import('../../data/interactables.json'),
      ])
      if (cancelled || !canvasRef.current) return
      // Must run before game.start() sizes anything off the buffer (the camera's first frame
      // reads canvas.width/height) — see sizeCanvasBuffer's comment for the root-cause zoom bug.
      sizeCanvasBuffer(canvasRef.current)
      const onResize = () => { if (canvasRef.current) sizeCanvasBuffer(canvasRef.current) }
      window.addEventListener('resize', onResize)
      detachResize = () => window.removeEventListener('resize', onResize)
      setUiLang(lang)
      const game = createWorldRpg({
        canvas: canvasRef.current,
        experience,
        sideProjects: SIDE_PROJECTS,
        placements,
        clips,
        authoredTiles,
        interactables,
        lang,
        onLangChange: setUiLang,
      })
      gameRef.current = game
      // Dev-only handle for Playwright e2e assertions — never ships to production
      // (import.meta.env.DEV is false under `astro build`). Mirrors careerGame.js's
      // window.__career handle.
      if (import.meta.env.DEV) window.__worldRpg = game
      if (prefersReducedMotion()) game.state.intro.skip()
      game.start()
      canvasRef.current.focus()

      if (isTouchDevice()) {
        const dirs = [
          [upRef.current, 'U'], [downRef.current, 'D'], [leftRef.current, 'L'], [rightRef.current, 'R'],
        ].filter(([el]) => el)
        const bound = dirs.map(([el, kind]) => {
          // Capture the pointer on press so pointerup/cancel always fire on THIS button even
          // when the finger drifts off it before lifting — without capture, an off-button
          // release lands on the document and the key sticks (avatar walks forever).
          const down = (e) => {
            e.preventDefault()
            if (e.pointerId != null && el.setPointerCapture) {
              try { el.setPointerCapture(e.pointerId) } catch (_) { /* capture unsupported */ }
            }
            game.state.input.press(kind, true)
          }
          const up = (e) => { e.preventDefault(); game.state.input.press(kind, false) }
          el.addEventListener('pointerdown', down)
          el.addEventListener('pointerup', up)
          el.addEventListener('pointercancel', up)
          el.addEventListener('lostpointercapture', up)
          return { el, down, up }
        })
        const onAction = (e) => {
          e.preventDefault()
          if (!canControl(game.state)) { game.state.intro.skip(); return }
          game.interact()
        }
        if (actionRef.current) actionRef.current.addEventListener('pointerdown', onAction)
        unbindTouch = () => {
          bound.forEach(({ el, down, up }) => {
            el.removeEventListener('pointerdown', down)
            el.removeEventListener('pointerup', up)
            el.removeEventListener('pointercancel', up)
            el.removeEventListener('lostpointercapture', up)
          })
          if (actionRef.current) actionRef.current.removeEventListener('pointerdown', onAction)
        }
      }
    }

    mount()

    return () => {
      cancelled = true
      if (detachResize) detachResize()
      if (unbindTouch) unbindTouch()
      if (gameRef.current) {
        gameRef.current.stop()
        gameRef.current = null
      }
      if (import.meta.env.DEV) window.__worldRpg = null
    }
  }, [started, lang])

  function toggleMute() {
    setMuted((prev) => {
      gameRef.current?.toggleMute()
      return !prev
    })
  }

  // No border/rounded/bg-surface here — this component is "the screen", framed by the
  // retro-console bezel one level up (src/pages/*/game.astro). A second nested border here
  // would compete with the bezel's own inset neon ring instead of reading as one device.
  if (!started) {
    return (
      <div className="world-rpg-cover relative flex flex-col items-center justify-center gap-3 bg-ink-950 py-20">
        <button
          type="button"
          onClick={() => setStarted(true)}
          className="font-pixel text-xs sm:text-sm uppercase tracking-[2px] rounded-full border border-accent px-6 py-3 text-accent hover:bg-accent hover:text-bg transition-colors duration-150"
        >
          {copy.play}
        </button>
        <p className="font-mono text-xs text-muted">{copy.hint}</p>
      </div>
    )
  }

  return (
    <div className="world-rpg relative overflow-hidden bg-ink-950">
      <canvas
        ref={canvasRef}
        data-testid="world-rpg-canvas"
        tabIndex={0}
        // h-[70vh] max-h-[640px] left too little room for the bezel's title row + the control
        // legend below it on standard viewport heights — the legend read as clipped under the
        // canvas (polish-pass screenshot review). Trimmed the vh share and the cap so the full
        // device (bezel + title + canvas + legend) fits within one viewport on common desktop
        // heights, with min-h as a floor so very short viewports don't collapse the canvas.
        className="block w-full h-[56vh] max-h-[520px] min-h-[320px] outline-hidden [image-rendering:pixelated]"
      />
      <TouchControls copy={copy} upRef={upRef} downRef={downRef} leftRef={leftRef} rightRef={rightRef} actionRef={actionRef} />
      <button
        type="button"
        onClick={toggleMute}
        aria-label={muted ? copy.unmute : copy.mute}
        className="absolute top-3 right-3 w-9 h-9 rounded-full border border-border bg-bg/80 text-text flex items-center justify-center hover:border-accent"
      >
        {muted ? '🔇' : '🔊'}
      </button>
    </div>
  )
}

import React, { useEffect, useRef, useState } from 'react'

// Props-based React island (locale via prop, matching Experience/Nav islands)
// — the Career World canvas platformer. Ships as a click-to-load cover so the
// game engine (rAF loop, audio, canvas rendering) never enters the initial
// bundle or executes until the visitor opts in. On click it dynamically
// imports src/game/careerGame.js, mounts a <canvas>, and wires the touch
// d-pad to the engine's own state.input.bindTouch (see src/game/engine/input.js)
// so on-screen buttons drive the same L/R/J key state as keyboard input.
// Role-detail panel fields mirror the Experience card (`co`, `y`, `biome`,
// `role`, `date`, `metric`, `tech`, `bullets`) via the engine's onOpenPanel
// callback.

const COPY = {
  en: {
    play: '▶ Play my career',
    left: 'Move left',
    right: 'Move right',
    jump: 'Jump',
    mute: 'Mute',
    unmute: 'Unmute',
    close: 'Close',
  },
  es: {
    play: '▶ Juega mi carrera',
    left: 'Mover a la izquierda',
    right: 'Mover a la derecha',
    jump: 'Saltar',
    mute: 'Silenciar',
    unmute: 'Activar sonido',
    close: 'Cerrar',
  },
}

function pick(field, lang) {
  if (typeof field === 'string') return field
  return field?.[lang] ?? field?.en ?? ''
}

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function DPadButton({ innerRef, label, glyph }) {
  return (
    <button
      ref={innerRef}
      type="button"
      aria-label={label}
      className="w-12 h-12 rounded-full border border-border bg-bg/80 text-lg text-text flex items-center justify-center touch-none select-none hover:border-accent active:bg-accent/20"
    >
      {glyph}
    </button>
  )
}

function DPad({ copy, leftRef, rightRef, jumpRef }) {
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 sm:hidden">
      <DPadButton innerRef={leftRef} label={copy.left} glyph="◄" />
      <DPadButton innerRef={jumpRef} label={copy.jump} glyph="▲" />
      <DPadButton innerRef={rightRef} label={copy.right} glyph="►" />
    </div>
  )
}

function RolePanel({ company, lang, copy, onClose }) {
  const bullets = pick(company.bullets, lang)
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-bg/85 backdrop-blur-xs p-4">
      <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-xl border border-accent/40 bg-surface p-6">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <div className="font-mono text-xs text-accent">{company.y} · {pick(company.date, lang)}</div>
            <h3 className="text-lg font-extrabold text-text leading-tight">{pick(company.role, lang)}</h3>
            <div className="text-sm text-muted">{company.co}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={copy.close}
            className="shrink-0 text-muted hover:text-text"
          >
            ✕
          </button>
        </div>
        {company.metric && (
          <div className="font-mono text-xs uppercase tracking-[2px] text-muted mb-3">
            {company.metric.value} {pick(company.metric.label, lang)}
          </div>
        )}
        {Array.isArray(company.tech) && company.tech.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {company.tech.map((chip) => (
              <span
                key={chip}
                className="font-mono text-[11px] py-1 px-2.5 bg-bg border border-border rounded-full text-muted"
              >
                {chip}
              </span>
            ))}
          </div>
        )}
        {Array.isArray(bullets) && bullets.length > 0 && (
          <ul className="text-sm text-text/85 leading-relaxed space-y-1.5">
            {bullets.map((b) => <li key={b}>→ {b}</li>)}
          </ul>
        )}
      </div>
    </div>
  )
}

export default function CareerGame({ locale }) {
  const lang = locale
  const copy = COPY[lang] || COPY.en
  const [started, setStarted] = useState(false)
  const [panel, setPanel] = useState(null)
  const [muted, setMuted] = useState(false)
  const canvasRef = useRef(null)
  const gameRef = useRef(null)
  const leftRef = useRef(null)
  const rightRef = useRef(null)
  const jumpRef = useRef(null)

  useEffect(() => {
    if (!started) return undefined
    let cancelled = false

    async function mount() {
      const { init } = await import('../../game/careerGame.js')
      if (cancelled || !canvasRef.current) return
      const game = init(canvasRef.current, {
        locale: lang,
        reduced: prefersReducedMotion(),
        onOpenPanel: setPanel,
      })
      gameRef.current = game
      const { input } = game.getState()
      if (input?.bindTouch) {
        if (leftRef.current) input.bindTouch(leftRef.current, 'L')
        if (rightRef.current) input.bindTouch(rightRef.current, 'R')
        if (jumpRef.current) input.bindTouch(jumpRef.current, 'J')
      }
      game.start()
      canvasRef.current.focus()
    }

    mount()

    return () => {
      cancelled = true
      if (gameRef.current) {
        gameRef.current.stop()
        gameRef.current = null
      }
    }
  }, [started, lang])

  function toggleMute() {
    setMuted((prev) => {
      const next = !prev
      gameRef.current?.setMuted(next)
      return next
    })
  }

  if (!started) {
    return (
      <div className="career-game-cover relative flex items-center justify-center rounded-xl border border-border bg-surface py-20">
        <button
          type="button"
          onClick={() => setStarted(true)}
          className="font-pixel text-xs sm:text-sm uppercase tracking-[2px] rounded-full border border-accent px-6 py-3 text-accent hover:bg-accent hover:text-bg transition-colors duration-150"
        >
          {copy.play}
        </button>
      </div>
    )
  }

  return (
    <div className="career-game relative overflow-hidden rounded-xl border border-border bg-surface">
      <canvas
        ref={canvasRef}
        data-testid="career-canvas"
        tabIndex={0}
        className="block w-full h-[70vh] max-h-[640px] outline-hidden"
      />
      <DPad copy={copy} leftRef={leftRef} rightRef={rightRef} jumpRef={jumpRef} />
      <button
        type="button"
        onClick={toggleMute}
        aria-label={muted ? copy.unmute : copy.mute}
        className="absolute top-3 right-3 w-9 h-9 rounded-full border border-border bg-bg/80 text-text flex items-center justify-center hover:border-accent"
      >
        {muted ? '🔇' : '🔊'}
      </button>
      {panel && (
        <RolePanel
          company={panel}
          lang={lang}
          copy={copy}
          onClose={() => {
            gameRef.current?.close()
            setPanel(null)
          }}
        />
      )}
    </div>
  )
}

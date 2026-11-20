# Mapa visual del World RPG — qué cambiar y dónde

Referencia directa: para cada cosa que se ve en el juego, **qué archivo**, **qué símbolo** y **qué efecto**.
No hay "Claude Design" para esto: el juego se dibuja en `<canvas>` con código + un atlas de sprites.

## Cómo funciona el pipeline (leer una vez)

```
manifest.js  ──(npm run assets:pack)──▶  atlas.png + atlas.json  ──▶  scene2d.js / entities/*  dibujan en <canvas>
 (coords {x,y,w,h}                         (imagen baked +            (posición, tamaño, animación,
  de cada frame                             lookup de frames)          orden de profundidad)
  dentro de los PNG)
```

- **Cambias coords/qué sprite** → editas `src/game/assets/manifest.js` → corres `npm run assets:pack` → `npm run build`.
- **Cambias posición/tamaño/animación/colocación** → editas `scene2d.js` o `entities/*` o `world/*` → `npm run build` (NO hace falta re-pack).
- Ver cambios: `npx astro preview --port=4321` → `http://localhost:4321/en/game` (usar build de prod, `astro dev` rompe los islands).
- Node ≥22: usar `/opt/homebrew/bin/node` o `PATH=/opt/homebrew/bin:$PATH`.

---

## 🌊 Estanque

| Qué | Archivo | Símbolo | Efecto |
|-----|---------|---------|--------|
| Posición y tamaño | `world/overworld.js` | `PONDS = [{x,y,r}]` | Mueve/agranda cada estanque. `r` = radio del agua |
| Silueta (recorte de tiles) | `render/scene2d.js` | `resolveWaterFrame` (`n+e+s+w < 2`) | Sube el umbral → recorta más "picos"; baja → más cuadriculado |
| Arte del agua | `assets/manifest.js` | `water_*` (usa `cfWaterTile`) | Cambia el PNG fuente o las celdas del autotile |
| Anillos de ola | `render/ambient.js` | `WAVE_RINGS`, `WAVE_SPEED`, `WAVE_AMPLITUDE`, `strokeStyle` | # de anillos, velocidad, tamaño, color/opacidad (`rgba(255,255,255,0.35)`) |
| Decoración acuática | `world/decor.js` | `buildPondLife` | Cuántos lillypads/cattails, dónde va la rana y la kapybara (radios `*0.68`, `*0.92`, `*0.3`) |
| Colisión | `worldRpg.js` | `pondSolids` (`r * 0.82`) | Qué tan cerca del agua se puede parar el jugador |

**Estanque se ve tosco → recetas rápidas:** subir `r` a ~90-110 (más grande y redondo); bajar la opacidad de las olas a `0.18`; subir el umbral de recorte para bordes más limpios.

---

## 🧍 Hero (Carlos)

| Qué | Archivo | Símbolo | Efecto |
|-----|---------|---------|--------|
| Ropa/pelo | `assets/manifest.js` | `AVATAR_LAYER_IMG` (`cfLegs`/`cfChest`/`cfHair`/`cfFeet`) | Cambia el PNG de cada capa → otra camisa/pelo/color |
| Orden de capas | `render/tiles.js` | `AVATAR_LAYERS` | Qué se dibuja encima de qué |
| Tamaño en pantalla | `render/scene2d.js` | `AVATAR_W`, `AVATAR_H` (40×44) | Más grande/pequeño |
| Frames de caminar | `render/tiles.js` | `AVATAR_WALK_FRAMES` (6) | Fluidez del ciclo |
| Velocidad de animación | `worldRpg.js` / `scene2d.js` | `STEP_RATE` (0.15) / `IDLE_TICKS` (44) | Rapidez del caminar / respiración idle |

---

## 🏠 Edificios

| Qué | Archivo | Símbolo | Efecto |
|-----|---------|---------|--------|
| Casa por empresa | `world/overworld.js` | `HOUSES`, `LANDMARKS`, `buildingFor` | Qué sprite le toca a cada empresa |
| Tamaño/footprint | `world/overworld.js` | `BUILDING_DIMS` | Ancho/alto dibujado + colisión |
| Granero/molino en granja | `world/overworld.js` | `farmBuilding`, `farmWindmill` | Posición y sprite |
| Aspas del molino | `render/scene2d.js` | `SAIL_DX`, `SAIL_DY`, `WINDMILL_SAIL` | Dónde montan las aspas + velocidad de giro |
| Etiqueta de empresa | `render/scene2d.js` | `drawBuildingLabel` | Texto sobre el edificio |

---

## 🐔 Animales (granja) y 🧑‍🌾 NPCs

| Qué | Archivo | Símbolo | Efecto |
|-----|---------|---------|--------|
| Qué animales / cuántos | `entities/critters.js` | `KINDS`, `ROSTER` | Especies + mezcla; `size`/`speed`/`ampX/Y`/`ticks` por especie |
| Qué NPC por edificio | `entities/npcs.js` | `NPC_IMG` (manifest), `npcTypeFor` | Tipo de aldeano por empresa |
| Tamaño/deambular NPC | `entities/npcs.js` | `NPC_W/H`, `WANDER_SPEED`, `AMP_X/Y`, `FRONT_OFFSET` | Qué tan grandes, dónde y cuánto se mueven |

---

## 🌳 Decoración y 🟩 terreno

| Qué | Archivo | Símbolo | Efecto |
|-----|---------|---------|--------|
| Qué props/árboles se esparcen | `world/decor.js` | `TYPES`, `SOLID_TYPES` | Añadir/quitar tipos de decoración |
| Densidad de decoración | `world/decor.js` | `DENSITY` | Más/menos objetos por área |
| Tamaño de cada decor | `render/scene2d.js` | `DECOR_DIMS` | Ancho/alto de cada tipo |
| Decor animada | `render/scene2d.js` | `ANIM_DECOR` | Frames/velocidad de flores, lillypad, rana, etc. |
| Balanceo (viento) | `render/ambient.js` | `SWAY_TYPES`, `SWAY_SKEW` | Qué se mece y cuánto |
| Tile de suelo por bioma | `render/tiles.js` | `GROUND_VARIANTS`, `GROUND_WEIGHTS` | Qué tiles y proporción por bioma |
| Tinte de era (cyber/castillo) | `render/scene2d.js` | `ERA_TINTS`, `ERA_TINT_ALPHA` | Color/fuerza del wash por era |
| Camino de adoquines | `assets/manifest.js` | `path_*`, `PATH_THRESHOLD` (tiles.js) | Arte + ancho del camino |

---

## ➕ Cómo AGREGAR un sprite nuevo (receta)

1. **Encuentra el frame** en el pack: `public/game/cute-fantasy/...`. Mide con `sips -g pixelWidth -g pixelHeight archivo.png` y ubica la celda `{x,y,w,h}`.
2. **Regístralo en** `src/game/assets/manifest.js`:
   - añade el PNG a `images:` (`cfMiCosa: '/game/cute-fantasy/.../Mi.png'`, espacios → `%20`)
   - añade el/los frame(s) a `frames:` (`mi_cosa: { img: 'cfMiCosa', x, y, w, h }`)
   - añade su tamaño real a `manifest.test.js` (`REAL_IMAGE_SIZE`) y el nombre a `REQUIRED_FRAMES`
3. **Bake:** `npm run assets:pack` (regenera `atlas.png` + `atlas.json`).
4. **Úsalo** según qué sea:
   - decoración esparcida → `world/decor.js` `TYPES` + `scene2d.js` `DECOR_DIMS` (+ `ANIM_DECOR` si anima)
   - animal de granja → `entities/critters.js` `KINDS` + `ROSTER`
   - decor de estanque → `world/decor.js` `buildPondLife`
   - edificio → `world/overworld.js` (`HOUSES`/`LANDMARKS`/`farm*`) + `scene2d.js` dibujo
5. **Verifica:** `npm run build` → preview → screenshot.

---

## 🧰 Colocar sprites en el mundo

Se hace en el World Editor (repo `world-editor`): el mapa `src/game/world/authored/career.map.json`
es la única fuente. El antiguo Asset Placer (`public/game/placer.html`) se retiró porque se publicaba
en producción junto con el inventario del pack de pago.

## Flujo recomendado para "arreglar lo visual"

1. Abres `localhost:4321/en/game`, ves qué se ve mal.
2. Buscas el elemento en la tabla de arriba → sabes archivo + símbolo exacto.
3. Me dices "sube `r` del estanque a 100" / "camisa azul en vez de roja" / "menos árboles" — o lo ajusto yo y te muestro el screenshot.
4. Repetimos hasta que te guste. Commit + push.
</content>

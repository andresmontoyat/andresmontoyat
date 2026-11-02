# Fase 2 — Interiores

- Fecha: 2026-11-02
- Estado: aprobado por el autor (2026-11-02)
- Roadmap: [Fase 2 de 2026-10-20-career-rpg-roadmap-design.md](2026-10-20-career-rpg-roadmap-design.md)
- ADR: [0004 — A house can have an interior](../../adr/0004-a-house-can-have-an-interior.md) (aceptado)

## Intención

Hoy cada casa del mundo es una experiencia laboral, y al llegar a su puerta y pulsar la acción sale una
tarjeta con cargo, empresa, fechas, métrica y tecnologías. La fase 2 deja **entrar** en la casa. Dentro, quien
juega recorre la experiencia: un personaje le recibe y los objetos de la sala cuentan, uno a uno, lo que se
hizo en ese trabajo.

El porqué: es lo que más acerca el sitio a un RPG de verdad, y lo hace sin inventar contenido. El texto sale
de `src/data/experience.json`, la misma fuente que el sitio y el CV, así que los tres cuentan la misma
historia en EN y ES.

## Lo que decidió el autor

1. **Cada experiencia tiene su interior, decorado a mano** en el world-editor. Nada se genera.
2. **Un personaje por casa** da la ficha corta de la experiencia: `title`, `company`, `date` y `metric`.
3. **Objetos para leer**, uno por bullet. Interactuar con uno abre un diálogo de lectura con ese bullet.
   Una casa tiene tantos objetos de lectura como bullets tiene su experiencia (Soldife 8, Tul 4, …).
4. **El texto sale de `experience.json`**, en el idioma activo del juego. Cambiar un bullet cambia el
   juego. Los guiones se pueden pulir después sin tocar este diseño.
5. **Salida sin guía:** dentro hay una puerta; el jugador camina hasta ella y sale, igual que entró. Fuera
   aparece delante de la puerta de esa casa.
6. **Un `.map.json` por interior** (opción A). Se une a la casa por el id de la experiencia, el mismo que
   ya lleva la puerta exterior (`door:soldife-2026`). Pasar más adelante a "varios mapas en un proyecto"
   no obliga a rehacer los interiores, porque el formato de cada mapa no cambia.
7. **Entrega por partes.** Una casa sin interior se comporta como hoy (tarjeta en la puerta). Cada interior
   terminado se adopta y esa casa se abre. La fase se cierra cuando las 11 casas visibles están abiertas.
   El juego sigue apagado en producción (`features.game=false`) mientras tanto.

## Objetivos

- Entrar y salir de cualquier casa con interior, sin perder la posición en el mundo.
- Leer la ficha (personaje) y cada bullet (objetos) en EN y ES.
- Teclado y táctil: la misma acción que hoy abre la tarjeta (tecla de acción / botón táctil).
- Autoría 100 % en el editor: decorar, colocar personaje, objetos, punto de entrada y puerta de salida.
- El import rechaza un interior incompleto o mal etiquetado, con un mensaje que dice qué arreglar.

## No objetivos

- Diálogos con elecciones, misiones, inventario, recompensas (las skills son la fase 3).
- Reescribir los bullets en voz de personaje. Por ahora se leen tal cual.
- Varios mapas dentro de un proyecto del editor, portales navegables desde el editor.
- Guía hacia la salida (flecha, brillo).
- Interiores para experiencias ocultas (`visible:false`, hoy solo CODERIO): no tienen casa.

## Anti-objetivos (fallaría aunque funcione)

- Texto del juego que no coincide con el sitio/CV.
- Un bullet que no aparece en ninguna parte de la casa, o un objeto que dice algo que no está en los datos.
- Salir de una casa y aparecer en otro sitio del mundo.
- Que la página del juego pierda el objetivo de rendimiento (Lighthouse 90+ en móvil) por cargar los 11
  interiores de golpe.

## Restricciones

- Mapa exterior y pipeline actuales: `career.map.json` → `npm run map:import` → `npm run assets:pack`
  (ADR 0001–0003). El pack de arte es de pago y está fuera del repo, así que el import no corre en CI;
  los artefactos generados sí se versionan.
- El editor valida la **forma** de las etiquetas, no su vocabulario; el vocabulario lo define y valida el
  import del sitio (`convert.js`, `IDENTITY_KINDS` / `FLAG_TAGS`).
- Una sola fuente de texto: `experience.json`. El mapa no guarda texto, solo referencias.

## Cómo es

### Autoría (editor)

Un interior es un mapa normal del editor, con su propio tamaño de mundo, capas de tiles y objetos. El autor
lo exporta como `src/game/world/authored/interiors/<experience-id>.map.json`. El id del fichero es el id de
la experiencia (`tul-2022.map.json`).

Etiquetas que usa un interior (vocabulario completo en el ADR 0004):

| Etiqueta | En qué objeto | Cuántas |
|---|---|---|
| `spawn` | donde aparece el jugador al entrar (ya existe como flag) | exactamente 1 |
| `npc:host` | el personaje que da la ficha | exactamente 1 |
| `read:<n>` | un objeto de lectura; `n` es el número del bullet, desde 1 | uno por bullet |
| `exit` | la puerta de salida | exactamente 1 |

El objeto con `read:3` lee el tercer bullet de esa experiencia. El orden de los objetos en la sala lo decide
el autor colocándolos; el número solo dice qué texto lleva.

### Import (sitio)

`npm run map:import` procesa el exterior como hoy y además cada fichero de `interiors/`:

- Valida cada interior con las mismas reglas que el exterior (cuadrícula, frames, hitboxes, agua) y además:
  - el id del fichero es una experiencia visible con puerta en el exterior;
  - tiene exactamente un `spawn`, un `npc:host` y un `exit`;
  - los `read:<n>` cubren exactamente `1..bullets.length` de esa experiencia: ni falta uno, ni sobra uno, ni
    se repite.
- Emite los artefactos de cada interior (tiles, placements, interactables), y sus frames entran en el atlas
  en `npm run assets:pack`.
- Informa de la cobertura como hoy con las puertas: qué casas tienen interior y cuáles no.

### Juego

- **Escena.** El estado del juego tiene una escena activa: el exterior o un interior concreto. Exterior e
  interior comparten jugador, cámara, entrada, diálogo, audio y bucle; cambia el mundo que se dibuja y con
  el que se choca.
- **Entrar.** En la puerta de una casa con interior, la acción entra (con una transición breve). En una casa
  sin interior, la acción abre la tarjeta de hoy.
- **Dentro.**
  - El jugador aparece en el `spawn`.
  - Acción junto al `npc:host`: diálogo con la ficha (lo que hoy muestra la tarjeta, `dialogLines`).
  - Acción junto a un `read:<n>`: diálogo con el bullet `n` en el idioma activo. Si no cabe en una página, se
    pagina; la acción avanza página y cierra al final.
  - Acción en el `exit`: sale.
- **Salir.** El jugador vuelve al exterior delante de la puerta de esa casa (`doorPoint`), mirando hacia
  abajo, con el resto del estado del exterior intacto (hora del día, casas vistas, criaturas).
- **Idioma.** Cambiar de idioma con un diálogo abierto cambia el texto, como hoy.
- **Táctil.** El D-pad y el botón de acción actuales sirven sin cambios.

## Aceptación

1. Las casas con interior se entran y se salen; al salir, el jugador está delante de la puerta de la que
   entró.
2. En cada interior, el personaje da la ficha y cada bullet se lee exactamente en un objeto, en EN y ES.
3. Una casa sin interior se comporta como hoy.
4. El import rechaza: un interior de una experiencia oculta o sin puerta; uno sin `spawn`, `npc:host` o
   `exit`; un bullet sin objeto; un `read:<n>` fuera de rango o repetido.
5. Teclado y táctil completan el recorrido entrar → leer todo → salir.
6. Con 11 interiores adoptados, la página del juego (preview con el juego encendido) pasa
   `npm run lighthouse:check` en móvil (rendimiento ≥ 0.95), y la primera carga no descarga ningún interior.
7. Tests de la conversión, la cobertura de bullets y el cambio de escena, en la línea de los existentes.

## Decisiones mías (revisables)

- **Salir con la acción, no pisando la puerta.** "Igual que entró": hoy se entra pulsando acción en la
  puerta, así que se sale igual. Evita salir sin querer al rozar la puerta.
- **Etiquetas `npc:host`, `read:<n>`, `exit`.** `npc` ya está en el vocabulario. `read` y `exit` son nuevas.
  El número de bullet empieza en 1 porque es lo que el autor ve contando.
- **El interior no repite el id de la experiencia en sus etiquetas.** Ya lo dice el nombre del fichero.
- **El import rechaza un interior incompleto** en vez de abrir una casa a medias, igual que hoy rechaza una
  experiencia visible sin puerta.
- **La ficha del personaje es la tarjeta de hoy, completa** (`dialogLines`, con la línea `‹tech›`). Así el
  stack sigue apareciendo dentro de la casa y no hay un segundo formato de ficha que mantener.
- **El personaje es un objeto colocado, no una entidad nueva.** Un sprite que el autor elige en el editor,
  animado si le pone un clip, con un radio de interacción. El NPC que hoy pasea delante de cada casa se
  queda fuera, sin cambios.
- **Carpeta `interiors/` = adoptado.** Un interior a medias vive fuera del repo (en el proyecto del editor);
  solo se copia a `interiors/` cuando está completo. Así un borrador nunca bloquea `map:import` del
  exterior, y el import puede seguir siendo estricto: un fichero en `interiors/` que no valida hace fallar
  el import entero.
- **Cobertura en EN y ES por separado.** Los bullets de los dos idiomas deben tener el mismo número; si no,
  el import falla diciendo qué experiencia.
- **Rendimiento: el gate del repo** (`npm run lighthouse:check`, rendimiento ≥ 0.95), medido sobre una
  build de preview con `features.game=true`, que es como ya se hacen los playtests. Para no pagar los 11
  interiores en la primera carga, **cada interior se carga cuando el jugador entra**: sus datos y su propio
  atlas, aparte del atlas del exterior. Esto corrige el "mismo atlas" del primer borrador del ADR.
- **Entrar marca la casa como vista**, igual que hoy abrir la tarjeta.
- **El editor no necesita cambios para empezar.** Ya valida la forma de `read:3` y `npc:host`, y `exit` es
  una palabra suelta válida. Una lista de ids o un autocompletado se puede añadir más adelante.

## Lo que queda al constructor

- Dónde y con qué forma se emiten los artefactos y el atlas de cada interior, y cómo se piden al entrar
  (con qué se ve mientras carga).
- Estructura del cambio de escena en `worldRpg.js` / `scene2d.js`, y la transición.
- Alcance de interacción del personaje y de los objetos (distancias), y el prompt visual si lo hay.
- Paginación del diálogo: ancho de línea y cuántas líneas por página.
- Si los tiles del interior se dibujan con el mismo camino que el exterior (`drawAuthoredTiles`) y qué se
  apaga dentro (ciclo día/noche, olas, criaturas, música por región).
- Un interior de prueba para tests y aceptación antes de los 11 reales.

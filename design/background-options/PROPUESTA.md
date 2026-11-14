# Propuesta: familia de fondos aleatorios para CalendarPRO

13 SVG autocontenidos 1600x1000 (8-51 KB, sin CDN ni fuentes), ilustraciones originales: 6 de almanaque vintage y 7 de paisaje acuarela calido (ambiente, sin escenas ni personajes de peliculas existentes). Vista previa y maquetas claro/oscuro: `index.html`. Datos para la app: `manifest.json`.

## Fondos (velo claro / oscuro = opacidad de la capa sobre el fondo)
| # | Fondo | Estacion / animo | Velo |
|---|---|---|---|
| 01 | Primavera de cerezo | primavera, serena | .58 / .74 |
| 02 | Verano: trigo y girasol | verano, dorado | .60 / .74 |
| 03 | Otono: hojas y bellotas | otono, pergamino | .60 / .76 |
| 04 | Invierno: acebo y escarcha | invierno, frio | .60 / .76 |
| 05 | Almanaque celeste | todo el ano, lunar | .62 / .78 |
| 06 | Herbario de hojas prensadas | todo el ano, naturalista | .60 / .76 |
| 07 | Colina de verano con cumulos | verano, luminoso | .50 / .74 |
| 08 | Bosque con niebla y rayos | primavera, quieto | .50 / .72 |
| 09 | Tren sobre el mar | verano, viaje | .52 / .74 |
| 10 | Aldea al atardecer | otono, hora dorada | .52 / .76 |
| 11 | Cielo de tormenta suave | primavera/otono, lluvia mansa | .50 / .74 |
| 12 | Noche con luciernagas | verano, magico (fondo oscuro) | .70 / .50 |
| 13 | Aldea nevada | invierno, acogedor | .50 / .74 |

Velo: claro = rgba(252,248,240,a); oscuro = rgba(16,18,24,a). Cada fondo deja una zona de respiro (detalle en `manifest.json`, campo `calm`): cielo o papel liso en el centro/tercio superior; el motivo va a esquinas o al tercio inferior.

## Reglas de aleatoriedad
- Modo: `open` (cada vez que se abre la app), `daily` (por fecha), `monthly` (por mes), `interval` (cada N min, 15-1440).
- Semilla determinista: daily = hash(AAAA-MM-DD), monthly = hash(AAAA-MM), para que todas las ventanas muestren el mismo fondo. `open` e `interval` usan Math.random.
- Nunca repetir el anterior: guardar `lastBackgroundId` en settings; si el sorteo coincide, avanzar al siguiente del pool.
- Baraja sin reposicion: recorrer todo el pool antes de repetir (guardar `shuffleBag` en settings).
- Filtros del pool: por grupo (vintage / acuarela / Mis imagenes), por estacion (campo `season`), o "estacion actual" (usa `months`; los de "todo el ano" siempre entran). En modo mensual con "estacion actual", prioriza los que contienen el mes en `months`.

## Ajustes en la UI (Ajustes > Apariencia)
- Fondo: [Ninguno | Aleatorio | Fijo | Mis imagenes].
- Aleatorio: cambiar [al abrir | cada dia | cada mes | cada N min]; incluir [Vintage / Acuarela / Mis imagenes]; solo estacion actual (casilla); boton "Cambiar ahora".
- Fijo: galeria de miniaturas (reutilizar el selector actual de artTheme).
- Intensidad del velo: deslizador 0-95 % que sobrescribe el recomendado (por defecto "Recomendado"). En temas oscuros/midnight se usa velo oscuro; tema `contrast` siempre sin fondo (como hoy).
- Mis imagenes: boton "Abrir carpeta" (carpeta en datos de la app, p. ej. `<AppData>/backgrounds/`), "Actualizar" y contador. Formatos svg/png/jpg/webp. El usuario coloca ahi sus imagenes (propias o descargadas por el de fuentes cuyos terminos de uso permitan ese uso); la app no descarga nada. Velo recomendado por defecto .60 / .74.

## Integracion con artTheme
- Ampliar `ArtThemeId` con `"random"` y `"custom"` y los ids de la coleccion (`primavera-cerezo`, ...); los temas actuales (botanical, birds...) se mantienen como "marca de agua".
- Nuevo modelo en `art.ts`: `BACKGROUNDS: {id, file, group, season, months, veilLight, veilDark}[]` (generable desde `manifest.json`); copiar los SVG a `assets/art/bg/`. Nueva funcion `resolveBackground(settings, now, rng)` pura y testeable (reglas de arriba) que devuelve `{url, veil}`; tests junto a `art.test.ts` (sin repeticion, semilla diaria estable, filtro estacional).
- Diferencia de render: la marca de agua actual es un icono centrado a baja opacidad; estos fondos son a pantalla completa (`background-size: cover`), con una capa `.month-art__veil` encima (color segun tema + alpha del velo). No se necesita el `filter: invert` oscuro actual; el velo oscuro lo sustituye.
- Mis imagenes: en Tauri listar la carpeta con un comando Rust y servir con `convertFileSrc` (requiere ampliar el CSP `img-src` con `asset:`/`http://asset.localhost` y el scope del protocolo asset solo a esa carpeta).
- Nuevos ajustes: `bgMode`, `bgRotation`, `bgPool`, `bgVeil`, `lastBackgroundId`, `shuffleBag`; validar con `isArtTheme`-like en carga.
- Rendimiento: los SVG usan feTurbulence; si se nota lentitud en pantallas 4K, rasterizar a WebP 1920 en build (opcional).

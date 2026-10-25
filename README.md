# CalendarPRO

**Calendario, agenda y notas 100 % locales — by Parrita Labs.**

CalendarPRO es una app de escritorio para organizar el día sin cuentas, sin
nube y sin telemetría. Todo se guarda en un único archivo JSON dentro de la
carpeta de datos de la aplicación, y puedes exportar respaldos cuando quieras.

## Funcionalidades

- **Cuatro vistas**: mes, semana, día y agenda continua.
- **Eventos** con calendario, lugar, etiquetas, notas, recordatorio y repetición
  (diaria, semanal, mensual o anual, con intervalo y fecha final), además de
  estado (ocupado, libre, tentativo, ausente), sensibilidad, asistentes y la
  opción de omitir una sola ocurrencia.
- **Calendarios múltiples** con color y visibilidad independiente.
- **Notas en Markdown** con vista previa, etiquetas, notas fijadas y vínculo a un
  día concreto del calendario.
- **Búsqueda instantánea** de eventos y notas (`Ctrl/Cmd + K`).
- **Importación `.ics`** sin conexión, con recurrencia, excepciones, alarmas y
  estados; las limitaciones del archivo se informan antes de importar.
- **Feriados por país** generados localmente (ES, MX, CO, CL, PE, AR, US).
- **Impresión** de mes, semana, día, agenda y nota con la marca de Parrita Labs.
- **Números de semana** ISO y **zona horaria secundaria** en las vistas de tiempo.
- **Respaldo automático** diario con 14 copias rotativas, además de los respaldos
  manuales.
- **Seis temas** (sistema, claro, oscuro, medianoche, sepia, alto contraste) y
  siete colores de acento.
- **Fondos artísticos opcionales**: cinco ilustraciones vintage (flores
  botánicas, aves, conejos, niños jugando y animales) dibujadas como SVG locales
  y aplicadas como marca de agua tenue detrás de la cuadrícula del mes.
- **TODO de la semana**: panel en la barra lateral con todo lo agendado en la
  semana visible, agrupado por día y con casillas para marcar cada ocurrencia
  como hecha. Muestra pendientes y progreso, y respeta calendarios ocultos y el
  filtro de etiquetas.
- **Español e inglés**, semana desde lunes o domingo, formato de 12 o 24 horas.
- **Recordatorios del sistema** opcionales, solo mientras la app está abierta.
- **Respaldos**: JSON completo (restaurable), `.ics` para otras apps de
  calendario, notas en Markdown y agenda en Markdown.

## Atajos

| Tecla | Acción |
| --- | --- |
| `N` | Nuevo evento |
| `T` | Ir a hoy |
| `1` `2` `3` `4` | Mes, semana, día, agenda |
| `Ctrl/Cmd + K` o `/` | Buscar |
| `Esc` | Cerrar el diálogo o quitar el filtro |

## Desarrollo

Requisitos: Node 20+ y Rust 1.77+ (probado con Node 24 y Rust 1.99).

```bash
npm install
npm run dev          # UI en el navegador (datos en localStorage)
npm run app:dev      # app de escritorio con Tauri
npm test             # pruebas de fechas, recurrencia, ICS, búsqueda, respaldos y layout
npm run typecheck
npm run build
```

Con `npm run dev` puedes abrir `http://localhost:1420/?demo=1` para cargar un
conjunto de eventos y notas de ejemplo; añade `&view=week`, `&view=day` o
`&view=agenda` para abrir otra vista. Los datos de ejemplo solo existen en
desarrollo.

## Instaladores

```bash
npm run dist:win     # Windows · NSIS
npm run dist:mac     # macOS · DMG
npm run dist:linux   # Linux · AppImage + .deb
```

Las compilaciones de macOS deben hacerse en macOS y las de Linux en Linux. El
flujo de GitHub Actions o cualquier CI puede ejecutar esos mismos comandos.

## Dónde viven los datos

| Sistema | Ruta |
| --- | --- |
| Windows | `%APPDATA%\com.parritalabs.calendar\calendar-data.json` |
| macOS | `~/Library/Application Support/com.parritalabs.calendar/calendar-data.json` |
| Linux | `~/.local/share/com.parritalabs.calendar/calendar-data.json` |

El archivo se escribe de forma atómica y la versión anterior queda como
`calendar-data.json.bak`. En Ajustes → Datos puedes abrir la carpeta, exportar un
respaldo completo o restaurarlo.

## Identidad

- **Icono:** el pájaro madrugador de CalendarPRO — «el que madruga». Sigue la idea del elefante de Evernote: un animal que cuenta la promesa de la app. La hoja marfil llena el icono sin marco, con dos anillas recortadas, la casilla de hoy marcada y el punto ámbar del evento. El pájaro se posa en la primera línea (la rama) y el pico es el mismo ámbar del evento. El símbodo de la app (`assets/app-mark.svg`) es la versión invertida: hoja aguamarina con el pájaro.
- La hoja marfil llena el icono sin marco, con dos anillas recortadas, la casilla de hoy marcada y el punto ámbar del evento. El símbolo de la app (`assets/app-mark.svg`) es la versión invertida: hoja aguamarina con el pájaro madrugador.
- Regenerar: tras editar `assets/app-icon.svg`, `npm run icons`.

## Stack

React 18 · TypeScript · Vite · Zustand · Tauri v2 (Rust) · lucide-react ·
Inter · Markdown con `marked` + `dompurify`. Las ilustraciones de los fondos son
SVG originales en `assets/art`, sin servicios de imágenes ni peticiones de red.

## Licencia

MIT © 2026 Parrita Labs

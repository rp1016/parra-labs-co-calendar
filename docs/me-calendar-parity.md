# Paridad con Me Calendar

Este documento registra cómo se analizó **Me Calendar** con REA, qué se encontró,
y cómo **CalendarPRO** alcanza paridad funcional sin copiar código ni activos.

## 1. Método

| Paso | Herramienta | Resultado |
| --- | --- | --- |
| Inventario del artefacto | REA (morluto MCP) | App WinUI 3 sobre .NET 8, empaquetada como MSIX; ensamblados `MeCalendar.dll` y `MeCalendar.Core.dll` (namespace interno `DesignMe`). |
| Superficie administrada | REA + lector PE/CLI local | Censo de los *heaps* `#Strings` (identificadores) y `#US` (literales) de ambos ensamblados: **9 949** identificadores y **346** literales en `MeCalendar`, **394** y **20** en `MeCalendar.Core`. |
| Dependencias | REA | `LiteDB` (base local), `Ical.Net`, `SkiaSharp`, clientes iCloud/CalDAV/WebCal, sistema de suscripción y anuncios. |
| Contraste de UI | REA (vistas y modelos) | Modos de vista, impresión, feriados, ajustes y estados de evento. |

**Limitación conocida.** El inspector administrado de REA agota su presupuesto de
64 MB de metadatos con `MeCalendar.dll`, y en la máquina de análisis solo está el
runtime de .NET (sin SDK ni `ildasm`). Por eso el censo se hizo sobre los *heaps*
de metadatos del propio PE, que exponen nombres de tipos, miembros y literales sin
ejecutar el binario ni descompilar IL. Es suficiente para identificar
funcionalidades, no para reconstruir implementaciones.

**Regla de trabajo.** Se replica el comportamiento observable y el modelo de datos.
No se reutiliza código, XAML, iconos, tipografías ni textos de Me Calendar. Toda la
implementación de CalendarPRO es original.

### Cómo reproducir el censo

El lector PE/CLI usado está en `%TEMP%\opencode\dnet-strings.mjs` y no tiene
dependencias. Escribe `<ensamblado>-identifiers.txt` y `<ensamblado>-literals.txt`:

```bash
node dnet-strings.mjs "C:/Program Files/WindowsApps/<MeCalendar>/MeCalendar.dll"
node dnet-strings.mjs "C:/Program Files/WindowsApps/<MeCalendar>/MeCalendar.Core.dll"
```

Las consultas de este documento se hacen con `Select-String` sobre esos volcados.

## 2. Qué hace Me Calendar

Evidencia = símbolos presentes en los volcados (`Tipo.Miembro`).

| Área | Evidencia | Comportamiento observado |
| --- | --- | --- |
| Vistas de calendario | `Blossom.MonthCalendar`, `Blossom.DayCalendar`, `Blossom.CalendarNavigator`, `MeCalendar.View.TimeItem` | Mes, semana/día y navegación por periodos. |
| Números de semana | `Set_Blossom_MonthCalendar_ShowWeekNumber`, `Set_Blossom_CalendarNavigator_CalendarWeekNumberRule` | Columna de semana opcional con regla de numeración configurable. |
| Zona horaria secundaria | `DesignMe.TimeZoneDisplayModel`, `TimeZoneHelper`, `Set_Blossom_DateSelectorButton_TimeZonePreference`, `IsIanaTimeZone` | Reloj adicional IANA (útil para reuniones con otras ciudades). |
| Estado del evento | `EventViewModel+ShowAsItem`, `ShowAsItems`, `ShowAsPickerHelperView` | Ocupado / libre / tentativo / fuera de la oficina. |
| Privacidad | `EventViewModel+SensitivityItem`, `SensitivityComboBox` | Normal / privado / confidencial; los detalles se ocultan. |
| Invitados | `MeetingAttendee`, `MeetingAttendeeListView`, `CanAddAttendee` | Lista de asistentes por evento (sin servidor de invitaciones). |
| Recurrencia con excepciones | `DesignMe.RecurrenceException`, `Event.RecurrenceExceptions` | Omitir o mover una ocurrencia sin romper la serie. |
| Importación `.ics` | `ICalendarImportViewPopup` | Importar eventos desde archivos iCalendar. |
| Feriados | `HolidayService`, `HolidayDataLoader`, `AddHolidayCalendarView`, `SupportedCountryHolidayViewItem`, `HolidayCalendarViewModel+LangCodeItem` | Calendario de feriados por país, generado localmente. |
| Impresión | `Blossom.PrintView`, `MonthCalendarPrintView`, `DayCalendarPrintView`, `EventPrinterPopup`, `CalendarPrintSetting`, `PrintViewTypeItem` | Hojas imprimibles de mes/día y ficha de evento. |
| Respaldo automático | `BackUpSettingViewModel.IsAutoBackupEnabled`, `AutoBackupDescription` | Copias periódicas locales. |
| Idiomas | `DesignMe.LanguageInfo` | Interfaz multiidioma. |
| Sincronización | `ConnectCalDav`, `ConnectWebCal`, `iCloudButton` | CalDAV, WebCal e iCloud. |
| Monetización / extras | `Subscription`, `GoPremium`, `Ads`, `CoupangAds`, `MonthCalendarWidget`, `MiniAppWidgetGroupView` | Suscripción, anuncios y widgets. |

**No existe** en Me Calendar: módulo de notas (solo la descripción del evento) ni
integración de clima. Los volcados no contienen `NotesViewModel`, `NoteView`,
`Weather` ni `Markdig`.

## 3. Matriz de paridad

| Función | Me Calendar | CalendarPRO | Estado |
| --- | --- | --- | --- |
| Vistas mes / semana / día | Sí | Sí, más agenda continua | **Paridad +** |
| Números de semana | Sí | Sí (ISO 8601), opcional en mes y semana | **Paridad** |
| Zona horaria secundaria | Sí | Sí, columna de reloj IANA en semana/día | **Paridad** |
| Estado del evento (mostrar como) | Sí | Sí: ocupado, libre, tentativo, ausente | **Paridad** |
| Sensibilidad / privacidad | Sí | Sí: normal, privado, confidencial; oculta detalles en vistas y agenda | **Paridad** |
| Asistentes | Sí | Sí, lista local de nombres/correos | **Paridad** |
| Repetición con excepciones | Sí | Sí: omitir una ocurrencia (EXDATE) | **Paridad** |
| Importar `.ics` | Sí | Sí, parser propio y offline | **Paridad** |
| Feriados por país | Sí | Sí, 7 países, cálculo local | **Paridad** |
| Impresión | Sí | Sí: mes, semana, día, agenda y nota, con marca y números de semana | **Paridad** |
| Respaldo automático | Sí | Sí, diario, 14 copias rotativas | **Paridad** |
| Multiidioma | Varios idiomas | Español e inglés | **Parcial (a propósito)** |
| Notas Markdown | No | Sí | **Extra** |
| Búsqueda global | No verificada | Sí (`Ctrl/Cmd + K`) | **Extra** |
| Temas y acentos | Claro/oscuro | 6 temas + 7 acentos | **Extra** |
| Fondos artísticos (marca de agua) | No | 5 ilustraciones vintage locales, opcionales | **Extra** |
| TODO de la semana | No | Panel lateral con casillas por ocurrencia y progreso | **Extra** |
| Exportar JSON / Markdown | No verificado | Sí | **Extra** |
| Sincronización CalDAV / WebCal / iCloud | Sí | No | **Fuera de alcance** |
| Cuentas, anuncios, suscripción | Sí | No | **Fuera de alcance** |
| Widgets de sistema | Sí | No | **Fuera de alcance** |
| Clima | No | No | — |

## 4. Cómo se implementó cada pieza

### Importación `.ics` — `src/lib/icsImport.ts`

Parseo propio, sin red ni librerías de terceros:

- Despliegue de líneas plegadas y escapes (`\,`, `\;`, `\n`).
- `DTSTART`/`DTEND` en `DATE`, `DATE-TIME` local, `Z` y con offset; `DURATION`
  (`PT1H30M`, `P1D`).
- `DTEND` exclusivo en eventos de día completo → último día visible.
- `RRULE` con `FREQ`, `INTERVAL`, `COUNT` y `UNTIL`; `EXDATE`.
- `VALARM` → minutos de recordatorio (sin que su `DESCRIPTION` pise la nota).
- `TRANSP`, `STATUS`, `CLASS`, `CATEGORIES`, `ATTENDEE;CN=`.
- Deduplicación por `UID` y descarte de `STATUS:CANCELLED`.
- Limitaciones declaradas al usuario en vez de fallar en silencio: `TZID`,
  `BYDAY`/`BYxxx`, `RECURRENCE-ID`.

### Feriados sin conexión — `src/lib/holidays.ts`

- Países: España, México, Colombia, Chile, Perú, Argentina y Estados Unidos.
- Fechas fijas + festivos móviles por cómputo de Pascua (algoritmo gregoriano).
- Reglas de traslado a lunes (Colombia, Chile, Argentina, etc.) y reglas de
  “n-ésimo día de la semana” (EE. UU.).
- Nombres traducidos es/en, UID determinista y eventos de día completo marcados
  como **libre**, para que no bloqueen la agenda.

### Impresión — `src/components/PrintSheet.tsx`

- Hojas de mes (con números de semana), semana, día, agenda y nota.
- Encabezado con el lockup `CalendarPRO`, `by Parrita Labs` y el rango.
- CSS `@media print` dedicado; el resto de la interfaz se oculta.
- Verificado en A4: **1 página**, sin recortes, con los chips ajustando texto.

### Estados de evento y privacidad

`src/lib/eventVisual.ts` traduce `showAs`/`sensitivity` a clases CSS compartidas
por mes, semana, día, agenda, rail y hojas impresas: borde punteado (libre),
contorno punteado (tentativo), trama diagonal (ausente) y cursiva (privado). En
eventos privados o confidenciales, las vistas muestran el título y ocultan lugar,
notas y asistentes.

### Fondos artísticos sin conexión — `assets/art`, `src/lib/art.ts`

Se descartaron las URLs dinámicas de bancos de imágenes: la app es 100 % local,
la CSP de Tauri solo permite `img-src 'self' data: blob:` y cada petición externa
rompería la promesa de privacidad y funcionamiento sin red. En su lugar se
dibujaron cinco SVG originales (`botanical`, `birds`, `rabbits`, `children`,
`animals`) con acabado de acuarela vintage:

- Paleta apagada de la ilustración editorial clásica (verdes salvia, rosa
  empolvado, ocre, azul grisáceo) y trazo irregular.
- `feTurbulence` + `feDisplacementMap` para que los bordes “tiemblen” como
  acuarela, más degradados radiales que simulan el lavado del papel.
- Fondo transparente: el SVG no trae papel ni marco, así el blanco de la app
  sigue siendo el de la interfaz.

En Ajustes → Apariencia, el `<select>` “Tema de ilustración” (Ninguno, Flores
botánicas, Aves, Conejos, Niños jugando, Animales) guarda `settings.artTheme`.
`MonthView` pinta una capa `.month-art` dentro de `.month-body`:

```css
.month-art {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-repeat: no-repeat;
  background-position: center 46%;
  background-size: min(86%, 1080px) auto;
  opacity: var(--art-opacity, 0.11);
  filter: saturate(0.92) contrast(0.96);
}
```

La opacidad es un token por tema (0.11 claro, 0.13 sepia, 0.20 oscuro, 0.22
medianoche); en tema oscuro se invierte el tono para que la tinta no desaparezca
y en alto contraste la capa se oculta. La cuadrícula y los chips viven en
`.month-week` con `z-index: 1`, así que la marca de agua nunca tapa texto, líneas
ni eventos. Las celdas de días de otro mes usan `background: transparent` para
que la ilustración continúe detrás de ellas. La impresión se mantiene limpia.

### TODO de la semana — `src/components/WeekTodo.tsx`, `src/lib/weekTodo.ts`

La barra lateral incluye un resumen de la semana visible, pensado como lista de
pendientes y no como una quinta vista de calendario:

- La semana se alinea con el ajuste “la semana empieza en” y sigue al día
  enfocado (`cursor`); al abrir la app coincide con la semana actual.
- `groupWeekTodos()` reparte las ocurrencias en siete cubetas por su **fecha de
  inicio**, así una tarea pertenece al día en que está programada y no a todos
  los días que ocupa.
- Cada fila muestra hora (o “Todo el día”), color del calendario y título.
  Pulsarla abre el evento; el `+` del encabezado del día crea uno nuevo.
- El día de hoy se marca con una píldora de acento. El encabezado muestra los
  pendientes y una barra fina de progreso; al completar todo aparece un check.
- Se excluyen los calendarios de feriados y los calendarios ocultos, y se
  respeta el filtro de etiquetas activo.
- El panel se puede plegar y su lista tiene scroll propio para no empujar el
  botón “Agregar calendario”.

El estado de completado es **por ocurrencia**: `CalendarEvent.doneDates` guarda
fechas `YYYY-MM-DD`. Así una serie semanal puede tener hecha solo la de esta
semana. `normalizeData()` valida el formato y las fechas reales, el respaldo JSON
las conserva y los recordatorios omiten las ocurrencias ya marcadas. El `.ics`
no las exporta porque no forman parte del estándar iCalendar.

### Respaldos — `src-tauri/src/lib.rs`

- `auto_backup` valida el JSON y escribe como máximo una copia por día.
- `prune_backups` conserva las 14 más recientes.
- `backup_location` expone la carpeta y Ajustes la abre con el manejador del
  sistema (`opener:allow-open-path`).
- La escritura principal sigue siendo atómica y deja `calendar-data.json.bak`.

## 5. Fuera de alcance (por diseño)

| Función de Me Calendar | Motivo |
| --- | --- |
| CalDAV, WebCal, iCloud | Requieren red, cuentas y servidores de terceros. |
| Anuncios, suscripción, “Premium” | El producto es local, sin monetización ni llamadas externas. |
| Widgets de escritorio | Dependen del ecosistema WinUI y de integración con el sistema. |
| Varios idiomas | Se mantienen es/en para no entregar traducciones automáticas de baja calidad. |

## 6. Verificación

```bash
npm run typecheck     # TypeScript estricto
npm run test          # 11 archivos, 60 pruebas
npm run build         # tsc + Vite
cargo test            # 4 pruebas (src-tauri): escritura atómica, respaldo, poda
```

Pruebas nuevas ligadas a la paridad:

- `src/lib/icsImport.test.ts` — 12 casos (plegado, zonas, duración, RRULE,
  EXDATE, VALARM, estados, duplicados, limitaciones).
- `src/lib/holidays.test.ts` — 8 casos (Pascua, reglas de lunes, EE. UU., UID
  determinista, país desconocido).
- `src/lib/recurrence.test.ts` — omisión de ocurrencias por EXDATE.
- `src/lib/dates.test.ts` — numeración ISO de semanas.
- `src/lib/art.test.ts` — catálogo de ilustraciones, URL local, validación y
  reparación de valores guardados.
- `src/lib/weekTodo.test.ts` — agrupación por día, completado por ocurrencia,
  rango de semana y reparación de fechas guardadas.

Revisión visual con Chrome headless (CDP) sobre `?demo=1`: mes con números de
semana, semana con zona secundaria, diálogo con estado/privacidad/asistentes,
Ajustes con feriados y respaldo, e impresión A4 exportada a PDF de una página.
Para los fondos artísticos se recorrieron las seis opciones del selector y se
comprobó en el DOM la URL local, la opacidad calculada, el apilado (`z-index`) y
la ausencia de errores en consola.
Del panel TODO se recorrieron los estados pendiente, hecho, todo completado,
plegado, semana siguiente y semana vacía, verificando además la persistencia en
`doneDates` y la actualización del contador y la barra de progreso.

## 7. Evidencia visual

| Captura | Contenido |
| --- | --- |
| `parity-month-weeks.png` | Mes con columna de semana y chips de evento. |
| `parity-week-tz.png` | Semana con “Semana 43” y reloj de Bogotá. |
| `parity-event-dialog.png` | Estado, sensibilidad, asistentes y “omitir solo este día”. |
| `parity-settings-holidays.png` | Feriados por país/años, importación `.ics`, respaldo. |
| `parity-print-a4.png` | Hoja A4 de mes con la marca de Parrita Labs. |
| `parity-print.pdf` | PDF de una página generado desde la hoja. |
| `art-settings-botanical.png` | Ajustes → Apariencia con el selector y la vista previa del fondo. |
| `art-month-botanical.png` | Marca de agua botánica detrás de la cuadrícula, en tema claro. |
| `art-month-dark.png` | La misma marca de agua en tema oscuro. |
| `todo-week-light.png` | Panel “TODO de la semana” con pendientes y progreso. |
| `todo-week-done.png` | Una tarea marcada como hecha, con el contador actualizado. |
| `todo-week-all-done.png` | Semana completa: check, tachado y barra al 100 %. |
| `todo-week-empty.png` | Estado vacío con el botón para agregar una tarea. |

Las capturas viven en `%TEMP%\opencode` de la máquina de análisis; el PDF se
regenera con cualquier diálogo de impresión del sistema.

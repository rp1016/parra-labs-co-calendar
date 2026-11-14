# CalendarPRO (Tauri) — limpieza al cerrar sesión

Aplican las reglas de `../CLAUDE.md` (carpeta `parrita-repos`). Resumen para este repo:

## Compilado final
- CalendarPRO_<version>_x64-setup.exe (sale de src-tauri/target/release/bundle/nsis/).
- Cópialo a `C:\Users\Rafael\parrita-repos\Utils\` reemplazando la versión anterior del mismo producto y verifica el sha256. No dejes copias repetidas en otras carpetas.

## Borrable al terminar (regenerable, rutas exactas relativas a este repo)
- `node_modules`
- `src-tauri/target`

## No borrar
- Código fuente, `.git`, `package.json`/lockfiles/`Cargo.*`, `assets/`, datos y `design/`.
- `dist/` cuando contiene el último compilado.

Antes de borrar algo que no esté en esta lista, pregunta.

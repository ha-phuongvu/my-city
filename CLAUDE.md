# My City

A Ghibli-style 3D hobby world. A pnpm + Turborepo monorepo: the site is `apps/web` (Next.js), the database package is `packages/db`. Read `apps/web/AGENTS.md` before writing Next.js code.

## Code rules

### No loose strings: use an enum

A string that names one of a fixed set of values (a season, a city, a state, a kind, a shape, a phase, a language, a key…) is always an `enum` member, never a bare string literal. No `"summer" | "winter"` types and no `x === "winter"` checks.

```ts
// constants/season.constants.ts
export enum Season {
  Summer = "summer",
  Winter = "winter",
}

// anywhere else
if (season === Season.Winter) …
```

- Use a string enum whose values are the same strings as before, so anything stored or loaded by name (localStorage, file names, URLs) keeps working.
- Write the enum in the constants file of the code that owns it (see below), with a comment saying what it is, and import it everywhere else.
- Data tables use the enum too: `{ kind: FlagColor.Red }`, `[Season.Winter]: …` as an object key, `switch` on `SignKind.Scroll`.
- A value that is a number or a special case beside numbers gets a named constant instead (e.g. `CUT_BACK = -1`).

These stay plain strings, because they must match something outside our code exactly:

- browser and library API values: `KeyboardEvent.key` is read via the `KeyName` enum, but `AudioContext.state`, `typeof x === "function"`, Intl options (`{ month: "long" }`), canvas and CSS values;
- `process.env.NODE_ENV === "development"` (Next replaces it at build time, so it must stay a literal);
- shader attribute and uniform names (`setAttribute("position", …)`) and GLB node names (`part("ball")`, `partsNamed("walls")`);
- paths and URLs (`/models/fountain.glb`), CSS class names, translation keys, and text people read.

### No comments in code

Don't write comments (`//`, `/* */`, JSDoc, comments inside shader strings, CSS comments) in components, utils, app, i18n, scripts or `packages/db`. The one place comments belong is the constants files (`*.constants.ts`), where a short note says what each value or enum is.

### Constants and helpers

- Module-level constant values live in a matching `<File>.constants.ts` under `apps/web/src/components/world/constants/`, in the same subfolder as the component (`environment/Grass.tsx` → `constants/environment/Grass.constants.ts`). Constants shared across folders or used by `utils/` stay at the `constants/` root.
- Helper `.ts` files (no component, not only data) go flat in `world/utils/`.
- Reuse what is already written. Before writing a function, search `utils/` and the code around it for one that does the same job, and call it. Never write a second copy of a function that already exists. If the existing one is close but not quite right, extend it (a parameter, an option) instead of copying it, and if it lives in a component but is needed elsewhere, move it to `utils/` and import it from both places.
- Clean up dead code after each task.

### World folders (`apps/web/src/components/world/`)

- `core/`: the scene setup (World, WorldCanvas, WorldLights, Model)
- `opening/`: the opening
- `environment/`: nature and the land
- `seasons/`: season-only extras
- `cities/`: things placed across all cities, and `cities/<city>/` for each city's models (`plaza`, `story`, `music`, `game`, `movie`, `comic`, `future`)
- `ui/`: flat overlays on the screen (calendar, record player)

Every new file goes straight into its right place:

- A new component goes in the folder above that matches what it is (a tree → `environment/`, a Music City model → `cities/music/`). Never leave it at the `world/` root or in a folder where it doesn't belong.
- Its constants go in the mirrored `constants/` subfolder, and its CSS sits next to it.
- If nothing fits, ask before making a new folder. Then add the folder to this list.
- When a file moves, move its constants file with it and fix every import.

### Styles

CSS modules don't work here (`next.config.ts` turns every `*.css` into plain CSS for Tailwind). Use plain CSS with class names prefixed by the component (`cal-`, `rp-`).

## Checks

Run before saying a change is done: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` for anything that touches the build.

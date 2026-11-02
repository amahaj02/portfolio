# Aarav Mahajan portfolio

Static portfolio with a WebGL particle-knot hero, interactive Three.js project map, experience, and project overviews.

## Development

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev
```

Open http://localhost:4173. Run `npm run build` to create the public site in `dist/`. Deploy that directory to a static host; build command: `npm run build`.

## Editing

- `index.html`: hero, experience, About, contact.
- `content/projects.json`: project names, summaries, stacks, and links. Run `npm run content` after edits; dev startup and build also regenerate project markup.
- `styles.css`: visual styling and responsive layouts.
- `assets/Aarav_Mahajan_Resume.pdf`: canonical public resume.
- `scripts/site-files.mjs`: explicit public-file allowlist.

Fonts and stack logos are bundled locally. Desktop project visualization loads Three.js r128 from cdnjs. Small screens and unavailable WebGL use a readable project list. Motion respects reduced-motion preferences and pauses offscreen.

## Checks

With the preview running, `npm test` runs Playwright checks using installed Chrome. `node scripts/verify.mjs --no-captures` skips screenshots.

Development notes, skills, historical prototypes, and review artifacts live under `.agents/`, excluded from version control and deployment. Only allowlisted files are exported. No credentials or private source documents belong in the repository.

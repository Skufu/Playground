# Playground rules

You are adding a prototype to a playground. Not shipping a product. The point is
speed of trying: one idea in, one live link out, no setup between them.

Read this file before building anything here.

## Add a prototype

1. `mkdir prototypes/<kebab-slug>`. The slug becomes the URL (`/p/<slug>`) and it
   never changes, so name it for the idea, not for the version.
2. `prototypes/<slug>/meta.json`:

```json
{
  "title": "Piano",
  "summary": "One sentence, under 140 characters.",
  "tags": ["audio"],
  "hue": 268,
  "date": "2026-11-20"
}
```

   `hue` is 0–360 and tints the index thumbnail. `date` is ISO and sorts the index,
   newest first.
3. `prototypes/<slug>/page.tsx`: `"use client"` if it holds state, default-export a
   component. No page-level layout needed; the route renders it fullscreen.
4. `pnpm sync` — regenerates `lib/prototypes.generated.ts`.

Never edit `lib/prototypes.generated.ts`. It is overwritten on the next sync, and
the sync failure message names the folder that broke it.

## Hard rules

**Standalone.** A prototype never imports from another prototype folder. Shared code
lives in `components/` or `lib/`. Why: deleting any folder must leave every other URL
working, and one prototype's mess must never be another's problem.

**Mobile first.** Build at 390×844 before anything else. Every control is at least
44×44px. Why: this playground is mostly driven from a phone, and a layout that only
works on desktop gets thrown away the moment you open it.

**The top 56px is not yours.** The index escape hatch floats at top-left. Every
prototype root starts with `pt-14`. Why: on a phone the back gesture is unreliable,
the escape hatch is the only way out, and content underneath it is content you can
never tap.

**Tokens only.** No hex, no `rgb()`, no named colours in prototype code. Use
`bg-canvas`, `bg-surface`, `bg-surface-2`, `text-fg`, `text-muted-fg`, `border-border`,
`border-border-strong`, `text-accent`. Why: light and dark both come free, and a
hardcoded colour is the one mistake you can't repair globally later.

**Both themes, always.** Toggle the theme and look at the result before calling a
prototype done. Dark mode is not an inversion: keep the surface order, and use solid
borders in dark and alpha borders in light.

**Default to restraint.** No header labels explaining the UI, no item counts, no
decorative icons, no panels that weren't asked for. Complexity is earned by a control
that needs somewhere to live, and disclosed progressively.

**Knobs go in a panel.** Anything tunable — speed, colour, count, size — goes in one
control panel off to the side (below the content on mobile), and the panel always ends
with a **Randomize** button. Why: the panel is the prototype's API. Without it you can
only imagine one setting of the idea, and randomize is the fastest way to find the
version you didn't know you wanted.

**Persistence is `localStorage`.** No database, no auth, no API key, no network call on
first paint. Why: a prototype that needs infrastructure stops being a prototype, and
one less thing to manage is one less reason not to try the idea.

**Static only.** Every route is exported to HTML and served as a Cloudflare Workers
asset. No API routes, no server actions, no middleware, no `next/image` optimisation.
Why: the deploy is a file upload with no runtime, so anything that needs a server works
in `pnpm dev` and silently fails in production, and finding that out after deploying is
more expensive than designing around it.

**Delete what you didn't use.** Unused props, variants, comments, and dead branches go
before the prototype counts as done. A prototype is a sketch you keep, not a codebase.

## Build order

1. Static layout with real copy, at 390px wide.
2. The one interaction that makes it worth existing.
3. The control panel, including randomize.
4. Dark mode pass.
5. `localStorage` for state worth keeping.
6. Delete everything unused.

Do it in this order because a layout error invalidates any polish you do before it,
and a panel designed after the polish has to be polished again.

## Definition of done

- [ ] `/p/<slug>` loads at 390×844 with no horizontal scroll and no clipped controls
- [ ] every control is reachable and at least 44×44px
- [ ] both themes look deliberate; no hardcoded colours
- [ ] randomize produces a visibly different prototype
- [ ] a reload keeps the state that matters
- [ ] no console errors, no unused exports
- [ ] `pnpm build` passes
- [ ] `pnpm deploy` succeeds and the live URL shows the prototype

## When a rule is wrong

Change this file. A rule that gets broken silently is worse than no rule, because the
next prototype copies the exception and nobody remembers why.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

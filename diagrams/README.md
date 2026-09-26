# Cag Note — Diagram Assets

This repository is the diagram library for the Cag Note / Digital Whiteboard app.
The app reads it directly (public, branch `main`).

## How the app finds diagrams

Every image placed under `diagrams/<Subject>/<Category>/` is loaded automatically:

```
diagrams/
  Biology/<Category>/your-diagram.svg
  Math/<Category>/...
  Physics/<Category>/...
  Chemistry/<Category>/...
  Science/<Category>/...
  General/<Category>/...
```

- `<Subject>` must be one of: `Biology`, `Math`, `Physics`, `Chemistry`, `Science`, `General`.
- `<Category>` is free-form (e.g. `Cell`, `Mechanics`, `Geometry`). Use `General` if unsure.
- Supported files: `.svg`, `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif` (SVG recommended).
- The diagram **name** is taken from the file name, so use readable names:
  `cell-membrane.svg` becomes "Cell Membrane".

Files may also sit directly inside a subject folder (category becomes "General").

## Refreshing inside the app

Whiteboard -> top-left Cag Note menu -> **Settings -> Refresh diagrams**
(or just reopen the app while online).

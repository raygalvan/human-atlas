# Human Atlas

An interactive 3D anatomy explorer built with React, Three.js, and shadcn/ui. Take the BodyParts3D adult male reference apart into **2,234 individually selectable meshes**, explore **15 anatomical systems**, and search **3,432 named concepts**.

This fork is also the working source for the **Homer Courtroom Atlas**. The courtroom branch adds a separate **Homer’s Injuries** layer beside Systems so documented injury groups can isolate the relevant reference anatomy without replacing the general anatomy controls. Precise fracture, hemorrhage, contusion, and soft-tissue overlays remain separate work and must not be inferred from an isolated whole structure.

## Explore

- Orbit, zoom, and select structures directly on the body.
- Toggle individual systems or use skeleton and organ presets.
- Switch between general anatomical Systems and Homer’s documented injury-reference groups.
- Isolate injury-reference anatomy with a strong courtroom highlight while normal structure isolation retains the underlying anatomical material color.
- Move from assembled anatomy to a spaced inventory of every visible piece.
- Search anatomical names and source identifiers.
- Isolate a selected structure and read its details.
- Use compact controls and detail panels on mobile.

## Run locally

Requires Node.js 22.13 or newer. No API keys or accounts are needed.

```sh
npm ci
npm run dev
```

Open http://localhost:3016. To build the static site, run `npm run build`; the output is in `dist/`.

## Validate

```sh
npm run check
node scripts/validate-atlas.mjs
node scripts/validate-interactions.mjs
node scripts/validate-injuries.mjs
node scripts/validate-base-path.mjs
npm run build
```

Validation covers mesh buffers, names and concept membership, nonoverlapping exploded layouts at desktop and mobile aspect ratios, search and inspection contracts, Homer injury-reference resolution, nested hosting, and tap-versus-drag handling.

## Courtroom injury-reference controls

The first Homer layer is intentionally structure-driven. It currently resolves reference anatomy for:

- brain hemorrhage regions
- skull fracture reference anatomy
- left ribs 2–4
- right ribs 2–5
- right ribs 8–10
- left costal cartilage 3–7
- pulmonary findings
- periaortic findings

These controls identify which anatomical structures are relevant to documented findings. They do **not** claim that an entire highlighted structure is injured, and they do not substitute for precise regional overlays or medical review.

## Anatomy data

The current viewer uses **BodyParts3D 4.0**, an adult male reference anatomy, licensed **CC BY 4.0**. It does not represent every human structure or variation. Individual source meshes are distinct from named concepts, which may group multiple meshes. Descriptions distinguish general system context from individual organ explanations.

Geometry is simplified for browser performance while retaining every source mesh. The packaged model contains 2,288,268 triangles and downloads approximately 33 MB of compressed geometry. Full credits, source links, and adaptation details are in [ATTRIBUTION.md](public/ATTRIBUTION.md).

This is an educational and demonstrative reference, not a diagnostic or surgical tool and not a patient-specific reconstruction.

## How it works

Geometry is merged into batches. Per-structure GPU textures control translation, visibility, selection, and courtroom injury-reference highlighting, while component geometry supports accurate picking. Exploded layouts pack only the visible pieces. Rendering updates when the scene changes; orbit controls remain responsive without thousands of separate draw calls.

The optional WebMCP tools expose anatomy search and inspection in compatible browsers. The visible interface works without them.

## Rebuilding geometry

The repository includes browser-ready geometry. Rebuilding it is optional: obtain the official BodyParts3D OBJ archive and English metadata tables, prepare the joined concepts and display-system mappings, run `scripts/convert-anatomy.py`, then `node scripts/optimize-anatomy.mjs` and `node scripts/compress-models.mjs`. Simplification uses a 0.2% relative error limit per structure.

## Deploy

The project builds to static files in `dist/`. This fork is configured with relative asset paths so it can live under an existing website path such as `/courtroom-atlas/` without a separate hosting account.

## License

Original application code is released under the [MIT License](LICENSE). **The anatomy data has its own CC BY 4.0 license**; preserve the attribution when redistributing it. Third-party dependencies retain their respective licenses.

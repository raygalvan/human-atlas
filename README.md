# Human Atlas

An interactive 3D anatomy explorer built with React, Three.js, and shadcn/ui. Take the BodyParts3D adult male reference apart into **2,234 individually selectable meshes**, explore **15 anatomical systems**, and search **3,432 named concepts**.

This fork is also the working source for the **Homer Courtroom Atlas**. The courtroom branch adds a separate **Homer’s Injuries** layer beside Systems so inherited, unverified case reference groups can isolate the relevant reference anatomy without replacing the general anatomy controls. Precise fracture, hemorrhage, contusion, and soft-tissue overlays remain separate work and must not be inferred from an isolated whole structure.

## Explore

- Orbit, zoom, and select structures directly on the body.
- Toggle individual systems or use skeleton and organ presets.
- Switch between general anatomical Systems and Homer’s unverified case reference groups.
- Isolate healthy reference anatomy while preserving anatomical materials. Inherited Homer groups remain unverified until reviewed against identified source evidence.
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
node scripts/validate-inspection.mjs
node scripts/validate-surface.mjs
node scripts/validate-base-path.mjs
npm run build
```

Validation covers mesh buffers, names and concept membership, nonoverlapping exploded layouts at desktop and mobile aspect ratios, search and inspection contracts, Homer injury-reference resolution, nested hosting, and tap-versus-drag handling.

## Inspect the integrated anatomy

In **Systems → Inspect anatomy**, choose **Brain**, **Skull**, **Brain + skull**, or **Left rib 2**. The same meshes remain selectable through search and canvas picking. Original source detail loads on demand for isolated target structures. Switch it off to compare against browser geometry without changing identity or registration.

- Brain inspection exposes source-defined left and right cerebral hemispheres, cerebellum, brainstem, and remaining source brain structures independently.
- Skull inspection selects 18 existing cranial/facial skeletal meshes from the source skull concept. The broader source concept remains unchanged, including its eye and hyoid memberships.
- The reveal slider clips existing skull surfaces from patient left to right. Cut surfaces are deliberately **uncapped**. No internal tissue, bone thickness, or fracture is reconstructed.
- **Restore atlas** restores the normal assembly, materials, and visibility. Mobile keeps its compact Layers button and direct orbit/zoom.

Patient axes are **+X left, +Y superior, +Z anterior**, in meters. The small orientation compass follows the camera. Left/right inspection buttons refer to the patient.

## Evidence and injury placement

Homer’s Injuries retains the eight inherited reference groups as **unverified**. Their locations and rib levels are not treated as findings. No Medical Examiner report with page-level citations is present in this checkout, so this milestone asserts no lesion placement. The failed flat Homer Body Surface tab and face/back panel have been removed from the active application. The ordinary Body surface system remains.

`app/injury-attachments.ts` separates source-evidence review from visualization-placement review. Records carry stable structure identity, laterality, source citation, supported region, placement method, and independent review status. There are currently **zero verified injury records**.

A developer-only view, `?developer=registration`, exposes an explicitly labeled synthetic blue surface patch inside Inspect anatomy. This patch is disabled by default and is never a Homer finding. Its mask evaluates the parent mesh’s own reference coordinates before the shared GPU explosion translation. Parent visibility, clipping, and source-detail replacement therefore apply to the patch. Reference-space masks require the same source registration; triangle attachments require a matching topology hash and cannot silently transfer between detail levels.

## Anatomy data

The current viewer uses **BodyParts3D 4.0**, an adult male reference anatomy, licensed **CC BY 4.0**. It does not represent every human structure or variation. Individual source meshes are distinct from named concepts, which may group multiple meshes. Descriptions distinguish general system context from individual organ explanations.

Geometry is simplified for browser performance while retaining every source mesh. The packaged model contains 2,288,268 triangles and downloads approximately 33 MB of compressed geometry. Full credits, source links, and adaptation details are in [ATTRIBUTION.md](public/ATTRIBUTION.md).

This is an educational and demonstrative reference, not a diagnostic or surgical tool and not a patient-specific reconstruction.

## How it works

Geometry is merged into batches. Per-structure GPU textures control translation, visibility, selection, and courtroom injury-reference highlighting, while component geometry supports accurate picking. Isolated target geometry is replaced in the existing per-chunk/system batches; the picker uses that exact replacement geometry. Entire invisible batches are skipped. Exploded layouts pack only the visible pieces. Rendering updates when the scene changes; orbit controls remain responsive without thousands of separate draw calls.

The optional WebMCP tools expose anatomy search and inspection in compatible browsers. The visible interface works without them.

## Rebuilding geometry

The repository includes browser-ready geometry. Rebuilding it is optional: obtain the official BodyParts3D OBJ archive and English metadata tables, prepare the joined concepts and display-system mappings, run `scripts/convert-anatomy.py`, then `node scripts/optimize-anatomy.mjs` and `node scripts/compress-models.mjs`. Simplification uses a 0.2% relative error limit per structure.

### Rebuild the targeted inspection assets

```sh
python3 scripts/build-inspection-detail.py /path/to/isa_BP3D_4.0_obj_99 all
node scripts/validate-inspection.mjs
```

This packer reuses the existing converter’s exact transform, retains source positions/normals/triangles, regenerates all target offsets/counts/bounds, and emits deterministic gzip files plus SHA-256 source and topology mappings. It leaves `atlas.json` and all base body buffers unchanged. No subdivision, smoothing, procedural noise, texture planes, or normal maps are used to invent geometry. The official `_obj_99` archive is itself a reduced reference dataset, not raw MRI resolution.

See [geometry and browser review](docs/geometry-review/REVIEW.md) for source comparison, limitations, before/after captures, and test details. Browser CI exports a build and captures under **anatomy-browser-evidence**; this is not a live deployment.

## Deploy

The project builds to static files in `dist/`. This fork is configured with relative asset paths so it can live under an existing website path such as `/courtroom-atlas/` without a separate hosting account.

## License

Original application code is released under the [MIT License](LICENSE). **The anatomy data has its own CC BY 4.0 license**; preserve the attribution when redistributing it. Third-party dependencies retain their respective licenses.

# Injury production contract v1

Hosted injury production uses reviewed case instances supplied by injury.bot. The former healthy reference checklist is not presented as lesion geometry. Standalone test fixtures remain available for engineering regression.

- The host supplies case-scoped, authenticated geometry URLs; the bridge accepts only the fixed production endpoint shape and the configured parent origin.
- Surface lesions clip actual source triangles inside a measured tangent footprint. A subarachnoid illustration adds a stated thickness along interpolated source normals. It is a surface blood-layer illustration, not a CT reconstruction or an inferred distribution throughout unmodeled spaces.
- Individual rib fractures use a measured plane/gap with closed illustrative fracture faces. No marrow/cortex microstructure is claimed. Only one replacement per source part is supported by the host.
- Geometry inherits its parent's visibility and explosion offset. Replacement geometry restores the source when removed. The host pins source-engine versions and blocks mismatched assets.
- Selecting anatomy reports the actual picked reference coordinate and surface normal to the authorized parent. These are not patient-specific measurements.
- The Node worker entry is app/production-worker.ts; the host bundles it with its pinned engine release. Rendering code remains maintained in this repository.

Validation: node scripts/validate-production.mjs checks all three render classes against real atlas buffers, verifies finite output and registration bounds, and ensures source arrays are unchanged. Existing fracture fixture and host bridge validators remain gates.

# Synthetic subarachnoid hemorrhage capability test

Open `?test=sah` or Layers → Test 3 → Start hemorrhage test. The actual reference brain remains in the atlas. Toggle the synthetic blood collection, compare Skull on / Skull cutaway / Isolate brain, rotate 360°, zoom, and explode/reassemble using the test slider.

This authored example occupies a limited area of the left frontal convexity and follows modeled sulcal surfaces. Stable parents are FJ1833 (left superior frontal gyrus), FJ1787 (left middle frontal gyrus), and FJ1800 (left precentral gyrus). The footprint is deliberately irregular and does not color entire structures. Source coordinate convention is meters, +X patient left, +Y superior, +Z anterior.

Subarachnoid blood is outside brain tissue, within the space between pia and arachnoid. General anatomical reference: https://www.ncbi.nlm.nih.gov/books/NBK441958/ . The atlas does not supply a segmented meningeal/subarachnoid compartment. This representation is therefore a thin illustrative blood layer on the modeled cortical contours, not a validated segmentation of that compartment, measured volume, fluid simulation, aneurysm, or Homer finding.

The overlay is genuine nonplanar triangle geometry generated from each current source mesh. Its anchors are barycentric on that source's triangles. Its irregular border is clipped there; color and small outward thickness vary with local source concavity. Concavity controls presentation; it is not claimed to identify named sulci or reconstruct absent anatomy. Maximum authored offset is below 0.9 mm. Both upper and lower layer surfaces are represented; the very thin perimeter is not a closed volume and must not be used to calculate blood volume.

No source brain vertices are replaced or displaced. Base and original-detail topology each generate their own attachment geometry. Source IDs, per-part visibility and GPU translations are shared; hiding a parent hides its blood layer. Depth testing remains enabled so opaque skull and intervening anatomy obscure blood. Skull cutaway uses the existing open clipping mechanism without adding anatomical cut tissue. Explosion separates the existing gyri and their respective attached portions of the example.

No new external assets or texture maps. BodyParts3D source anatomy and CC BY 4.0 attribution are retained. New blood geometry is authored synthetic code.

`validate-subarachnoid.mjs` checks actual base/detail attachments, barycentric containment, bounded normal offset, unchanged source arrays, laterality, nonplanarity and parent IDs. The single focused browser proof checks visible blood, clean toggle, full rotation, opaque-skull occlusion, reveal, isolation, zoom, both topologies, parent hiding, separate GPU explosion transforms, restoration and compact mobile controls. Its PNGs and recording are actual build captures, not generated illustrations. Broad atlas suites are not duplicated for this focused test.

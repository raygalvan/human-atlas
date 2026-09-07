# Test 2: localized rib fracture

Open `?test=fracture` or Layers → Test 2 → Start fracture test. Starts with the healthy left second rib, FJ3229 / FMA8012. Toggle **Localized fracture**, choose **Inspect fracture**, then orbit or use **Rotate rib 360°** and zoom. Whole rib and the normal-state toggle restore the original comparison.

This synthetic demonstration makes a 1.2 mm illustrative gap in the lateral shaft near reference coordinates (.083, 1.387, .010) meters. Patient left is +X, anterior +Z, superior +Y. It is not a Homer finding, measured fracture, or patient reconstruction.

Geometry is actually clipped on either side of a locally irregular fracture surface. The rest of the rib remains in its original coordinates and retains its ivory material. Cut faces are explicitly illustrative solid faces, not reconstructed cortex, marrow or trabeculae. No claim of medical validation is made from this synthetic example.

Both the packaged and high-detail source topologies are supported by rebuilding the cut from the active geometry. The normal mesh remains unchanged. The fractured mesh replaces its parent's geometry in the existing batch and picker, sharing stable identity, bounds, selection, visibility, and GPU explosion transforms. No old rib is drawn beneath the fracture gap.

`validate-fracture.mjs` checks both source levels, retained remote vertices, unchanged source buffers, identical bounds, finite geometry and generated cut faces. `check-fracture-browser.mjs` captures normal → localized fracture → close-up → full rotation → zoom → topology changes → normal restoration. Images/video come from the actual production build under the nested courtroom URL.

CI now builds once in one PR job, retains short integrity checks, and selects this focused browser proof for fracture changes. Broad browser suites remain manually runnable. Source post-merge duplication is removed. Subsequent unrelated renderer changes select the normal atlas browser regression rather than this fracture-only proof.

Source anatomy remains BodyParts3D, CC BY 4.0, with existing attribution. All fracture construction is authored synthetic geometry; no external injury assets were added.

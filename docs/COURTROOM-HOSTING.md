# Separate courtroom atlas preview

This fork is the source for the Homer courtroom demonstrative. It does not replace the existing law-bot injury atlas or the original injury atlas in the family portal.

The initial preview contains reference anatomy only. It has no case-specific injury placements and is not a patient-specific reconstruction. Injury mapping and the presentation redesign are separate subsequent work.

## Existing AWS hosting

Build this repository with Node 22.13 or newer:

```sh
npm ci
npm run check
node scripts/validate-atlas.mjs
node scripts/validate-interactions.mjs
node scripts/validate-base-path.mjs
npm run build
```

Publish the complete `dist/` directory, including `models/` and `ATTRIBUTION.md`, into its own `courtroom-atlas/` directory on the existing justiceforhomer.com site. No Vercel account, new domain, new server, API keys, or login system is required by this viewer.

The intended entry point is `https://justiceforhomer.com/courtroom-atlas/index.html`. Use the explicit `index.html`: the Homer site's existing Express static configuration has directory indexes disabled. This is a deployment destination, not a claim that publication has completed.

Bundle and model URLs resolve within the viewer's own directory. They do not claim the existing site's `/assets/` or `/models/` routes. Preserve the upstream MIT license and BodyParts3D attribution.

Deployment should build a pinned commit of this fork, test the result before publishing, and copy only this dedicated directory. Keep a copy in the host application's `public/courtroom-atlas/` so subsequent normal site builds retain the viewer. Never copy over the host's root `index.html` or its existing injury-atlas files.

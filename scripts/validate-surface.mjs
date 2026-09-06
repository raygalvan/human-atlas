import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
const portrait='public/homer/homer-surface-reference.jpg';
const size=statSync(portrait).size;assert(size>10000&&size<500000,'surface portrait must be a compact user-supplied image');
const surface=readFileSync('app/surface.tsx','utf8');
for(const token of ['PATIENT LEFT','scalp-abrasions','left-face','tongue-lacerations','posterior-neck','flank-lower-back','Illustrative placement']) assert(surface.includes(token),`missing surface contract: ${token}`);
const page=readFileSync('app/page.tsx','utf8');assert(page.includes("selectionMode:'surface'"),'body surface must activate the dedicated 3D material mode');assert(page.includes('HomerSurfaceReference'),'surface demonstrative must render beside the 3D viewer');
const scene=readFileSync('app/scene.tsx','utf8');assert(scene.includes("s.selectionMode==='surface'"),'scene must render opaque surface material in body-surface mode');
console.log(`Surface demonstrative contract passed; portrait ${size} bytes; patient-left orientation and ambiguity notes present.`);

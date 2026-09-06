// Retain the existing regression entry point while replacing its removed flat
// feature expectations with Systems / Homer transitions and real 3D inspection.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
assert(!readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8').includes('HomerSurfaceReference'));
await import('./check-atlas-browser.mjs');

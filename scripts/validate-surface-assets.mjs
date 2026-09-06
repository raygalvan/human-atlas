import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const source = readFileSync(new URL('../app/atlas-assets.ts', import.meta.url), 'utf8');
const {outputText} = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});
const {atlasAssetUrl,homerAssetUrl} = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
for (const entry of ['https://example.test/','https://example.test/courtroom-atlas/','https://example.test/courtroom-atlas/index.html','https://example.test/courtroom-atlas/index.html?revision=test']) {
  for (const leading of ['', '/']) {
    assert.equal(homerAssetUrl(leading+'homer/homer-surface-reference.webp',entry),new URL('homer/homer-surface-reference.webp',entry).href);
    assert.equal(atlasAssetUrl(leading+'models/atlas.json',entry),new URL('models/atlas.json',entry).href);
  }
  assert.throws(()=>atlasAssetUrl('/homer/homer-surface-reference.webp',entry),'Model resolver must not silently accept portraits');
  assert.throws(()=>homerAssetUrl('/models/atlas.json',entry));
  for (const invalid of ['https://external.test/homer/p.jpg','//external.test/homer/p.jpg','//homer/p.jpg','/homer/../private','/homer/%2e%2e/private','/homer/./p.jpg','/homer/p.jpg?secret=1','/homer/p.jpg#tag','/homer/a\\b','/homer/','/homer//p.jpg']) assert.throws(()=>homerAssetUrl(invalid,entry),invalid);
}
console.log('PASS: portrait path resolves under root and nested hosting; model-only guard and unsafe-path rejection preserved.');

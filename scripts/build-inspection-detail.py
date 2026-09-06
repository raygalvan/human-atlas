"""Reproducible, unsimplified targeted BodyParts3D geometry. No smoothing or reconstruction.
Usage: python3 scripts/build-inspection-detail.py path/to/isa_BP3D_4.0_obj_99 [brain|all]
The unchanged base atlas supplies identity, concept and system membership only.
"""
import gzip,hashlib,json,math,struct,sys
from pathlib import Path
root=Path(__file__).resolve().parents[1]
base=json.loads((root/'public/models/atlas.json').read_text())
source=Path(sys.argv[1]);stage=sys.argv[2] if len(sys.argv)>2 else 'all'
out=root/'public/models/inspection';out.mkdir(exist_ok=True)
concepts={c['name']:c for c in base['concepts']}
ids=set(concepts['brain']['elements'])
if stage=='all':
 ids.update(p['id'] for p in base['parts'] if p['id'] in concepts['skull']['elements'] and p['system']=='skeletal' and 'hyoid' not in p['name'].lower())
 ids.update(concepts['left second rib']['elements'])
chunks=[];records=[];blob=bytearray();summaries=[]
def flush():
 global blob
 if not blob:return
 name=f'detail-{len(chunks)}.bin';raw=bytes(blob);compressed=gzip.compress(raw,compresslevel=9,mtime=0)
 (out/(name+'.gz')).write_bytes(compressed)
 chunks.append({'url':'/models/inspection/'+name+'.gz','gzip':'/models/inspection/'+name+'.gz','bytes':len(raw),'gzipBytes':len(compressed),'sha256':hashlib.sha256(raw).hexdigest()});blob=bytearray()
def append(values,fmt):
 while len(blob)%4:blob.append(0)
 offset=len(blob);blob.extend(struct.pack('<'+str(len(values))+fmt,*values));return offset
for part in base['parts']:
 if part['id'] not in ids:continue
 path=source/(part['id']+'.obj');raw=path.read_bytes();positions=[];normals=[];indices=[]
 for line in raw.decode().splitlines():
  if line.startswith('v '):
   x,y,z=map(float,line.split()[1:4]);positions.extend([x*.001,z*.001+.0781112,-y*.001-.1])
  elif line.startswith('vn '):
   x,y,z=map(float,line.split()[1:4]);normals.extend([round(x*32767),round(z*32767),round(-y*32767)])
  elif line.startswith('f '):
   tokens=line.split()[1:];face=[]
   for token in tokens:
    s=token.split('/');vi=int(s[0])-1;ni=int(s[-1])-1
    assert vi==ni, f'{part["id"]}: separate normal indices require explicit remapping'
    face.append(vi)
   for j in range(1,len(face)-1):indices.extend([face[0],face[j],face[j+1]])
 assert len(positions)==len(normals) and max(indices)<len(positions)//3
 positions=list(struct.unpack('<'+str(len(positions))+'f',struct.pack('<'+str(len(positions))+'f',*positions)))
 bounds=[[min(positions[i::3]) for i in range(3)],[max(positions[i::3]) for i in range(3)]]
 assert max(abs(bounds[e][a]-part['bounds'][e][a]) for e in range(2) for a in range(3))<2e-7,part['id']
 if blob and len(blob)+len(positions)*6+len(indices)*4>240000:flush()
 topology=hashlib.sha256(struct.pack('<'+str(len(positions))+'f',*positions)+struct.pack('<'+str(len(indices))+'I',*indices)).hexdigest()
 record={**part,'chunk':len(chunks),'positions':append(positions,'f'),'normals':append(normals,'h'),'indices':append(indices,'I'),'vertexCount':len(positions)//3,'indexCount':len(indices),'bounds':bounds,'topology':topology,'sourceSha256':hashlib.sha256(raw).hexdigest(),'sourceFile':path.name,'baseTriangles':part['indexCount']//3}
 records.append(record)
flush()
manifest={'version':'bodyparts3d-4.0-inspection-v1','source':'https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_BP3D_4.0_obj_99.zip','license':'CC-BY-4.0','transform':'(x,y,z) mm -> (x/1000,z/1000+0.0781112,-y/1000-0.1) m','parts':records,'chunks':chunks,'triangles':sum(p['indexCount']//3 for p in records)}
# Remove only obsolete outputs owned by this deterministic packer.
valid={c['gzip'].split('/')[-1] for c in chunks}
for old in out.glob('detail-*.bin.gz'):
 if old.name not in valid:old.unlink()
(out/'detail.json').write_text(json.dumps(manifest,separators=(',',':'))+'\n')
print(json.dumps({'stage':stage,'parts':len(records),'baseTriangles':sum(p['baseTriangles'] for p in records),'detailTriangles':manifest['triangles'],'gzipBytes':sum(c['gzipBytes'] for c in chunks),'maxChunkGzipBytes':max(c['gzipBytes'] for c in chunks),'chunks':len(chunks)},indent=2))

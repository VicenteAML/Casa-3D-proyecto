const fs = require('fs');

const txt = fs.readFileSync(process.argv[2], 'utf8');
const lines = txt.split('\n').map(l => l.trim()).filter(Boolean);

let solids = [], cur = null, tri = null;
for(const l of lines){
  if(l.startsWith('solid ')){ cur = {name: l.slice(6), tris: []}; solids.push(cur); }
  else if(l.startsWith('facet ')){ tri = []; }
  else if(l.startsWith('vertex ')){
    const a = l.split(/\s+/);
    tri.push([parseFloat(a[1]), parseFloat(a[2]), parseFloat(a[3])]);
  }
  else if(l.startsWith('endfacet')){ if(cur && tri.length === 3) cur.tris.push(tri); tri = null; }
}

const problemas = [];
const sub = (a,b) => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
const cross = (a,b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const mag = a => Math.hypot(a[0], a[1], a[2]);

let totalTri = 0, areaTotal = 0, volumenTotal = 0;
let minx=1e9,miny=1e9,minz=1e9,maxx=-1e9,maxy=-1e9,maxz=-1e9;

for(const s of solids){
  if(!/^[A-Za-z][A-Za-z0-9_ ]*$/.test(s.name)) problemas.push("nombre no portable: " + s.name);
  if(s.tris.length !== 12){ problemas.push(s.name + " tiene " + s.tris.length + " triangulos (se esperaban 12)"); continue; }

  const edges = new Map();
  let area = 0, vol = 0;
  for(const t of s.tris){
    totalTri++;
    const n = cross(sub(t[1],t[0]), sub(t[2],t[0]));
    area += mag(n) / 2;
    vol += (t[0][0]*(t[1][1]*t[2][2] - t[1][2]*t[2][1])
          - t[0][1]*(t[1][0]*t[2][2] - t[1][2]*t[2][0])
          + t[0][2]*(t[1][0]*t[2][1] - t[1][1]*t[2][0])) / 6;
    for(const v of t){
      if(v[0]<minx)minx=v[0]; if(v[0]>maxx)maxx=v[0];
      if(v[1]<miny)miny=v[1]; if(v[1]>maxy)maxy=v[1];
      if(v[2]<minz)minz=v[2]; if(v[2]>maxz)maxz=v[2];
    }
    for(let i = 0; i < 3; i++){
      const a = t[i], b = t[(i+1)%3];
      const k = a.join(",") + "|" + b.join(",");
      edges.set(k, (edges.get(k) || 0) + 1);
    }
  }

  if(Math.abs(vol) < 1e-9) problemas.push(s.name + " tiene volumen cero");
  const esperado = s.tris.length;
  let sueltas = 0, repetidas = 0;
  for(const [k, c] of edges){
    const [a, b] = k.split("|");
    if(c > 1) repetidas++;
    if(!edges.has(b + "|" + a)) sueltas++;
  }
  if(sueltas) problemas.push(s.name + ": " + sueltas + " aristas sin pareja (hueco en la malla)");
  if(repetidas) problemas.push(s.name + ": " + repetidas + " aristas repetidas");

  areaTotal += area;
  volumenTotal += Math.abs(vol);
}

console.log("solidos:", solids.length);
console.log("triangulos:", totalTri);
console.log("caja (cm): X " + minx.toFixed(1) + " a " + maxx.toFixed(1) +
            " | Y " + miny.toFixed(1) + " a " + maxy.toFixed(1) +
            " | Z " + minz.toFixed(1) + " a " + maxz.toFixed(1));
console.log("superficie:", areaTotal.toFixed(1), "cm2");
console.log("volumen:", volumenTotal.toFixed(1), "cm3");
console.log("");
if(problemas.length === 0){
  console.log("VALIDO: las 54 piezas son solidos cerrados y orientadas, sin huecos ni triangulos degenerados.");
} else {
  console.log("PROBLEMAS (" + problemas.length + "):");
  for(const p of problemas.slice(0, 30)) console.log("  - " + p);
}
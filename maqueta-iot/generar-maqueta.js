const fs = require('fs');
const path = require('path');

const W = 30, D = 30, T = 0.8, H = 18, BASE_T = 1.0, ROOF_T = 1.2;

const parts = [];
function P(name, x0, y0, z0, x1, y1, z1){ parts.push({name, x0, y0, z0, x1, y1, z1}); }

P("Base", 0, 0, -BASE_T, W, D, 0);
P("Techo Desmontable", -0.5, -0.5, H, W + 0.5, D + 0.5, H + ROOF_T);

function wall(name, axis, f0, f1, a0, a1, openings){
  const cols = new Set([a0, a1]), rows = new Set([0, H]);
  for(const o of openings){ cols.add(o[0]); cols.add(o[1]); rows.add(o[2]); rows.add(o[3]); }
  const C = [...cols].sort((p, q) => p - q);
  const R = [...rows].sort((p, q) => p - q);
  const grid = [];
  for(let j = 0; j < R.length - 1; j++){
    const row = [];
    for(let i = 0; i < C.length - 1; i++){
      const ca = (C[i] + C[i + 1]) / 2, cz = (R[j] + R[j + 1]) / 2;
      row.push(!openings.some(o => ca > o[0] && ca < o[1] && cz > o[2] && cz < o[3]));
    }
    grid.push(row);
  }
  const runs = [];
  for(let j = 0; j < grid.length; j++){
    let i = 0;
    while(i < grid[j].length){
      if(!grid[j][i]){ i++; continue; }
      let k = i;
      while(k + 1 < grid[j].length && grid[j][k + 1]) k++;
      runs.push({i0: i, i1: k, j: j});
      i = k + 1;
    }
  }
  const stack = [];
  for(const r of runs){
    const top = stack[stack.length - 1];
    if(top && top.i0 === r.i0 && top.i1 === r.i1 && top.j1 === r.j - 1){ top.j1 = r.j; }
    else stack.push({i0: r.i0, i1: r.i1, j0: r.j, j1: r.j});
  }
  for(const s of stack){
    const a = C[s.i0], b = C[s.i1 + 1], z0 = R[s.j0], z1 = R[s.j1 + 1];
    const nm = name + " " + String.fromCharCode(65 + s.j0) + (s.i0 + 1);
    if(axis === 'y') P(nm, a, f0, z0, b, f1, z1);
    else P(nm, f0, a, z0, f1, b, z1);
  }
}

wall("Pared Frontal", 'y', 0, T, 0, W, [[11.5, 18.5, 0, 10], [2.5, 6.5, 8, 12]]);
wall("Pared Trasera", 'y', D - T, D, 0, W, [[11.5, 18.5, 0, 10], [23.5, 27.5, 8, 12]]);
wall("Pared Izquierda", 'x', 0, T, 0, D, [[11, 19, 6, 11]]);
wall("Pared Derecha", 'x', D - T, D, 0, D, [[11, 19, 6, 11]]);

P("Hoja Puerta Principal", 11.7, 0.12, 0.15, 18.3, 0.68, 9.9);
P("Hoja Puerta Trasera", 11.7, D - 0.68, 0.15, 18.3, D - 0.12, 9.9);
P("Hoja Ventana Izquierda", 0.12, 11.15, 6.15, 0.68, 18.85, 10.85);
P("Hoja Ventana Derecha", W - 0.68, 11.15, 6.15, W - 0.12, 18.85, 10.85);
P("Vidrio Ventana Decorativa Frontal", 2.65, 0.2, 8.15, 6.35, 0.6, 11.85);
P("Vidrio Ventana Decorativa Trasera", 23.65, D - 0.6, 8.15, 27.35, D - 0.2, 11.85);

P("Servo Puerta Principal", 18.6, 1.0, 9.5, 20.9, 3.2, 11.9);
P("Servo Puerta Trasera", 8.8, 26.8, 9.5, 11.1, 29.0, 11.9);
P("Servo Ventana Izquierda", 1.0, 11.5, 11.0, 3.2, 13.8, 13.4);
P("Servo Ventana Derecha", W - 3.2, 11.5, 11.0, W - 1.0, 13.8, 13.4);

P("Brazo Servo Puerta Principal", 20.9, 1.4, 10.3, 22.6, 2.0, 10.7);
P("Brazo Servo Puerta Trasera", 7.3, 28.0, 10.3, 8.8, 28.6, 10.7);
P("Brazo Servo Ventana Izquierda", 1.6, 13.8, 12.3, 2.2, 15.5, 12.7);
P("Brazo Servo Ventana Derecha", W - 2.2, 13.8, 12.3, W - 1.6, 15.5, 12.7);

P("Reed Puerta Principal", 18.7, 0.9, 7.0, 21.2, 1.7, 7.8);
P("Iman Puerta Principal", 17.7, 0.15, 7.0, 18.3, 0.75, 7.8);
P("Reed Puerta Trasera", 8.8, 28.3, 7.0, 11.3, 29.1, 7.8);
P("Iman Puerta Trasera", 11.7, 29.25, 7.0, 12.3, 29.85, 7.8);
P("Reed Ventana Izquierda", 0.9, 19.2, 8.4, 1.7, 21.7, 9.2);
P("Iman Ventana Izquierda", 0.15, 18.4, 8.4, 0.75, 19.0, 9.2);
P("Reed Ventana Derecha", W - 1.7, 19.2, 8.4, W - 0.9, 21.7, 9.2);
P("Iman Ventana Derecha", W - 0.75, 18.4, 8.4, W - 0.15, 19.0, 9.2);

P("Proximidad Puerta Principal", 9.0, 0.9, 4.0, 10.5, 1.8, 4.9);
P("Proximidad Puerta Trasera", 19.5, 28.2, 4.0, 21.0, 29.1, 4.9);
P("Proximidad Ventana Izquierda", 0.9, 8.5, 6.6, 1.8, 10.0, 7.5);
P("Proximidad Ventana Derecha", W - 1.8, 8.5, 6.6, W - 0.9, 10.0, 7.5);

P("Arduino UNO R4 WiFi", 3.0, 3.0, 0, 9.9, 7.6, 0.9);
P("Protoboard", 11.5, 3.0, 0, 28.0, 8.5, 1.0);

function sub(a, b){ return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function cross(a, b){ return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function dot(a, b){ return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function unit(n){ const l = Math.hypot(n[0], n[1], n[2]); return [n[0] / l, n[1] / l, n[2] / l]; }

function boxTris(p){
  const {x0, y0, z0, x1, y1, z1} = p;
  const A = [x0, y0, z0], B = [x1, y0, z0], C = [x1, y1, z0], Dd = [x0, y1, z0];
  const E = [x0, y0, z1], F = [x1, y0, z1], G = [x1, y1, z1], Hh = [x0, y1, z1];
  const faces = [
    [[A, Dd, C], [0, 0, -1]], [[A, C, B], [0, 0, -1]],
    [[E, F, G], [0, 0, 1]],  [[E, G, Hh], [0, 0, 1]],
    [[A, B, F], [0, -1, 0]], [[A, F, E], [0, -1, 0]],
    [[Dd, Hh, G], [0, 1, 0]], [[Dd, G, C], [0, 1, 0]],
    [[A, E, Hh], [-1, 0, 0]], [[A, Hh, Dd], [-1, 0, 0]],
    [[B, C, G], [1, 0, 0]],  [[B, G, F], [1, 0, 0]],
  ];
  return faces.map(([v, want]) => {
    let n = unit(cross(sub(v[1], v[0]), sub(v[2], v[0])));
    if(dot(n, want) < 0){
      const t = v[1]; v[1] = v[2]; v[2] = t;
      n = [-n[0], -n[1], -n[2]];
    }
    return {n: n, v: v};
  });
}

function fmt(n){
  let s = n.toFixed(5);
  if(s === "-0.00000") s = "0.00000";
  return s;
}

const S = Number(process.argv[3]) || 1;

let stl = "";
let total = 0;
for(const p of parts){
  stl += "solid " + p.name + "\n";
  for(const t of boxTris(p)){
    stl += "  facet normal " + fmt(t.n[0]) + " " + fmt(t.n[1]) + " " + fmt(t.n[2]) + "\n";
    stl += "    outer loop\n";
    for(const v of t.v) stl += "      vertex " + fmt(v[0] * S) + " " + fmt(v[1] * S) + " " + fmt(v[2] * S) + "\n";
    stl += "    endloop\n  endfacet\n";
    total++;
  }
  stl += "endsolid " + p.name + "\n";
}

const dir = path.dirname(module.filename === undefined ? process.argv[1] : ".");
const out = process.argv[2] || path.join(process.cwd(), "maqueta-casa.stl");
fs.writeFileSync(out, stl, "utf8");

let minx = 1e9, miny = 1e9, minz = 1e9, maxx = -1e9, maxy = -1e9, maxz = -1e9;
for(const p of parts){
  minx = Math.min(minx, p.x0); maxx = Math.max(maxx, p.x1);
  miny = Math.min(miny, p.y0); maxy = Math.max(maxy, p.y1);
  minz = Math.min(minz, p.z0); maxz = Math.max(maxz, p.z1);
}

console.log("piezas:", parts.length, "| triangulos:", total);
console.log("medidas externas (cm): X=" + (maxx - minx).toFixed(1) +
            "  Y=" + (maxy - miny).toFixed(1) +
            "  Z=" + (maxz - minz).toFixed(1));
console.log("archivo:", out, "|", (stl.length / 1024).toFixed(1), "KB");
console.log("");
for(const p of parts){
  console.log("  " + p.name.padEnd(32) +
    " [" + [p.x0, p.y0, p.z0].map(fmt).join(", ") + "] -> [" +
    [p.x1, p.y1, p.z1].map(fmt).join(", ") + "]");
}
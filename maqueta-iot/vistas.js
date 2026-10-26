const fs = require('fs');

function cargar(ruta){
  const lineas = fs.readFileSync(ruta, 'utf8').split('\n').map(l => l.trim());
  const solidos = [];
  let cur = null, tri = null;
  for(const l of lineas){
    if(l.startsWith('solid ')){ cur = {name: l.slice(6), tris: []}; solidos.push(cur); }
    else if(l.startsWith('facet ')){ tri = []; }
    else if(l.startsWith('vertex ')){
      const a = l.split(/\s+/);
      if(tri) tri.push([parseFloat(a[1]), parseFloat(a[2]), parseFloat(a[3])]);
    }
    else if(l.startsWith('endfacet')){
      if(cur && tri && tri.length === 3) cur.tris.push(tri);
      tri = null;
    }
  }
  return solidos;
}

const sub = (a,b) => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
const cross = (a,b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const dot = (a,b) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const unit = n => { const l = Math.hypot(n[0],n[1],n[2]); return [n[0]/l, n[1]/l, n[2]/l]; };

function rotar(p, pivote, eje, ang){
  const k = unit(eje);
  const v = sub(p, pivote);
  const c = Math.cos(ang), s = Math.sin(ang);
  const kv = cross(k, v), kd = dot(k, v);
  return [
    v[0]*c + kv[0]*s + k[0]*kd*(1-c) + pivote[0],
    v[1]*c + kv[1]*s + k[1]*kd*(1-c) + pivote[1],
    v[2]*c + kv[2]*s + k[2]*kd*(1-c) + pivote[2]
  ];
}

function color(nombre){
  if(/Techo/.test(nombre)) return [196, 74, 66];
  if(/^Base/.test(nombre)) return [122, 106, 88];
  if(/Pared/.test(nombre)) return [226, 216, 196];
  if(/Hoja Puerta/.test(nombre)) return [150, 100, 60];
  if(/Hoja Ventana/.test(nombre)) return [110, 150, 190];
  if(/Vidrio/.test(nombre)) return [150, 200, 225];
  if(/Servo/.test(nombre)) return [70, 110, 200];
  if(/Brazo/.test(nombre)) return [40, 80, 160];
  if(/Reed/.test(nombre)) return [200, 60, 170];
  if(/Iman/.test(nombre)) return [240, 150, 40];
  if(/Proximidad/.test(nombre)) return [60, 160, 90];
  if(/Arduino/.test(nombre)) return [40, 150, 150];
  if(/Protoboard/.test(nombre)) return [232, 232, 232];
  return [180, 180, 180];
}

const luz = unit([-0.4, -0.6, 0.7]);
const M = 9;

function dibujar(solidos, archivo, opciones){
  const ocultar = (opciones.ocultar || []);
  const abrir = (opciones.abrir || []);
  const caras = [];

  for(const s of solidos){
    if(ocultar.some(re => re.test(s.name))) continue;
    const mover = abrir.find(o => o.re.test(s.name));

    for(const t of s.tris){
      const v = mover ? t.map(p => rotar(p, mover.pivote, mover.eje, mover.ang)) : t.map(p => p.slice());
      const n = unit(cross(sub(v[1],v[0]), sub(v[2],v[0])));
      const c = [0,1,2].map(i => (v[0][i]+v[1][i]+v[2][i])/3);
      const luzAmt = Math.abs(dot(n, luz)) * 0.65 + 0.35;
      const base = color(s.name);
      const rgb = base.map(x => Math.min(255, Math.round(x * luzAmt)));
      caras.push({
        prof: c[0] + c[1] + c[2],
        rgb: rgb,
        v: v
      });
    }
  }

  caras.sort((a,b) => a.prof - b.prof);

  let xmin = 1e9, xmax = -1e9, ymin = 1e9, ymax = -1e9;
  for(const p of caras) for(const v of p.v){
    const sx = (v[0]-v[1]) * 0.8660, sy = (v[0]+v[1]) * 0.5 - v[2];
    if(sx < xmin) xmin = sx; if(sx > xmax) xmax = sx;
    if(sy < ymin) ymin = sy; if(sy > ymax) ymax = sy;
  }
  const W = Math.round((xmax-xmin)*M + 2*M);
  const H = Math.round((ymax-ymin)*M + 2*M);
  const ox = -xmin*M + M, oy = -ymin*M + M;

  let svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H +
            '" viewBox="0 0 ' + W + ' ' + H + '">';
  svg += '<rect width="100%" height="100%" fill="#f4f6f8"/>';
  for(const p of caras){
    const d = p.v.map(v => {
      const sx = ((v[0]-v[1]) * 0.8660)*M + ox;
      const sy = ((v[0]+v[1]) * 0.5 - v[2])*M + oy;
      return sx.toFixed(2) + "," + sy.toFixed(2);
    }).join(" ");
    const c = p.rgb.join(",");
    svg += '<polygon points="' + d + '" fill="rgb(' + c + ')" stroke="rgb(' + c +
           ')" stroke-width="0.5" stroke-linejoin="round"/>';
  }
  svg += '</svg>';
  fs.writeFileSync(archivo, svg, 'utf8');
  console.log("  " + archivo + "  " + W + "x" + H + "  " + caras.length + " caras");
}

const solidos = cargar("maqueta-casa.stl");
console.log("piezas leidas:", solidos.length);

const abrir = [
  {re: /Hoja Puerta Principal/,   pivote: [11.5, 0.4, 0],   eje: [0,0,1], ang: -1.25},
  {re: /Hoja Puerta Trasera/,     pivote: [18.5, 29.6, 0],  eje: [0,0,1], ang:  1.25},
  {re: /Hoja Ventana Izquierda/, pivote: [0.4, 19, 11],     eje: [0,1,0], ang:  1.15},
  {re: /Hoja Ventana Derecha/,   pivote: [29.6, 19, 11],   eje: [0,1,0], ang: -1.15}
];

console.log("generando vistas...");
dibujar(solidos, "vista-3d.svg", {});
dibujar(solidos, "vista-sin-techo.svg", {ocultar: [/Techo/]});
dibujar(solidos, "vista-abierta.svg", {ocultar: [/Techo/], abrir: abrir});
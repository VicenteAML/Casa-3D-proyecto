import PlanDePruebas from './PlanDePruebas'
import { useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import * as THREE from 'three'
import './index.css'

// Medidas visuales: 7 unidades equivalen a una base de 350 mm.
const ANCHO = 6.6
const ALTO = 3.2
const GROSOR = 0.16
const PARED = '#dad5c5'
const MARCO = '#617b7b'
const TECHO = '#934d3e'

function Bloque({ position = [0, 0, 0], size, color, ...props }) {
  return (
    <mesh position={position} castShadow receiveShadow {...props}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.65} />
    </mesh>
  )
}

// Paredes con huecos reales; el interior no contiene un bloque sólido.
function Pared({ ancho, huecos = [], ...props }) {
  const cortes = [...new Set([-ancho / 2, ancho / 2,
    ...huecos.flatMap(a => [a.x - a.w / 2, a.x + a.w / 2]),
  ])].sort((a, b) => a - b)
  const piezas = []
  for (let i = 0; i < cortes.length - 1; i++) {
    const centro = (cortes[i] + cortes[i + 1]) / 2
    const aberturas = huecos.filter(a => centro > a.x - a.w / 2 && centro < a.x + a.w / 2)
      .sort((a, b) => a.y - b.y)
    let desde = 0
    for (const a of [...aberturas, { y: ALTO, h: 0 }]) {
      if (a.y > desde) piezas.push(
        <Bloque key={`${i}-${desde}`} position={[centro, (desde + a.y) / 2, 0]}
          size={[cortes[i + 1] - cortes[i], a.y - desde, GROSOR]} color={PARED} />
      )
      desde = Math.max(desde, a.y + a.h)
    }
  }
  return <group {...props}>{piezas}</group>
}

function Vidrio({ ancho, alto, position }) {
  return (
    <mesh position={position}>
      <planeGeometry args={[ancho, alto]} />
      <meshStandardMaterial color="#addde4" transparent opacity={0.2}
        roughness={0.2} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  )
}

// Representación simplificada de un microservo azul tipo SG90.
// El eje vertical queda alineado con el pivote de la hoja.
function Servo({ position }) {
  return (
    <group position={position}>
      <Bloque position={[0, -0.14, -0.1]} size={[0.28, 0.28, 0.32]} color="#2168b4" />
      <Bloque position={[0, -0.2, -0.1]} size={[0.46, 0.055, 0.32]} color="#3184cf" />
      {[-0.19, 0.19].map(x => (
        <mesh key={x} position={[x, -0.163, -0.1]}>
          <cylinderGeometry args={[0.025, 0.025, 0.025, 12]} />
          <meshStandardMaterial color="#c4c8cd" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
      <mesh position={[0, 0.035, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.045, 0.07, 16]} />
        <meshStandardMaterial color="#dddde1" />
      </mesh>
      {/* Tres cables decorativos, sin conexión a hardware. */}
      {['#624330', '#ce433b', '#e8bb49'].map((color, i) => (
        <Bloque key={color} position={[-0.035 + i * 0.035, -0.26, -0.34]}
          size={[0.022, 0.022, 0.22]} color={color} />
      ))}
    </group>
  )
}

function Abertura({ position, rotation = [0, 0, 0], ancho, alto,
  puerta = false, movil = false, abierta = false, alternar }) {
  const pivote = useRef()
  const borde = 0.08
  const holgura = 0.018
  const hojaAncho = ancho - 2 * borde - 2 * holgura
  const hojaAlto = alto - 2 * borde - 2 * holgura
  const bisagra = -ancho / 2 + borde + holgura
  const servoY = puerta ? 0.43 : 0.3
  useFrame((_, dt) => {
    if (!pivote.current) return
    const destino = movil && abierta ? -Math.PI / 2 : 0
    pivote.current.rotation.y = THREE.MathUtils.damp(pivote.current.rotation.y, destino, 7, dt)
    if (Math.abs(pivote.current.rotation.y - destino) < 0.001) pivote.current.rotation.y = destino
  })
  return (
    <group position={position} rotation={rotation}>
      {/* Marcos contenidos en el hueco y con suficiente profundidad para tocar la pared. */}
      {[-1, 1].map(s => (
        <Bloque key={s} position={[s * (ancho / 2 - borde / 2), alto / 2, 0]}
          size={[borde, alto - 2 * borde, 0.22]} color={MARCO} />
      ))}
      {[borde / 2, alto - borde / 2].map(y => (
        <Bloque key={y} position={[0, y, 0]} size={[ancho, borde, 0.22]} color={MARCO} />
      ))}
      {movil && <Servo position={[bisagra, servoY, -0.045]} />}
      <group ref={pivote} position={[bisagra, borde + holgura, -0.045]}
        onClick={movil ? e => { e.stopPropagation(); alternar() } : undefined}>
        {movil && (
          <Bloque position={[0.1, servoY + 0.08 - borde - holgura, 0]}
            size={[0.26, 0.045, 0.08]} color="#f3f0e5" />
        )}
        {puerta ? (
          <group>
            <Bloque position={[hojaAncho / 2, hojaAlto / 2, 0]}
              size={[hojaAncho, hojaAlto, 0.085]} color="#a97641" />
            {[hojaAlto * 0.28, hojaAlto * 0.73].map(y => (
              <Bloque key={y} position={[hojaAncho / 2, y, 0.048]}
                size={[hojaAncho - 0.18, hojaAlto * 0.34, 0.012]} color="#b8864e" />
            ))}
            <Bloque position={[hojaAncho - 0.13, hojaAlto * 0.48, 0.08]}
              size={[0.04, 0.18, 0.055]} color="#393d40" />
          </group>
        ) : (
          <group position={[hojaAncho / 2, hojaAlto / 2, 0]}>
            <Vidrio ancho={hojaAncho - 0.1} alto={hojaAlto - 0.1} />
            {[-1, 1].map(s => (
              <Bloque key={`v${s}`} position={[s * (hojaAncho / 2 - 0.025), 0, 0]}
                size={[0.05, hojaAlto - 0.1, 0.065]} color={MARCO} />
            ))}
            {[-1, 1].map(s => (
              <Bloque key={`h${s}`} position={[0, s * (hojaAlto / 2 - 0.025), 0]}
                size={[hojaAncho, 0.05, 0.065]} color={MARCO} />
            ))}
            <Bloque size={[0.04, hojaAlto - 0.1, 0.065]} color={MARCO} />
            {movil && <Bloque position={[hojaAncho / 2 - 0.12, 0, 0.065]}
              size={[0.035, 0.15, 0.05]} color="#dedcd2" />}
          </group>
        )}
      </group>
    </group>
  )
}

function Tejado() {
  const { cubierta, fronton } = useMemo(() => {
    const cubierta = new THREE.Shape()
    // Un único perfil extruido: sin solapes en la cumbrera.
    cubierta.moveTo(-3.6, -0.12)
    cubierta.lineTo(0, 1.35)
    cubierta.lineTo(3.6, -0.12)
    cubierta.lineTo(3.6, 0.03)
    cubierta.lineTo(0, 1.5)
    cubierta.lineTo(-3.6, 0.03)
    cubierta.closePath()
    const fronton = new THREE.Shape()
    fronton.moveTo(-3.38, 0)
    fronton.lineTo(3.38, 0)
    fronton.lineTo(0, 1.35)
    fronton.closePath()
    return { cubierta, fronton }
  }, [])
  return (
    <group position={[0, ALTO, 0]}>
      <mesh position={[0, 0, -3.6]} castShadow receiveShadow>
        <extrudeGeometry args={[cubierta, { depth: 7.2, bevelEnabled: false }]} />
        <meshStandardMaterial color={TECHO} />
      </mesh>
      {[-3.38, 3.22].map(z => (
        <mesh key={z} position={[0, 0, z]} castShadow receiveShadow>
          <extrudeGeometry args={[fronton, { depth: GROSOR, bevelEnabled: false }]} />
          <meshStandardMaterial color={PARED} />
        </mesh>
      ))}
    </group>
  )
}

const PARTES = [
  { id: 'delantera', nombre: 'Puerta delantera' },
  { id: 'trasera', nombre: 'Puerta trasera' },
  { id: 'izquierda', nombre: 'Ventana lateral izquierda' },
  { id: 'derecha', nombre: 'Ventana lateral derecha' },
]
const CERRADAS = { delantera: false, trasera: false, izquierda: false, derecha: false }

// Componentes de electrónica ilustrativos, no un plano de montaje certificado.
const POS_ARDUINO = [-1.2, 0.12, -0.4]
const POS_PROTO = [0.8, 0.085, -0.4]
const ROJO = '#e34a43'
const NEGRO = '#38353b'
const SENAL = '#ecbd42'
const pDigital = pin => [POS_ARDUINO[0] - 0.52 + pin * 0.075, 0.22, POS_ARDUINO[2] - 0.45]
const pGND = [-1.55, 0.22, 0.05]
const pRail = (i, positivo) => [0.23 + i * 0.23, 0.18, positivo ? 0.08 : 0.15]
const CONEXIONES = [
  { id: 'delantera', pin: 3, origen: [0, 0, 3.3], giro: 0, ancho: 1.3, servoY: 0.43,
    ruta: [[-1.95, 0.07, 1.2], [-1.95, 0.07, 2.65]] },
  { id: 'trasera', pin: 5, origen: [0, 0, -3.3], giro: Math.PI, ancho: 1.3, servoY: 0.43,
    ruta: [[1.95, 0.07, -1.1], [1.95, 0.07, -2.65]] },
  { id: 'izquierda', pin: 6, origen: [-3.3, 1.05, 0], giro: -Math.PI / 2, ancho: 2.05, servoY: 0.3,
    ruta: [[-2.55, 0.07, -1.6], [-2.76, 0.07, -0.927]] },
  { id: 'derecha', pin: 9, origen: [3.3, 1.05, 0], giro: Math.PI / 2, ancho: 2.05, servoY: 0.3,
    ruta: [[2.55, 0.07, 1.6], [2.76, 0.07, 0.927]] },
]

function Cable({ puntos, color, radio = 0.014 }) {
  const curva = useMemo(() => {
    // Segmentos rectos: no se desvían ni atraviesan paredes al suavizar esquinas.
    const ruta = new THREE.CurvePath()
    const vertices = puntos.map(p => new THREE.Vector3(...p))
    let desde = vertices[0]
    for (let i = 1; i < vertices.length - 1; i++) {
      const anterior = vertices[i - 1]
      const actual = vertices[i]
      const siguiente = vertices[i + 1]
      const radio = Math.min(0.06, actual.distanceTo(anterior) * 0.24, actual.distanceTo(siguiente) * 0.24)
      const entrada = actual.clone().add(anterior.clone().sub(actual).normalize().multiplyScalar(radio))
      const salida = actual.clone().add(siguiente.clone().sub(actual).normalize().multiplyScalar(radio))
      if (desde.distanceTo(entrada) > 0.00001) ruta.add(new THREE.LineCurve3(desde, entrada))
      if (radio > 0.00001) ruta.add(new THREE.QuadraticBezierCurve3(entrada, actual, salida))
      desde = salida
    }
    const ultimo = vertices[vertices.length - 1]
    if (desde.distanceTo(ultimo) > 0.00001) ruta.add(new THREE.LineCurve3(desde, ultimo))
    return ruta
  }, [puntos])
  return (
    <mesh castShadow>
      <tubeGeometry args={[curva, 96, radio, 8, false]} />
      <meshStandardMaterial color={color} roughness={0.55} />
    </mesh>
  )
}

function Rotulo({ position, children, pequeno = false }) {
  return (
    <Html position={position} center occlude zIndexRange={[4, 0]} style={{ pointerEvents: 'none' }}>
      <div style={{ whiteSpace: 'nowrap', background: '#24343bea', color: 'white',
        padding: pequeno ? '2px 4px' : '4px 6px', borderRadius: 4,
        font: `${pequeno ? 9 : 11}px Arial`, border: '1px solid #ffffff55' }}>{children}</div>
    </Html>
  )
}

function ArduinoR4() {
  return (
    <group position={POS_ARDUINO}>
      <Bloque size={[1.38, 0.075, 1.08]} color="#187b83" />
      {/* USB-C y conector de alimentación: representación simplificada de UNO R4. */}
      <Bloque position={[-0.61, 0.1, -0.15]} size={[0.25, 0.16, 0.24]} color="#b8bec2" />
      <Bloque position={[-0.742, 0.1, -0.15]} size={[0.018, 0.065, 0.16]} color="#303c42" />
      <Bloque position={[-0.56, 0.1, 0.29]} size={[0.25, 0.18, 0.22]} color="#262c31" />
      <Bloque position={[0.04, 0.085, 0]} size={[0.37, 0.095, 0.36]} color="#303539" />
      <Bloque position={[0.45, 0.08, 0.15]} size={[0.12, 0.075, 0.16]} color="#bfc7c8" />
      <Bloque position={[-0.23, 0.075, 0.22]} size={[0.09, 0.06, 0.09]} color="#d8d8d0" />
      {Array.from({ length: 14 }, (_, pin) => (
        <group key={pin} position={[-0.52 + pin * 0.075, 0.07, -0.45]}>
          <Bloque size={[0.067, 0.1, 0.11]} color="#20282c" />
          <Bloque position={[0, 0.052, 0]} size={[0.028, 0.012, 0.034]} color="#aab0b1" />
        </group>
      ))}
      {Array.from({ length: 14 }, (_, i) => (
        <group key={i} position={[-0.52 + i * 0.075, 0.07, 0.45]}>
          <Bloque size={[0.067, 0.1, 0.11]} color="#20282c" />
          <Bloque position={[0, 0.052, 0]} size={[0.028, 0.012, 0.034]} color="#aab0b1" />
        </group>
      ))}
      {[-1, 1].flatMap(x => [-1, 1].map(z => (
        <mesh key={`${x}-${z}`} position={[x * 0.61, 0.045, z * 0.46]}>
          <cylinderGeometry args={[0.038, 0.038, 0.012, 12]} />
          <meshStandardMaterial color="#ded8ae" metalness={0.5} roughness={0.3} />
        </mesh>
      )))}
      <Rotulo position={[0, 0.28, 0.15]}>Arduino UNO R4</Rotulo>
    </group>
  )
}

function Protoboard() {
  return (
    <group position={POS_PROTO}>
      <Bloque size={[1.7, 0.14, 1.25]} color="#f3f0e7" />
      <Bloque position={[0, 0.071, 0]} size={[1.55, 0.009, 0.08]} color="#babbb5" />
      {[-1, 1].map(s => (
        <group key={s}>
          <Bloque position={[0, 0.072, s * 0.46]} size={[1.55, 0.008, 0.014]} color={ROJO} />
          <Bloque position={[0, 0.072, s * 0.57]} size={[1.55, 0.008, 0.014]} color="#427ba7" />
        </group>
      ))}
      {Array.from({ length: 20 }, (_, columna) => (
        <group key={columna} position={[-0.73 + columna * 0.077, 0.073, 0]}>
          {[-0.54, -0.48, -0.35, -0.29, -0.23, -0.17, -0.11,
            0.11, 0.17, 0.23, 0.29, 0.35, 0.48, 0.55].map(z => (
            <Bloque key={z} position={[0, 0, z]} size={[0.028, 0.009, 0.025]} color="#515956" />
          ))}
        </group>
      ))}
      <Rotulo position={[0, 0.3, -0.1]}>Protoboard</Rotulo>
      <Rotulo position={[0.67, 0.23, 0.48]} pequeno>+5 V</Rotulo>
      <Rotulo position={[0.67, 0.23, 0.55]} pequeno>GND</Rotulo>
    </group>
  )
}


function Canaleta({ puntos }) {
  return <group>{puntos.slice(1).map((fin, i) => {
    const inicio = puntos[i]
    const dx = fin[0] - inicio[0]
    const dz = fin[2] - inicio[2]
    const largo = Math.hypot(dx, dz)
    if (largo < 0.01) return null
    return <Bloque key={i} position={[(inicio[0] + fin[0]) / 2, 0.025, (inicio[2] + fin[2]) / 2]}
      rotation={[0, -Math.atan2(dz, dx), 0]} size={[largo + 0.05, 0.05, 0.16]} color="#aab5b0" />
  })}</group>
}

function Electronica() {
  // Canaletas por el suelo; señales independientes a través de la protoboard.
  const rutas = [
    [[-1.9, 0.1, 1.05], [-1.9, 0.1, 2.65], [-0.552, 0.1, 2.65], [-0.552, 0.1, 2.805]],
    [[1.9, 0.1, -1.3], [1.9, 0.1, -2.65], [0.552, 0.1, -2.65], [0.552, 0.1, -2.805]],
    [[-2, 0.1, -1.25], [-2.805, 0.1, -1.25], [-2.805, 0.1, -0.927]],
    [[2, 0.1, 1.25], [2.805, 0.1, 1.25], [2.805, 0.1, 0.927]],
  ]
  const columnas = [5, 8, 11, 14].map(n => POS_PROTO[0] - 0.73 + n * 0.077)
  return (
    <group>
      {/* Bandeja de montaje: placas separadas y sin cables cruzando por encima del chip. */}
      <Bloque position={[-0.25, 0.012, -0.4]} size={[3.7, 0.024, 1.45]} color="#d6ddd6" />
      <ArduinoR4 />
      <Protoboard />
      <Bloque position={[0.3, 0.17, -2.05]} size={[1.25, 0.34, 0.65]} color="#4c565d" />
      <Bloque position={[-0.15, 0.355, -1.83]} size={[0.12, 0.04, 0.1]} color={ROJO} />
      <Bloque position={[0.65, 0.355, -1.83]} size={[0.12, 0.04, 0.1]} color={NEGRO} />
      <Rotulo position={[0.3, 0.52, -2.05]}>Fuente externa · 5 V</Rotulo>
      {/* Alimentación rodeando la bandeja por la derecha. */}
      <Cable color={ROJO} puntos={[[-0.15, 0.38, -1.83], [-0.15, 0.1, -1.55],
        [1.83, 0.1, -1.55], [1.83, 0.1, 0.08], [1.456, 0.18, 0.08]]} />
      <Cable color={NEGRO} puntos={[[0.65, 0.38, -1.83], [0.65, 0.07, -1.48],
        [1.89, 0.07, -1.48], [1.89, 0.07, 0.15], [1.456, 0.18, 0.15]]} />
      <Cable color="#424a50" radio={0.027} puntos={[[-0.34, 0.2, -2.05],
        [-2.18, 0.1, -2.05], [-2.18, 0.16, -0.55], [-1.94, 0.22, -0.55]]} />
      <Cable color={NEGRO} puntos={[pGND, [-1.55, 0.14, 0.34],
        [1.302, 0.14, 0.34], [1.302, 0.18, 0.15]]} />
      <Rotulo position={[-1.55, 0.32, 0.06]} pequeno>GND común</Rotulo>
      <Rotulo position={[-1.19, 0.42, -1.03]} pequeno>D3 · D5 · D6 · D9</Rotulo>
      {CONEXIONES.map((c, i) => {
        const xColumna = columnas[i]
        const bisagra = -c.ancho / 2 + 0.098
        return (
          <group key={c.id}>
            {/* Puente Arduino → columna aislada; nunca a los rieles de alimentación. */}
            <Cable color={SENAL} radio={0.011} puntos={[pDigital(c.pin),
              [pDigital(c.pin)[0], 0.29 + i * 0.035, -1.03 - i * 0.065],
              [xColumna, 0.29 + i * 0.035, -1.03 - i * 0.065],
              [xColumna, 0.18, -0.63]]} />
            <Rotulo position={[xColumna, 0.28, -0.76]} pequeno>D{c.pin}</Rotulo>
            <Canaleta puntos={rutas[i]} />
            {[NEGRO, ROJO, SENAL].map((color, tipo) => {
              const localX = bisagra - 0.035 + tipo * 0.035
              const fin = [c.origen[0] + Math.cos(c.giro) * localX + Math.sin(c.giro) * -0.495,
                c.origen[1] + c.servoY - 0.26,
                c.origen[2] - Math.sin(c.giro) * localX + Math.cos(c.giro) * -0.495]
              // Dos contactos de una misma columna forman la unión de señal.
              const inicio = [xColumna, 0.18, tipo === 0 ? 0.15 : tipo === 1 ? 0.08 : -0.51]
              const offset = (tipo - 1) * 0.035
              const altura = 0.095 + i * 0.018
              const ruta = rutas[i].map(([x, , z]) => [x + offset, altura, z + offset])
              const lateralX = ruta[0][0]
              const salidaZ = 0.37 + i * 0.075 + tipo * 0.035
              const puntos = [inicio,
                [xColumna + offset, 0.205 + tipo * 0.025, inicio[2]],
                [xColumna + offset, 0.205 + tipo * 0.025, salidaZ],
                [lateralX, altura, salidaZ], ...ruta,
                [fin[0], altura, fin[2]], fin]
              return <Cable key={color} color={color} radio={0.011} puntos={puntos} />
            })}
            {/* Sujetacables al principio y final de cada canaleta. */}
            {[rutas[i][0], rutas[i][rutas[i].length - 1]].map((p, n) => (
              <Bloque key={n} position={[p[0], 0.052, p[2]]}
                size={[0.19, 0.016, 0.19]} color="#6e7c73" />
            ))}
          </group>
        )
      })}
    </group>
  )
}

function Casa({ mostrarTecho, mostrarCables, estados, alternar }) {
  const frente = [
    { x: 0, y: 0, w: 1.3, h: 2.45 },
    { x: -2.1, y: 1.15, w: 1.3, h: 1 },
    { x: 2.1, y: 1.15, w: 1.3, h: 1 },
  ]
  const lateral = [{ x: 0, y: 1.05, w: 2.05, h: 1.35 }]
  return (
    <group>
      <Bloque position={[0, -0.09, 0]} size={[7, 0.18, 7]} color="#becbc7" />
      <Pared ancho={ANCHO + GROSOR} huecos={frente} position={[0, 0, 3.3]} />
      <Pared ancho={ANCHO + GROSOR} huecos={frente} position={[0, 0, -3.3]}
        rotation={[0, Math.PI, 0]} />
      {[-1, 1].map(s => (
        <Pared key={s} ancho={ANCHO - GROSOR} huecos={lateral}
          position={[s * 3.3, 0, 0]} rotation={[0, s * Math.PI / 2, 0]} />
      ))}
      {[false, true].map(trasera => (
        <group key={String(trasera)} position={[0, 0, trasera ? -3.3 : 3.3]}
          rotation={[0, trasera ? Math.PI : 0, 0]}>
          <Abertura position={[0, 0, 0]} ancho={1.3} alto={2.45} puerta movil
            abierta={estados[trasera ? 'trasera' : 'delantera']}
            alternar={() => alternar(trasera ? 'trasera' : 'delantera')} />
          {[-2.1, 2.1].map(x => (
            <Abertura key={x} position={[x, 1.15, 0]} ancho={1.3} alto={1} />
          ))}
        </group>
      ))}
      {[-1, 1].map(s => {
        const id = s < 0 ? 'izquierda' : 'derecha'
        return <Abertura key={id} position={[s * 3.3, 1.05, 0]}
          rotation={[0, s * Math.PI / 2, 0]} ancho={2.05} alto={1.35}
          movil abierta={estados[id]} alternar={() => alternar(id)} />
      })}
      {mostrarCables && <Electronica />}
      {mostrarTecho && <Tejado />}
      <pointLight position={[0, 2.6, 0]} intensity={8} distance={9} color="#fff6e7" />
    </group>
  )
}

export default function App() {
  const [mostrarTecho, setMostrarTecho] = useState(true)
  const [mostrarCables, setMostrarCables] = useState(true)
  const [estados, setEstados] = useState(CERRADAS)
  const cambiar = (id, valor) => setEstados(actual => ({ ...actual, [id]: valor }))
  const alternar = id => setEstados(actual => ({ ...actual, [id]: !actual[id] }))
  const todo = valor => setEstados(Object.fromEntries(PARTES.map(p => [p.id, valor])))
  const boton = { cursor: 'pointer', background: '#287d4c', color: 'white',
    border: '1px solid #54a577', padding: '8px 10px', borderRadius: 6, fontSize: 13 }
  const fila = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <aside aria-label="Control de la casa" style={{ position: 'absolute', top: 16,
        left: 16, zIndex: 10, width: 255, maxWidth: 'calc(100vw - 64px)',
        maxHeight: 'calc(100vh - 64px)', overflowY: 'auto', padding: 16,
        borderRadius: 12, background: 'rgba(61,68,72,0.97)', color: '#f4f7f5',
        fontFamily: 'Arial, sans-serif', boxShadow: '0 5px 22px #0003' }}>
        <strong>Casa inteligente · Maqueta</strong>
        <p style={{ fontSize: 12, lineHeight: 1.5, color: '#d5ddd8' }}>
          Dos puertas y dos ventanas laterales. Gira con el botón izquierdo,
          desplaza con el derecho y acerca con la rueda.
        </p>
        <div style={{ display: 'grid', gap: 13 }}>
          {PARTES.map(p => (
            <div key={p.id}>
              <div style={{ fontSize: 13, marginBottom: 6 }}>
                {p.nombre} · {estados[p.id] ? 'Orden: abrir' : 'Orden: cerrar'}
              </div>
              <div style={fila}>
                <button style={boton} onClick={() => cambiar(p.id, true)}>Abrir</button>
                <button style={boton} onClick={() => cambiar(p.id, false)}>Cerrar</button>
              </div>
            </div>
          ))}
          <div style={{ ...fila, paddingTop: 12, borderTop: '1px solid #738079' }}>
            <button style={boton} onClick={() => todo(true)}>Abrir todo</button>
            <button style={boton} onClick={() => todo(false)}>Cerrar todo</button>
          </div>
          <button style={boton} onClick={() => setMostrarTecho(v => !v)}>
            {mostrarTecho ? 'Ocultar techo' : 'Mostrar techo'}
          </button>
          <button style={boton} onClick={() => setMostrarCables(v => !v)}>
            {mostrarCables ? 'Ocultar electrónica' : 'Mostrar electrónica'}
          </button>
        </div>
        <p style={{ fontSize: 11, color: '#cbd5ce', lineHeight: 1.5, marginBottom: 0 }}>
          Rojo: +5 V. Oscuro: GND. Amarillo: señal.
          D3/D5: puertas. D6/D9: ventanas izquierda/derecha.
          Fuente externa para servos y GND común. Arduino alimentado por USB.
          Modelo UNO R4 simplificado, no un plano exacto de pines.
          Señales independientes en la protoboard y cables agrupados por mecanismo. Simulación visual: no controla dispositivos reales.
        </p>
      </aside>
      <Canvas shadows camera={{ position: [11, 8, 12], fov: 45 }}>
        <color attach="background" args={['#e7eeea']} />
        <ambientLight intensity={1.15} />
        <directionalLight position={[5, 10, 7]} intensity={2.1} castShadow
          shadow-mapSize-width={2048} shadow-mapSize-height={2048}
          shadow-camera-left={-9} shadow-camera-right={9}
          shadow-camera-top={9} shadow-camera-bottom={-9} shadow-normalBias={0.025} />
        <Casa mostrarTecho={mostrarTecho} mostrarCables={mostrarCables} estados={estados} alternar={alternar} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.185, 0]} receiveShadow>
          <planeGeometry args={[200, 200]} />
          <meshStandardMaterial color="#9ab39a" />
        </mesh>
        <OrbitControls target={[0, 1.5, 0]} enableDamping minDistance={2}
          maxDistance={28} maxPolarAngle={Math.PI / 2 - 0.015} />
      </Canvas>

      <PlanDePruebas />
    </div>
  )
}
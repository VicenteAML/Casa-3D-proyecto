// Modelo de dominio compartido por la interfaz y la integración Blynk.
export const PARTES = [
  { id: 'delantera', nombre: 'Puerta delantera', servoPin: 'D9', sensorPin: 'D2', commandPin: 'v1', statePin: 'v5' },
  { id: 'trasera', nombre: 'Puerta trasera', servoPin: 'D10', sensorPin: 'D3', commandPin: 'v2', statePin: 'v6' },
  { id: 'izquierda', nombre: 'Ventana izquierda', servoPin: 'D5', sensorPin: 'D12', commandPin: 'v3', statePin: 'v7' },
  { id: 'derecha', nombre: 'Ventana derecha', servoPin: 'D6', sensorPin: 'D4', commandPin: 'v4', statePin: 'v8' },
]

export const ESTADOS_INICIALES = Object.fromEntries(PARTES.map(({ id }) => [id, false]))

export function traducirEstados(datastreams = {}) {
  return Object.fromEntries(PARTES
    .filter(({ statePin }) => Object.hasOwn(datastreams, statePin))
    .map(({ id, statePin }) => [id, Number(datastreams[statePin]) === 1]))
}

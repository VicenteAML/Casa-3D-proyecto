export function leerPreferencia(nombre, valorPredeterminado) {
  if (typeof window === 'undefined') return valorPredeterminado
  try {
    const guardado = window.localStorage.getItem(`casa_${nombre}`)
    return guardado === null ? valorPredeterminado : JSON.parse(guardado) ?? valorPredeterminado
  } catch {
    return valorPredeterminado
  }
}

export function guardarPreferencia(nombre, valor) {
  window.localStorage.setItem(`casa_${nombre}`, JSON.stringify(valor))
}

export function eliminarPreferencia(nombre) {
  window.localStorage.removeItem(`casa_${nombre}`)
}

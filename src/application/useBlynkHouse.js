import { useCallback, useEffect, useState } from 'react'
import { PARTES, ESTADOS_INICIALES, traducirEstados } from '../domain/houseModel'
import { enviarOrden, leerDatastreams } from '../infrastructure/blynkClient'
import { eliminarPreferencia, guardarPreferencia, leerPreferencia } from '../infrastructure/browserStorage'

export function useBlynkHouse() {
  const [estados, setEstados] = useState(ESTADOS_INICIALES)
  const [token, setToken] = useState(() => leerPreferencia('tok', ''))
  const [tokenBorrador, setTokenBorrador] = useState(() => leerPreferencia('tok', ''))
  const [servidor] = useState(() => leerPreferencia('srv', 'https://ny3.blynk.cloud'))
  const [estadoConexion, setEstadoConexion] = useState(() =>
    leerPreferencia('tok', '') ? 'Conectando con Blynk…' : 'Token pendiente · modo local'
  )
  const [ordenesPendientes, setOrdenesPendientes] = useState({})

  useEffect(() => {
    if (!token) return undefined
    let activa = true
    let temporizador

    const consultar = async () => {
      try {
        const datos = await leerDatastreams(servidor, token)
        const estadosRecibidos = traducirEstados(datos)
        if (!activa) return
        if (Object.keys(estadosRecibidos).length) {
          setEstados(actuales => ({ ...actuales, ...estadosRecibidos }))
          const recibidos = Object.keys(estadosRecibidos).length
          setEstadoConexion(recibidos === PARTES.length
            ? 'En línea · 4 elementos sincronizados'
            : `En línea · ${recibidos}/4 estados recibidos`)
        } else {
          setEstadoConexion('En línea · esperando V5–V8')
        }
      } catch (error) {
        if (activa) setEstadoConexion(`Sin conexión · ${error.message}`)
      } finally {
        if (activa) temporizador = window.setTimeout(consultar, 3000)
      }
    }

    consultar()
    return () => {
      activa = false
      window.clearTimeout(temporizador)
    }
  }, [token, servidor])

  const conectar = useCallback(() => {
    const nuevoToken = tokenBorrador.trim()
    if (!nuevoToken) {
      setEstadoConexion('Pega el token de dispositivo de Blynk')
      return
    }
    try {
      guardarPreferencia('tok', nuevoToken)
      guardarPreferencia('srv', servidor)
    } catch {
      setEstadoConexion('El navegador no permitió guardar el token')
      return
    }
    setToken(nuevoToken)
    setEstadoConexion('Conectando con Blynk…')
  }, [tokenBorrador, servidor])

  const desconectar = useCallback(() => {
    try { eliminarPreferencia('tok') } catch { /* El estado local también se limpia. */ }
    setToken('')
    setTokenBorrador('')
    setEstadoConexion('Token pendiente · modo local')
  }, [])

  const comandar = useCallback(async (id, abrir) => {
    const parte = PARTES.find(item => item.id === id)
    if (!parte) return
    if (!token) {
      setEstados(actuales => ({ ...actuales, [id]: abrir }))
      return
    }

    setOrdenesPendientes(actuales => ({ ...actuales, [id]: true }))
    setEstadoConexion(`Enviando orden a ${parte.nombre}…`)
    try {
      await enviarOrden(servidor, token, parte.commandPin, abrir ? 1 : 0)
      setEstadoConexion(`Orden enviada · ${parte.nombre}; esperando estado de la placa`)
    } catch (error) {
      setEstadoConexion(`No se pudo enviar la orden · ${error.message}`)
    } finally {
      setOrdenesPendientes(actuales => ({ ...actuales, [id]: false }))
    }
  }, [servidor, token])

  const comandarTodo = useCallback(async abrir => {
    if (!token) {
      setEstados(Object.fromEntries(PARTES.map(({ id }) => [id, abrir])))
      return
    }
    await Promise.all(PARTES.map(({ id }) => comandar(id, abrir)))
  }, [comandar, token])

  return {
    estados,
    token,
    tokenBorrador,
    setTokenBorrador,
    estadoConexion,
    ordenesPendientes,
    conectar,
    desconectar,
    comandar,
    comandarTodo,
  }
}

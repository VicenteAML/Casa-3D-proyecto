import { useEffect, useId, useRef, useState } from 'react'

// Escala propuesta de la versión de la casa con base de 7 × 7 unidades.
// No representa medidas físicas confirmadas ni modifica la geometría.
const BASE_PROPUESTA_CM = 35
const pruebas = [
  ['P01', 'Puerta delantera', 'Enviar la orden de abrir y luego cerrar.', 'Abre hasta 90° y vuelve al cierre sin atascarse ni forzar el servo.'],
  ['P02', 'Puerta trasera', 'Enviar la orden de abrir y luego cerrar.', 'Abre hasta 90° y vuelve al cierre sin atascarse ni forzar el servo.'],
  ['P03', 'Ventana izquierda', 'Enviar la orden de abrir y luego cerrar.', 'Completa la apertura de 90° y el cierre sin rozar el marco.'],
  ['P04', 'Ventana derecha', 'Enviar la orden de abrir y luego cerrar.', 'Completa la apertura de 90° y el cierre sin rozar el marco.'],
  ['P05', 'Control independiente', 'Accionar cada mecanismo por separado, dejando los demás cerrados.', 'Solo se mueve el mecanismo seleccionado.'],
  ['P06', 'Accionamiento conjunto', 'Si el control físico incluye esa función, ordenar abrir todo y después cerrar todo.', 'Los cuatro mecanismos completan el movimiento sin reinicios ni movimientos imprevistos.'],
  ['P07', 'Repetición', 'Realizar cinco ciclos completos de apertura y cierre por mecanismo.', 'Completa los cinco ciclos sin atascos, piezas sueltas ni pérdida de funcionamiento.'],
  ['P08', 'Alimentación y estabilidad', 'Durante los movimientos, observar reinicios o vibraciones; medir la alimentación si se dispone de un instrumento.', 'El Arduino permanece estable y la alimentación de los servos se mantiene dentro del rango de sus especificaciones.'],
]
const dimensiones = [
  ['Base', [7, 7, 0.18], 'Largo × ancho × espesor'],
  ['Cuerpo de la casa (exterior)', [6.76, 6.76, 3.2], 'Largo × ancho × altura de pared'],
  ['Espesor de pared', [0.16], 'Espesor'],
  ['Cubierta del techo (envolvente)', [7.2, 7.2], 'Largo × ancho, vistos desde arriba'],
  ['Altura total desde la cara superior de la base', [4.7], 'Hasta la parte más alta del techo'],
  ['Hueco de cada puerta', [1.3, 2.45], 'Ancho × alto; no es el tamaño de la hoja'],
  ['Hueco de cada ventana lateral', [2.05, 1.35], 'Ancho × alto; no es el tamaño de la hoja'],
  ['Hueco de cada ventana fija', [1.3, 1], 'Ancho × alto; no es el tamaño de la hoja'],
]

export default function PlanDePruebas() {
  const [abierto, setAbierto] = useState(true)
  const [pestana, setPestana] = useState('pruebas')
  const dialogo = useRef(null)
  const botonAbrir = useRef(null)
  const tituloId = useId()
  const escala = BASE_PROPUESTA_CM / 7
  const cm = valor => new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 }).format(valor * escala)

  useEffect(() => {
    const elemento = dialogo.current
    if (abierto && !elemento.open) elemento.showModal()
    if (!abierto && elemento.open) elemento.close()
  }, [abierto])

  function cerrar() {
    setAbierto(false)
    botonAbrir.current?.focus()
  }

  return (
    <>
      <style>{`
        .plan-abrir { position: fixed; right: 16px; bottom: 16px; z-index: 30; padding: 12px 16px; border: 1px solid #74c696; border-radius: 8px; background: #246b43; color: white; cursor: pointer; font: 600 14px Arial, sans-serif; }
        .plan-dialogo { box-sizing: border-box; width: min(960px, calc(100vw - 24px)); max-width: none; max-height: calc(100dvh - 32px); padding: 0; margin: auto; border: 1px solid #9bb1a5; border-radius: 12px; background: #f7faf8; color: #20342a; font: 14px/1.55 Arial, sans-serif; text-align: left; box-shadow: 0 16px 60px #0005; overflow: auto; }
        .plan-dialogo::backdrop { background: #14241ccc; }
        .plan-cabecera { position: sticky; top: 0; z-index: 1; display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 16px 20px; background: #34443b; color: white; }
        .plan-dialogo h2 { margin: 0; font-size: 20px; color: inherit; }
        .plan-cerrar { flex-shrink: 0; width: 38px; height: 38px; padding: 0; border: 1px solid #a6b8ad; border-radius: 6px; background: #ffffff15; color: white; font-size: 25px; cursor: pointer; }
        .plan-contenido { padding: 20px; }
        .plan-menu { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }
        .plan-menu button { padding: 9px 14px; border: 1px solid #46765b; border-radius: 6px; background: white; color: #244a34; cursor: pointer; font: inherit; }
        .plan-menu button[aria-pressed="true"] { background: #287d4c; color: white; }
        .plan-aviso { padding: 12px; border-left: 4px solid #bb871f; background: #fff3ce; margin: 14px 0; }
        .plan-tabla-scroll { overflow-x: auto; }
        .plan-dialogo table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .plan-dialogo th, .plan-dialogo td { padding: 10px; border: 1px solid #bccdc2; text-align: left; vertical-align: top; }
        .plan-dialogo th { background: #e0ece4; }
        .plan-dialogo p { margin: 0 0 12px; }
        .plan-dialogo h3 { margin: 20px 0 8px; font-size: 16px; }
        .plan-dialogo li { margin-bottom: 6px; }
        .plan-dialogo button:focus-visible, .plan-abrir:focus-visible { outline: 3px solid #d99b21; outline-offset: 3px; }
      `}</style>
      <button ref={botonAbrir} className="plan-abrir" onClick={() => setAbierto(true)}>
        Ver plan de pruebas y medidas
      </button>
      <dialog ref={dialogo} className="plan-dialogo" aria-labelledby={tituloId}
        onCancel={evento => { evento.preventDefault(); cerrar() }}
        onClose={() => setAbierto(false)}>
        <header className="plan-cabecera">
          <h2 id={tituloId}>Casa automatizada · Planificación</h2>
          <button className="plan-cerrar" onClick={cerrar} aria-label="Cerrar panel" autoFocus>×</button>
        </header>
        <div className="plan-contenido">
          <nav className="plan-menu" aria-label="Contenido del panel">
            <button aria-pressed={pestana === 'pruebas'} onClick={() => setPestana('pruebas')}>Plan de pruebas</button>
            <button aria-pressed={pestana === 'medidas'} onClick={() => setPestana('medidas')}>Medidas propuestas</button>
          </nav>
          {pestana === 'pruebas' ? (
            <section>
              <p><strong>Objetivo:</strong> comprobar el funcionamiento de las dos puertas y las dos ventanas laterales de la maqueta física, accionadas mediante cuatro servomotores y un Arduino UNO R4.</p>
              <div className="plan-aviso"><strong>Estado: pruebas planificadas, pendientes de ejecutar.</strong> Los botones de esta aplicación demuestran únicamente la simulación. No verifican el cableado, la fuerza de los servos ni el funcionamiento del Arduino físico.</div>
              <h3>Preparación y seguridad</h3>
              <ul>
                <li>Revisar las conexiones con la alimentación desconectada y comprobar que las hojas pueden moverse sin obstáculos.</li>
                <li>Usar una fuente regulada adecuada para los cuatro servos y compartir GND con el Arduino. No alimentarlos todos desde el pin de 5 V de la placa.</li>
                <li>Calibrar primero cada mecanismo por separado. Los 90° son un objetivo: si hay esfuerzo o interferencias, detener la prueba y ajustar el montaje o el recorrido.</li>
                <li>Ejecutar las órdenes mediante el control físico que implemente el equipo; la interfaz de esta aplicación aún no está conectada al hardware.</li>
              </ul>
              <div className="plan-tabla-scroll">
                <table>
                  <thead><tr><th scope="col">ID / prueba</th><th scope="col">Procedimiento</th><th scope="col">Resultado esperado</th></tr></thead>
                  <tbody>{pruebas.map(([id, nombre, procedimiento, resultado]) => (
                    <tr key={id}><th scope="row">{id} · {nombre}</th><td>{procedimiento}</td><td>{resultado}</td></tr>
                  ))}</tbody>
                </table>
              </div>
              <h3>Registro al realizar las pruebas</h3>
              <p>Para cada ID, anotar: fecha, responsable, resultado observado, estado (aprobada, fallida o no realizada), evidencia y corrección necesaria. Repetir las pruebas fallidas después de corregir el problema.</p>
            </section>
          ) : (
            <section>
              <div className="plan-aviso"><strong>Propuesta, no medidas físicas confirmadas.</strong> Se toma una base de {BASE_PROPUESTA_CM} × {BASE_PROPUESTA_CM} cm. Esta tabla traduce la geometría de la versión con base de 7 × 7 unidades; no cambia el modelo ni garantiza coincidencia si se modificó su geometría.</div>
              <div className="plan-tabla-scroll">
                <table>
                  <thead><tr><th scope="col">Elemento</th><th scope="col">Medida propuesta (cm)</th><th scope="col">Referencia</th></tr></thead>
                  <tbody>{dimensiones.map(([nombre, valores, nota]) => (
                    <tr key={nombre}><th scope="row">{nombre}</th><td>{valores.map(cm).join(' × ')}</td><td>{nota}</td></tr>
                  ))}</tbody>
                </table>
              </div>
              <h3>Antes de construir</h3>
              <ul>
                <li>Confirmar estas medidas con el equipo y el material disponible. El techo sobresale de la base en esta propuesta.</li>
                <li>Las dimensiones de puertas y ventanas corresponden a sus huecos; descontar marco y holguras para fabricar las hojas.</li>
                <li>Medir el Arduino, la protoboard, los servos y la fuente reales. Sus representaciones actuales son ilustrativas y no están todas a la misma escala física.</li>
                <li>La posición de los componentes y los recorridos de cables deben revisarse contra el montaje real. Esta tabla no es un plano eléctrico ni una lista de cortes definitiva.</li>
              </ul>
            </section>
          )}
        </div>
      </dialog>
    </>
  )
}

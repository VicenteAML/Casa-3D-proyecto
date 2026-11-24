const tarjeta = {
  padding: 14,
  borderRadius: 10,
  background: '#1e293b',
  border: '1px solid #475569',
  color: '#f8fafc',
  lineHeight: 1.45,
}

const caja = {
  padding: 11,
  borderRadius: 8,
  background: '#334155',
  border: '1px solid #64748b',
  textAlign: 'center',
  minWidth: 130,
  flex: '1 1 150px',
}

function Flecha({ children = 'HTTPS / REST' }) {
  return <div aria-label={`flujo ${children}`} style={{ color: '#7dd3fc', fontSize: 12, fontWeight: 700,
    padding: '6px 2px', textAlign: 'center' }}>↓ {children}</div>
}

export default function ArchitecturePanel({ onClose }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 30, padding: 18,
      background: '#0b1220d9', display: 'grid', placeItems: 'center', fontFamily: 'Arial, sans-serif' }}>
      <section role="dialog" aria-modal="true" aria-labelledby="arquitectura-titulo"
        onClick={event => event.stopPropagation()}
        style={{ width: 'min(940px, 100%)', maxHeight: '90vh', overflow: 'auto', padding: 22,
          boxSizing: 'border-box', borderRadius: 16, background: '#111827', color: '#f8fafc',
          boxShadow: '0 20px 60px #0009' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12 }}>
          <div>
            <h2 id="arquitectura-titulo" style={{ margin: '0 0 5px' }}>Arquitectura de SmartHouse</h2>
            <p style={{ margin: 0, color: '#cbd5e1', fontSize: 14 }}>
              Dos patrones integrados en la maqueta y en este visor.
            </p>
          </div>
          <button onClick={onClose} aria-label="Cerrar arquitectura" style={{ ...caja, minWidth: 0, flex: '0 0 auto', cursor: 'pointer' }}>Cerrar</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 14, marginTop: 18 }}>
          <article style={tarjeta}>
            <h3 style={{ marginTop: 0, color: '#7dd3fc' }}>1 · Cliente-servidor</h3>
            <p>El navegador y el Arduino actúan como clientes. Blynk recibe y entrega estados y órdenes desde sus servicios HTTPS.</p>
            <div style={caja}>Cliente web<br /><small>visor 3D / controles</small></div>
            <Flecha />
            <div style={caja}>Servidor Blynk<br /><small>API y datastreams V1–V8</small></div>
            <Flecha>Wi-Fi · SDK Blynk</Flecha>
            <div style={caja}>Cliente IoT<br /><small>UNO R4 WiFi · sensores · servos</small></div>
            <p style={{ marginBottom: 0, color: '#cbd5e1', fontSize: 13 }}>
              El visor consulta V5–V8 cada 3 s y escribe V1–V4 cuando el usuario da una orden.
            </p>
          </article>

          <article style={tarjeta}>
            <h3 style={{ marginTop: 0, color: '#86efac' }}>2 · Arquitectura en capas</h3>
            <p>El código separa la interfaz, los casos de uso, el modelo de la casa y las llamadas externas.</p>
            <div style={caja}>Presentación<br /><small>App.jsx · panel React/3D</small></div>
            <Flecha>invoca acciones</Flecha>
            <div style={caja}>Aplicación<br /><small>useBlynkHouse.js · estado y órdenes</small></div>
            <Flecha>usa el modelo y el cliente</Flecha>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <div style={caja}>Dominio<br /><small>houseModel.js · pines y estados</small></div>
              <div style={caja}>Infraestructura<br /><small>blynkClient.js · HTTPS/REST<br />browserStorage.js · preferencias</small></div>
            </div>
            <p style={{ marginBottom: 0, color: '#cbd5e1', fontSize: 13 }}>
              La capa visual no construye URLs ni interpreta directamente los pines de Blynk.
            </p>
          </article>
        </div>

        <p style={{ margin: '16px 0 0', padding: 12, borderRadius: 8, background: '#422006', color: '#fde68a', fontSize: 13 }}>
          Alcance: el visor representa visualmente la apertura; la posición real se confirma con los estados que publica la placa. La maqueta 3D del cableado es ilustrativa, no un plano eléctrico.
        </p>
      </section>
    </div>
  )
}

function baseUrl(server) {
  return String(server || 'https://ny3.blynk.cloud').replace(/\/$/, '')
}

async function readResponse(response) {
  const body = await response.text()
  let payload = body
  try { payload = body ? JSON.parse(body) : null } catch { /* Blynk puede responder texto plano. */ }
  if (!response.ok || payload?.error) {
    throw new Error(payload?.error?.message || `HTTP ${response.status}`)
  }
  return payload
}

export async function leerDatastreams(server, token) {
  const query = new URLSearchParams({ token })
  const response = await fetch(`${baseUrl(server)}/external/api/getAll?${query}`, { cache: 'no-store' })
  return readResponse(response)
}

export async function enviarOrden(server, token, virtualPin, value) {
  const query = new URLSearchParams({ token, [virtualPin]: String(value) })
  const response = await fetch(`${baseUrl(server)}/external/api/update?${query}`, { cache: 'no-store' })
  return readResponse(response)
}

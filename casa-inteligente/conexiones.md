# Diagrama de conexión — Casa Inteligente IoT (Uno R4 WiFi)

## Cableado vigente

El firmware configura cuatro servos, cuatro entradas IR MH-B y el LCD 16x2 I2C.
Las pruebas físicas reportadas cubren ambas puertas; valida alcance y sentido de
detección de cada sensor de ventana antes de presentarlo. Los reed switches
blancos no se usan.

| Componente | Conexión |
|---|---|
| Servo puerta principal | Señal D9; VCC al riel de servos; GND común |
| Servo puerta trasera | Señal D10; VCC al riel de servos; GND común |
| Servo ventana izquierda | Señal D5; VCC al riel de servos; GND común |
| Servo ventana derecha | Señal D6; VCC al riel de servos; GND común |
| Sensor IR puerta principal | VCC 5V; GND común; OUT D2 |
| Sensor IR puerta trasera | VCC 5V; GND común; OUT D3 |
| Sensor IR ventana izquierda | VCC 5V; GND común; OUT D12 |
| Sensor IR ventana derecha | VCC 5V; GND común; OUT D4 |
| LCD 16x2 I2C | VCC 5V; GND; SDA a SDA; SCL a SCL |

Los cuatro sensores comparten 5V y GND; cada salida OUT va a su propio pin.
D2 corresponde a la puerta principal, D3 a la trasera, D12 a la ventana
izquierda y D4 a la ventana derecha. Mantén GND común entre Arduino y la fuente
externa de servos; no conectes el positivo de esa fuente al pin 5V del Arduino.

## Pines reservados para ampliaciones futuras

| Dispositivo | Ubicación | Servo (señal) | Reed switch | Sensor IR |
|-------------|-----------|--------------|-------------|-----------|
| Puerta principal | fachada frontal | **D9** | no instalado | **D2 (actual)** |
| Puerta trasera | fachada posterior | **D10** | no instalado | **D3 (actual)** |
| Ventana izquierda | lado izquierdo | **D5 (actual)** | no instalado | **D12 (actual)** |
| Ventana derecha | lado derecho | **D6 (actual)** | no instalado | **D4 (actual)** |

- Pines PWM usados por servos: D5, D6, D9, D10.
- D0/D1 quedan libres (son la serial RX/TX).
- A0–A5 y 3.3V quedan libres para futuro.

## Alimentación (CRÍTICO — no juntar las dos fuentes sin tierra común)

```
FUENTE A: Arduino Uno R4 WiFi  ── USB-C ──  banco de energía / cargador de celular (5V)
   -> alimenta: lógica, sensores IR (5V) y reed (pull-up interno)

FUENTE B: riel +5V_SERVO        ──  adaptador 5V/2A o más ──  (o porta 4xAA ≈ 6V)
   -> alimenta: SOLO los 4 servos SG90 (riel +5V_SERVO)
```

**Regla de oro:** GND del Arduino y GND de la fuente de los servos se unen
(tierra común). Sin esto el servo no recibe señal bien.

## Conexión por componente

### Servo SG90 (x4) — conector de 3 cables

| Cable | Conectar a |
|-------|-----------|
| Naranja (señal) | pin digital del servo (D9, D10, D5, D6) |
| Rojo (VCC) | riel **+5V_SERVO** (fuente externa) |
| Café (GND) | riel GND común |

### Sensor magnético MC-38 — no instalado en las puertas actuales

| Cable | Conectar a |
|-------|-----------|
| Cable 1 | Pin digital libre asignado en firmware; D4 está ocupado por el IR de la ventana derecha |
| Cable 2 | GND común |

- En código: `pinMode(pin, INPUT_PULLUP)`.
- Imán junto al reed (puerta CERRADA) → lee LOW.
- Imán lejos (puerta ABIERTA) → lee HIGH.
- Transición LOW→HIGH = apertura, HIGH→LOW = cierre. Un ciclo = apertura + cierre.

### Sensor IR MH-B — cuatro entradas configuradas en firmware

| Pin módulo | Conectar a |
|-----------|-----------|
| VCC | 5V del Arduino |
| GND | GND común |
| OUT (DO) | principal D2; trasera D3; ventana izquierda D12; ventana derecha D4 |

- No usar el pin AO (salida analógica).
- Calibrar alcance con el potenciómetro del módulo (giro lento mientras se prueba).
- En feria interior va bien; evita apuntarlo directo a una pared blanca muy cerca.

## Diagrama esquemático (texto)

```
                        +5V (Arduino)          GND (común con todo)
                        |                      |
  IR puerta      D2   <-|OUT                   |
  IR trasera     D3   <-|OUT   VCC -> [+]      VCC/IR -> 5V Arduino
  IR vent.i      D12  <-|OUT                   GND/IR -> GND común
  IR vent.d      D4   <-|OUT
                        |
  MC-38 puertas  --   no instalados
  MC-38 vent.d   D7   <-|-- cable 1   cable 2 -> GND
                        |
  SERVO puerta   D9   <-|-- naranja   rojo -> [+5V_SERVO]   café -> GND
  SERVO trasera  D10  <-|-- naranja   rojo -> [+5V_SERVO]   café -> GND
  SERVO vent.i   D5   <-|-- naranja   rojo -> [+5V_SERVO]   café -> GND
  SERVO vent.d   D6   <-|-- naranja   rojo -> [+5V_SERVO]   café -> GND
                        |
   Arduino Uno R4 WiFi (USB-C = alimentación lógica)

   Protoboard:
   [riel +5V_SERVO] ---- fuente 5V/2A (adaptador) ---- GND común
   [riel +5V]      ---- pin 5V Arduino
   [riel GND]      ---- pin GND Arduino + GND fuente servos
   (Opcional: condensador 100-470µF entre +5V_SERVO y GND para picos)
```

## Notas de montaje / trucos

1. **Debounce**: los reed rebotan al abrir/cerrar. En el código espera ~50 ms
   tras detectar un cambio antes de contar el evento.
2. **Estado del servo tras arranque**: el servo arranca donde quedó; en
   `setup()` siéntalo a la posición inicial (0° o 180° según puerta cerrada).
3. **Sentido de giro**: según cómo pegues el brazo del servo a la puerta, quizá
   haya que invertir con `180 - angulo`. Calibrar en físico.
4. **Distancia reed**: trabaja a 15–25 mm — pega el imán en la puerta y el
   cuerpo del reed en el marco, alineados cara a cara.
5. **IR falso positivo**: si detecta siempre algo, gira el potenciómetro para
   reducir alcance. Si es al revés (no detecta el dedo), súbelo.
6. **Resistencias**: con `INPUT_PULLUP` no hace falta nada externo. Si un reed
   diera lecturas erráticas pese al debounce, agregar 10kΩ externa pin→5V.
7. **Corriente**: 4 servos en movimiento ≈ 1A; al atascarse ~2.5A. Por eso la
   fuente de servos de 2A mínimo (3A ideal). No los alimentes desde el Arduino.
8. **WiFi**: para la app móvil usamos el Uno R4 WiFi con **Blynk**
   (blynk.io). El USB-C solo alimenta; los datos van por WiFi.
   Ojo: el R4 WiFi **solo trabaja en redes 2.4 GHz**. Si en la feria la
   red es 5 GHz, la placa no se conecta y hay que llevar un hotspot
   configurado en 2.4 GHz.

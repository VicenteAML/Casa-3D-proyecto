# Diagrama de conexión — Casa Inteligente IoT (Uno R4 WiFi)

## Montaje actual con sonido, LED y display

Esta es la asignación del firmware actual: dos servos, sensor de sonido, dos
LED indicadores y display de un dígito. El aplauso alterna la puerta principal
(servo D9); la segunda puerta (D10) conserva su control desde Blynk.

| Componente | Conexión |
|---|---|
| Servo puerta principal | Señal D9; alimentación según el montaje actual |
| Servo puerta trasera | Señal D10; alimentación según el montaje actual |
| Sensor de sonido | VCC a 5V, GND a GND, DO a A0; AO sin conectar |
| Display de un dígito | Segmentos a-g a D2-D8, cada segmento con su resistencia; DP sin conectar |
| LED verde | D11 → resistencia → ánodo (pata larga); cátodo a GND |
| LED rojo | D12 → resistencia → ánodo (pata larga); cátodo a GND |

Usar una resistencia de 470 Ω o 1 kΩ en cada segmento del display y en cada
LED. El pin común del display va a GND si es cátodo común, o a 5V si es ánodo
común. El código queda configurado por defecto para cátodo común; confirmar el
modelo del display pequeño antes de conectarlo y ajustar
`DISPLAY_ANODO_COMUN` si corresponde.

Todos los GND deben compartir el mismo riel. No conectar las patas del display
por número sin confirmar el pinout físico: los números cambian según el modelo.
El sketch actual desactiva las entradas reed/IR y las ventanas aún no instaladas
para liberar D2-D8 y D11-D12.

## Asignación anterior / ampliación futura con reed e IR

| Dispositivo | Ubicación | Servo (señal) | Reed switch | Sensor IR |
|-------------|-----------|--------------|-------------|-----------|
| Puerta principal | fachada frontal | **D9** | **D2** | **D8** |
| Puerta trasera | fachada posterior | **D10** | **D3** | **D11** |
| Ventana izquierda | lado izquierdo (si no hay puerta) | **D5** | **D4** | **D12** |
| Ventana derecha | lado derecho (si no hay puerta) | **D6** | **D7** | **D13** |

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

### Sensor magnético MC-38 (x4) — reed switch normalmente abierto

| Cable | Conectar a |
|-------|-----------|
| Cable 1 | pin digital del reed (D2, D3, D4, D7) |
| Cable 2 | GND común |

- En código: `pinMode(pin, INPUT_PULLUP)`.
- Imán junto al reed (puerta CERRADA) → lee LOW.
- Imán lejos (puerta ABIERTA) → lee HIGH.
- Transición LOW→HIGH = apertura, HIGH→LOW = cierre. Un ciclo = apertura + cierre.

### Sensor IR HW-201 (x4) — módulo con 3 pines útiles

| Pin módulo | Conectar a |
|-----------|-----------|
| VCC | 5V del Arduino |
| GND | GND común |
| OUT (DO) | pin digital del IR (D8, D11, D12, D13) |

- No usar el pin AO (salida analógica).
- Calibrar alcance con el potenciómetro del módulo (giro lento mientras se prueba).
- En feria interior va bien; evita apuntarlo directo a una pared blanca muy cerca.

## Diagrama esquemático (texto)

```
                        +5V (Arduino)          GND (común con todo)
                        |                      |
  HW-201 puerta  D8   <-|OUT                   |
  HW-201 trasera D11  <-|OUT   VCC -> [+]      VCC/IR -> 5V Arduino
  HW-201 vent.i  D12  <-|OUT                   GND/IR -> GND común
  HW-201 vent.d  D13  <-|OUT
                        |
  MC-38 puerta   D2   <-|-- cable 1   cable 2 -> GND
  MC-38 trasera  D3   <-|-- cable 1   cable 2 -> GND
  MC-38 vent.i   D4   <-|-- cable 1   cable 2 -> GND
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

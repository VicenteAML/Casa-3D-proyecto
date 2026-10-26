# Prueba de la lógica en Wokwi (sin comprar nada)

Wokwi es **gratis y online** (no se instala). Simula la placa y el circuito en
el navegador. Ideal para adelantar la lógica mientras llegan los componentes.

> Limitación: Wokwi NO soporta el Arduino Uno R4 WiFi ni la nube de Arduino.
> Por eso esta es una versión LOCAL: misma lógica (servos, reed, IR,
> anti-rebote, conteo de ciclos con EEPROM) pero el control se hace con
> comandos de teclado en el Monitor Serie, y simula el IR con switches.

## Cómo montar el proyecto (3 minutos)

1. Entra a **wokwi.com** → REGISTRATE (gratis, con Google/GitHub/email).
2. Crea un proyecto nuevo: **New Project → Arduino Uno**.
3. Borra el contenido de `sketch.ino` y **pega** el de `sketch.ino` de esta carpeta.
4. Borra `diagram.json` y **pega** el de `diagram.json` de esta carpeta.
5. Ajusta el Monitor Serie a **9600 baud** y pulsa ▶ (Start simulation).

Sugerencia: guarda el proyecto (nombre: "Casa Inteligente") para volver a él.

## Qué hay en el circuito virtual

| Pieza virtual | Cant. | Representa |
|---------------|:-----:|------------|
| 4x `wokwi-servo` | 4 | Los SG90 (signals en D9, D10, D5, D6) |
| 4x switch SW1-SW4 | 4 | Reed switch MC-38 (D2, D3, D4, D7) |
| 4x switch SW5-SW8 + 4x resistencia 10k | 4 | Sensor IR HW-201 (D8, D11, D12, D13) |
| Arduino Uno R3 | 1 | Tu Uno R4 WiFi (misma lógica) |

- **Reed (SW1-SW4)**: izquierda = CERRADA, derecha = ABIERTA.
  Arrancan en CERRADA. Moverlos a mano **manda**: actualiza el estado y
  recoloca el servo, igual que en el firmware real.
- **IR (SW5-SW8)**: izquierda = hay obstáculo, derecha = libre.
  (La resistencia 10k hace de pull-up, igual que la placa del HW-201 real.)

## Cómo probar

En el Monitor Serie escribe las teclas:

| Tecla | Acción |
|-------|--------|
| `1` | abrir/cerrar **puerta principal** |
| `2` | abrir/cerrar **puerta trasera** |
| `3` | abrir/cerrar **ventana izquierda** |
| `4` | abrir/cerrar **ventana derecha** |
| `s` | estado de las 4 unidades + ciclos |
| `h` | ayuda |

### Guion de prueba sugerido (3 pasos)

1. **Servo**: pulsa `1` repetidamente → la puerta principal abre y cierra
   (observas el brazo del servo girando). Pulsa `s` → ciclos suben cada cierre.
2. **Anti-obstáculo**: pulsa `1` para abrir. Luego mueve el switch **SW5 a la
   izquierda** (obstáculo) e intenta cerrar con `1` → el servo se DETIENE a
   mitad de camino y el monitor dice `se detuvo por OBSTACULO`.
3. **Anti-obstáculo**: pulsa `1` para abrir. Luego mueve el switch **SW5 a la
   izquierda** (obstáculo) e intenta cerrar con `1` → el servo se DETIENE a
   mitad de camino y el monitor dice `se detuvo por OBSTACULO`.
4. **Reed manda sobre el servo**: con la puerta principal quieta, mueve **SW1
   a la derecha** (abrir) → el monitor dice `puerta_principal -> ABIERTA
   (reed)`, el brazo del servo se recoloca y el estado interno se actualiza.
   Mueve SW1 a la izquierda → `CERRADA (reed). Ciclos: 1` (el cierre manual
   cuenta ciclo, igual que uno con servo). Ahora pulsa `1`: el servo debe
   **cerrar**, no abrir, porque ya sabe que estaba abierta.
5. **Reed + ciclos persistente**: reinicia la simulación y comprueba que los
   ciclos siguen ahí (EEPROM virtual). Los switches arrancan en CERRADA.

## Diferencias con el firmware real (cuando lleguen los componentes)

| Detalle | Wokwi (esta versión) | Real (`casa_inteligente.ino`) |
|---------|----------------------|-------------------------------|
| Control | teclado (Monitor Serie) | botones de la app Blynk |
| Nube | ninguna (no hay WiFi en el R3) | Blynk, 16 datastreams V1–V16 |
| Riel servos | conectado a los 5V virtuales | fuente externa 5V + tierra común |
| Sensor IR | switch + resistencia | módulo HW-201 real |
| Reed | switch deslizante | imán + contacto MC-38 |

La lógica de movimiento, obstáculo, reed y conteo es **idéntica**, así que
todo lo que veas bien aquí funcionará igual en la maqueta física.
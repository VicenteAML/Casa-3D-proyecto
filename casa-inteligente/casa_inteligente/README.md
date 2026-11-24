# Firmware — Casa Inteligente IoT (Arduino Uno R4 WiFi + Blynk)

Código del proyecto. El control y el monitoreo salen del celular por la
app **Blynk IoT**.

> **Cambio de plataforma:** antes esto usaba Arduino IoT Cloud. Se migró a
> Blynk porque el plan gratuito de Arduino Cloud permite **5 variables por
> Thing** y este proyecto necesita **16** (4 unidades × 4 datos). Blynk
> gratuito permite **50 datastreams por plantilla**. Ver `../BLYNK.md`.

## Archivos

| Archivo | Qué es |
|---------|--------|
| `casa_inteligente.ino` | Sketch principal (toda la lógica) |
| `config.template.h` | Plantilla de credenciales (copiar como `config.h`) |
| `config.h` | Tus credenciales reales — **no subir a GitHub** |
| `../BLYNK.md` | Guía para crear la plantilla y los widgets en blynk.io |

## Qué hace el firmware

- **Control actual**: Blynk/app web maneja dos puertas y dos ventanas con
  servos en D9, D10, D5 y D6.
- **Indicadores físicos**: LED verde = abierta; LED rojo = cerrada; display de
  un dígito = `1` abierta y `0` cerrada.
- **Blynk**: la acción local del aplauso actualiza el estado y el contador que
  ya se publican para la puerta principal. No requiere datastreams nuevos.
- **Ciclos**: cada cierre completo suma 1 ciclo. Se guardan en EEPROM para
  que no se pierdan al apagar la placa.
- **Sensores IR de obstáculos**: puerta principal OUT en D2 (V13), puerta
  trasera OUT en D3 (V14) y ventana izquierda OUT en D12 (V15). Detienen el
  cierre; desde la app se confirma «Objeto quitado: continuar con el cierre».
  El firmware solo reanuda si el sensor ya indica paso libre.
- **Reed switches y sensores de la ventana derecha**: siguen desactivados.

## Puesta en marcha

1. Sigue `../BLYNK.md` para crear la plantilla de 16 datastreams, el
   dispositivo y conseguir el **TEMPLATE ID** y el **AUTH TOKEN**.
2. Copia `config.template.h` → `config.h` y pega esos dos valores más tu
   SSID y tu clave. Ojo: la librería **no compila** si faltan
   `BLYNK_TEMPLATE_ID` y `BLYNK_TEMPLATE_NAME`.
3. En el IDE de Arduino:
   - **Herramientas → Placa → Arduino UNO R4 WiFi**
   - **Herramientas → Administrar bibliotecas** → instala `Servo`,
     `WiFiS3` (viene con la placa) y `Blynk`.
4. Abre `casa_inteligente.ino`, compila y sube.
5. Monitor Serie a **9600** baud. Debe verse algo como:
   ```
   puerta_principal en CERRADA. Ciclos: 0
   puerta_trasera en CERRADA. Ciclos: 0
   Esperando WiFi y Blynk...
   [BLYNK] conectado. Publicando estado de las 2 puertas activas.
   ```

## Los 16 Virtual Pins

| Pin | Tipo | Significado |
|---|---|---|
| V1–V4 | Button (entrada) | abrir/cerrar ambas puertas y ventanas |
| V5–V8 | LED (salida) | estado abierto de cada unidad |
| V9–V12 | Label (salida) | ciclos de cada unidad |
| V13–V16 | LED (salida) | obstáculo de cada unidad; ventana derecha aún sin sensor |

Están asignados en la tabla `unidades[]` del sketch, junto a los pines
físicos de cada unidad. La tabla completa está en `../BLYNK.md`.

## Ajustes y solución de problemas

- **IR invertido**: si el sensor detecta obstáculo "siempre" o "nunca",
  cambia en el sketch `const bool IR_DETECTA_NIVEL = LOW;` a `HIGH`.
- **Servo al revés**: invierte los `anguloAbierto`/`anguloCerrado` de esa
  unidad (o los valores 180/0 en la tabla `unidades[]`).
- **WiFi no conecta**: el R4 WiFi solo soporta redes **2.4 GHz**.
- **Cortes de luz en la feria**: los ciclos quedan guardados en EEPROM, así
  que reiniciar la placa no los borra.

## Por qué el WiFi no usa `Blynk.begin()`

Casi todos los ejemplos de Blynk hacen `Blynk.begin(token, ssid, pass)`, pero
esa función tiene dos bucles infinitos adentro: uno esperando el WiFi y otro
esperando al servidor. Si algo falla, el sketch **se congela en `setup()`** y
los servos dejan de responder, sin decirte qué pasó.

Acá se usa `Blynk.config(token)`, que solo guarda el token sin conectarse, y
la conexión se va resolviendo en `loop()`. Resultado: la maqueta **siempre**
funciona, y el Monitor Serie te dice en todo momento si el problema es el
WiFi, el token, o blynk.io. Los mensajes son `[WIFI]`, `[BLYNK] TOKEN
INVALIDO` y `[BLYNK] conectado` (ver `../BLYNK.md`).

## Para probar sin el circuito físico

Copia de la lógica que corre en **Wokwi** (gratis, en el navegador) con un
Uno R3 virtual: mismo servo, mismo reed, mismo IR, mismo EEPROM. Ideal
para probar la lógica antes de comprar nada. Ver `wokwi/README.md`.

Ojo: Wokwi **no** habla con Blynk (el Uno R3 virtual no tiene WiFi), así
que ahí el control es por teclado en el Monitor Serie. Sirve para validar
la lógica, no la nube.

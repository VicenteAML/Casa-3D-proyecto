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

- **Control actual**: Blynk/app web maneja las dos puertas. Un aplauso alterna
  la puerta principal con el servo D9; el servo D10 sigue con su control actual.
- **Indicadores físicos**: LED verde = abierta; LED rojo = cerrada; display de
  un dígito = `1` abierta y `0` cerrada.
- **Blynk**: la acción local del aplauso actualiza el estado y el contador que
  ya se publican para la puerta principal. No requiere datastreams nuevos.
- **Ciclos**: cada cierre completo suma 1 ciclo. Se guardan en EEPROM para
  que no se pierdan al apagar la placa.
- **Sensores reed/IR y ventanas**: no forman parte de esta configuración
  física actual; el firmware los deja desactivados hasta que se instalen.

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
| V1–V2 | Button (entrada) | abrir/cerrar puerta principal y trasera |
| V3–V4 | Reservado | ventanas no instaladas en esta configuración |
| V5–V6 | LED (salida) | estado abierto de cada puerta |
| V9–V10 | Label (salida) | ciclos de cada puerta |
| V13–V14 | Reservado | obstáculo IR no instalado en esta configuración |
| V7–V8, V11–V12, V15–V16 | Reservado | quedan para ampliaciones futuras |

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

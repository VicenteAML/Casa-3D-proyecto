# Guía de Blynk — Casa Inteligente IoT

Por qué Blynk y no Arduino IoT Cloud:

| | Arduino IoT Cloud (gratis) | Blynk (gratis) |
|---|---|---|
| Variables / datastreams | **5 por Thing** (y 2 Things) | **50 por plantilla** |
| ¿Alcanza para este proyecto? | No: se necesitan **16** | Sí, con 34 de sobra |
| Historial | Solo valor actual | **No sirve** (ver abajo) |
| Mensajes | — | 100.000/mes (aquí se usan ~50/día) |

> **Corrección importante (verificada con el dispositivo):** Blynk **no guarda
> historial de los datastreams**. Al exportar los datos del proyecto
> `Casa-Sala` solo devuelve los eventos de conectar/desconectar de la placa, sin
> ningún valor de `V1`–`V16`, y la API de histórico devuelve error 500.
> Por eso el proyecto usa **Firestore** como base de datos (ver
> "Base de datos: Firebase Firestore" más abajo).

El proyecto quedó migrado a Blynk y mantiene los datastreams existentes.
Para el montaje físico actual se usan dos puertas: `V1`/`V5`/`V9` para la
puerta principal y `V2`/`V6`/`V10` para la trasera. La acción por sonido
publica estado y ciclos por esos mismos datastreams; no requiere cambios en
la consola ni en la app web. Las entradas reed/IR y las ventanas quedan
desactivadas hasta instalar esos componentes.

---

## Paso 1 — Crear la cuenta y activar el modo desarrollador

> **Estado: HECHO.** Plantilla `Casa Inteligente` creada, ID
> `TMPL292-g0i7p`, región `NY3`. Son los valores que van en `config.h`.

1. Entra a **blynk.io** y regístrate (gratis, con correo, Google o GitHub).
   Confirma el email que te envían.
2. Entra a la **Blynk Console** (la consola web donde se configuran
   plantillas y dispositivos).
3. **Activa el modo desarrollador** — este paso es obligatorio y muchos lo
   saltan, con lo cual después no aparece la opción de crear plantillas:
   - Ve a **My Profile** (esquina superior derecha de la consola)
   - Pone el interruptor **Developer Mode** en **ON**
4. Menú **Developer Zone** → **My Templates** → **+ New Template**.
5. Dale un nombre: `Casa Inteligente`. En *Hardware* elige el similar más
   cercano (si no aparece el Uno R4 WiFi exacto, da igual: solo define el
   icono y los perfiles de hardware).
6. Presiona **Save**.

## Paso 2 — Agregar los 16 datastreams

> **Estado: HECHO.** Los 16 existen en la plantilla
> `TMPL292-g0i7p` (región **NY3**), con el pin, tipo y rango exactos de la
> tabla de abajo. Verificado uno por uno contra la consola.

Abre la plantilla que acabas de crear, ve a la pestaña **Datastreams** y
presiona **New Datastream** 16 veces. Para cada una:

- **Name**: el nombre de la tabla de abajo
- **Type**: `Virtual Pin`
- **Virtual Pin**: `V1` … `V16` (en orden)
- **Data Type**: `Integer`
- **Min / Max**: según la tabla

| # | Name | Virtual Pin | Data Type | Min | Max |
|---|---|:---:|---|:--:|:--:|
| 1 | `pp_control` | V1 | Integer | 0 | 1 |
| 2 | `pt_control` | V2 | Integer | 0 | 1 |
| 3 | `vi_control` | V3 | Integer | 0 | 1 |
| 4 | `vd_control` | V4 | Integer | 0 | 1 |
| 5 | `pp_abierta` | V5 | Integer | 0 | 1 |
| 6 | `pt_abierta` | V6 | Integer | 0 | 1 |
| 7 | `vi_abierta` | V7 | Integer | 0 | 1 |
| 8 | `vd_abierta` | V8 | Integer | 0 | 1 |
| 9 | `pp_ciclos` | V9 | Integer | 0 | 99999 |
| 10 | `pt_ciclos` | V10 | Integer | 0 | 99999 |
| 11 | `vi_ciclos` | V11 | Integer | 0 | 99999 |
| 12 | `vd_ciclos` | V12 | Integer | 0 | 99999 |
| 13 | `pp_obstaculo` | V13 | Integer | 0 | 1 |
| 14 | `pt_obstaculo` | V14 | Integer | 0 | 1 |
| 15 | `vi_obstaculo` | V15 | Integer | 0 | 1 |
| 16 | `vd_obstaculo` | V16 | Integer | 0 | 1 |

Los nombres están en inglés a propósito: el orden de las palabras es
`iniciales + qué_mide`, y coinciden con los pines físicos:

| Inicial | Unidad | Pines |
|---|---|---|
| `pp` | puerta principal | servo D9, reed D2, IR D8 |
| `pt` | puerta trasera | servo D10, reed D3, IR D11 |
| `vi` | ventana izquierda | servo D5, reed D4, IR D12 |
| `vd` | ventana derecha | servo D6, reed D7, IR D13 |

> El Min/Max importa: los widgets de la app (gauge, LED) se configuran
> automáticamente con esos rangos. Si los dejas vacíos, el LED puede
> quedar siempre apagado o el botón sin rango válido.

### Ojo con el doble "Guardar"

La consola tiene **dos** botones que se llaman igual:

| Botón | Dónde | Qué hace |
|---|---|---|
| **Guardar** | dentro del diálogo del datastream | agrega el datastream a la **lista** |
| **Guardar** | arriba a la derecha, junto a *Cancelar* | **persiste** la plantilla en el servidor |

Si solo presionas el del diálogo, la fila aparece en la tabla pero al
recargar la página desaparece: era un borrador. Después de crear o editar
datastreams, siempre presiona el **Guardar de arriba** y espera el aviso
"Cambios guardados".

Otro detalle: el selector de **Virtual pin** es un desplegable con búsqueda.
Si escribes `V2` te puede pegar `V20` o `V21`, porque el filtro también
coincide con esos. **Revisa siempre la columna Pin de la tabla** después de
crear cada uno.

## Paso 3 — Crear el dispositivo

> **Estado: HECHO.** Dispositivo `Casa-Sala` creado (ID `1076840`) desde la
> plantilla `Casa Inteligente`. Su AUTH TOKEN ya está en `casa_inteligente/config.h`.

1. Menú **Devices** → **New Device** → selecciona la plantilla
   `Casa Inteligente` → **Choose**.
2. Dale un nombre (ej: `Casa-Sala`) y déjala como **Untitled / WiFi**.
3. **Copia el AUTH TOKEN** que aparece en la ficha del dispositivo.
   Es una cadena de ~40 caracteres. Lo vas a pegar en `config.h`.
4. **Copia también el TEMPLATE ID y el TEMPLATE NAME**: están en la parte
   superior de la plantilla, y con las 3 cosas juntas el firmware
   compila y conecta.


> Ojo: el AUTH TOKEN es el del **dispositivo**, no el de la plantilla.
> Son parecidos pero no iguales, y confundirlos es el error más común.

## Paso 4 — Poner las credenciales en el firmware

> **Estado: HECHO.** `casa_inteligente/config.h` existe con el TEMPLATE ID
> (`TMPL292-g0i7p`), el TEMPLATE NAME, el AUTH TOKEN del dispositivo
> `Casa-Sala` y la red de casa (`Patagonia_Vargas2.4G`).

1. En la carpeta `casa_inteligente/`, copia `config.template.h` → `config.h`.
2. Abre `config.h` y completa los 3 valores:

   ```cpp
   #define BLYNK_TEMPLATE_ID   "TMPL292-g0i7p"
   #define BLYNK_TEMPLATE_NAME "Casa Inteligente"
   #define BLYNK_AUTH_TOKEN     "el token del dispositivo"
   ```

   Las dos primeras son **obligatorias**: si faltan, el sketch no compila
   y sale un error que dice literalmente
   `Please specify your BLYNK_TEMPLATE_ID and BLYNK_TEMPLATE_NAME`.

3. **No subas `config.h` a GitHub ni a Google Drive compartido**: tiene tu
   clave de WiFi. Si publicas el proyecto, sube solo `config.template.h`.
   El repo ya tiene un `.gitignore` que lo excluye.

### Varias redes para casa y para la feria

El WiFi no se pone en dos variables sueltas sino en una **lista**, y el
firmware la prueba en orden hasta que una funcione:

```cpp
const RedWiFi redes[] = {
  { "Patagonia_Vargas2.4G", "tu clave" },   // red 1: casa
  // { "Hotspot-Companero",  "12345678" },   // red 2: descomentar para la feria
};
const int TOTAL_REDES = (int)(sizeof(redes) / sizeof(redes[0]));
```

Para agregar una red solo hay que **descomentar la línea y completarla**;
no se toca ningún otro archivo. La ventaja es que en la feria no
compilás nada: si prendés el hotspot del compañero, la placa entra sola.

Dos avisos importantes sobre esto:

- **Solo 2.4 GHz.** El Uno R4 WiFi no ve redes de 5 GHz. Si el router tiene
  dos bandas, usá el nombre de la de 2.4 GHz. En este proyecto la red
  válida es `Patagonia_Vargas2.4G`; la `Patagonia_Vargas5G` no sirve.
- **Cuidado con el portal cautivo.** Una red de institución que te pide
  abrir el navegador y loguearte se ve como "conectada" pero no deja salir
  a internet, así que la placa nunca llega a Blynk. El firmware detecta ese
  caso (entra a la red pero no a Blynk) y pasa a la siguiente red sola,
  pero si la única red disponible es una con portal, no hay arreglo:
  **para la feria, usá el hotspot del celu de un compañero.**

## Paso 5 — La interfaz: app web propia (`app/index.html`)

> **Estado: HECHO y verificado.** Es la interfaz principal del proyecto.

La app es **un solo archivo HTML**, sin dependencias ni compilación. Habla
directo con la nube de Blynk por su API pública, así que la placa no se toca.

### Cómo funciona

| Acción | Llamada |
|---|---|
| Leer los 16 valores | `GET {servidor}/external/api/getAll?token={token}` |
| Mover una unidad | `GET {servidor}/external/api/update?token={token}&v1=1` (o `=0`) |

El token **no** está escrito en el archivo: la app lo pide una vez y lo guarda
en el `localStorage` del navegador. Por eso se puede compartir el archivo sin
filtrar el control de las puertas.

### Valores de control (importante)

Desde el firmware actual, `V1` a `V4` significan:

| Valor | Acción |
|---|---|
| `1` | **Abrir** |
| `0` | **Cerrar** |
| `2` | **Invertir** el estado actual (para un botón sin etiqueta) |

Antes el firmware invertía el estado en cada escritura, que era confuso para
los interruptores del panel web. Ahora el valor manda y el panel muestra
`ABIERTA` / `CERRADA` / `MOVIENDO` / `DETENIDA`.

### Pantallas

- **Control**: una tarjeta por unidad con el estado y los botones Abrir/Cerrar.
  Las unidades sin servo se pueden desactivar para que no parezcan rotas.
- **Mantenimiento**: ciclos acumulados contra el límite que uno fija, con barra
  verde / amarilla / roja. El límite se edita en Ajustes.
- **Ajustes**: token, servidor, intervalo de refresco, unidades instaladas,
  límites de ciclos y las instrucciones para instalarla en el celu.

### Instalarla en el celu

1. Pasá `app/index.html` al celu y abrilo en Chrome, o subilo a un hosting
   estático gratis (Netlify, Cloudflare Pages, GitHub Pages).
2. Pegá el token (está en `config.h` → `BLYNK_AUTH_TOKEN`, o en la consola en
   **Dispositivos → Casa-Sala → Info**).
3. Menú **⋮ → Agregar a pantalla de inicio**. Queda un ícono y se abre a
   pantalla completa.

La API de Blynk responde con `Access-Control-Allow-Origin: *`, por eso la app
funciona incluso abierta como archivo local (`file://`) desde el navegador.

### Reserva: la app oficial de Blynk

Se puede usar igual, pero hay que tener en cuenta que la app oficial crea un
**dispositivo nuevo con otro token**, no reutiliza el de la consola. Habría que
cambiar `BLYNK_AUTH_TOKEN` en `config.h` y volver a subir el firmware. Por eso
la app web propia es la recomendada, y la oficial queda como plan B.

| Widget | Datastream | Para qué |
|---|---|---|
| **Switch** | `pp_control`, `pt_control`, `vi_control`, `vd_control` | Abrir/cerrar cada puerta o ventana |
| **LED** | `pp_abierta`, `pt_abierta`, `vi_abierta`, `vd_abierta` | Verde si está abierta |
| **LED** (color rojo) | `pp_obstaculo`, `pt_obstaculo`, `vi_obstaculo`, `vd_obstaculo` | Se enciende si se detuvo por obstáculo |
| **Label / Number** | `pp_ciclos`, `pt_ciclos`, `vi_ciclos`, `vd_ciclos` | Ciclos acumulados |

---

## Compilar y subir sin instalar el IDE

Se puede hacer todo por línea de comandos con **arduino-cli**, que ya está
instalado en esta máquina. Sirve para cuando no querés abrir el IDE, o
para dejar los comandos copiados y listos antes de la feria.

La placa aparece como `COM6` y el board es `arduino:renesas_uno:unor4wifi`:

```powershell
$cli = "$env:LOCALAPPDATA\Temp\opencode\acli\arduino-cli.exe"

& $cli compile --fqbn arduino:renesas_uno:unor4wifi "C:\Users\saave\casa-inteligente\casa_inteligente"
& $cli upload  -p COM6 --fqbn arduino:renesas_uno:unor4wifi "C:\Users\saave\casa-inteligente\casa_inteligente"
```

Dos detalles que aparecen al hacerlo:

- **La carpeta del sketch tiene que llamarse igual que el `.ino`.** Por eso
  la carpeta se llama `casa_inteligente/` y no `firmware/`. Si no coinciden,
  da `main file missing from sketch`.
- **`arduino-cli` está en la carpeta Temp**, que Windows puede limpiar. Si
  algún día deja de existir, hay que volver a descargarlo.

### Librerías que hacen falta

- `Blynk` 1.3.5 (de *Blynk*, no `Blynk_ESP8266`)
- `Servo` 1.3.0
- El core `arduino:renesas_uno` 1.6.0, que trae `WiFiS3` y `EEPROM`

## Estado verificado en la placa antes de la integración física

Probado con la UNO R4 WiFi conectada por USB en `COM6`:

- Compila con **29% del programa** y **27% de la memoria**.
- El Monitor Serie a 9600 mostraba el mensaje de conexión de la versión anterior.
- En blynk.io, `Casa-Sala` figura **Online**, con la librería `1.3.5` y la
  plantilla `TMPL292-g0i7p`.

O sea que la parte de Blynk está completa: token, plantilla, red y los 16
datastreams.

### Estado verificado antes de añadir sonido y display

La prueba siguiente corresponde al sketch anterior. La integración de sonido,
LED y display está preparada en `casa_inteligente.ino`, pero aún falta
confirmar el pinout del display pequeño y cargar esa versión en la placa.

- **Dos puertas funcionando** (D9 y D10) controladas desde el panel web: abren
  y cierran de verdad. La placa figura **Online** y los ciclos se leen
  correctamente por la API.
- **Un tercer bug encontrado y corregido con la API:** los contadores de las
  ventanas salían en `65535`. Venían de una EEPROM nunca escrita, que vale
  `0xFFFF`; `cargarCiclos()` ahora lo interpreta como cero y lo normaliza.
- **Segundo arreglo:** el pin de cada sensor IR quedó como `INPUT_PULLUP` en
  vez de `INPUT`. Con el sensor desconectado el pin flotaba, se leía como
  LOW, y el firmware tomaba eso por un obstáculo: la puerta no se movía. Con el
  pull-up, un pin al aire significa "no hay nada" y el sensor connected manda
  cuando está puesto.
- **Falta todavía:** la fuente externa de 5 V. Con dos servos la USB se queda
  corta y quedan con poca fuerza (zumban al moverse), así que antes de la feria
  hay que llevar una de **5 V / 4 A** para las cuatro unidades.

### Prueba de hardware con un servo (Tower Pro 9G SG90)

Se probó un servo SG90 en **D9** con la placa alimentada solo por USB:

- **El servo se mueve bien** con la corriente que da el puerto USB. Con
  **un** servo alcanza; con los cuatro a la vez hay que usar fuente externa.
- Al arrancar, el firmware pone el servo **directo en 180° de un golpe**
  (no gradual) y después queda quieto, porque ya está en su posición final.
  **El ruido del primer movimiento es normal**: es el servo llegando al tope.
- Para verlo ir y venir hay que darle una orden (botón del panel) o cambiar
  el reed, porque si no hay nada que lo mande a otro lado, se queda ahí.
- **El Monitor Serie puede dejar de responder** en la UNO R4 después de
  varias lecturas seguidas: el puerto USB queda trabado del lado de Windows.
  Se arregla reiniciando la PC, o deshabilitando y rehabilitando el
  dispositivo en el Administrador de dispositivos. No es un problema del
  proyecto, y el LED de la placa sigue parpadeando normal mientras pasa.

---

## Problemas frecuentes

**El dispositivo aparece "Offline" en la app**

Abre el Monitor Serie a **9600** y lee lo que dice. El sketch está hecho
para no quedar congelado nunca, así que siempre te informa:

| Qué sale en el Monitor Serie | Qué significa |
|---|---|
| `[WIFI] sin conexion, reintentando...` | No entra al WiFi. Revisa SSID/clave, y que la red sea **2.4 GHz** (el Uno R4 WiFi no soporta 5 GHz). |
| `[BLYNK] TOKEN INVALIDO: ...` | El `BLYNK_AUTH_TOKEN` está mal. Pega el del **dispositivo**, no el de la plantilla. |
| `[BLYNK] conectado. Publicando estado...` | Todo bien. Los 16 datastreams se recién refrescaron. |
| Se queda en `Esperando WiFi y Blynk...` para siempre | No llegó ni al WiFi ni al servidor. Revisa que estés en una red con internet, no solo en un hotspot sin datos. |

**No compila y dice `Please specify your BLYNK_TEMPLATE_ID and BLYNK_TEMPLATE_NAME`**
- Te falta una de las dos primeras líneas de `config.h`. Se agregaron a
  `config.template.h` justamente por esto: la librería las exige siempre.

**Compila pero da error con `BlynkSimpleWifi.h`**
- El orden de includes importa. Debe ser:
  `SPI.h` → `WiFiS3.h` → `BlynkSimpleWifi.h`.
- En el IDE: **Herramientas → Administrar bibliotecas** → busca
  `Blynk` (de *Blynk*, no `Blynk_ESP8266`) e instala la última versión.
- La placa debe estar seleccionada: **Herramientas → Placa → Arduino UNO R4 WiFi**.

**Los botones hacen nada a veces**
- Es normal si la unidad ya está `MOVIENDO`: el código ignora el comando
  hasta que el servo termina. No es un error.

**La app se queda pegada mostrando datos viejos**
- Es normal durante un corte: el firmware reintenta solo y, en la versión
  actual, al reconectar publica el estado de las 2 puertas instaladas. Si la
  placa quedó sin WiFi, el Monitor Serie lo está avisando.

**¿Y si en la feria no hay internet?**
- Blynk necesita internet, así que sin señal la app no muestra nada. La
  maqueta sigue moviendo los servos desde el sensor de sonido y los ciclos se
  guardan en EEPROM; se pierde el control remoto hasta que vuelva internet.
- Para una feria sin señal, la alternativa es Node-RED corriendo en un
  notebook: el dashboard se abre en el navegador desde la red local del
  colegio y no necesita internet. Es un plan B aparte, no hace falta
  prepararlo ahora.

---

# Base de datos: Firebase Firestore

## Por qué Firestore

La app sigue hablando con Blynk para el control, que es la parte que ya
funcionaba. Lo que faltaba era **guardar el historial**, y Firestore se
eligió por tres razones concretas:

- La API REST de Firestore **sí manda cabeceras CORS**. Verificado: el
  preflight responde `200` con `Access-Control-Allow-Origin` y permite `POST`
  y `content-type`. Por eso la app puede **leer y escribir desde el
  navegador**, sin servidor intermedio y sin claves de servicio.
- No hace falta meter un certificado raíz en el firmware, que era lo que
  bloqueaba escribir directo a Google Sheets desde la placa.
- Es Firestore, que ya se conoce.

## Arquitectura

```
Placa → Blynk (control y contadores) → la App lee
                                          ↓
                              la App escribe el evento en Firestore
                                          ↓
                              la App lee Firestore → pantalla Historial
```

**Limitación honesta:** los eventos se registran **mientras la app está
abierta**. Como el contador de ciclos vive en la EEPROM de la placa, no se
pierde ningún ciclo: solo la hora exacta de los que ocurrieron sin nadie
mirando. Para registro 24/7 haría falta un receptor en la nube (un Cloudflare
Worker o una Cloud Function) al que la placa le escriba directo.

## Qué se registra

Cada evento es un documento de la colección `eventos`:

| Campo | Tipo | Significado |
|---|---|---|
| `ts` | timestamp | Fecha y hora. La pone el navegador, porque la placa no tiene reloj |
| `unidad` | string | Nombre de la puerta o ventana |
| `tipo` | string | `ciclo`, `obstaculo` o `reinicio` |
| `ciclos` | entero | Contador acumulado en ese momento |
| `delta` | entero | Cuántos ciclos ocurrieron en este evento |

Reglas de detección, en `revisarYRegistrar()` de `app/index.html`:

- La **primera** lectura al abrir la app no genera eventos: solo deja la línea
  base. Así no se inventan eventos por cambios antiguos.
- Si el contador **sube**, se registra un `ciclo` con la diferencia.
- Si el contador **baja**, se registra un `reinicio` (alguien reseteó el
  contador o se reprogramó la placa).
- Si un sensor de obstáculos pasa a `1`, se registra un `obstaculo`.
- Las unidades marcadas como "sin instalar" se ignoran.

## Configuración

Las claves **no** van escritas en `app/index.html`. Se ingresan en
**Ajustes → Base de datos (Firestore)** y quedan guardadas solo en ese
navegador (`localStorage`), igual que el token de Blynk:

- `projectId`: el ID del proyecto de Firebase.
- `apiKey`: la clave de la configuración web.

El botón **Probar conexión** hace una lectura real y avisa si responde o no.

## Pantalla Historial

- Gráfico de barras con los ciclos registrados por día (últimos 14 días con
  datos).
- Resumen de ciclos por unidad.
- Tabla con los últimos 20 eventos.

## Reglas de seguridad de Firestore

Para que la app escriba desde el navegador, las reglas tienen que permitir
lectura y escritura. Con reglas abiertas, cualquiera que conozca el
`projectId` y la `apiKey` podría leer y escribir también. Para un proyecto
escolar está bien, pero conviene **decirlo en la presentación** en vez de
esconderlo: es parte de lo que aprendiste.

## Estado verificado

Probado de punta a punta con las dos puertas reales:

| Paso | Estado |
|---|---|
| La placa publica estados y contadores en Blynk | anda |
| La app lee Blynk desde el navegador | anda |
| La app escribe los ciclos en Firestore | anda, confirmado en la consola de Firebase |
| Eventos de las dos puertas (`puerta principal` y `puerta trasera`) | guardados |
| Control desde el celular vía Netlify | anda |

Un detalle que costó trabajo y conviene recordar: **Firestore devuelve el
mismo código `403` para varias causas distintas** (reglas cerradas,
`projectId` equivocado, `apiKey` que no corresponde, API no activada). Por eso
la app ahora muestra el mensaje real de Google en vez de un error genérico,
con `errorFB()` y `explicarError()` en `app/index.html`. Si algún día vuelve a
fallar, el texto que aparece dice cuál de las cuatro es.

## Lo que falta para la feria

- **Alimentación externa de los servos.** Con los dos SG90 en el USB de la
  placa mueven con poca fuerza y zumban. Hace falta 5 V / 3-4 A y GND común.
  Esto es lo más urgente.
- **Reed switches e IR HW-201** (los 4 de cada uno) todavía no llegan.
- Marcar en **Ajustes → Unidades instaladas** las dos ventanas como "sin
  instalar", para que no se vean como averiadas.
- Si en la feria no hay internet, la app no muestra nada, pero la maqueta
  sigue funcionando con los pulsadores físicos.

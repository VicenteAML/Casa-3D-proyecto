/*
 * Casa Inteligente IoT - Arduino Uno R4 WiFi + Blynk
 * Configuración física actual: 2 servos, sensor de sonido, LED y display
 * de un dígito. Las entradas reed/IR quedan opcionales para una ampliación.
 *
 * El control y el monitoreo van por Blynk (50 datastreams gratis) en vez de
 * Arduino IoT Cloud, cuyo plan gratuito solo permite 5 variables por Thing
 * y este proyecto necesita 16. Ver BLYNK.md para crear el template.
 *
 * Conexiones propuestas para esta configuración:
 *  Servo principal/trasero -> D9/D10
 *  Sensor de sonido AO -> A0; VCC -> 5V; GND -> GND (DO sin conectar)
 *  Display segmentos a-g -> D2-D8; común según sea ánodo/cátodo común
 *  LED verde/rojo -> D11/D12, cada uno con su resistencia en serie
 */

// config.h va PRIMERO a propósito: la librería Blynk valida que existan
// BLYNK_TEMPLATE_ID y BLYNK_TEMPLATE_NAME en el momento de procesar sus
// propios headers, así que si este #include queda después de BlynkSimpleWifi.h
// la compilación falla con "Please specify your BLYNK_TEMPLATE_ID...".
#include "config.h"

#include <SPI.h>
#include <WiFiS3.h>
#include <BlynkSimpleWifi.h>
#include <Servo.h>
#include <EEPROM.h>

// ------------------------------------------------------------------
// CONSTANTES DE AJUSTE
// ------------------------------------------------------------------
const unsigned long PASO_MS = 20;       // ms por paso (1°) del servo
const unsigned long DEBOUNCE_MS = 50;   // anti-rebote del reed
const unsigned long IR_MS = 25;         // frecuencia de lectura del IR al cerrar
const unsigned long REDE_MS = 10000;    // cada cuánto revisar el WiFi
const uint8_t INTENTOS_POR_RED = 6;     // tras esto, prueba la siguiente red
const unsigned long AVISO_MS = 30000;   // cada cuánto insistir con el token malo
const bool IR_DETECTA_NIVEL = LOW;      // HW-201: LOW = hay obstáculo.
                                        // Si tu módulo lee invertido, usa HIGH.

// Componentes añadidos: el display se maneja como cátodo común por defecto.
// Confirmar el tipo del display antes de conectarlo; para ánodo común cambia
// DISPLAY_ANODO_COMUN a true. El sensor de sonido se lee por AO para evitar
// depender del umbral del comparador digital DO.
const uint8_t PIN_SONIDO = A0;
const unsigned long BLOQUEO_APLAUSO_MS = 700;
const int UMBRAL_APLAUSO_AO = 120; // amplitud pico a pico inicial; ajustar mirando el monitor
const uint8_t PIN_LED_VERDE = 11;
const uint8_t PIN_LED_ROJO = 12;
const uint8_t PIN_SEGMENTOS[] = { 2, 3, 4, 5, 6, 7, 8 }; // a,b,c,d,e,f,g
const bool DISPLAY_ANODO_COMUN = false;
const uint8_t PIN_NO_INSTALADO = 255;
unsigned long ultimoAplauso = 0;
unsigned long ultimoReporteSonido = 0;

// Estados de posición
const uint8_t P_CERRADA = 0;
const uint8_t P_ABIERTA = 1;
const uint8_t P_OBSTACULO = 2;          // se detuvo por obstáculo
const uint8_t P_MOVIENDO = 3;

// ------------------------------------------------------------------
// ESTRUCTURA DE CADA UNIDAD (puerta o ventana)
//
// Los vs* son los Virtual Pins de Blynk. La app escribe en vsControl
// (botón) y el dispositivo publica en vsAbierta / vsCiclos / vsObstaculo.
// ------------------------------------------------------------------
struct Unidad {
  const char* nombre;
  uint8_t pinServo;
  uint8_t pinReed;
  uint8_t pinIR;
  uint8_t anguloAbierto;   // ángulo del servo cuando queda ABIERTA
  uint8_t anguloCerrado;   // ángulo del servo cuando queda CERRADA
  uint8_t eepromCiclos;    // dirección EEPROM (2 bytes) de su contador
  uint8_t vsControl;       // botón de la app -> abre/cierra
  uint8_t vsAbierta;       // LED: está abierta
  uint8_t vsCiclos;        // número: ciclos acumulados
  uint8_t vsObstaculo;     // LED rojo: se detuvo por obstáculo

  Servo servo;
  uint8_t posicion;               // estado lógico actual de la puerta
  uint8_t posicionObjetivo;
  uint8_t anguloActual;
  int reedAnterior;
  int reedEstable;
  unsigned long ultimoReed;
  unsigned long ultimoPaso;
  unsigned long ultimoIR;
  int irLectura;
  uint16_t ciclos;
};

Unidad unidades[] = {
  { "puerta_principal",   9, PIN_NO_INSTALADO, PIN_NO_INSTALADO, 180, 0, 0, V1, V5, V9, V13 },
  { "puerta_trasera",    10, PIN_NO_INSTALADO, PIN_NO_INSTALADO, 180, 0, 2, V2, V6, V10, V14 },
};
const size_t NUM_UNIDADES = sizeof(unidades) / sizeof(unidades[0]);

void ejecutarControl(Unidad& u, int valor);

unsigned long ultimoIntentoRed = 0;
unsigned long ultimoAvisoToken = 0;
int redActual = 0;              // cuál de las redes de config.h se está probando
uint8_t intentosBlynk = 0;      // reintentos sobre la MISMA red sin entrar a Blynk

// ------------------------------------------------------------------
// FUNCIONES AUXILIARES
// ------------------------------------------------------------------
void syncloud(Unidad& u) {
  Blynk.virtualWrite(u.vsAbierta, (u.posicion == P_ABIERTA) ? 1 : 0);
  Blynk.virtualWrite(u.vsObstaculo, (u.posicion == P_OBSTACULO) ? 1 : 0);
  Blynk.virtualWrite(u.vsCiclos, u.ciclos);
}

// Indicadores físicos de la puerta principal. Se muestra 0 cerrada y 1 abierta.
void actualizarIndicadores(const Unidad& u) {
  const bool abierta = u.posicion == P_ABIERTA;
  const bool cerrada = u.posicion == P_CERRADA;
  digitalWrite(PIN_LED_VERDE, abierta ? HIGH : LOW);
  digitalWrite(PIN_LED_ROJO, cerrada ? HIGH : LOW);

  // Segmentos en orden a,b,c,d,e,f,g. Durante movimiento/obstáculo se apagan.
  const bool cero[7] = { true, true, true, true, true, true, false };
  const bool uno[7]  = { false, true, true, false, false, false, false };
  for (uint8_t i = 0; i < 7; i++) {
    const bool encendido = cerrada ? cero[i] : (abierta ? uno[i] : false);
    const bool nivelAlto = encendido != DISPLAY_ANODO_COMUN;
    digitalWrite(PIN_SEGMENTOS[i], nivelAlto ? HIGH : LOW);
  }
}

// Cada aplauso alterna la puerta principal, siempre con el mismo servo D9.
void manejarSonido() {
  int minimo = 1023;
  int maximo = 0;
  const unsigned long inicioMuestra = millis();
  do {
    const int lectura = analogRead(PIN_SONIDO);
    if (lectura < minimo) minimo = lectura;
    if (lectura > maximo) maximo = lectura;
  } while ((millis() - inicioMuestra) < 20);

  const int amplitud = maximo - minimo;
  if ((millis() - ultimoReporteSonido) >= 500) {
    ultimoReporteSonido = millis();
    Serial.print(F("[SONIDO] AO min="));
    Serial.print(minimo);
    Serial.print(F(" max="));
    Serial.print(maximo);
    Serial.print(F(" pp="));
    Serial.println(amplitud);
  }

  if (amplitud >= UMBRAL_APLAUSO_AO &&
      (millis() - ultimoAplauso) >= BLOQUEO_APLAUSO_MS) {
    ultimoAplauso = millis();
    Serial.println(F("[SONIDO] Alternando puerta principal"));
    ejecutarControl(unidades[0], 2);
  }
}

// Lee los contadores guardados en EEPROM al arrancar
void cargarCiclos(Unidad& u) {
  uint16_t v = (uint16_t)(EEPROM.read(u.eepromCiclos) << 8) | EEPROM.read(u.eepromCiclos + 1);
  // Una EEPROM nunca escrita vale 0xFFFF: no son 65535 ciclos, son cero.
  u.ciclos = (v == 0xFFFF) ? 0 : v;
  if (v == 0xFFFF) guardarCiclos(u);
}

// Guarda el contador (EEPROM.update solo escribe si cambió)
void guardarCiclos(Unidad& u) {
  EEPROM.update(u.eepromCiclos, u.ciclos >> 8);
  EEPROM.update(u.eepromCiclos + 1, u.ciclos & 0xFF);
}

// Traduce el valor que llega de la app a un destino y arranca el movimiento
void comandar(Unidad& u, uint8_t destino) {
  if (u.posicion == P_MOVIENDO) return;   // ya está en movimiento
  if (u.posicion == destino) return;      // ya está en ese lado: no hacer nada

  u.posicionObjetivo = destino;
  u.posicion = P_MOVIENDO;
  u.ultimoPaso = millis();
  if (&u == &unidades[0]) actualizarIndicadores(u);
  Blynk.virtualWrite(u.vsObstaculo, 0);
  if (destino == P_CERRADA) u.ultimoIR = millis();
}

// Valores que manda la app: 1 = abrir, 0 = cerrar, 2 = invertir el estado.
void ejecutarControl(Unidad& u, int valor) {
  if (valor == 2) {
    comandar(u, (u.posicion == P_ABIERTA) ? P_CERRADA : P_ABIERTA);
    return;
  }
  comandar(u, (valor != 0) ? P_ABIERTA : P_CERRADA);
}

// Anti-rebote opcional del reed. Solo se ejecuta si esa entrada está instalada.
void manejarReed(Unidad& u) {
  if (u.pinReed == PIN_NO_INSTALADO) return;
  int lectura = digitalRead(u.pinReed);
  if (lectura != u.reedAnterior) u.ultimoReed = millis();
  u.reedAnterior = lectura;

  if ((millis() - u.ultimoReed) <= DEBOUNCE_MS) return;  // aún rebotando
  if (lectura == u.reedEstable) return;                  // no cambió nada
  u.reedEstable = lectura;

  // Mientras el servo se mueve, el imán pasa por delante del reed y dispararía
  // cambios falsos a mitad del recorrido. Se ignora hasta que termine.
  if (u.posicion == P_MOVIENDO) return;

  uint8_t nueva = (lectura == LOW) ? P_CERRADA : P_ABIERTA;
  if (nueva == u.posicion) return;

  u.posicion = nueva;
  u.anguloActual = (nueva == P_ABIERTA) ? u.anguloAbierto : u.anguloCerrado;
  u.servo.write(u.anguloActual);      // recoloca el brazo tras el movimiento a mano
  if (&u == &unidades[0]) actualizarIndicadores(u);

  Serial.print(u.nombre);
  if (nueva == P_CERRADA) {
    Serial.print(" -> CERRADA (reed). Ciclos: ");
    u.ciclos++;                       // cuenta igual que un cierre con servo
    guardarCiclos(u);
    Serial.println(u.ciclos);
  } else {
    Serial.println(" -> ABIERTA (reed)");
  }

  Blynk.virtualWrite(u.vsObstaculo, 0);
  syncloud(u);
}

// Mueve el servo 1° por vez; al cerrar revisa el IR por obstáculos
void manejarMovimiento(Unidad& u) {
  if (u.posicion != P_MOVIENDO) return;
  if ((millis() - u.ultimoPaso) < PASO_MS) return;

  uint8_t objetivo = (u.posicionObjetivo == P_ABIERTA) ? u.anguloAbierto
                                                       : u.anguloCerrado;

  // Al cerrar: frente a obstáculo, detenerse
  if (u.pinIR != PIN_NO_INSTALADO && u.posicionObjetivo == P_CERRADA &&
      (millis() - u.ultimoIR) >= IR_MS) {
    u.ultimoIR = millis();
    u.irLectura = digitalRead(u.pinIR);
    if (u.irLectura == IR_DETECTA_NIVEL) {
      u.posicion = P_OBSTACULO;          // se detiene donde está ahora
      if (&u == &unidades[0]) actualizarIndicadores(u);
      Serial.print(u.nombre);
      Serial.println(" -> se detuvo por OBSTACULO");
      syncloud(u);
      return;
    }
  }

  // Avanzar un grado en la dirección correcta
  int dir = (objetivo > u.anguloActual) ? 1 : -1;
  u.anguloActual += dir;
  u.servo.write(u.anguloActual);
  u.ultimoPaso = millis();

  // ¿Llegó al destino?
  if (u.anguloActual == objetivo) {
    u.posicion = u.posicionObjetivo;
    if (u.posicion == P_CERRADA) {
      u.ciclos++;                        // ciclo = una apertura + un cierre
      guardarCiclos(u);
      Serial.print(u.nombre);
      Serial.print(" -> CERRADA. Ciclos: ");
      Serial.println(u.ciclos);
    }
    if (&u == &unidades[0]) actualizarIndicadores(u);
    syncloud(u);
  }
}

// ------------------------------------------------------------------
// CALLBACKS DE LOS BOTONES DE LA APP
// Blynk exige una función propia por Virtual Pin, no se pueden agrupar.
// ------------------------------------------------------------------
BLYNK_WRITE(V1) { ejecutarControl(unidades[0], param[0].asInt()); }
BLYNK_WRITE(V2) { ejecutarControl(unidades[1], param[0].asInt()); }
BLYNK_WRITE(V3) { /* ventana izquierda aún no instalada */ }
BLYNK_WRITE(V4) { /* ventana derecha aún no instalada */ }

// Se dispara cada vez que la placa logra (re)conectarse con Blynk, así que
// es el momento exacto de refrescar los 16 datastreams en la app.
BLYNK_CONNECTED() {
  Serial.println(F("[BLYNK] conectado. Publicando estado de las 2 puertas activas."));
  for (size_t i = 0; i < NUM_UNIDADES; i++) syncloud(unidades[i]);
}

// ------------------------------------------------------------------
// CONEXIÓN
// No usamos Blynk.begin() porque internamente se queda en un bucle
// infinito si no hay WiFi o el token está mal: la placa quedaría
// congelada y los servos no responderían. Acá el WiFi se reintenta solo.
//
// Se prueban las redes de config.h en orden (redes[0], redes[1], ...), así
// que el mismo sketch sirve en casa y en la feria sin recompilar.
// ------------------------------------------------------------------
void intentarRed() {
  Serial.print(F("[WIFI] probando red "));
  Serial.print(redActual + 1);
  Serial.print('/');
  Serial.print(TOTAL_REDES);
  Serial.print(F(": "));
  Serial.println(redes[redActual].ssid);

  intentosBlynk = 0;
  WiFi.disconnect();
  WiFi.begin(redes[redActual].ssid, redes[redActual].pass);
}

void siguienteRed() {
  redActual = (redActual + 1) % TOTAL_REDES;
  intentarRed();
}

void mantenerConexion() {
  if (Blynk.connected()) {
    intentosBlynk = 0;
    return;
  }

  unsigned long ahora = millis();
  if ((ahora - ultimoIntentoRed) < REDE_MS) return;
  ultimoIntentoRed = ahora;

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println(F("[WIFI] sin conexion"));
    siguienteRed();
    return;
  }

  // Hay WiFi pero Blynk no entra. Las dos causas posibles: token equivocado
  // (mensaje de acá abajo) o red con portal cautivo, que se comporta como
  // "conectada" pero no deja salir a internet. Por eso, tras varios
  // intentos damos por perdida esta red y probamos la siguiente.
  if (++intentosBlynk >= INTENTOS_POR_RED) {
    Serial.println(F("[WIFI] entra a la red pero no a Blynk: puede ser portal"));
    siguienteRed();
    return;
  }

  if (Blynk.isTokenInvalid() && ((ahora - ultimoAvisoToken) > AVISO_MS)) {
    ultimoAvisoToken = ahora;
    Serial.println(F("[BLYNK] TOKEN INVALIDO: revisa BLYNK_AUTH_TOKEN en config.h"));
  }
}

// ------------------------------------------------------------------
// SETUP Y LOOP
// ------------------------------------------------------------------
void setup() {
  Serial.begin(9600);
  delay(1500);

  pinMode(PIN_SONIDO, INPUT);
  analogReadResolution(10);
  pinMode(PIN_LED_VERDE, OUTPUT);
  pinMode(PIN_LED_ROJO, OUTPUT);
  for (uint8_t i = 0; i < 7; i++) pinMode(PIN_SEGMENTOS[i], OUTPUT);

  for (size_t i = 0; i < NUM_UNIDADES; i++) {
    Unidad& u = unidades[i];
    if (u.pinReed != PIN_NO_INSTALADO) pinMode(u.pinReed, INPUT_PULLUP);
    // INPUT_PULLUP: con el sensor desconectado el pin queda en HIGH, es decir
    // "sin obstáculo". Con el HW-201 puesto, el módulo decide el nivel.
    if (u.pinIR != PIN_NO_INSTALADO) pinMode(u.pinIR, INPUT_PULLUP);
    u.servo.attach(u.pinServo);
    cargarCiclos(u);

    // Sin reed instalado, se inicia en cerrado. Deja la puerta cerrada al
    // encender para que el ángulo y los indicadores coincidan con la maqueta.
    if (u.pinReed != PIN_NO_INSTALADO) {
      int r = digitalRead(u.pinReed);
      u.reedAnterior = r;
      u.reedEstable = r;
      u.posicion = (r == LOW) ? P_CERRADA : P_ABIERTA;
    } else {
      u.posicion = P_CERRADA;
      u.reedAnterior = HIGH;
      u.reedEstable = HIGH;
    }
    u.anguloActual = (u.posicion == P_CERRADA) ? u.anguloCerrado : u.anguloAbierto;
    u.servo.write(u.anguloActual);

    Serial.print(u.nombre);
    Serial.print(" en ");
    Serial.print(u.posicion == P_ABIERTA ? "ABIERTA" : "CERRADA");
    Serial.print(". Ciclos: ");
    Serial.println(u.ciclos);
  }

  actualizarIndicadores(unidades[0]);

  // config() solo guarda el token y la dirección del servidor: NO intenta
  // conectarse. La conexión la va haciendo Blynk.run() en segundo plano.
  Blynk.config(BLYNK_AUTH_TOKEN);
  intentarRed();
  Serial.println(F("Esperando WiFi y Blynk..."));
}

void loop() {
  Blynk.run();
  mantenerConexion();
  manejarSonido();

  for (size_t i = 0; i < NUM_UNIDADES; i++) {
    manejarReed(unidades[i]);
    manejarMovimiento(unidades[i]);
  }
}

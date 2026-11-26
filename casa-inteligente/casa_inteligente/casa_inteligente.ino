/*
 * Casa Inteligente IoT - Arduino Uno R4 WiFi + Blynk
 * Configuración física actual: 4 servos, sensores IR en puertas D2/D3 y
 * ventanas D12/D4, y LCD 16x2 I2C. Los reed siguen sin instalar.
 *
 * El control y el monitoreo van por Blynk (50 datastreams gratis) en vez de
 * Arduino IoT Cloud, cuyo plan gratuito solo permite 5 variables por Thing
 * y este proyecto necesita 16. Ver BLYNK.md para crear el template.
 *
 * Conexiones propuestas para esta configuración:
 *  Servos puerta principal/trasera y ventanas -> D9/D10/D5/D6
 *  Sensor IR principal/trasero/ventanas OUT -> D2/D3/D12/D4
 *  Sensor IR VCC -> 5V; GND -> GND
 *  LCD I2C: VCC -> 5V; GND -> GND; SDA -> SDA; SCL -> SCL
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
#include <Wire.h>
#include <hd44780.h>
#include <hd44780ioClass/hd44780_I2Cexp.h>

// ------------------------------------------------------------------
// CONSTANTES DE AJUSTE
// ------------------------------------------------------------------
const unsigned long PASO_MS = 20;       // ms por paso (1°) del servo
const unsigned long DEBOUNCE_MS = 50;   // anti-rebote del reed
const unsigned long IR_MS = 25;         // frecuencia de lectura del IR al cerrar
const unsigned long REDE_MS = 10000;    // cada cuánto revisar el WiFi
const uint8_t INTENTOS_POR_RED = 6;     // tras esto, prueba la siguiente red
const unsigned long AVISO_MS = 30000;   // cada cuánto insistir con el token malo
const bool IR_DETECTA_NIVEL = LOW;      // Módulo IR tipo MH-B: LOW = obstáculo.
                                        // Si el LED de detección se comporta al revés, confirmar OUT y ajustar.

// LCD de caracteres 16x2 con mochila I2C PCF8574.
// hd44780_I2Cexp detecta automáticamente la dirección y el mapeo más común.
const uint8_t LCD_COLUMNAS = 16;
const uint8_t LCD_FILAS = 2;
hd44780_I2Cexp lcd;
const unsigned long LCD_PASO_ANIMACION_MS = 180;
const unsigned long LCD_PAUSA_NOMBRE_MS = 1500;
const int LCD_LARGO_NOMBRE = 10; // ambos nombres tienen 10 caracteres
const int LCD_COLUMNA_CENTRO = (LCD_COLUMNAS - LCD_LARGO_NOMBRE) / 2;
int lcdColumna = LCD_COLUMNAS;
unsigned long lcdUltimoPaso = 0;
unsigned long lcdInicioPausa = 0;
bool lcdDisponible = false;
bool lcdEnPausa = false;
const uint8_t PIN_NO_INSTALADO = 255;

// Estados de posición
const uint8_t P_CERRADA = 0;
const uint8_t P_ABIERTA = 1;
const uint8_t P_OBSTACULO = 2;          // se detuvo por obstáculo
const uint8_t P_MOVIENDO = 3;
const uint8_t FASE_REPOSO = 0;
const uint8_t FASE_ABRIENDO = 1;
const uint8_t FASE_ESPERA_ABIERTA = 2;
const uint8_t FASE_CERRANDO = 3;
const uint8_t FASE_DETENIDA = 4;
const uint8_t SOLICITUD_CIERRE = 0;
const uint8_t SOLICITUD_APERTURA = 1;
const uint8_t SIN_UNIDAD = 255;

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
  uint8_t fase;
  bool enCola;
};

Unidad unidades[] = {
  { "puerta_principal",   9, PIN_NO_INSTALADO, 2,  90, 0, 0, V1, V5, V9, V13 }, // servo D9, sensor IR OUT D2
  { "puerta_trasera",    10, PIN_NO_INSTALADO, 3,  90, 0, 2, V2, V6, V10, V14 }, // servo D10, sensor IR OUT D3
  { "ventana_izquierda",  5, PIN_NO_INSTALADO, 12, 90, 0, 4, V3, V7, V11, V15 }, // servo D5, sensor IR OUT D12
  { "ventana_derecha",    6, PIN_NO_INSTALADO, 4, 90, 0, 6, V4, V8, V12, V16 }, // servo D6, sensor IR OUT D4
};
const size_t NUM_UNIDADES = sizeof(unidades) / sizeof(unidades[0]);

struct Solicitud {
  uint8_t indice;
  uint8_t tipo;
};

// Una única cola y un único actuador activo para las cuatro hojas.
Solicitud colaSolicitudes[NUM_UNIDADES];
uint8_t colaCabeza = 0;
uint8_t colaCantidad = 0;
uint8_t unidadActiva = SIN_UNIDAD;

void ejecutarControl(Unidad& u, int valor);

unsigned long ultimoIntentoRed = 0;
unsigned long ultimoAvisoToken = 0;
int redActual = 0;              // cuál de las redes de config.h se está probando
uint8_t intentosBlynk = 0;      // reintentos sobre la MISMA red sin entrar a Blynk

// ------------------------------------------------------------------
// FUNCIONES AUXILIARES
// ------------------------------------------------------------------
void syncloud(Unidad& u) {
  // V5–V8 significan "no está completamente cerrada". Así la interfaz 3D
  // comienza a abrir al mismo tiempo que el servo y conserva el estado si
  // el cierre queda detenido por un obstáculo.
  Blynk.virtualWrite(u.vsAbierta, (u.posicion == P_CERRADA) ? 0 : 1);
  Blynk.virtualWrite(u.vsObstaculo, (u.posicion == P_OBSTACULO) ? 1 : 0);
  Blynk.virtualWrite(u.vsCiclos, u.ciclos);
}

// Dibuja un nombre en una fila, ocultando las letras que aún están fuera
// del área visible del LCD.
void dibujarNombreLCD(uint8_t fila, const char* nombre, int columnaInicial) {
  char linea[LCD_COLUMNAS + 1];
  for (uint8_t i = 0; i < LCD_COLUMNAS; i++) linea[i] = ' ';
  linea[LCD_COLUMNAS] = '\0';

  for (int i = 0; nombre[i] != '\0'; i++) {
    int columna = columnaInicial + i;
    if (columna >= 0 && columna < LCD_COLUMNAS) linea[columna] = nombre[i];
  }

  lcd.setCursor(0, fila);
  lcd.print(linea);
}

// La animación no usa delay(), para que Blynk y los servos sigan atendiendo.
void actualizarAnimacionLCD() {
  if (!lcdDisponible) return;

  unsigned long ahora = millis();
  if (lcdEnPausa) {
    if (ahora - lcdInicioPausa < LCD_PAUSA_NOMBRE_MS) return;
    lcdEnPausa = false;
    lcdColumna = -LCD_LARGO_NOMBRE; // ambos nombres salen por la izquierda
  }

  if (ahora - lcdUltimoPaso < LCD_PASO_ANIMACION_MS) return;
  lcdUltimoPaso = ahora;

  dibujarNombreLCD(0, "SaturnTech", lcdColumna);
  dibujarNombreLCD(1, "SmartHouse", lcdColumna);

  if (lcdColumna == LCD_COLUMNA_CENTRO) {
    lcdEnPausa = true;
    lcdInicioPausa = ahora;
  } else {
    lcdColumna--;
    if (lcdColumna < -LCD_LARGO_NOMBRE) lcdColumna = LCD_COLUMNAS;
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

void iniciarMovimiento(Unidad& u, uint8_t destino, uint8_t fase) {
  u.posicionObjetivo = destino;
  u.posicion = P_MOVIENDO;
  u.fase = fase;
  u.ultimoPaso = millis();
  if (destino == P_CERRADA) u.ultimoIR = millis();
  Blynk.virtualWrite(u.vsObstaculo, 0);
  syncloud(u);
}

bool encolarSolicitud(Unidad& u, uint8_t tipo) {
  const uint8_t indice = (uint8_t)(&u - unidades);
  if (unidadActiva == indice || u.enCola) return false;
  if (colaCantidad >= NUM_UNIDADES) {
    Serial.println(F("[COLA] llena; orden rechazada"));
    return false;
  }

  const uint8_t lugar = (colaCabeza + colaCantidad) % NUM_UNIDADES;
  colaSolicitudes[lugar].indice = indice;
  colaSolicitudes[lugar].tipo = tipo;
  colaCantidad++;
  u.enCola = true;
  Serial.print(F("[COLA] solicitud para "));
  Serial.print(u.nombre);
  Serial.print(F(". Esperando: "));
  Serial.println(colaCantidad);
  return true;
}

void iniciarSiguienteSolicitud() {
  if (unidadActiva != SIN_UNIDAD) return;

  while (colaCantidad > 0) {
    const Solicitud solicitud = colaSolicitudes[colaCabeza];
    colaCabeza = (colaCabeza + 1) % NUM_UNIDADES;
    colaCantidad--;

    Unidad& u = unidades[solicitud.indice];
    u.enCola = false;
    if (u.posicion == P_OBSTACULO || u.posicion == P_MOVIENDO) continue;

    if (solicitud.tipo == SOLICITUD_APERTURA && u.posicion == P_CERRADA) {
      unidadActiva = solicitud.indice;
      Serial.print(F("[SECUENCIA] abriendo "));
      Serial.println(u.nombre);
      iniciarMovimiento(u, P_ABIERTA, FASE_ABRIENDO);
      return;
    }

    // Un cierre en cola se procesa cuando no hay otra hoja usando el servo.
    if (solicitud.tipo == SOLICITUD_CIERRE && u.posicion == P_ABIERTA) {
      unidadActiva = solicitud.indice;
      Serial.print(F("[SECUENCIA] cerrando "));
      Serial.println(u.nombre);
      iniciarMovimiento(u, P_CERRADA, FASE_CERRANDO);
      return;
    }
  }
}

// Desde DETENIDA, el valor 1 confirma que se retiró el obstáculo.
void reanudarCierre(Unidad& u) {
  const uint8_t indice = (uint8_t)(&u - unidades);
  if (u.posicion != P_OBSTACULO || unidadActiva != indice || u.fase != FASE_DETENIDA) return;

  // No mover mientras la salida del sensor siga indicando obstáculo.
  if (u.pinIR != PIN_NO_INSTALADO && digitalRead(u.pinIR) == IR_DETECTA_NIVEL) {
    Serial.print(u.nombre);
    Serial.println(" -> continuar rechazado: sensor aun detecta obstaculo");
    Blynk.virtualWrite(u.vsControl, 0); // deja listo el botón para otro intento
    syncloud(u);
    return;
  }

  Serial.print(u.nombre);
  Serial.println(" -> confirmacion recibida; continuando cierre");
  Blynk.virtualWrite(u.vsControl, 0);   // restablece el control a "cerrar"
  iniciarMovimiento(u, P_CERRADA, FASE_CERRANDO);
}

void solicitarCierre(Unidad& u) {
  const uint8_t indice = (uint8_t)(&u - unidades);
  if (u.posicion == P_OBSTACULO) return;

  // Cerrar sobre una apertura que aún espera en cola cancela esa solicitud.
  if (u.enCola) {
    for (uint8_t offset = 0; offset < colaCantidad; offset++) {
      const uint8_t slot = (colaCabeza + offset) % NUM_UNIDADES;
      if (colaSolicitudes[slot].indice != indice) continue;
      for (uint8_t mover = offset; mover + 1 < colaCantidad; mover++) {
        const uint8_t destino = (colaCabeza + mover) % NUM_UNIDADES;
        const uint8_t origen = (colaCabeza + mover + 1) % NUM_UNIDADES;
        colaSolicitudes[destino] = colaSolicitudes[origen];
      }
      colaCantidad--;
      u.enCola = false;
      Serial.print(F("[COLA] apertura cancelada: "));
      Serial.println(u.nombre);
      return;
    }
  }
  if (u.posicion == P_CERRADA) return;

  if (unidadActiva == indice) {
    // El cierre manual libera el servo al terminar; nunca habilita otro
    // actuador mientras esta hoja aún se mueve.
    if (u.fase == FASE_ESPERA_ABIERTA) iniciarMovimiento(u, P_CERRADA, FASE_CERRANDO);
    return;
  }
  encolarSolicitud(u, SOLICITUD_CIERRE);
}

// Abrir deja la hoja abierta; cerrar la mueve a cerrada. El valor 1 también
// confirma que se retiró un obstáculo cuando la unidad quedó detenida.
void ejecutarControl(Unidad& u, int valor) {
  if (u.posicion == P_OBSTACULO) {
    if (valor == 1) reanudarCierre(u);
    Blynk.virtualWrite(u.vsControl, 0);
    return; // no abrir ni cerrar sin confirmación mientras está detenida
  }

  if (valor == 1) encolarSolicitud(u, SOLICITUD_APERTURA);
  else if (valor == 0) solicitarCierre(u);
  Blynk.virtualWrite(u.vsControl, 0); // hace que Abrir sea un pulso repetible
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

  // Mientras una hoja se mueve o la cola tiene trabajo, no dejar que el reed
  // ordene otro servo en paralelo.
  if (unidadActiva != SIN_UNIDAD || colaCantidad > 0 || u.posicion == P_MOVIENDO) return;

  uint8_t nueva = (lectura == LOW) ? P_CERRADA : P_ABIERTA;
  if (nueva == u.posicion) return;

  u.posicion = nueva;
  u.anguloActual = (nueva == P_ABIERTA) ? u.anguloAbierto : u.anguloCerrado;
  u.servo.write(u.anguloActual);      // recoloca el brazo tras el movimiento a mano
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

// Ejecuta una sola solicitud activa: abrir y mantener, o cerrar.
void manejarMovimiento() {
  if (unidadActiva == SIN_UNIDAD) iniciarSiguienteSolicitud();
  if (unidadActiva == SIN_UNIDAD) return;

  Unidad& u = unidades[unidadActiva];
  // La placa conserva el bloqueo mientras está abierta. Solo el botón Cerrar
  // libera esta hoja para que empiece la siguiente solicitud.
  if (u.fase == FASE_ESPERA_ABIERTA) return;
  if (u.fase != FASE_ABRIENDO && u.fase != FASE_CERRANDO) return;
  if (u.posicion != P_MOVIENDO) return;
  if ((millis() - u.ultimoPaso) < PASO_MS) return;

  uint8_t objetivo = (u.posicionObjetivo == P_ABIERTA) ? u.anguloAbierto
                                                       : u.anguloCerrado;

  // Al cerrar: frente a obstáculo, detenerse
  if (u.fase == FASE_CERRANDO && u.pinIR != PIN_NO_INSTALADO &&
      (millis() - u.ultimoIR) >= IR_MS) {
    u.ultimoIR = millis();
    u.irLectura = digitalRead(u.pinIR);
    if (u.irLectura == IR_DETECTA_NIVEL) {
      u.posicion = P_OBSTACULO;          // se detiene donde está ahora
      u.fase = FASE_DETENIDA;
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
    if (u.fase == FASE_ABRIENDO) {
      u.posicion = P_ABIERTA;
      u.fase = FASE_ESPERA_ABIERTA;
      Serial.print(F("[SECUENCIA] abierta; esperando cierre manual: "));
      Serial.println(u.nombre);
      syncloud(u);
    } else {
      u.posicion = P_CERRADA;
      u.fase = FASE_REPOSO;
      u.ciclos++;                        // ciclo = una apertura + un cierre
      guardarCiclos(u);
      Serial.print(u.nombre);
      Serial.print(" -> CERRADA. Ciclos: ");
      Serial.println(u.ciclos);
      syncloud(u);
      unidadActiva = SIN_UNIDAD;
    }
  }
}

// ------------------------------------------------------------------
// CALLBACKS DE LOS BOTONES DE LA APP
// Blynk exige una función propia por Virtual Pin, no se pueden agrupar.
// ------------------------------------------------------------------
BLYNK_WRITE(V1) { ejecutarControl(unidades[0], param[0].asInt()); }
BLYNK_WRITE(V2) { ejecutarControl(unidades[1], param[0].asInt()); }
BLYNK_WRITE(V3) { ejecutarControl(unidades[2], param[0].asInt()); }
BLYNK_WRITE(V4) { ejecutarControl(unidades[3], param[0].asInt()); }

// Se dispara cada vez que la placa logra (re)conectarse con Blynk, así que
// es el momento exacto de refrescar los 16 datastreams en la app.
BLYNK_CONNECTED() {
  Serial.println(F("[BLYNK] conectado. Publicando estado de 4 unidades activas."));
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

  const int lcdEstado = lcd.begin(LCD_COLUMNAS, LCD_FILAS);
  if (lcdEstado == 0) {
    lcd.backlight();
    lcd.clear();
    lcdDisponible = true;
    lcdColumna = LCD_COLUMNAS;
    lcdUltimoPaso = millis();
    Serial.println(F("[LCD] SaturnTech / SmartHouse listo"));
  } else {
    Serial.print(F("[LCD] No se pudo iniciar. Codigo: "));
    Serial.println(lcdEstado);
  }

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

  // config() solo guarda el token y la dirección del servidor: NO intenta
  // conectarse. La conexión la va haciendo Blynk.run() en segundo plano.
  Blynk.config(BLYNK_AUTH_TOKEN);
  intentarRed();
  Serial.println(F("Esperando WiFi y Blynk..."));
}

void loop() {
  Blynk.run();
  mantenerConexion();

  for (size_t i = 0; i < NUM_UNIDADES; i++) manejarReed(unidades[i]);
  manejarMovimiento();

  actualizarAnimacionLCD();
}

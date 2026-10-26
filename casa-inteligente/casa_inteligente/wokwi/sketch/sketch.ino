/*
 * Casa Inteligente IoT - VERSION DE PRUEBA LOCAL (sin nube)
 * Para Wokwi con Arduino Uno R3. Misma logica que el firmware real,
 * pero el control se hace por comandos en el Monitor Serie:
 *
 *   1  -> abrir/cerrar puerta principal
 *   2  -> abrir/cerrar puerta trasera
 *   3  -> abrir/cerrar ventana izquierda
 *   4  -> abrir/cerrar ventana derecha
 *   h  -> ayuda
 *   s  -> estado de todas las unidades
 *
 * Simulacion del sensor IR: usa los switch deslizantes SW5-SW8.
 *   Posicion IZQUIERDA = hay obstaculo (el cierre se detiene).
 *   Posicion DERECHA   = libre.
 * Simulacion del reed: SW1-SW4. Izquierda = CERRADA, Derecha = ABIERTA.
 */

#include <Servo.h>
#include <EEPROM.h>

// CONSTANTES DE AJUSTE
const unsigned long PASO_MS = 20;       // ms por paso (1°) del servo
const unsigned long DEBOUNCE_MS = 50;   // anti-rebote del reed
const unsigned long IR_MS = 25;         // frecuencia de lectura del IR al cerrar
const bool IR_DETECTA_NIVEL = LOW;      // LOW = hay obstaculo (si tu modulo lee al reves, usa HIGH)

// Estados de posicion
const uint8_t P_CERRADA = 0;
const uint8_t P_ABIERTA = 1;
const uint8_t P_OBSTACULO = 2;          // se detuvo por obstaculo
const uint8_t P_MOVIENDO = 3;

struct Unidad {
  const char* nombre;
  uint8_t pinServo;
  uint8_t pinReed;
  uint8_t pinIR;
  uint8_t anguloAbierto;    // angulo del servo cuando queda ABIERTA
  uint8_t anguloCerrado;    // angulo del servo cuando queda CERRADA
  uint8_t eepromCiclos;     // direccion EEPROM (2 bytes) de su contador

  Servo servo;
  uint8_t posicion;               // CERRADA al iniciar (0)
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
  { "puerta_principal",   9, 2, 8,  180, 0, 0 },
  { "puerta_trasera",     10, 3, 11, 180, 0, 2 },
  { "ventana_izquierda",  5,  4, 12, 0,   180, 4 },
  { "ventana_derecha",    6,  7, 13, 0,   180, 6 },
};
const size_t NUM_UNIDADES = sizeof(unidades) / sizeof(unidades[0]);

const char* nombreEstado(uint8_t pos) {
  switch (pos) {
    case P_CERRADA:   return "CERRADA";
    case P_ABIERTA:   return "ABIERTA";
    case P_OBSTACULO: return "DETENIDA (obstaculo)";
    case P_MOVIENDO:  return "MOVIENDO";
  }
  return "?";
}

void cargarCiclos(Unidad& u) {
  u.ciclos = (uint16_t)(EEPROM.read(u.eepromCiclos) << 8) | EEPROM.read(u.eepromCiclos + 1);
}

void guardarCiclos(Unidad& u) {
  EEPROM.update(u.eepromCiclos, u.ciclos >> 8);
  EEPROM.update(u.eepromCiclos + 1, u.ciclos & 0xFF);
}

void ejecutarControl(Unidad& u) {
  if (u.posicion == P_MOVIENDO) return;

  u.posicionObjetivo = (u.posicion == P_ABIERTA) ? P_CERRADA : P_ABIERTA;
  u.posicion = P_MOVIENDO;
  u.ultimoPaso = millis();
  if (u.posicionObjetivo == P_CERRADA) u.ultimoIR = millis();
}

// Anti-rebote del reed. El reed es la fuente de verdad: si mueves el switch
// a mano, la posicion y el servo se rearriman a la realidad.
void manejarReed(Unidad& u) {
  int lectura = digitalRead(u.pinReed);
  if (lectura != u.reedAnterior) u.ultimoReed = millis();
  u.reedAnterior = lectura;

  if ((millis() - u.ultimoReed) <= DEBOUNCE_MS) return;  // aun rebotando
  if (lectura == u.reedEstable) return;                  // no cambio nada
  u.reedEstable = lectura;

  // Mientras el servo se mueve, el iman pasa por delante del reed y dispararia
  // cambios falsos a mitad del recorrido. Se ignora hasta que termine.
  if (u.posicion == P_MOVIENDO) return;

  uint8_t nueva = (lectura == LOW) ? P_CERRADA : P_ABIERTA;
  if (nueva == u.posicion) return;

  u.posicion = nueva;
  u.anguloActual = (nueva == P_ABIERTA) ? u.anguloAbierto : u.anguloCerrado;
  u.servo.write(u.anguloActual);      // recoloca el brazo tras el movimiento a mano

  Serial.print(u.nombre);
  if (nueva == P_CERRADA) {
    Serial.print(" -> CERRADA (reed). Ciclos: ");
    u.ciclos++;
    guardarCiclos(u);
    Serial.println(u.ciclos);
  } else {
    Serial.println(" -> ABIERTA (reed)");
  }
}

void manejarMovimiento(Unidad& u) {
  if (u.posicion != P_MOVIENDO) return;
  if ((millis() - u.ultimoPaso) < PASO_MS) return;

  uint8_t objetivo = (u.posicionObjetivo == P_ABIERTA) ? u.anguloAbierto : u.anguloCerrado;

  // Al cerrar: frente a obstaculo, detenerse
  if (u.posicionObjetivo == P_CERRADA && (millis() - u.ultimoIR) >= IR_MS) {
    u.ultimoIR = millis();
    u.irLectura = digitalRead(u.pinIR);
    if (u.irLectura == IR_DETECTA_NIVEL) {
      u.posicion = P_OBSTACULO;
      Serial.print(u.nombre);
      Serial.println(" -> se detuvo por OBSTACULO");
      return;
    }
  }

  int dir = (objetivo > u.anguloActual) ? 1 : -1;
  u.anguloActual += dir;
  u.servo.write(u.anguloActual);
  u.ultimoPaso = millis();

  if (u.anguloActual == objetivo) {
    u.posicion = u.posicionObjetivo;
    if (u.posicion == P_CERRADA) {
      u.ciclos++;                       // ciclo = una apertura + un cierre
      guardarCiclos(u);
      Serial.print(u.nombre);
      Serial.print(" -> CERRADA. Ciclos: ");
      Serial.println(u.ciclos);
    }
  }
}

void imprimirAyuda() {
  Serial.println(F("--- Comandos ---"));
  Serial.println(F("  1 puerta principal | 2 puerta trasera"));
  Serial.println(F("  3 ventana izq     | 4 ventana der"));
  Serial.println(F("  s estado | h ayuda"));
}

void imprimirEstado() {
  for (size_t i = 0; i < NUM_UNIDADES; i++) {
    Unidad& u = unidades[i];
    Serial.print(u.nombre);
    Serial.print(": ");
    Serial.print(nombreEstado(u.posicion));
    Serial.print("  ciclos=");
    Serial.println(u.ciclos);
  }
}

void manejarSerial() {
  while (Serial.available()) {
    switch (Serial.read()) {
      case '1': ejecutarControl(unidades[0]); break;
      case '2': ejecutarControl(unidades[1]); break;
      case '3': ejecutarControl(unidades[2]); break;
      case '4': ejecutarControl(unidades[3]); break;
      case 'h': case 'H': imprimirAyuda(); break;
      case 's': case 'S': imprimirEstado(); break;
    }
  }
}

void setup() {
  Serial.begin(9600);
  delay(500);
  Serial.println(F("=== Casa Inteligente (Wokwi) ==="));

  for (size_t i = 0; i < NUM_UNIDADES; i++) {
    Unidad& u = unidades[i];
    pinMode(u.pinReed, INPUT_PULLUP);
    pinMode(u.pinIR, INPUT);
    u.servo.attach(u.pinServo);
    cargarCiclos(u);

    // Al arrancar no suponemos "cerrado": leemos el reed, porque si la
    // maqueta quedo abierta desde la ultima vez hay que decirlo ya.
    int r = digitalRead(u.pinReed);
    u.reedAnterior = r;
    u.reedEstable = r;
    u.posicion = (r == LOW) ? P_CERRADA : P_ABIERTA;
    u.anguloActual = (r == LOW) ? u.anguloCerrado : u.anguloAbierto;
    u.servo.write(u.anguloActual);

    Serial.print(u.nombre);
    Serial.print(" en ");
    Serial.print(u.posicion == P_ABIERTA ? "ABIERTA" : "CERRADA");
    Serial.print(". Ciclos: ");
    Serial.println(u.ciclos);
  }
  imprimirAyuda();
}

void loop() {
  manejarSerial();

  for (size_t i = 0; i < NUM_UNIDADES; i++) {
    manejarReed(unidades[i]);
    manejarMovimiento(unidades[i]);
  }
}
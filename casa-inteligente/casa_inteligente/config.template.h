// config.h — CREDENCIALES DE BLYNK Y DEL WIFI
//
// NO SUBAS ESTE ARCHIVO A GITHUB NI LO COMPARTAS: contiene tu clave de red
// y el token de tu dispositivo.
//
// USO:
//   1. Copia este archivo como  config.h  (queda junto al .ino).
//   2. Reemplaza los 3 valores marcados abajo.
//   3. El .ino ya incluye "config.h": no hay que tocarlo.
//
// IMPORTANTE: el .ino incluye este archivo ANTES que a la librería Blynk,
// y por eso importa. Si por algún motivo lo moveras después, la
// compilación falla con:
//   "Please specify your BLYNK_TEMPLATE_ID and BLYNK_TEMPLATE_NAME"
//
// Si compilas desde el IDE de Arduino y el .ino y config.h están en la misma
// carpeta, funciona directo. Si usas otra carpeta, agrégala en
// Sketch > Incluir biblioteca > Agregar .h de sketch.

#ifndef CONFIG_H
#define CONFIG_H

// ------------------------------------------------------------------
// 1-2. PLANTILLA — blynk.io → Templates → tu plantilla
//      BLYNK_TEMPLATE_ID   sale en la URL al abrir la plantilla
//      BLYNK_TEMPLATE_NAME es el nombre que le pusiste
//      OJO: la librería NO compila si faltan estas dos.
// ------------------------------------------------------------------

#define BLYNK_TEMPLATE_ID   "PEGA_AQUI_EL_TEMPLATE_ID"
#define BLYNK_TEMPLATE_NAME "Casa Inteligente"

// ------------------------------------------------------------------
// 3. AUTH TOKEN — blynk.io → Devices → tu dispositivo → AUTH TOKEN
//    OJO: es el token del DISPOSITIVO, no el de la plantilla.
//    Si se confunden, el sketch avisa "TOKEN INVALIDO" por el Monitor Serie.
// ------------------------------------------------------------------

#define BLYNK_AUTH_TOKEN "PEGA_AQUI_TU_AUTH_TOKEN"

// ------------------------------------------------------------------
// 4. REDES WIFI
//
// OJO: el Uno R4 WiFi SOLO habla 2.4 GHz. Si tu red es "5G" o usa
// únicamente 5 GHz, la placa nunca se va a conectar. En un router de doble
// banda eso significa usar el nombre de la banda de 2.4 GHz.
//
// Acá van hasta las que quieras: el firmware las prueba EN ORDEN y se
// queda con la primera que alcance, así que el mismo sketch sirve en casa
// y en la feria sin recompilar. Para agregar una, quitá la "//" de la
// línea y completala. NO hace falta tocar nada más.
//
// OJO con la clave: si la red pide solo un pin o no tiene clave, poné ""
// entre las comillas.
// ------------------------------------------------------------------

struct RedWiFi {
  const char* ssid;
  const char* pass;
};

const RedWiFi redes[] = {
  // Red 1: casa. La de 2.4 GHz, NO la "5G".
  { "TU_RED_2.4GHZ", "TU_CLAVE" },

  // Red 2: descomentar y completar ANTES de la feria para que entre
  // sola. Lo más seguro es el hotspot del celu de un compañero: no tiene
  // portal cautivo. La red de la institución suele tener portal (tenés que
  // abrir el navegador y loguearte) y con eso la placa NO llega a Blynk.
  // { "NOMBRE_DE_LA_RED", "CLAVE" },
};
const int TOTAL_REDES = (int)(sizeof(redes) / sizeof(redes[0]));

#endif

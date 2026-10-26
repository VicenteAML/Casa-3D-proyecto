# Lista de Materiales (BOM) — Casa Inteligente IoT

Cantidades y precios en CLP (IVA incluido).
**REAL** = precio confirmado en mechatronicstore.cl. **EST** = estimado, verificar antes de comprar.

| # | Componente | Cant. | Precio unit. | Subtotal | Estado | Enlace |
|---|------------|------:|------------:|---------:|--------|--------|
| 1 | Atmel/Arduino Uno R4 WiFi | 1 | ~$27.990 | ~$27.990 | EST (verifica en tienda, es la placa original cara; el clon Uno R3 sale ~$7.890) | — |
| 2 | Servomotor SG90 180° | 4 | $3.490 | $13.960 | REAL | [SG90](https://www.mechatronicstore.cl/servomotor-sg90-servo/) |
| 3 | Sensor de proximidad IR HW-201 | 4 | $1.490 | $5.960 | REAL | [HW-201](https://www.mechatronicstore.cl/sensor-de-proximidad-infrarrojo-detector-de-obstaculos/) |
| 4 | Sensor magnético puerta/ventana MC-38 | 4 | $2.800 | $11.200 | REAL | [MC-38](https://www.mechatronicstore.cl/sensor-magnetico-puerta-ventana/) |
| 5 | Protoboard 830 puntos | 1 | ~$3.990 | ~$3.990 | EST | — |
| 6 | Cables jumper M-M (pack ~65) | 1 | ~$2.000 | ~$2.000 | EST | — |
| 7 | Cables jumper M-F (pack ~40, para sensores) | 1 | ~$1.500 | ~$1.500 | EST | — |
| 8 | Resistencias 10kΩ (solo repuesto/seguridad) | pack | ~$1.000 | ~$1.000 | EST | — |
| 9 | Condensador electrolítico 100–470 µF | 1 | ~$500 | ~$500 | EST | — |
| 10 | Fuente de poder servos: adaptador 5V/2A (o 4xAA) | 1 | ~$6.000 | ~$6.000 | EST | — |
| 11 | Cable USB-C + banco de energía/cargador para el Arduino | 1 | ~$2.000 | ~$2.000 | EST (si ya tienen cargador, $0) | — |

## Total hardware estimado

**~$76.100 CLP** aprox. (los componentes de MechatronicStore son $31.120; faltan la placa, protoboard, cables y alimentación).

Compra sobre $19.990 → **envío gratis** en MechatronicStore (la superas de sobra).

## Opcional para la maqueta física

| Ítem | Costo aprox. |
|------|-------------:|
| Cartón piedra / mica / madera balsa para la casa | ~$3.000–5.000 |
| Silicona caliente + pistola (o cinta doble faz) | ~$3.000 |
| Tornillos/largueros para brazo del servo | ~$1.000 |

## Notas importantes de compra

1. **El servos NO van a los 5V del Arduino.** Necesitan su propia fuente 5V (≥2A recomendado, 3A si pueden). El pin 5V del Arduino solo para la lógica y los sensores IR.
2. Los 4 SG90 vienen con sus brazos/cierres y tornillos — no falta nada para el montaje.
3. El MC-38 trae cable de 25 cm y cinta autoadherible. El HW-201 ya trae su placa con potenciómetro.
4. Resistores: **no son necesarios** porque usaremos `INPUT_PULLUP` interno (excepto si quieren LEDs indicadores o pull-up extra por ruido).
5. El Uno R4 WiFi se puede alimentar por su conector USB-C; es lo más simple para la feria.
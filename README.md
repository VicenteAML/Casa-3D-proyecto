# Casa automatizada en 3D

Maqueta virtual interactiva de una casa automatizada, desarrollada con React, Vite y Three.js mediante React Three Fiber.

Permite recorrer la casa desde distintos ángulos, abrir y cerrar dos puertas y dos ventanas laterales, y visualizar una representación de los servomotores, el Arduino UNO R4, la protoboard y su cableado.

> Es una simulación visual: no controla un Arduino real ni sustituye un plano de conexiones eléctricas.

## Requisitos

- **Node.js LTS**, disponible en [nodejs.org](https://nodejs.org/). Se recomienda Node.js 24 LTS; si se usa Node.js 22, debe ser la versión 22.12 o posterior.
- **npm**, incluido con Node.js.
- Un navegador actualizado con soporte para WebGL.
- Conexión a Internet para descargar el proyecto y sus dependencias.

No es obligatorio instalar Visual Studio Code para ejecutar el proyecto.

## Instalación en otro computador

1. Instala Node.js y abre una nueva terminal. Comprueba la instalación:

   ```bash
   node -v
   npm -v
   ```

2. Descarga el repositorio desde **Code → Download ZIP** en GitHub y descomprímelo, o clónalo con Git si ya lo tienes instalado.

3. Abre una terminal en la carpeta que contiene **`package.json`**. Si el proyecto está dentro de una subcarpeta llamada `escena-3d`, entra con:

   ```bash
   cd escena-3d
   ```

4. Instala las dependencias:

   ```bash
   npm install
   ```

5. Inicia el servidor local:

   ```bash
   npm run dev
   ```

6. Abre la dirección indicada junto a **Local** en la terminal. Normalmente será:

   ```text
   http://localhost:5173/
   ```

Mantén la terminal abierta mientras utilizas la aplicación. Para detenerla, pulsa **Ctrl + C**.

## Controles

| Acción | Control |
|---|---|
| Girar la cámara | Botón izquierdo del ratón y arrastrar |
| Acercar o alejar | Rueda del ratón |
| Desplazar la vista | Botón derecho del ratón y arrastrar |
| Accionar puertas y ventanas | Botones del panel de control |
| Ver el interior | Botón para ocultar el techo |
| Mostrar u ocultar el cableado y las placas | Botón de electrónica |

## Otros comandos

```bash
npm run build
```

Genera la versión de producción en la carpeta `dist`.

```bash
npm run preview
```

Permite revisar localmente esa versión después de generarla.

## Problemas frecuentes

- **Error `ENOENT` o no encuentra `package.json`:** la terminal está en la carpeta incorrecta. Entra en la que contiene ese archivo.
- **El navegador no puede acceder al sitio:** ejecuta `npm run dev` y utiliza la dirección que muestre la terminal; el puerto puede cambiar.
- **`node` o `npm` no se reconoce:** instala Node.js y vuelve a abrir la terminal o VS Code.

> Subir el código a GitHub no publica automáticamente la aplicación. `localhost` solo funciona en el computador donde se está ejecutando el servidor.

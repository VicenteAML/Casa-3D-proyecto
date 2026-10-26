# Activar el acceso protegido a Firestore

La web usa Firestore REST. Para que siga guardando y mostrando el historial con reglas protegidas, primero debe iniciar sesión con Firebase Authentication.

## 1. Habilitar correo y contraseña

1. Abre Firebase Console y selecciona el proyecto `casa-inteligente`.
2. Ve a **Authentication** y selecciona **Get started** si aparece.
3. Abre **Sign-in method** y habilita **Email/Password**. Guarda los cambios.
4. En **Users**, crea el usuario de la aplicación. El UID de esa cuenta debe ser `tObszVM0VwNvHMh5CZAmvFWnGPq1`.

## 2. Iniciar sesión en la web

1. Abre la aplicación y entra a **Ajustes**.
2. En **Base de datos (Firestore)** guarda el `projectId` y la `apiKey` de la aplicación web del mismo proyecto Firebase.
3. En **Acceso seguro a Firestore**, escribe el correo y la contraseña del usuario creado y pulsa **Iniciar sesión**.
4. Pulsa **Probar conexión**. La app debe indicar que Firestore responde bien.

La app no guarda la contraseña. La sesión se conserva solo en la pestaña actual del navegador; cada dispositivo debe iniciar sesión por separado. El QR de la app no transfiere esta sesión.

## 3. Publicar las reglas

Cuando Authentication esté habilitado y la web tenga el inicio de sesión actualizado:

1. En Firebase Console ve a **Firestore Database → Rules**.
2. Reemplaza el contenido por el archivo `firestore.rules` de esta carpeta.
3. Pulsa **Publish**.
4. Vuelve a la app, inicia sesión y usa **Probar conexión**.

Las reglas permiten leer eventos y crear/actualizar documentos válidos en `eventos` solo al UID autorizado. Deniegan borrar eventos y deniegan acceso a las demás colecciones.

**No publiques la regla anterior en modo abierto ni extiendas su fecha de vencimiento.** Si las credenciales o los datos de inicio no coinciden, la app mostrará un error de autenticación o permisos.

# Business Manager API

API RESTful construida con Node.js y Express para dar soporte a la aplicación Business Manager. Maneja la autenticación, base de datos y lógica de negocio.

## Tecnologías Principales

- **Backend:** Node.js, Express
- **Base de datos:** MongoDB (Mongoose)
- **Autenticación:** JWT, Google Auth Library, speakeasy (2FA)
- **Seguridad:** Helmet, express-rate-limit, cors, xss-clean y express-mongo-sanitize
- **Otros:** groq-sdk, nodemailer para correos, pdfkit

## Instalación y uso local

1. Instala las dependencias:
   ```bash
   npm install
   ```

2. Crea un archivo `.env` en la raíz del proyecto. Deberás configurar:
   - Cadena de conexión a MongoDB (`MONGO_URI` o similar).
   - Secretos para JWT y configuración de Nodemailer.
   - Resto de credenciales de terceros.

3. Inicia el servidor en modo desarrollo:
   ```bash
   npm run dev
   ```
   El servidor normalmente escuchará en el puerto especificado en tu archivo `.env`.

## Prácticas de seguridad aplicadas

La API incluye limitadores de peticiones (rate limiting) para prevenir ataques de fuerza bruta, sanitización contra inyecciones NoSQL y XSS, además de los headers de seguridad configurados vía Helmet.

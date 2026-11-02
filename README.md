# Sonora

Sonora es una experiencia musical en español inspirada en el proyecto OpenTune. Incluye una interfaz web adaptable y una aplicación Android que muestra el mismo reproductor de forma local. No usa el nombre, la marca ni contenido de Spotify.

## Qué incluye

- Búsqueda de canciones y artistas, listas, biblioteca y favoritos guardados en el dispositivo.
- Reproducción de demostración sintetizada al pulsar reproducir; no se descargan ni transmiten grabaciones comerciales.
- Controles de reproducción, mezcla, repetición, posición y volumen.
- Interfaz adaptable e instalación como PWA en navegadores compatibles.
- Contenedor Android que carga la experiencia desde sus propios recursos, sin permisos de red.

## Probar la app web

Sirve la raíz del repositorio con cualquier servidor web estático y abre `http://localhost:8000`. Por ejemplo:

```bash
python -m http.server 8000
```

La app también funciona sin conexión después de la primera carga cuando se sirve desde HTTPS o `localhost`.

## Crear el APK de Android

Requisitos: JDK 17, Android SDK con API 35 y Gradle 8.7. Desde la raíz del repositorio:

```bash
cd android
gradle assembleDebug
```

El APK de depuración se crea en `android/app/build/outputs/apk/debug/app-debug.apk`. Gradle copia automáticamente los archivos web actuales al paquete Android antes de compilar.

También puedes ejecutar el workflow **Build Sonora APK** desde la pestaña **Actions** de GitHub. Este genera el mismo APK como artefacto descargable durante 14 días. El APK de depuración es para pruebas; antes de distribuir una versión pública, crea y protege una clave de firma y genera una compilación de lanzamiento.

## Estructura

- `index.html`, `css/sonora.css`, `js/sonora.js`: app web y reproductor.
- `manifest.webmanifest`, `sw.js`: instalación PWA y caché sin conexión.
- `android/`: aplicación Android basada en WebView y sus recursos locales.
- `android/app/src/main/assets/www/`: archivos web copiados durante la compilación, no es la fuente editable.

Los documentos y páginas de idiomas heredados del sitio original permanecen en el repositorio, pero la página de entrada es Sonora.

## Licencia

El repositorio conserva la licencia GPL-3.0 indicada en [LICENSE](./LICENSE).

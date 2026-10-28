# rocket-league-scoreboard

Marcador en directo para Rocket League, pensado para tenerlo abierto en una segunda pantalla mientras juegas. Muestra algo parecido a la tabla que sale al pulsar Tab, con algunos datos extra, y se actualiza en tiempo real.

Lee la [Stats API oficial de Rocket League](https://www.rocketleague.com/developer/stats-api), un socket local que abre el propio juego. No hay servidor ni cuenta: la página se conecta directamente al juego en tu PC.

> Proyecto no oficial. No está afiliado, patrocinado ni respaldado por Psyonix ni por Epic Games. Rocket League es una marca de Psyonix LLC.

## Qué muestra

- **Marcador**: nombre y color de cada equipo (incluidos los de club), goles, reloj y prórroga, con avisos de "Repetición", "Prórroga" o "Ganador".
- **Último toque**: qué equipo tocó el balón por última vez.
- **Una tabla por equipo**, ordenada por puntos: puntos, goles, asistencias, paradas, tiros, toques, demoliciones, golpe más fuerte (km/h) y boost.
- **Jugadas**: las últimas 12 (goles con velocidad y asistente, paradas, demoliciones, larguerazos, fin del partido), con el texto tal cual lo da el juego, en su idioma.
- **"Tú"**: tu fila se resalta automáticamente.
- **Tema claro y oscuro** según el sistema, y diseño adaptable: por debajo de 1250 px de ancho, las jugadas pasan debajo de las tablas.

## Requisitos

- Rocket League en el mismo PC que el navegador.
- Un navegador actual (Chrome, Edge o Firefox).

## Activar la Stats API

La API viene desactivada. Con el juego **cerrado**, edita `TAGame\Config\TAStatsAPI.ini` en la carpeta de instalación del juego (o `DefaultStatsAPI.ini` si no existe el primero) y deja esta sección:

```ini
[TAGame.MatchStatsExporter_TA]
PacketSendRate=30
WebPort=49124
Port=0
```

- `PacketSendRate`: actualizaciones por segundo (máximo 120). `0` desactiva la API. Con 30 hay de sobra.
- `WebPort`: puerto del WebSocket al que se conecta el panel.
- `Port=0`: cierra el socket TCP (49123 por defecto) que el juego abre además del WebSocket. El panel no lo usa.

Cualquier cambio exige reiniciar el juego.

## Uso

1. Descarga el repositorio (botón **Code → Download ZIP**) y descomprímelo.
2. Abre `index.html` con doble clic. No hace falta instalar nada.
3. Abre el juego y entra en una partida. El panel se conecta solo y, si el juego no está abierto, lo reintenta cada 2 segundos.

Para verlo en un stream, añade `index.html` en OBS como **fuente de navegador** con la opción de archivo local.

### Parámetros de URL

| Parámetro | Qué hace |
|---|---|
| `?demo` | Arranca en modo demo, con una partida simulada. |
| `?me=Nombre` | Fija quién eres y desactiva la detección automática. |
| `?port=49124` | Usa otro puerto si has cambiado `WebPort`. |

Se combinan con `&`, por ejemplo `index.html?demo&me=Kaiser`.

### Modo demo

El botón **Modo demo** simula una partida 3v3 para ver el panel sin el juego abierto. Los datos tienen la misma forma que los reales.

### Grabar un registro

**Grabar registro** guarda en memoria todo lo que manda el juego y **Descargar registro** lo exporta como JSON (`rl-log-<fecha>.json`), con un campo `t` (hora local en ms) en cada mensaje. Sirve para analizar partidas o depurar el panel.

- Está apagado por defecto. Empezar una grabación nueva descarta la anterior.
- Para un máximo de 60.000 mensajes, unos 33 minutos a 30 actualizaciones por segundo.
- El equipamiento de cada jugador solo se guarda la primera vez, porque es lo que más ocupa.
- **El registro incluye los nombres y los ID de plataforma (Steam, Epic, PlayStation, Xbox) de todos los jugadores de la partida.** Ten cuidado si lo compartes.

## Qué datos da el juego

Algunos comportamientos de la API no coinciden con su documentación. Esto es lo que se ha comprobado con partidas reales, y explica lo que verás en el panel:

- **Boost**: online solo llega el de tu equipo. El de los rivales llega únicamente durante las repeticiones de gol; el resto del tiempo el panel muestra "—" (sin dato).
- **Velocidades**: llegan en km/h, aunque la documentación dice unidades del juego por segundo.
- **Sin rango ni MMR**: la API no los envía.
- **Idioma**: los nombres de equipo sin club y los textos de las jugadas llegan en el idioma del juego.
- **Quién eres**: se deduce del jugador al que sigue la cámara al empezar cada partida. Si estás espectando o la detección falla, usa `?me=`.

## Seguridad

La Stats API **no tiene autenticación** y, además de enviar datos, **acepta comandos** (pausar, cambiar la cámara, ocultar el HUD, controlar repeticiones).

- **No abras nunca el puerto 49124 (ni el 49123) a Internet** ni lo redirijas en el router.
- Un WebSocket no tiene las restricciones de origen de otras peticiones: mientras el juego esté abierto con la API activada, cualquier página web que tengas abierta en el navegador podría conectarse a él. Si no vas a usar el panel, desactiva la API con `PacketSendRate=0`.

## Estructura

```
index.html   estructura de la página
styles.css   estilos
app.js       conexión con el juego, estado, render y modo demo
```

Sin dependencias ni proceso de build. Las únicas peticiones externas son las fuentes Barlow y Barlow Condensed de Google Fonts, con fuentes del sistema de respaldo.

## Licencia

[MIT](LICENSE).

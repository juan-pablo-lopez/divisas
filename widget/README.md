# Widget de iOS (Scriptable)

Widget de pantalla de inicio que muestra los tipos de cambio desde el mismo
Worker (`mercado-divisas`) que usa la PWA.

## Instalación

1. Instala **Scriptable** (gratis) desde la App Store.
2. Abre Scriptable → toca **+** (nuevo script) → **pega** todo el contenido de
   [`divisas-widget.js`](./divisas-widget.js) → nómbralo **"Divisas"** y guarda.
   - Alternativa: copia `divisas-widget.js` a la carpeta `iCloud Drive/Scriptable/`
     y aparecerá solo en la app.
3. En la pantalla de inicio: mantén pulsado → **+** → busca **Scriptable** →
   elige el tamaño (pequeño / mediano / grande) → **Agregar widget**.
4. Mantén pulsado el widget recién agregado → **Editar widget**:
   - **Script**: `Divisas`
   - **Parameter** (opcional): sobreescribe la config sin editar el script (ver
     abajo). Vacío = usa los valores del bloque `CONFIG`.

## Parametrizar desde el widget (sin editar el script)

El campo **Parameter** de "Editar widget" acepta dos formas. Así puedes tener
**varios widgets, cada uno con su propia config**, con un solo script.

- **Solo la base**: un código de 3 letras. Ej.: `USD`
- **Config completa**: pares `clave=valor` separados por espacios. Ej.:

  ```
  base=USD monto=500 dir=inv monedas=EUR,MXN,GBP
  ```

  | Clave | Valor | Ejemplo |
  |---|---|---|
  | `base` | código de 3 letras | `base=EUR` |
  | `monto` | número | `monto=500` |
  | `dir` | `inv` / `inversa` / `listaABase` = Lista→Base; cualquier otra = Base→Lista | `dir=inv` |
  | `monedas` | códigos separados por coma | `monedas=USD,EUR,RSD` |

  Lo que no incluyas en el Parameter usa el valor del `CONFIG` del script.

## Configuración (valores por defecto)

Edita el bloque `CONFIG` al inicio de `divisas-widget.js` para cambiar los
valores por defecto (los que se usan cuando el Parameter está vacío):

| Campo | Descripción |
|---|---|
| `base` | Moneda base (default `MXN`). También sobreescribible por el *Parameter* del widget. |
| `monedas` | Lista de monedas a mostrar. |
| `monto` | Cantidad base de la conversión. |
| `direccion` | `"baseALista"` (con `monto` de la base, cuánto compras) o `"listaABase"` (cuántas unidades de la base cuestan `monto` de cada moneda). |
| `apiBase` | URL del Worker. Ya apunta a `https://mercado-divisas.tgojp.workers.dev`. |

## Notas

- **Refresco**: iOS decide cuándo actualizar los widgets; el script sugiere
  refrescar tras la próxima publicación del proveedor (`refreshAfterDate`). No hay
  refresco manual real en un widget de iOS.
- **Sin conexión**: guarda el último resultado en un archivo local y lo muestra
  con el aviso `⚠︎ sin conexión` si no puede alcanzar el Worker.
- **Filas por tamaño**: pequeño 3, mediano 5, grande hasta 12 monedas.
- El widget no está sujeto a CORS (las peticiones son nativas, no del navegador).

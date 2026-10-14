# Seguridad del Cloud Sync

## El problema (P0)

La versión anterior del sync era insegura:

- **ID adivinable** — `cloudId` se generaba como `user_<timestamp>_<random>`. El
  timestamp delataba cuándo se creó y el resto era muy corto, así que un atacante
  podía *enumerar* IDs y leer/escribir datos de salud de otros usuarios.
- **"Token encriptado" falso** — `getSyncToken()` era `btoa(JSON)`: solo Base64 del
  ID, sin cifrar, sin firmar y sin expiración.
- **Sin reglas efectivas** — si las reglas de Firebase Realtime Database estaban
  abiertas, cualquier persona con el URL podía leer `users/*`.
- **`syncDown` sobrescribía todo lo local** sin confirmación.

## Qué se cambió en el código

- **`cloudId` criptográfico** — 128 bits de `crypto.getRandomValues()` (32 hex).
  No es enumerable. Los IDs antiguos (`user_...`) se migran automáticamente.
- **Token = capability con expiración** — el código ahora lleva `{v, id, exp}` y
  caduca en 7 días. Se documenta honestamente como un *código* que otorga acceso,
  no como "encriptado". Trátalo como una contraseña.
- **Guardia de sobrescritura** — `syncDown` pide confirmación antes de reemplazar
  datos locales existentes.
- **Auth anónimo opcional** — se intenta `signInAnonymously()`; si está habilitado,
  las reglas pueden exigir `auth != null`. Si no, el sync sigue funcionando por
  código (nunca lanza error).
- **compId de competición seguro** — los nuevos usan `comp_` + 128 bits aleatorios
  en lugar de `comp_<timestamp>` (que era enumerable). Las reglas ahora también
  cubren `competitions/*`.

## Lo que DEBES hacer tú (no se puede desde el código)

Las reglas de seguridad viven en **Firebase**, no en este repo. Para cerrar el
agujero P0 de verdad:

1. **Habilita Auth anónimo**: consola de Firebase → *Authentication → Sign-in
   method → Anonymous → Enable*.
2. **Despliega las reglas** de [database.rules.json](database.rules.json):

   ```bash
   firebase deploy --only database
   ```

   Estas reglas exigen que quien toque `users/*` esté autenticado (`auth != null`).
   Combinado con el ID inadivinable, eso impide el scraping anónimo masivo.

3. **Limpia los IDs antiguos** (opcional): los `users/user_<timestamp>_...`
   quedaron huérfanos al migrar. Puedes borrarlos a mano en la consola.

> **Importante**: si despliegas `auth != null` **sin** habilitar Auth anónimo, el
> sync dejará de funcionar (permiso denegado). Activa el paso 1 antes del paso 2.

## Alternativa más fuerte (por cuenta)

El modelo anterior es *capability* (quien tiene el código, accede). La opción más
fuerte es **por usuario**: guardar en `users/$uid` y usar reglas
`"$uid": { ".read": "auth != null && auth.uid === $uid", ".write": "... " }`.
Eso exige cuentas reales (email/Google) y **elimina el enlace por código** (cada
dispositivo tendría su propio `auth.uid`). Es la opción correcta si quieres
aislamiento real por cuenta; cambia la UX de sincronización.## Modelo de competiciones

Los datos de competiciones (`competitions/<compId>/dailyStats/...`) contienen
nombre + volumen/racha diarios de cada miembro. Antes el `compId` era
`comp_<timestamp>` (enumerable) y las reglas no lo cubrían: cualquiera podía
leer o escribir en una competición adivinando el ID.

Se corrigió:
- Los `compId` **nuevos** son aleatorios e inadivinables.
- `database.rules.json` ahora exige `auth != null` también en `competitions/*`.

> **Aviso**: las competiciones **creadas antes** de este cambio conservan su ID
> `comp_<timestamp>` enumerable (migrarlas rompería el enlace con los miembros que
> ya tienen ese ID). Son de severidad baja (solo agregados de entrenamiento diario).
> Si quieres cerrarlas, recrea la competición con el código nuevo.

### Bug funcional detectado (no es de seguridad)

`Storage.joinCompetition(code)` descarta el `id` del código y genera un ID nuevo
en el dispositivo que se une, así que dos miembros pueden terminar con IDs de
competición distintos y sus dailyStats no se agregan en la misma ruta de Firebase.
Es un bug de funcionalidad preexistente, aparte de la seguridad — ¿quieres que lo
arregle?

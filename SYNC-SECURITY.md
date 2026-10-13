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
aislamiento real por cuenta; cambia la UX de sincronización.

## Modelo de competiciones

Los datos de competiciones/leaderboards viven en un nodo distinto y son
deliberadamente compartidos, por lo que estas reglas (`users/*`) **no** los tocan.

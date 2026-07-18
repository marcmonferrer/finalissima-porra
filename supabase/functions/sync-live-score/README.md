# Sincronització automàtica del marcador

La funció consulta API-Football i actualitza la fila `public.partit` de Supabase.
Busca automàticament la final Espanya–Argentina del Mundial 2026 (`league=1`,
`season=2026`) i després reutilitza l'identificador del partit.

## Secrets necessaris

- `API_FOOTBALL_KEY`: clau gratuïta d'API-Sports.
- `SYNC_SECRET`: text aleatori llarg que també ha d'enviar la tasca programada
  a la capçalera `x-sync-secret`.

`SUPABASE_URL` i les claus secretes del projecte són proporcionades per
Supabase a les Edge Functions.

## Programació

Desplega la funció sense verificació JWT i programa una invocació cada dos
minuts. La funció només consulta API-Football entre les 20:50 i les 00:00,
hora de Madrid, i s'atura abans si detecta `FT`, `AET` o `PEN`. Això manté el
consum per sota de les 100 peticions diàries del pla gratuït.

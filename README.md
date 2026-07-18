# Finalíssima · Porra España–Argentina

Web responsive per gestionar i compartir una porra de 25 resultats possibles.

## Què inclou

- Quadrícula 5×5 amb Espanya a l'eix X i Argentina a l'eix Y.
- Màxim de dues caselles per participant.
- Càlcul de premis i comissió del developer.
- Seguiment de Bizums pendents i pagats.
- Marcador, minut i fase del partit compartits en directe amb Supabase.
- Sincronització automàtica opcional amb API-Football per a la final del Mundial 2026.
- Missatges preparats per compartir a WhatsApp.

## Configuració de Supabase

Les reserves utilitzen la taula `caselles`. Per activar el marcador compartit, executa
[`supabase/live-match.sql`](supabase/live-match.sql) una sola vegada al SQL Editor de
Supabase. L'script crea la fila única del partit, activa Realtime i limita les
actualitzacions a l'usuari amb `app_metadata.porra_admin = true`.

La funció [`sync-live-score`](supabase/functions/sync-live-score/) consulta el
partit cada dos minuts i actualitza la mateixa fila. El panell manual continua
disponible com a sistema de reserva.

## Publicació

El projecte està preparat per publicar-se directament amb GitHub Pages, sense procés de compilació.

# ⚽ Finalíssima Porra

Demo interactiva d’una porra digital per a un partit Espanya–Argentina, dissenyada i desenvolupada per **Marc Monferrer** amb l’ajuda de la intel·ligència artificial.

[▶️ Obrir la demo interactiva](https://marcmonferrer.github.io/finalissima-porra/)

> **Mode demostració:** no hi ha pagaments ni dades personals reals. Les dades es desen exclusivament al navegador de cada visitant i es poden reiniciar en qualsevol moment.

---

## Català

### Què pots provar

- Quadrícula interactiva de resultats 5×5.
- Selecció de fins a dues caselles per participant.
- Tres apostes especials integrades a la quadrícula.
- Càlcul automàtic del pot, els premis i la comissió del developer.
- Simulació de pagaments pendents i confirmats.
- Marcador editable amb fase i minut del partit.
- Marcatge automàtic de la casella guanyadora a la mitja part i al final.
- Confirmació manual de les apostes especials.
- Missatges preparats per compartir a WhatsApp.
- Botó per reiniciar completament la demo.

### Com utilitzar la demo

1. Escriu el nom d’un participant.
2. Selecciona una o dues caselles lliures.
3. Prem **Assignar caselles**.
4. Marca el pagament com a confirmat des de la llista de participants.
5. Utilitza els **Controls de demostració** per modificar el marcador.
6. Selecciona **Mitja part** o **Final** per comprovar el marcatge automàtic del guanyador.
7. Prem **Reiniciar demo** per tornar a l’estat inicial.

### Funcionament de les dades

La demo pública funciona amb `localStorage`:

- Cada visitant té una sessió independent.
- No s’envia cap dada a un servidor.
- No es processen pagaments reals.
- En reiniciar la demo s’eliminen totes les dades locals.

### Arquitectura original de producció

El projecte original es va construir amb:

- **HTML, CSS i JavaScript** sense framework ni procés de compilació.
- **GitHub Pages** per a la publicació.
- **Supabase Database** per a les reserves i el marcador compartit.
- **Supabase Auth** per protegir els controls de l’administrador.
- **Supabase Realtime** per sincronitzar canvis entre dispositius.
- **Supabase Edge Functions** i **API-Football** per automatitzar el marcador.
- **Supabase Cron** per executar la sincronització cada dos minuts.

El codi original connectat a Supabase es conserva a [`app.js`](app.js). La versió pública de demostració utilitza [`demo.js`](demo.js).

### Fitxers principals

| Fitxer | Funció |
|---|---|
| [`index.html`](index.html) | Interfície principal de la demo |
| [`styles.css`](styles.css) | Disseny responsive i estils visuals |
| [`demo.js`](demo.js) | Lògica local i reiniciable de la demo |
| [`app.js`](app.js) | Lògica original connectada a Supabase |
| [`supabase/live-match.sql`](supabase/live-match.sql) | Estructura del marcador compartit |
| [`supabase/functions/sync-live-score/`](supabase/functions/sync-live-score/) | Sincronització amb API-Football |
| [`supabase/schedule-live-score.sql`](supabase/schedule-live-score.sql) | Programació automàtica del marcador |

---

## English

### What you can test

- Interactive 5×5 score grid.
- Selection of up to two entries per participant.
- Three special bets integrated into the grid.
- Automatic calculation of the prize pool, payouts and developer fee.
- Simulated pending and confirmed payments.
- Editable scoreboard, match phase and minute.
- Automatic winner highlighting at half-time and full-time.
- Manual confirmation of special bets.
- Ready-to-share WhatsApp messages.
- Full demo reset button.

### How to use the demo

1. Enter a participant name.
2. Select one or two available squares.
3. Press **Assignar caselles** to assign the entries.
4. Mark the simulated payment as confirmed in the participant list.
5. Use the **Controls de demostració** panel to update the score.
6. Select **Mitja part** or **Final** to trigger automatic winner highlighting.
7. Press **Reiniciar demo** to restore the initial state.

### Demo data model

The public demo uses browser `localStorage`:

- Every visitor receives an independent session.
- No data is sent to a server.
- No real payments are processed.
- Resetting the demo removes all locally stored data.

### Original production architecture

The original project was built with:

- **HTML, CSS and JavaScript**, with no framework or build process.
- **GitHub Pages** for deployment.
- **Supabase Database** for entries and the shared scoreboard.
- **Supabase Auth** to protect administrator controls.
- **Supabase Realtime** for multi-device synchronization.
- **Supabase Edge Functions** and **API-Football** for live-score automation.
- **Supabase Cron** to run score synchronization every two minutes.

The original Supabase-connected implementation remains available in [`app.js`](app.js). The public portfolio demo runs through [`demo.js`](demo.js).

### Main files

| File | Purpose |
|---|---|
| [`index.html`](index.html) | Main demo interface |
| [`styles.css`](styles.css) | Responsive layout and visual design |
| [`demo.js`](demo.js) | Local, resettable demo logic |
| [`app.js`](app.js) | Original Supabase-connected logic |
| [`supabase/live-match.sql`](supabase/live-match.sql) | Shared scoreboard schema |
| [`supabase/functions/sync-live-score/`](supabase/functions/sync-live-score/) | API-Football synchronization |
| [`supabase/schedule-live-score.sql`](supabase/schedule-live-score.sql) | Automated score schedule |

---

## Author

**Marc Monferrer**  
AI consulting · Prototypes · Automation · Applied artificial intelligence

[LinkedIn](https://www.linkedin.com/in/marcmonferrer)

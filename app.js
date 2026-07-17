(() => {
  "use strict";

  const SUPABASE_URL = "https://hnezlrjxsbujkeupogvf.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_A_qihcL6So8YhJcMsZxxKw_50XjK59F";
  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

  const ENTRY_PRICE = 4.5;
  const POOL_PER_ENTRY = 4;
  const DEVELOPER_FEE = 0.5;
  const MATCH_STORAGE_KEY = "finalissima-porra-match-v1";

  const defaultState = {
    entries: [],
    match: {
      phase: "pre",
      minute: 0,
      spain: 0,
      argentina: 0,
      halfScore: null
    }
  };

  let state = { entries: [], match: loadMatchState() };
  let selected = [];
  let isAdmin = false;

  const grid = document.querySelector("[data-grid]");
  const nameInput = document.querySelector("#participant-name");
  const assignButton = document.querySelector("[data-action='assign']");
  const selectionText = document.querySelector("[data-selection]");
  const feedback = document.querySelector("[data-feedback]");
  const roster = document.querySelector("[data-roster]");
  const rosterWrap = document.querySelector("[data-roster-wrap]");
  const phaseSelect = document.querySelector("#match-phase");
  const minuteInput = document.querySelector("#match-minute");
  const adminLoginPanel = document.querySelector("[data-admin-login]");
  const adminControls = document.querySelector("[data-admin-controls]");
  const adminEmailInput = document.querySelector("#admin-email");
  const adminPasswordInput = document.querySelector("#admin-password");
  const adminLoginButton = document.querySelector("[data-action='admin-login']");
  const authFeedback = document.querySelector("[data-auth-feedback]");

  function setAuthFeedback(message, isError = false) {
    authFeedback.textContent = message;
    authFeedback.classList.toggle("is-error", isError);
  }

  function applyAdminSession(session) {
    isAdmin = Boolean(session?.user);
    adminLoginPanel.hidden = isAdmin;
    adminControls.hidden = !isAdmin;
    if (!isAdmin) {
      adminControls.open = false;
    }
    renderRoster();
  }

  async function loginAdmin() {
    const email = adminEmailInput.value.trim();
    const password = adminPasswordInput.value;

    if (!email || !password) {
      setAuthFeedback("Escriu el correu i la contrasenya.", true);
      return;
    }

    adminLoginButton.disabled = true;
    setAuthFeedback("Comprovant les dades…");
    const { error } = await db.auth.signInWithPassword({ email, password });
    adminLoginButton.disabled = false;

    if (error) {
      setAuthFeedback("El correu o la contrasenya no són correctes.", true);
      return;
    }

    adminPasswordInput.value = "";
    setAuthFeedback("");
  }

  async function logoutAdmin() {
    const { error } = await db.auth.signOut();
    if (error) {
      setFeedback("No s'ha pogut tancar la sessió.", true);
    }
  }

  function loadMatchState() {
    try {
      const saved = JSON.parse(localStorage.getItem(MATCH_STORAGE_KEY) || "null");
      return saved && saved.phase ? saved : JSON.parse(JSON.stringify(defaultState.match));
    } catch (error) {
      return JSON.parse(JSON.stringify(defaultState.match));
    }
  }

  function saveMatchState() {
    localStorage.setItem(MATCH_STORAGE_KEY, JSON.stringify(state.match));
  }

  async function loadRemoteEntries() {
    const { data, error } = await db
      .from("caselles")
      .select("id, nom, espanya, argentina, pagat, created_at")
      .order("created_at", { ascending: true });

    if (error) {
      setFeedback("No s'han pogut carregar les caselles. Torna-ho a provar.", true);
      return;
    }

    const grouped = new Map();
    for (const row of data) {
      const groupKey = row.nom.trim().toLocaleLowerCase("ca");
      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, {
          id: `db-${row.id}`,
          name: row.nom,
          scores: [],
          paid: true,
          rowIds: []
        });
      }
      const entry = grouped.get(groupKey);
      entry.scores.push(scoreKey(row.espanya, row.argentina));
      entry.rowIds.push(row.id);
      entry.paid = entry.paid && row.pagat === true;
    }

    state.entries = [...grouped.values()];
    selected = selected.filter(key => !ownerOf(key));
    render();
  }

  function subscribeToEntries() {
    db.channel("caselles-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "caselles" },
        () => loadRemoteEntries()
      )
      .subscribe();
  }

  function scoreKey(spain, argentina) {
    return `${spain}-${argentina}`;
  }

  function shortScore(key) {
    return key.replace("-", "–");
  }

  function longScore(key) {
    const [spain, argentina] = key.split("-");
    return `Espanya ${spain}–${argentina} Argentina`;
  }

  function ownerOf(key) {
    return state.entries.find(entry => entry.scores.includes(key));
  }

  function winningKeys() {
    const keys = [];
    if (state.match.halfScore) keys.push(scoreKey(state.match.halfScore.spain, state.match.halfScore.argentina));
    if (state.match.phase === "final") keys.push(scoreKey(state.match.spain, state.match.argentina));
    return keys;
  }

  function allScores() {
    return Array.from({ length: 25 }, (_, index) => {
      const argentina = Math.floor(index / 5);
      const spain = index % 5;
      return scoreKey(spain, argentina);
    });
  }

  function renderGrid() {
    grid.replaceChildren();
    const corner = document.createElement("div");
    corner.className = "grid-corner";
    corner.innerHTML = "<span>🇪🇸 X →</span><span>🇦🇷 Y ↓</span>";
    grid.appendChild(corner);

    for (let spain = 0; spain <= 4; spain += 1) {
      const axis = document.createElement("div");
      axis.className = "axis";
      axis.textContent = String(spain);
      axis.setAttribute("aria-label", `Espanya ${spain}`);
      grid.appendChild(axis);
    }

    const winners = winningKeys();
    for (let argentina = 0; argentina <= 4; argentina += 1) {
      const axis = document.createElement("div");
      axis.className = "axis";
      axis.textContent = String(argentina);
      axis.setAttribute("aria-label", `Argentina ${argentina}`);
      grid.appendChild(axis);

      for (let spain = 0; spain <= 4; spain += 1) {
        const key = scoreKey(spain, argentina);
        const owner = ownerOf(key);
        const button = document.createElement("button");
        button.type = "button";
        button.className = "score-cell";
        button.dataset.score = key;
        button.textContent = shortScore(key);
        button.setAttribute("aria-label", longScore(key));
        button.setAttribute("aria-pressed", selected.includes(key) ? "true" : "false");
        if (selected.includes(key)) button.classList.add("is-picked");
        if (owner) {
          button.classList.add("is-occupied");
          button.disabled = true;
          button.title = owner.name;
          button.setAttribute("aria-label", `${longScore(key)}, ocupada per ${owner.name}`);
        }
        if (winners.includes(key)) button.classList.add("is-winner");
        grid.appendChild(button);
      }
    }
  }

  function renderStats() {
    const occupied = state.entries.reduce((sum, entry) => sum + entry.scores.length, 0);
    const paidEntries = state.entries.filter(entry => entry.paid);
    const paidCells = paidEntries.reduce((sum, entry) => sum + entry.scores.length, 0);
    const totalOwed = occupied * ENTRY_PRICE;
    const collected = paidCells * ENTRY_PRICE;

    document.querySelector("[data-stat='occupied']").textContent = `${occupied} / 25`;
    document.querySelector("[data-stat='final-prize']").textContent = money(occupied * POOL_PER_ENTRY * .75);
    document.querySelector("[data-stat='half-prize']").textContent = money(occupied * POOL_PER_ENTRY * .25);
    document.querySelector("[data-available]").textContent = `${25 - occupied} lliures`;
    document.querySelector("[data-money='collected']").textContent = money(collected);
    document.querySelector("[data-money='pending']").textContent = money(totalOwed - collected);
    document.querySelector("[data-money='developer']").textContent = money(occupied * DEVELOPER_FEE);
    document.querySelector("[data-paid-summary]").textContent = `${paidEntries.length}/${state.entries.length} pagats`;

    if (selected.length === 0) {
      selectionText.textContent = "Escriu un nom i tria fins a 2 resultats.";
    } else {
      selectionText.textContent = `${selected.map(longScore).join(" · ")} · ${money(selected.length * ENTRY_PRICE)}`;
    }
    assignButton.disabled = !nameInput.value.trim() || selected.length === 0;
  }

  function renderRoster() {
    roster.replaceChildren();
    rosterWrap.hidden = state.entries.length === 0;
    state.entries.forEach(entry => {
      const row = document.createElement("div");
      row.className = "person-row";

      const name = document.createElement("strong");
      name.textContent = entry.name;

      const scores = document.createElement("span");
      scores.className = "person-row__scores";
      scores.textContent = `${entry.scores.map(shortScore).join(" · ")} · ${money(entry.scores.length * ENTRY_PRICE)}`;

      const paidLabel = document.createElement("label");
      paidLabel.className = "paid-check";
      const paid = document.createElement("input");
      paid.type = "checkbox";
      paid.checked = entry.paid;
      paid.dataset.paid = entry.id;
      paidLabel.append(paid, document.createTextNode("Pagat"));

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "remove-button";
      remove.dataset.remove = entry.id;
      remove.textContent = "Treure";

      if (isAdmin) {
        row.append(name, scores, paidLabel, remove);
      } else {
        const paymentStatus = document.createElement("span");
        paymentStatus.className = `payment-status ${entry.paid ? "is-paid" : ""}`;
        paymentStatus.textContent = entry.paid ? "✅ Pagat" : "⏳ Pendent";
        row.append(name, scores, paymentStatus);
      }
      roster.appendChild(row);
    });
  }

  function renderScoreboard() {
    const { phase, minute, spain, argentina, halfScore } = state.match;
    const phases = {
      pre: ["PREPARTIT", "—", "El partit encara no ha començat"],
      first: ["EN DIRECTE", `${minute}′`, "Primera part"],
      half: ["MITJA PART", "45′", winnerNote(scoreKey(spain, argentina), "Guanyador provisional")],
      second: ["EN DIRECTE", `${minute}′`, halfScore ? `Mitja part: ${halfScore.spain}–${halfScore.argentina}` : "Segona part"],
      final: ["FINAL", "90′", winnerNote(scoreKey(spain, argentina), "Guanyador final")]
    };
    const [label, clock, note] = phases[phase];
    document.querySelector("[data-live-label]").textContent = label;
    document.querySelector("[data-clock]").textContent = clock;
    document.querySelector("[data-match-note]").textContent = note;
    document.querySelector("[data-live-indicator]").classList.toggle("is-live", phase === "first" || phase === "second");
    document.querySelector("[data-score='spain']").textContent = spain;
    document.querySelector("[data-score='argentina']").textContent = argentina;
    document.querySelector("[data-admin-score='spain']").textContent = spain;
    document.querySelector("[data-admin-score='argentina']").textContent = argentina;
    phaseSelect.value = phase;
    minuteInput.value = minute;
  }

  function winnerNote(key, prefix) {
    const owner = ownerOf(key);
    return owner ? `${prefix}: ${owner.name} (${shortScore(key)})` : `${shortScore(key)} · casella sense propietari`;
  }

  function render() {
    renderGrid();
    renderStats();
    renderRoster();
    renderScoreboard();
  }

  function money(value) {
    return value.toLocaleString("ca-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
  }

  function setFeedback(message, isError = false) {
    feedback.textContent = message;
    feedback.classList.toggle("is-error", isError);
  }

  async function assignEntry() {
    const name = nameInput.value.trim();
    if (!name || selected.length === 0) return;
    if (state.entries.some(entry => entry.name.toLocaleLowerCase("ca") === name.toLocaleLowerCase("ca"))) {
      setFeedback("Aquest nom ja té caselles assignades.", true);
      return;
    }

    assignButton.disabled = true;
    setFeedback("Reservant caselles…");
    const rows = selected.map(key => {
      const [spain, argentina] = key.split("-").map(Number);
      return { nom: name, espanya: spain, argentina, pagat: false };
    });
    const { error } = await db.from("caselles").insert(rows);

    if (error) {
      setFeedback(
        error.code === "23505"
          ? "Una d'aquestes caselles acaba de ser ocupada. Tria'n una altra."
          : "No s'ha pogut fer la reserva. Torna-ho a provar.",
        true
      );
      await loadRemoteEntries();
      return;
    }

    selected = [];
    nameInput.value = "";
    await loadRemoteEntries();
    setFeedback(`${name} ha quedat apuntat/da. Falta confirmar el Bizum.`);
  }

  function inviteMessage() {
    const free = allScores().filter(key => !ownerOf(key));
    return [
      "🏆 FINALÍSSIMA",
      "ESPAÑA 🇪🇸 · ARGENTINA 🇦🇷",
      "",
      "Això passa molt poques vegades a la vida! Per fer la FINALÍSSIMA encara més interessant, he creat una porra interactiva.",
      "",
      "📋 NORMES",
      "💶 4,50 € per casella (se'n juguen 4 €)",
      "✌️ Màxim 2 entrades per persona",
      "📐 Espanya = X · Argentina = Y · Resultat: X–Y",
      "🏆 3 € per casella per al guanyador final",
      "⏱️ 1 € per casella per al guanyador de la mitja part",
      "🧑‍💻 0,50 € per casella per al developer de l'app",
      "📲 Bizum: 692 84 37 43 · assumpte: Nom PAGAT",
      "",
      `Caselles disponibles: ${free.map(shortScore).join(", ") || "cap"}`,
      "",
      "Si l'àrbitre la lia, no me'n faig responsable 😂"
    ].join("\n");
  }

  function statusMessage() {
    const occupied = state.entries.reduce((sum, entry) => sum + entry.scores.length, 0);
    const lines = state.entries.length
      ? state.entries.map(entry => `${entry.paid ? "✅" : "⏳"} ${entry.name}: ${entry.scores.map(shortScore).join(", ")}`)
      : ["Encara no hi ha cap casella ocupada."];
    return [
      "⚽ ESTAT DE LA PORRA ESPAÑA–ARGENTINA",
      "",
      ...lines,
      "",
      `Guanyador final: ${money(occupied * POOL_PER_ENTRY * .75)}`,
      `Guanyador mitja part: ${money(occupied * POOL_PER_ENTRY * .25)}`,
      `Developer: ${money(occupied * DEVELOPER_FEE)}`
    ].join("\n");
  }

  function shareWhatsApp(message) {
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  grid.addEventListener("click", event => {
    const button = event.target.closest("button[data-score]");
    if (!button || button.disabled) return;
    const key = button.dataset.score;
    if (selected.includes(key)) {
      selected = selected.filter(item => item !== key);
      setFeedback("");
    } else if (selected.length >= 2) {
      setFeedback("Màxim 2 caselles per persona. Desmarca'n una per canviar-la.", true);
      return;
    } else {
      selected.push(key);
      setFeedback("");
    }
    renderGrid();
    renderStats();
  });

  nameInput.addEventListener("input", renderStats);
  nameInput.addEventListener("keydown", event => {
    if (event.key === "Enter" && !assignButton.disabled) assignEntry();
  });
  assignButton.addEventListener("click", assignEntry);

  roster.addEventListener("change", async event => {
    const checkbox = event.target.closest("input[data-paid]");
    if (!checkbox || !isAdmin) return;
    const entry = state.entries.find(item => item.id === checkbox.dataset.paid);
    if (!entry) return;

    const previous = entry.paid;
    entry.paid = checkbox.checked;
    renderStats();
    const { error } = await db
      .from("caselles")
      .update({ pagat: entry.paid })
      .in("id", entry.rowIds);

    if (error) {
      entry.paid = previous;
      checkbox.checked = previous;
      renderStats();
      setFeedback("No s'ha pogut actualitzar el pagament.", true);
      return;
    }
    setFeedback(`${entry.name} consta com a ${entry.paid ? "pagat/da" : "pendent"}.`);
  });

  roster.addEventListener("click", async event => {
    const button = event.target.closest("button[data-remove]");
    if (!button || !isAdmin) return;
    const entry = state.entries.find(item => item.id === button.dataset.remove);
    if (!entry) return;

    const { error } = await db.from("caselles").delete().in("id", entry.rowIds);
    if (error) {
      setFeedback("No s'ha pogut treure el participant.", true);
      return;
    }
    await loadRemoteEntries();
    setFeedback(`${entry.name} s'ha tret de la porra.`);
  });

  document.querySelector("[data-action='invite']").addEventListener("click", () => shareWhatsApp(inviteMessage()));
  document.querySelector("[data-action='status']").addEventListener("click", () => shareWhatsApp(statusMessage()));
  adminLoginButton.addEventListener("click", loginAdmin);
  adminPasswordInput.addEventListener("keydown", event => {
    if (event.key === "Enter") loginAdmin();
  });
  document.querySelector("[data-action='admin-logout']").addEventListener("click", logoutAdmin);

  phaseSelect.addEventListener("change", () => {
    if (!isAdmin) return;
    state.match.phase = phaseSelect.value;
    if (state.match.phase === "half") {
      state.match.halfScore = { spain: state.match.spain, argentina: state.match.argentina };
    }
    saveMatchState();
    render();
  });

  minuteInput.addEventListener("input", () => {
    if (!isAdmin) return;
    state.match.minute = Math.max(0, Math.min(130, Number(minuteInput.value) || 0));
    saveMatchState();
    renderScoreboard();
  });

  adminControls.addEventListener("click", event => {
    const button = event.target.closest("button[data-goal]");
    if (!button || !isAdmin) return;
    const [team, change] = button.dataset.goal.split(":");
    state.match[team] = Math.max(0, state.match[team] + Number(change));
    saveMatchState();
    render();
  });

  render();
  db.auth.getSession().then(({ data }) => applyAdminSession(data.session));
  db.auth.onAuthStateChange((_event, session) => applyAdminSession(session));
  loadRemoteEntries().then(subscribeToEntries);
})();

(() => {
  "use strict";

  const ENTRY_PRICE = 4.5;
  const POOL_PER_ENTRY = 4;
  const DEVELOPER_FEE = 0.5;
  const STORAGE_KEY = "finalissima-porra-state-v1";

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

  let state = loadState();
  let selected = [];

  const grid = document.querySelector("[data-grid]");
  const nameInput = document.querySelector("#participant-name");
  const assignButton = document.querySelector("[data-action='assign']");
  const selectionText = document.querySelector("[data-selection]");
  const feedback = document.querySelector("[data-feedback]");
  const roster = document.querySelector("[data-roster]");
  const rosterWrap = document.querySelector("[data-roster-wrap]");
  const phaseSelect = document.querySelector("#match-phase");
  const minuteInput = document.querySelector("#match-minute");

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!saved || !Array.isArray(saved.entries) || !saved.match) return JSON.parse(JSON.stringify(defaultState));
      saved.entries = saved.entries.map(entry => ({ ...entry, paid: entry.paid === true }));
      return saved;
    } catch (error) {
      return JSON.parse(JSON.stringify(defaultState));
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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

      row.append(name, scores, paidLabel, remove);
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

  function assignEntry() {
    const name = nameInput.value.trim();
    if (!name || selected.length === 0) return;
    if (state.entries.some(entry => entry.name.toLocaleLowerCase("ca") === name.toLocaleLowerCase("ca"))) {
      setFeedback("Aquest nom ja té caselles assignades.", true);
      return;
    }
    state.entries.push({
      id: crypto.randomUUID(),
      name,
      scores: [...selected],
      paid: false
    });
    saveState();
    selected = [];
    nameInput.value = "";
    setFeedback(`${name} ha quedat apuntat/da. Falta confirmar el Bizum.`);
    render();
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

  roster.addEventListener("change", event => {
    const checkbox = event.target.closest("input[data-paid]");
    if (!checkbox) return;
    const entry = state.entries.find(item => item.id === checkbox.dataset.paid);
    if (!entry) return;
    entry.paid = checkbox.checked;
    saveState();
    setFeedback(`${entry.name} consta com a ${entry.paid ? "pagat/da" : "pendent"}.`);
    renderStats();
  });

  roster.addEventListener("click", event => {
    const button = event.target.closest("button[data-remove]");
    if (!button) return;
    const entry = state.entries.find(item => item.id === button.dataset.remove);
    state.entries = state.entries.filter(item => item.id !== button.dataset.remove);
    saveState();
    setFeedback(entry ? `${entry.name} s'ha tret de la porra.` : "Participant eliminat.");
    render();
  });

  document.querySelector("[data-action='invite']").addEventListener("click", () => shareWhatsApp(inviteMessage()));
  document.querySelector("[data-action='status']").addEventListener("click", () => shareWhatsApp(statusMessage()));

  phaseSelect.addEventListener("change", () => {
    state.match.phase = phaseSelect.value;
    if (state.match.phase === "half") {
      state.match.halfScore = { spain: state.match.spain, argentina: state.match.argentina };
    }
    saveState();
    render();
  });

  minuteInput.addEventListener("input", () => {
    state.match.minute = Math.max(0, Math.min(130, Number(minuteInput.value) || 0));
    saveState();
    renderScoreboard();
  });

  document.querySelector(".admin").addEventListener("click", event => {
    const button = event.target.closest("button[data-goal]");
    if (!button) return;
    const [team, change] = button.dataset.goal.split(":");
    state.match[team] = Math.max(0, state.match[team] + Number(change));
    saveState();
    render();
  });

  render();
})();

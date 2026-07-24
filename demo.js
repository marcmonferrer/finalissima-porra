(() => {
  "use strict";

  const STORAGE_KEY = "finalissima-porra-demo-v1";
  const ENTRY_PRICE = 4.5;
  const POOL_PER_ENTRY = 4;
  const DEVELOPER_FEE = 0.5;
  const SPECIAL_BETS = {
    "4-4": { short: "Messi ×3", label: "Hat-trick de Messi" },
    "3-4": { short: "Lamine ×2", label: "Doblet de Lamine" },
    "4-3": { short: "+6 gols", label: "Més de 6 gols totals" }
  };

  const emptyMatch = () => ({
    phase: "pre",
    minute: 0,
    spain: 0,
    argentina: 0,
    halfScore: null,
    regulationScore: null,
    messiHatTrick: false,
    lamineBrace: false,
    moreThanSixGoals: false,
    providerStatus: null
  });

  const emptyState = () => ({ entries: [], match: emptyMatch() });

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
  const adminLoginPanel = document.querySelector("[data-admin-login]");
  const adminControls = document.querySelector("[data-admin-controls]");

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved?.entries && saved?.match) return saved;
    } catch (error) {
      console.warn("No s'ha pogut carregar la demo desada", error);
    }
    return emptyState();
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function scoreKey(spain, argentina) {
    return `${spain}-${argentina}`;
  }

  function isSpecialBet(key) {
    return Boolean(SPECIAL_BETS[key]);
  }

  function scoreResult(key) {
    return key.replace("-", "–");
  }

  function shortScore(key) {
    return SPECIAL_BETS[key]?.short || scoreResult(key);
  }

  function longScore(key) {
    if (SPECIAL_BETS[key]) return SPECIAL_BETS[key].label;
    const [spain, argentina] = key.split("-");
    return `Espanya ${spain}–${argentina} Argentina`;
  }

  function ownerOf(key) {
    return state.entries.find(entry => entry.scores.includes(key));
  }

  function achievedSpecialKeys() {
    const keys = [];
    if (state.match.messiHatTrick) keys.push("4-4");
    if (state.match.lamineBrace) keys.push("3-4");
    if (state.match.moreThanSixGoals) keys.push("4-3");
    return keys;
  }

  function winningKeys() {
    const keys = [];
    if (state.match.halfScore) {
      const key = scoreKey(state.match.halfScore.spain, state.match.halfScore.argentina);
      if (!isSpecialBet(key)) keys.push(key);
    }
    if (state.match.regulationScore) {
      const key = scoreKey(state.match.regulationScore.spain, state.match.regulationScore.argentina);
      if (!isSpecialBet(key)) keys.push(key);
    }
    return [...new Set([...keys, ...achievedSpecialKeys()])];
  }

  function allScores() {
    return Array.from({ length: 25 }, (_, index) => {
      const argentina = Math.floor(index / 5);
      const spain = index % 5;
      return scoreKey(spain, argentina);
    });
  }

  function money(value) {
    return value.toLocaleString("ca-ES", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + " €";
  }

  function setFeedback(message, isError = false) {
    feedback.textContent = message;
    feedback.classList.toggle("is-error", isError);
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
      grid.appendChild(axis);
    }

    const winners = winningKeys();
    for (let argentina = 0; argentina <= 4; argentina += 1) {
      const axis = document.createElement("div");
      axis.className = "axis";
      axis.textContent = String(argentina);
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
        if (isSpecialBet(key)) button.classList.add("is-special");
        if (selected.includes(key)) button.classList.add("is-picked");
        if (owner) {
          button.classList.add("is-occupied");
          button.disabled = true;
          button.title = owner.name;
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
    document.querySelector("[data-stat='final-prize']").textContent = money(occupied * POOL_PER_ENTRY * .50);
    document.querySelector("[data-stat='half-prize']").textContent = money(occupied * POOL_PER_ENTRY * .25);
    document.querySelector("[data-stat='special-prize']").textContent = money(occupied * POOL_PER_ENTRY * .25);
    document.querySelector("[data-available]").textContent = `${25 - occupied} lliures · DEMO OBERTA`;
    document.querySelector("[data-money='collected']").textContent = money(collected);
    document.querySelector("[data-money='pending']").textContent = money(totalOwed - collected);
    document.querySelector("[data-money='developer']").textContent = money(occupied * DEVELOPER_FEE);
    document.querySelector("[data-paid-summary]").textContent = `${paidEntries.length}/${state.entries.length} pagats`;

    selectionText.textContent = selected.length === 0
      ? "Escriu un nom i tria fins a 2 caselles."
      : `${selected.map(longScore).join(" · ")} · ${money(selected.length * ENTRY_PRICE)}`;
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

  function winnerNote(key, prefix) {
    if (isSpecialBet(key)) return `${scoreResult(key)} · casella especial`;
    const owner = ownerOf(key);
    return owner ? `${prefix}: ${owner.name} (${scoreResult(key)})` : `${scoreResult(key)} · casella lliure`;
  }

  function renderScoreboard() {
    const { phase, minute, spain, argentina, halfScore, regulationScore } = state.match;
    const resultKey = regulationScore
      ? scoreKey(regulationScore.spain, regulationScore.argentina)
      : scoreKey(spain, argentina);
    const phases = {
      pre: ["PREPARTIT", "—", "Demo preparada per començar"],
      first: ["EN DIRECTE", `${minute}′`, "Primera part"],
      half: ["MITJA PART", "45′", winnerNote(scoreKey(spain, argentina), "Guanyador provisional")],
      second: ["EN DIRECTE", `${minute}′`, halfScore ? `Mitja part: ${halfScore.spain}–${halfScore.argentina}` : "Segona part"],
      final: ["FINAL", "90′", winnerNote(resultKey, "Guanyador dels 90 minuts")]
    };
    const [label, clock, note] = phases[phase] || phases.pre;

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
    document.querySelectorAll("[data-special-result]").forEach(input => {
      input.checked = Boolean(state.match[input.dataset.specialResult]);
    });
  }

  function render() {
    renderGrid();
    renderStats();
    renderRoster();
    renderScoreboard();
  }

  function assignEntry() {
    const name = nameInput.value.trim();
    if (!name || selected.length === 0) return;
    if (state.entries.some(entry => entry.name.toLocaleLowerCase("ca") === name.toLocaleLowerCase("ca"))) {
      setFeedback("Aquest nom ja té caselles assignades.", true);
      return;
    }

    state.entries.push({
      id: crypto.randomUUID ? crypto.randomUUID() : `demo-${Date.now()}`,
      name,
      scores: [...selected],
      paid: false
    });
    selected = [];
    nameInput.value = "";
    saveState();
    render();
    setFeedback(`${name} ha quedat apuntat/da. Aquesta reserva només existeix en aquest dispositiu.`);
  }

  function inviteMessage() {
    const free = allScores().filter(key => !ownerOf(key));
    return [
      "🏆 FINALÍSSIMA · DEMO INTERACTIVA",
      "ESPAÑA 🇪🇸 · ARGENTINA 🇦🇷",
      "",
      "Prototip de porra digital desenvolupat per Marc Monferrer amb IA.",
      "",
      "📋 FUNCIONALITATS",
      "🎯 Selecció de fins a 2 caselles",
      "💶 Càlcul automàtic del pot i els premis",
      "✅ Control de pagaments simulats",
      "⚽ Marcador i guanyadors de mitja part i final",
      "✨ Apostes especials",
      "",
      `Caselles disponibles en aquesta demo: ${free.map(shortScore).join(", ") || "cap"}`
    ].join("\n");
  }

  function statusMessage() {
    const occupied = state.entries.reduce((sum, entry) => sum + entry.scores.length, 0);
    const lines = state.entries.length
      ? state.entries.map(entry => `${entry.paid ? "✅" : "⏳"} ${entry.name}: ${entry.scores.map(shortScore).join(", ")}`)
      : ["Encara no hi ha cap casella ocupada."];
    return [
      "⚽ ESTAT DE LA DEMO",
      "",
      ...lines,
      "",
      `Final (50%): ${money(occupied * POOL_PER_ENTRY * .50)}`,
      `Mitja part (25%): ${money(occupied * POOL_PER_ENTRY * .25)}`,
      `Especials (25%): ${money(occupied * POOL_PER_ENTRY * .25)}`
    ].join("\n");
  }

  function matchUpdateMessage() {
    return [
      "⚽ ACTUALITZACIÓ DE LA DEMO",
      `${state.match.phase.toUpperCase()} · MINUT ${state.match.minute}`,
      "",
      `🇪🇸 ESPAÑA ${state.match.spain}–${state.match.argentina} ARGENTINA 🇦🇷`
    ].join("\n");
  }

  function shareWhatsApp(message) {
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  function resetDemo() {
    if (!window.confirm("Vols reiniciar la demo i esborrar totes les dades locals?")) return;
    state = emptyState();
    selected = [];
    nameInput.value = "";
    localStorage.removeItem(STORAGE_KEY);
    render();
    setFeedback("♻️ Demo reiniciada i oberta.");
  }

  grid.addEventListener("click", event => {
    const button = event.target.closest("button[data-score]");
    if (!button || button.disabled) return;
    const key = button.dataset.score;
    if (selected.includes(key)) {
      selected = selected.filter(item => item !== key);
    } else if (selected.length >= 2) {
      setFeedback("Màxim 2 caselles per persona. Desmarca'n una per canviar-la.", true);
      return;
    } else {
      selected.push(key);
    }
    setFeedback("");
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
    renderStats();
    setFeedback(`${entry.name} consta com a ${entry.paid ? "pagat/da" : "pendent"}.`);
  });

  roster.addEventListener("click", event => {
    const button = event.target.closest("button[data-remove]");
    if (!button) return;
    const entry = state.entries.find(item => item.id === button.dataset.remove);
    if (!entry) return;
    state.entries = state.entries.filter(item => item.id !== entry.id);
    saveState();
    render();
    setFeedback(`${entry.name} s'ha tret de la demo.`);
  });

  phaseSelect.addEventListener("change", () => {
    state.match.phase = phaseSelect.value;
    if (["pre", "first"].includes(state.match.phase)) {
      state.match.halfScore = null;
      state.match.regulationScore = null;
    }
    if (state.match.phase === "half") {
      state.match.halfScore = { spain: state.match.spain, argentina: state.match.argentina };
    }
    if (state.match.phase === "final") {
      state.match.regulationScore = { spain: state.match.spain, argentina: state.match.argentina };
    }
    saveState();
    render();
  });

  minuteInput.addEventListener("change", () => {
    state.match.minute = Math.max(0, Math.min(130, Number(minuteInput.value) || 0));
    saveState();
    renderScoreboard();
  });

  adminControls.addEventListener("change", event => {
    const input = event.target.closest("input[data-special-result]");
    if (!input) return;
    state.match[input.dataset.specialResult] = input.checked;
    saveState();
    render();
  });

  adminControls.addEventListener("click", event => {
    const button = event.target.closest("button[data-goal]");
    if (!button) return;
    const [team, change] = button.dataset.goal.split(":");
    state.match[team] = Math.max(0, state.match[team] + Number(change));
    if (state.match.phase === "half") {
      state.match.halfScore = { spain: state.match.spain, argentina: state.match.argentina };
    }
    if (state.match.phase === "final") {
      state.match.regulationScore = { spain: state.match.spain, argentina: state.match.argentina };
    }
    saveState();
    render();
  });

  document.querySelector("[data-action='invite']").addEventListener("click", () => shareWhatsApp(inviteMessage()));
  document.querySelector("[data-action='status']").addEventListener("click", () => shareWhatsApp(statusMessage()));
  document.querySelector("[data-action='match-update']").addEventListener("click", () => shareWhatsApp(matchUpdateMessage()));

  adminLoginPanel.hidden = true;
  adminControls.hidden = false;
  adminControls.open = true;

  const resetButton = document.createElement("button");
  resetButton.className = "button";
  resetButton.type = "button";
  resetButton.textContent = "♻️ Reiniciar demo";
  resetButton.addEventListener("click", resetDemo);
  const logoutButton = document.querySelector("[data-action='admin-logout']");
  logoutButton.replaceWith(resetButton);

  render();
  setFeedback("🧪 Mode demostració: les dades es desen només en aquest dispositiu i es poden reiniciar quan vulguis.");
})();
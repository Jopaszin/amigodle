/* =========================================================
   AMIGODLE — game.js
   Lógica do jogo, renderização da interface e interações.
   ========================================================= */

(function () {
  "use strict";

  const el = (id) => document.getElementById(id);

  // ---------------------------------------------------------
  // Elementos
  // ---------------------------------------------------------
  const DOM = {
    loadingScreen: el("loadingScreen"),
    app: el("app"),

    attemptCountPill: el("attemptCountPill"),
    streakPill: el("streakPill"),
    puzzleNumber: el("puzzleNumber"),

    btnModeDaily: el("btnModeDaily"),
    btnModeFree: el("btnModeFree"),
    modeHint: el("modeHint"),
    freePicker: el("freePicker"),
    btnNewRandomFriend: el("btnNewRandomFriend"),

    portrait: el("portrait"),
    portraitImg: el("portraitImg"),
    portraitBadge: el("portraitBadge"),

    guessInput: el("guessInput"),
    suggestions: el("suggestions"),
    btnGuess: el("btnGuess"),
    errorMsg: el("errorMsg"),

    attemptsLabel: el("attemptsLabel"),
    attemptsExtra: el("attemptsExtra"),

    boardWrap: el("boardWrap"),
    boardHeadRow: el("boardHeadRow"),
    boardBody: el("boardBody"),
    emptyBoard: el("emptyBoard"),

    btnRules: el("btnRules"),
    btnStats: el("btnStats"),
    btnSettings: el("btnSettings"),

    modalRules: el("modalRules"),
    modalSettings: el("modalSettings"),
    modalStats: el("modalStats"),
    modalWin: el("modalWin"),
    modalConfirmReset: el("modalConfirmReset"),

    toggleSound: el("toggleSound"),
    toggleTheme: el("toggleTheme"),
    btnResetProgress: el("btnResetProgress"),
    btnConfirmReset: el("btnConfirmReset"),

    statJogadas: el("statJogadas"),
    statVitorias: el("statVitorias"),
    statTaxa: el("statTaxa"),
    statSeqAtual: el("statSeqAtual"),
    statMelhorSeq: el("statMelhorSeq"),
    statMedia: el("statMedia"),
    statMenor: el("statMenor"),
    statMaior: el("statMaior"),
    distribution: el("distribution"),

    winPortraitImg: el("winPortraitImg"),
    winTitle: el("winTitle"),
    winApelido: el("winApelido"),
    winMessage: el("winMessage"),
    winAttempts: el("winAttempts"),
    winStreak: el("winStreak"),
    nextTimer: el("nextTimer"),
    nextTimerBox: el("nextTimerBox"),
    btnShare: el("btnShare"),
    btnWinClose: el("btnWinClose"),

    toast: el("toast"),

    // Abas de estatísticas (pessoal vs global)
    btnStatsPersonal: el("btnStatsPersonal"),
    btnStatsGlobal: el("btnStatsGlobal"),
  };

  // ---------------------------------------------------------
  // Estado
  // ---------------------------------------------------------
  const state = {
    mode: "daily", // 'daily' | 'free'
    secretFriend: null,
    attempts: [], // [{ friend, results, isCorrect }]
    finished: false,
    won: false,
    selectedFriend: null,
    activeSuggestionIndex: -1,
    dayKey: null,
    statsTab: "personal", // 'personal' | 'global'
  };

  let settings = AmigodleStorage.getSettings();
  let countdownTimer = null;

  // ---------------------------------------------------------
  // Áudio (gerado via Web Audio API — sem arquivos externos)
  // ---------------------------------------------------------
  let audioCtx = null;
  function playTone(freq, duration, type = "sine", delay = 0) {
    if (!settings.somAtivado) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, audioCtx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.12, audioCtx.currentTime + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + delay + duration);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(audioCtx.currentTime + delay);
      osc.stop(audioCtx.currentTime + delay + duration + 0.05);
    } catch {
      /* som é opcional, falha silenciosamente */
    }
  }
  const Sound = {
    attempt: () => playTone(320, 0.12, "triangle"),
    wrong: () => playTone(180, 0.18, "sawtooth"),
    partial: () => playTone(400, 0.12, "square"),
    win: () => {
      playTone(523, 0.14, "sine", 0);
      playTone(659, 0.14, "sine", 0.14);
      playTone(784, 0.22, "sine", 0.28);
    },
  };

  // ---------------------------------------------------------
  // Utilidades de UI
  // ---------------------------------------------------------
  function showToast(msg, ms = 2200) {
    DOM.toast.textContent = msg;
    DOM.toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => DOM.toast.classList.remove("show"), ms);
  }

  function openModal(idOrEl) {
    const modal = typeof idOrEl === "string" ? el(idOrEl) : idOrEl;
    modal.classList.remove("hidden");
    document.body.classList.add("no-scroll");
  }
  function closeModal(idOrEl) {
    const modal = typeof idOrEl === "string" ? el(idOrEl) : idOrEl;
    modal.classList.add("hidden");
    document.body.classList.remove("no-scroll");
  }

  document.querySelectorAll("[data-close]").forEach((btn) => {
    btn.addEventListener("click", () => closeModal(btn.dataset.close));
  });
  document.querySelectorAll(".overlay").forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal(overlay);
    });
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.querySelectorAll(".overlay:not(.hidden)").forEach(closeModal);
    }
  });

  function confetti() {
    const colors = ["#ffb238", "#5eead4", "#4ade80", "#fb7185", "#fbbf24"];
    const count = 60;
    for (let i = 0; i < count; i++) {
      const piece = document.createElement("div");
      piece.className = "confetti-piece";
      const size = 6 + Math.random() * 6;
      piece.style.width = size + "px";
      piece.style.height = size * 0.4 + "px";
      piece.style.left = Math.random() * 100 + "vw";
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      const duration = 2.2 + Math.random() * 1.6;
      piece.style.animationDuration = duration + "s";
      piece.style.transform = `rotate(${Math.random() * 360}deg)`;
      document.body.appendChild(piece);
      setTimeout(() => piece.remove(), duration * 1000 + 100);
    }
  }

  // ---------------------------------------------------------
  // Construção do cabeçalho do tabuleiro
  // ---------------------------------------------------------
  function buildBoardHeader() {
    const attrs = AmigodleData.ATTRIBUTES;
    DOM.boardHeadRow.innerHTML = "<th>Amigo</th>";
    attrs.forEach((attr) => {
      const th = document.createElement("th");
      th.textContent = attr.label;
      DOM.boardHeadRow.appendChild(th);
    });
  }

  // ---------------------------------------------------------
  // Portrait (foto borrada progressiva)
  // ---------------------------------------------------------
  function updatePortrait() {
    const friend = state.secretFriend;
    if (!friend) return;
    DOM.portraitImg.src = friend.foto;
    DOM.portraitImg.alt = state.won ? friend.nome : "Foto borrada do amigo secreto";

    const n = state.attempts.length;
    if (state.won) {
      DOM.portrait.classList.add("revealed");
      DOM.portraitImg.style.filter = "none";
      DOM.portraitBadge.classList.add("hidden");
    } else {
      DOM.portrait.classList.remove("revealed");
      DOM.portraitBadge.classList.remove("hidden");
      const blur = Math.max(18 - n * 2.5, 3);
      const brightness = Math.min(0.55 + n * 0.06, 0.95);
      DOM.portraitImg.style.filter = `blur(${blur}px) brightness(${brightness}) saturate(0.6)`;
      DOM.portraitBadge.textContent = n === 0 ? "?" : `${n} tentativa${n > 1 ? "s" : ""}`;
    }
  }

  // ---------------------------------------------------------
  // Renderização de uma linha de tentativa
  // ---------------------------------------------------------
  function buildRow(attempt, animate) {
    const tr = document.createElement("tr");

    const tdFriend = document.createElement("td");
    tdFriend.innerHTML = `
      <div class="row-friend">
        <div class="row-avatar"><img src="${attempt.friend.foto}" alt="" /></div>
        <div>
          <div class="row-name">${attempt.friend.nome}</div>
          <div class="row-attempt-n">"${attempt.friend.apelido}"</div>
        </div>
      </div>`;
    tr.appendChild(tdFriend);

    attempt.results.forEach((r, i) => {
      const td = document.createElement("td");
      const cell = document.createElement("div");
      cell.className = `cell state-${r.state}`;
      cell.innerHTML = `<span class="cell-inner">${r.display}${
        r.arrow ? `<span class="arrow">${r.arrow}</span>` : ""
      }</span>`;
      if (animate) {
        cell.classList.remove("state-green", "state-yellow", "state-red");
        cell.classList.add("state-pending");
        const delay = i * 90;
        setTimeout(() => {
          cell.classList.add("flip-enter");
          cell.classList.remove("state-pending");
          cell.classList.add(`state-${r.state}`);
          if (r.state === "green") Sound.attempt();
          else if (r.state === "yellow") Sound.partial();
        }, delay);
      }
      td.appendChild(cell);
      tr.appendChild(td);
    });

    return tr;
  }

  function renderAllAttempts(animateLast = false) {
    DOM.boardBody.innerHTML = "";
    state.attempts.forEach((attempt, idx) => {
      const isLast = idx === state.attempts.length - 1;
      const row = buildRow(attempt, animateLast && isLast);
      DOM.boardBody.appendChild(row);
    });
    DOM.emptyBoard.classList.toggle("hidden", state.attempts.length > 0);
    DOM.boardWrap.classList.toggle("hidden", state.attempts.length === 0);
    updateAttemptsCounter();
  }

  function updateAttemptsCounter() {
    const n = state.attempts.length;
    DOM.attemptsLabel.textContent = n;
    DOM.attemptCountPill.textContent = n;
    DOM.attemptsExtra.textContent = state.finished
      ? state.won
        ? "Descoberto! ✅"
        : ""
      : "";
  }

  // ---------------------------------------------------------
  // Autocomplete
  // ---------------------------------------------------------
  function guessedIds() {
    return new Set(state.attempts.map((a) => a.friend.id));
  }

  function filterFriends(query) {
    const q = AmigodleData.normalize(query);
    if (!q) return [];
    return AmigodleData.getFriends()
      .filter(
        (f) =>
          AmigodleData.normalize(f.nome).includes(q) ||
          AmigodleData.normalize(f.apelido).includes(q)
      )
      .slice(0, 8);
  }

  function renderSuggestions(list) {
    const already = guessedIds();
    DOM.suggestions.innerHTML = "";
    state.activeSuggestionIndex = -1;

    if (!list.length) {
      DOM.suggestions.innerHTML = `<div class="suggestions-empty">Nenhum amigo encontrado 🤔</div>`;
      DOM.suggestions.classList.remove("hidden");
      return;
    }

    list.forEach((friend) => {
      const isUsed = already.has(friend.id);
      const item = document.createElement("div");
      item.className = "suggestion-item" + (isUsed ? " suggestion-disabled" : "");
      item.setAttribute("role", "option");
      item.dataset.id = friend.id;
      item.innerHTML = `
        <div class="suggestion-avatar"><img src="${friend.foto}" alt="" /></div>
        <div>
          <div class="suggestion-name">${friend.nome} ${isUsed ? "✅" : ""}</div>
          <div class="suggestion-meta">"${friend.apelido}" · ${friend.cidade}/${friend.estado}</div>
        </div>`;
      if (!isUsed) {
        item.addEventListener("click", () => selectSuggestion(friend));
      }
      DOM.suggestions.appendChild(item);
    });
    DOM.suggestions.classList.remove("hidden");
  }

  function selectSuggestion(friend) {
    state.selectedFriend = friend;
    DOM.guessInput.value = friend.nome;
    DOM.suggestions.classList.add("hidden");
    DOM.btnGuess.disabled = false;
    DOM.guessInput.classList.remove("input-error");
    DOM.errorMsg.textContent = "";
  }

  DOM.guessInput.addEventListener("input", () => {
    state.selectedFriend = null;
    DOM.btnGuess.disabled = true;
    DOM.guessInput.classList.remove("input-error");
    DOM.errorMsg.textContent = "";
    const query = DOM.guessInput.value;
    if (!query.trim()) {
      DOM.suggestions.classList.add("hidden");
      return;
    }
    renderSuggestions(filterFriends(query));
  });

  DOM.guessInput.addEventListener("keydown", (e) => {
    const items = Array.from(DOM.suggestions.querySelectorAll(".suggestion-item:not(.suggestion-disabled)"));
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!items.length) return;
      state.activeSuggestionIndex = (state.activeSuggestionIndex + 1) % items.length;
      items.forEach((it, i) => it.classList.toggle("active", i === state.activeSuggestionIndex));
      items[state.activeSuggestionIndex].scrollIntoView({ block: "nearest" });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!items.length) return;
      state.activeSuggestionIndex =
        (state.activeSuggestionIndex - 1 + items.length) % items.length;
      items.forEach((it, i) => it.classList.toggle("active", i === state.activeSuggestionIndex));
      items[state.activeSuggestionIndex].scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (state.activeSuggestionIndex >= 0 && items[state.activeSuggestionIndex]) {
        const id = Number(items[state.activeSuggestionIndex].dataset.id);
        const friend = AmigodleData.getFriendById(id);
        if (friend) selectSuggestion(friend);
      } else {
        submitGuess();
      }
    } else if (e.key === "Escape") {
      DOM.suggestions.classList.add("hidden");
    }
  });

  document.addEventListener("click", (e) => {
    if (!DOM.suggestions.contains(e.target) && e.target !== DOM.guessInput) {
      DOM.suggestions.classList.add("hidden");
    }
  });

  DOM.btnGuess.addEventListener("click", submitGuess);

  // ---------------------------------------------------------
  // Envio de tentativa
  // ---------------------------------------------------------
  function submitGuess() {
    if (state.finished) return;

    const typed = DOM.guessInput.value.trim();
    if (!typed) return;

    let friend = state.selectedFriend;

    if (!friend) {
      friend = AmigodleData.getFriends().find(
        (f) => AmigodleData.normalize(f.nome) === AmigodleData.normalize(typed)
      );
    }

    if (!friend) {
      DOM.guessInput.classList.add("input-error");
      DOM.errorMsg.textContent = "Amigo não encontrado. Escolha um nome da lista de sugestões.";
      Sound.wrong();
      return;
    }

    if (guessedIds().has(friend.id)) {
      DOM.guessInput.classList.add("input-error");
      DOM.errorMsg.textContent = "Você já tentou esse amigo. Escolha outro!";
      return;
    }

    DOM.errorMsg.textContent = "";
    DOM.guessInput.classList.remove("input-error");

    const { isCorrect, results } = AmigodleData.evaluateGuess(friend, state.secretFriend);
    const attempt = { friend, results, isCorrect };
    state.attempts.push(attempt);

    DOM.guessInput.value = "";
    state.selectedFriend = null;
    DOM.btnGuess.disabled = true;
    DOM.suggestions.classList.add("hidden");

    renderAllAttempts(true);
    updatePortrait();

    if (state.mode === "daily") persistDailyState();

    const flipTotalDelay = AmigodleData.ATTRIBUTES.length * 90 + 500;

    if (isCorrect) {
      state.finished = true;
      state.won = true;
      setTimeout(() => finishGame(true), flipTotalDelay);
    } else {
      setTimeout(() => Sound.wrong(), 60);
    }
  }

  // ---------------------------------------------------------
  // Finalização de partida (vitória)
  // ---------------------------------------------------------
  const WIN_MESSAGES = [
    "ACERTOU! Você conhece seus amigos melhor do que imaginava.",
    "Caraca, você conhece esse maluco mesmo.",
    "Mandou bem! Amizade de verdade não engana.",
    "Isso aí! Detetive de amigos nível máximo.",
  ];
  const FAST_MESSAGES = ["Foi rápido demais! Suspeito...", "Uau, primeira tentativa! Vidente ou amigo de verdade?"];
  const SLOW_MESSAGES = (n) => [`Finalmente! Depois de ${n} tentativas.`, `Valeu a persistência! ${n} tentativas bem gastas.`];

  function pickWinMessage(attempts) {
    if (attempts <= 1) return FAST_MESSAGES[Math.floor(Math.random() * FAST_MESSAGES.length)];
    if (attempts >= 8) {
      const opts = SLOW_MESSAGES(attempts);
      return opts[Math.floor(Math.random() * opts.length)];
    }
    return WIN_MESSAGES[Math.floor(Math.random() * WIN_MESSAGES.length)];
  }

  function finishGame(won) {
    updatePortrait();
    let stats = AmigodleStorage.getStats();

    if (state.mode === "daily") {
      stats = AmigodleStorage.registerDailyResult({
        won,
        attempts: state.attempts.length,
        dayKey: state.dayKey,
      });
      persistDailyState();
      updateHeaderStats();
    }

    if (won) {
      Sound.win();
      confetti();
      openWinModal(stats);
    }
  }

  function openWinModal(stats) {
    const friend = state.secretFriend;
    DOM.winPortraitImg.src = friend.foto;
    DOM.winPortraitImg.alt = friend.nome;
    DOM.winTitle.textContent = friend.nome;
    DOM.winApelido.textContent = `"${friend.apelido}"`;
    DOM.winMessage.textContent = pickWinMessage(state.attempts.length);
    DOM.winAttempts.textContent = state.attempts.length;
    DOM.winStreak.textContent = state.mode === "daily" ? stats.sequenciaAtual : "–";

    if (state.mode === "daily") {
      DOM.nextTimerBox.classList.remove("hidden");
      startCountdown();
    } else {
      DOM.nextTimerBox.classList.add("hidden");
    }

    openModal(DOM.modalWin);
  }

  DOM.btnWinClose.addEventListener("click", () => closeModal(DOM.modalWin));

  // ---------------------------------------------------------
  // Countdown para o próximo amigo (modo diário)
  // ---------------------------------------------------------
  function startCountdown() {
    clearInterval(countdownTimer);
    const tick = () => {
      const ms = AmigodleData.msUntilNextDay();
      const h = String(Math.floor(ms / 3600000)).padStart(2, "0");
      const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, "0");
      const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, "0");
      DOM.nextTimer.textContent = `${h}:${m}:${s}`;
      if (ms <= 1000) {
        clearInterval(countdownTimer);
        if (state.mode === "daily") loadDailyMode();
      }
    };
    tick();
    countdownTimer = setInterval(tick, 1000);
  }

  // ---------------------------------------------------------
  // Compartilhar resultado
  // ---------------------------------------------------------
  function buildShareText() {
    const emojiMap = { green: "🟩", yellow: "🟨", red: "🟥" };
    const lines = state.attempts.map((a) =>
      a.results.map((r) => emojiMap[r.state]).join("")
    );
    const puzzleNum = AmigodleData.getPuzzleNumber(new Date());
    const header = `AMIGODLE #${puzzleNum} — ${state.attempts.length} tentativa${
      state.attempts.length > 1 ? "s" : ""
    }`;
    return `${header}\n\n${lines.join("\n")}\n\nJogue em: amigodle`;
  }

  DOM.btnShare.addEventListener("click", async () => {
    const text = buildShareText();
    try {
      if (navigator.share) {
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
      showToast("Resultado copiado! Cole onde quiser 🎉");
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        showToast("Resultado copiado! Cole onde quiser 🎉");
      } catch {
        showToast("Não foi possível copiar. Copie manualmente.");
      }
    }
  });

  // ---------------------------------------------------------
  // Modo Diário
  // ---------------------------------------------------------
  function getYesterdayKey() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return AmigodleData.getTodayKey(d);
  }

  function persistDailyState() {
    AmigodleStorage.saveDailyState({
      dayKey: state.dayKey,
      attemptIds: state.attempts.map((a) => a.friend.id),
      finished: state.finished,
      won: state.won,
    });
  }

  function loadDailyMode() {
    clearInterval(countdownTimer);
    const today = new Date();
    const dayKey = AmigodleData.getTodayKey(today);
    const secret = AmigodleData.getDailyFriend(today);

    const stats = AmigodleStorage.getStats();
    if (
      stats.ultimoDiaJogado &&
      stats.ultimoDiaJogado !== dayKey &&
      stats.ultimoDiaJogado !== getYesterdayKey() &&
      stats.sequenciaAtual !== 0
    ) {
      stats.sequenciaAtual = 0;
      AmigodleStorage.saveStats(stats);
    }

    state.mode = "daily";
    state.secretFriend = secret;
    state.dayKey = dayKey;
    state.finished = false;
    state.won = false;

    const saved = AmigodleStorage.getDailyState();
    if (saved.dayKey === dayKey) {
      state.attempts = (saved.attemptIds || [])
        .map((id) => AmigodleData.getFriendById(id))
        .filter(Boolean)
        .map((friend) => {
          const { isCorrect, results } = AmigodleData.evaluateGuess(friend, secret);
          return { friend, results, isCorrect };
        });
      state.finished = !!saved.finished;
      state.won = !!saved.won;
    } else {
      state.attempts = [];
      persistDailyState();
    }

    DOM.puzzleNumber.textContent = AmigodleData.getPuzzleNumber(today);
    DOM.modeHint.textContent =
      "Um amigo novo todo dia — todo mundo joga contra o mesmo amigo.";
    DOM.freePicker.classList.remove("active");

    finishSetupRender();

    if (state.finished && state.won) {
      updatePortrait();
    }
  }

  // ---------------------------------------------------------
  // Modo Livre
  // ---------------------------------------------------------
  function loadFreeMode(pickNew = true) {
    clearInterval(countdownTimer);
    state.mode = "free";
    state.finished = false;
    state.won = false;
    state.attempts = [];

    if (pickNew || !state.secretFriend || state.mode !== "free") {
      const friends = AmigodleData.getFriends();
      const randomFriend = friends[Math.floor(Math.random() * friends.length)];
      state.secretFriend = randomFriend;
    }

    DOM.modeHint.textContent = "Pratique à vontade: sorteie um amigo e tente quantas vezes quiser.";
    DOM.freePicker.classList.add("active");
    DOM.puzzleNumber.textContent = "∞";

    finishSetupRender();
  }

  DOM.btnNewRandomFriend.addEventListener("click", () => loadFreeMode(true));

  function finishSetupRender() {
    DOM.guessInput.value = "";
    DOM.errorMsg.textContent = "";
    DOM.guessInput.classList.remove("input-error");
    state.selectedFriend = null;
    DOM.btnGuess.disabled = true;
    renderAllAttempts(false);
    updatePortrait();
    updateHeaderStats();
  }

  function updateHeaderStats() {
    const stats = AmigodleStorage.getStats();
    DOM.streakPill.textContent = stats.sequenciaAtual;
  }

  DOM.btnModeDaily.addEventListener("click", () => {
    if (state.mode === "daily") return;
    setActiveMode("daily");
    loadDailyMode();
  });
  DOM.btnModeFree.addEventListener("click", () => {
    if (state.mode === "free") return;
    setActiveMode("free");
    loadFreeMode(true);
  });

  function setActiveMode(mode) {
    DOM.btnModeDaily.classList.toggle("active", mode === "daily");
    DOM.btnModeDaily.setAttribute("aria-selected", mode === "daily");
    DOM.btnModeFree.classList.toggle("active", mode === "free");
    DOM.btnModeFree.setAttribute("aria-selected", mode === "free");
  }

  // ---------------------------------------------------------
  // Estatísticas (modal) - Pessoal e Global
  // ---------------------------------------------------------
  async function renderStatsModal() {
    if (state.statsTab === "global") {
      const dayKey = state.dayKey || AmigodleData.getTodayKey(new Date());
      const globalData = await AmigodleStorage.fetchGlobalStats(dayKey);

      if (!globalData) {
        DOM.statJogadas.textContent = "0";
        DOM.statVitorias.textContent = "0";
        DOM.statTaxa.textContent = "0%";
        DOM.statSeqAtual.textContent = "–";
        DOM.statMelhorSeq.textContent = "–";
        DOM.statMedia.textContent = "–";
        DOM.statMenor.textContent = "–";
        DOM.statMaior.textContent = "–";
        DOM.distribution.innerHTML = `<p style="text-align:center; opacity:0.6;">Ainda não há dados suficientes para o dia de hoje.</p>`;
        return;
      }

      const jogadas = globalData.jogadas || 0;
      const vitorias = globalData.vitorias || 0;
      const taxa = jogadas ? Math.round((vitorias / jogadas) * 100) + "%" : "0%";
      const dist = globalData.distribuicao || {};

      DOM.statJogadas.textContent = jogadas;
      DOM.statVitorias.textContent = vitorias;
      DOM.statTaxa.textContent = taxa;
      DOM.statSeqAtual.textContent = "–";
      DOM.statMelhorSeq.textContent = "–";
      DOM.statMedia.textContent = "–";
      DOM.statMenor.textContent = "–";
      DOM.statMaior.textContent = "–";

      renderDistributionChart(dist);
    } else {
      // Estatísticas Pessoais (Padrão)
      const s = AmigodleStorage.getStats();
      DOM.statJogadas.textContent = s.jogadas;
      DOM.statVitorias.textContent = s.vitorias;
      DOM.statTaxa.textContent = s.jogadas ? Math.round((s.vitorias / s.jogadas) * 100) + "%" : "0%";
      DOM.statSeqAtual.textContent = s.sequenciaAtual;
      DOM.statMelhorSeq.textContent = s.melhorSequencia;
      DOM.statMedia.textContent = s.vitorias
        ? (s.somaTentativasVitorias / s.vitorias).toFixed(1)
        : "0";
      DOM.statMenor.textContent = s.menorTentativas ?? "–";
      DOM.statMaior.textContent = s.maiorTentativas ?? "–";

      renderDistributionChart(s.distribuicao || {});
    }
  }

  function renderDistributionChart(distrib) {
    const maxCount = Math.max(1, ...Object.values(distrib));
    DOM.distribution.innerHTML = "";
    for (let i = 1; i <= 10; i++) {
      const count = distrib[String(i)] || 0;
      const pct = Math.max((count / maxCount) * 100, count > 0 ? 8 : 0);
      const row = document.createElement("div");
      row.className = "dist-row";
      row.innerHTML = `
        <span class="dist-label">${i}</span>
        <div class="dist-bar-track">
          <div class="dist-bar-fill ${count > 0 ? "filled" : ""}" style="width:${pct}%;">${
        count > 0 ? count : ""
      }</div>
        </div>`;
      DOM.distribution.appendChild(row);
    }
  }

  // Eventos de alternância das abas de Estatísticas
  if (DOM.btnStatsPersonal) {
    DOM.btnStatsPersonal.addEventListener("click", () => {
      state.statsTab = "personal";
      DOM.btnStatsPersonal.classList.add("active");
      if (DOM.btnStatsGlobal) DOM.btnStatsGlobal.classList.remove("active");
      renderStatsModal();
    });
  }

  if (DOM.btnStatsGlobal) {
    DOM.btnStatsGlobal.addEventListener("click", () => {
      state.statsTab = "global";
      DOM.btnStatsGlobal.classList.add("active");
      if (DOM.btnStatsPersonal) DOM.btnStatsPersonal.classList.remove("active");
      renderStatsModal();
    });
  }

  DOM.btnStats.addEventListener("click", () => {
    renderStatsModal();
    openModal(DOM.modalStats);
  });
  DOM.btnRules.addEventListener("click", () => openModal(DOM.modalRules));
  DOM.btnSettings.addEventListener("click", () => openModal(DOM.modalSettings));

  // ---------------------------------------------------------
  // Configurações
  // ---------------------------------------------------------
  DOM.toggleSound.checked = settings.somAtivado;
  DOM.toggleTheme.checked = settings.temaEscuro;
  document.body.classList.toggle("light-mode", !settings.temaEscuro);

  DOM.toggleSound.addEventListener("change", () => {
    settings.somAtivado = DOM.toggleSound.checked;
    AmigodleStorage.saveSettings(settings);
  });
  DOM.toggleTheme.addEventListener("change", () => {
    settings.temaEscuro = DOM.toggleTheme.checked;
    AmigodleStorage.saveSettings(settings);
    document.body.classList.toggle("light-mode", !settings.temaEscuro);
  });

  DOM.btnResetProgress.addEventListener("click", () => {
    closeModal(DOM.modalSettings);
    openModal(DOM.modalConfirmReset);
  });
  DOM.btnConfirmReset.addEventListener("click", () => {
    AmigodleStorage.clearAllProgress();
    closeModal(DOM.modalConfirmReset);
    showToast("Progresso apagado.");
    updateHeaderStats();
    if (state.mode === "daily") loadDailyMode();
    else loadFreeMode(false);
  });

  // ---------------------------------------------------------
  // Inicialização
  // ---------------------------------------------------------
  async function init() {
    try {
      await AmigodleData.loadFriends();
    } catch {
      DOM.loadingScreen.innerHTML =
        '<p style="max-width:340px;text-align:center;">Não foi possível carregar os dados dos amigos. Verifique se os arquivos <code>friends.json</code> e <code>js/friends-data.js</code> existem e se o array de amigos não está vazio, depois recarregue a página.</p>';
      return;
    }

    buildBoardHeader();
    setActiveMode("daily");
    loadDailyMode();

    DOM.loadingScreen.classList.add("hidden");
    DOM.app.classList.remove("hidden");
  }

  init();
})();
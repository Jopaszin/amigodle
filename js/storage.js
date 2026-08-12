/* =========================================================
   AMIGODLE — storage.js
   Toda a leitura/escrita no localStorage passa por aqui.
   Sincroniza estatísticas globais com o Firebase.
   ========================================================= */

const AmigodleStorage = (() => {
  const KEYS = {
    STATS: "amigodle_stats_v1",
    DAILY_STATE: "amigodle_daily_state_v1",
    SETTINGS: "amigodle_settings_v1",
  };

  const DEFAULT_STATS = {
    jogadas: 0,
    vitorias: 0,
    sequenciaAtual: 0,
    melhorSequencia: 0,
    somaTentativasVitorias: 0,
    menorTentativas: null,
    maiorTentativas: null,
    distribuicao: {}, // { "1": 2, "2": 5, ... }
    ultimoDiaJogado: null, // yyyy-mm-dd
  };

  const DEFAULT_SETTINGS = {
    somAtivado: true,
    temaEscuro: true,
  };

  function safeParse(raw, fallback) {
    if (!raw) return fallback;
    try {
      return { ...fallback, ...JSON.parse(raw) };
    } catch {
      return fallback;
    }
  }

  function getStats() {
    return safeParse(localStorage.getItem(KEYS.STATS), { ...DEFAULT_STATS });
  }

  function saveStats(stats) {
    localStorage.setItem(KEYS.STATS, JSON.stringify(stats));
  }

  /**
   * Registra o resultado de uma partida do MODO DIÁRIO.
   * Atualiza o localStorage pessoal e o banco global no Firebase.
   */
  function registerDailyResult({ won, attempts, dayKey }) {
    const stats = getStats();
    stats.jogadas += 1;

    // Sequência local do jogador
    if (won) {
      stats.vitorias += 1;
      stats.sequenciaAtual += 1;
      stats.melhorSequencia = Math.max(stats.melhorSequencia, stats.sequenciaAtual);
      stats.somaTentativasVitorias += attempts;
      stats.menorTentativas =
        stats.menorTentativas === null ? attempts : Math.min(stats.menorTentativas, attempts);
      stats.maiorTentativas =
        stats.maiorTentativas === null ? attempts : Math.max(stats.maiorTentativas, attempts);
      const key = String(attempts);
      stats.distribuicao[key] = (stats.distribuicao[key] || 0) + 1;
    } else {
      stats.sequenciaAtual = 0;
    }

    stats.ultimoDiaJogado = dayKey;
    saveStats(stats);

    // --- ENVIAR PARA O FIREBASE (ESTATÍSTICAS GLOBAIS) ---
    if (window.db && window.dbRef && window.dbTransaction) {
      const statsRef = window.dbRef(window.db, `global_stats/${dayKey}`);
      
      window.dbTransaction(statsRef, (current) => {
        if (!current) {
          current = { jogadas: 0, vitorias: 0, distribuicao: {} };
        }
        current.jogadas = (current.jogadas || 0) + 1;
        if (won) {
          current.vitorias = (current.vitorias || 0) + 1;
          current.distribuicao = current.distribuicao || {};
          current.distribuicao[attempts] = (current.distribuicao[attempts] || 0) + 1;
        }
        return current;
      }).catch(err => console.error("Erro ao sincronizar com Firebase:", err));
    }

    return stats;
  }

  /**
   * Busca as estatísticas globais da comunidade do Firebase para o dia específico.
   */
  async function fetchGlobalStats(dayKey) {
    if (!window.db || !window.dbRef || !window.dbGet || !window.dbChild) {
      return null;
    }
    try {
      const snapshot = await window.dbGet(window.dbChild(window.dbRef(window.db), `global_stats/${dayKey}`));
      return snapshot.exists() ? snapshot.val() : null;
    } catch (err) {
      console.error("Erro ao buscar estatísticas globais do Firebase:", err);
      return null;
    }
  }

  function resetStats() {
    saveStats({ ...DEFAULT_STATS, distribuicao: {} });
  }

  function getDailyState() {
    const fallback = { dayKey: null, attempts: [], finished: false, won: false };
    return safeParse(localStorage.getItem(KEYS.DAILY_STATE), fallback);
  }

  function saveDailyState(state) {
    localStorage.setItem(KEYS.DAILY_STATE, JSON.stringify(state));
  }

  function getSettings() {
    return safeParse(localStorage.getItem(KEYS.SETTINGS), { ...DEFAULT_SETTINGS });
  }

  function saveSettings(settings) {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  }

  function clearAllProgress() {
    localStorage.removeItem(KEYS.STATS);
    localStorage.removeItem(KEYS.DAILY_STATE);
  }

  return {
    getStats,
    saveStats,
    registerDailyResult,
    fetchGlobalStats, // Exporta a nova função global
    resetStats,
    getDailyState,
    saveDailyState,
    getSettings,
    saveSettings,
    clearAllProgress,
  };
})();
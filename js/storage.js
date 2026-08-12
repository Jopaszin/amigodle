/* =========================================================
   AMIGODLE — storage.js
   Toda a leitura/escrita no localStorage passa por aqui.
   Nenhum dado é enviado para servidores externos: tudo fica
   salvo apenas no navegador do jogador.
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
    ultimoDiaJogado: null, // yyyy-mm-dd, para saber se a sequência quebrou
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
   * O modo livre nunca chama esta função.
   */
  function registerDailyResult({ won, attempts, dayKey }) {
    const stats = getStats();
    stats.jogadas += 1;

    // Sequência: se o último dia jogado não foi o dia anterior, zera.
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
    return stats;
  }

  function resetStats() {
    saveStats({ ...DEFAULT_STATS, distribuicao: {} });
  }

  /**
   * Estado da partida diária em andamento (persiste tentativas,
   * se já ganhou, etc). Guardamos a data para saber se é de hoje.
   */
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
    // Configurações (som/tema) são mantidas de propósito.
  }

  return {
    getStats,
    saveStats,
    registerDailyResult,
    resetStats,
    getDailyState,
    saveDailyState,
    getSettings,
    saveSettings,
    clearAllProgress,
  };
})();

/* =========================================================
   AMIGODLE — data.js
   Tudo relacionado aos DADOS dos amigos e às regras de
   comparação de atributos vive neste arquivo.
   Para trocar os amigos, edite apenas "friends.json".
   ========================================================= */

const AmigodleData = (() => {
  // Data de "lançamento" do jogo. É a partir dela que contamos
  // os dias para escolher o amigo do dia de forma determinística.
  const EPOCH = "2026-01-01";

  /**
   * Definição das colunas/atributos exibidos no tabuleiro.
   * type:
   *  - "text"     -> comparação exata (verde/vermelho), com possibilidade
   *                  de regra especial de "parcial" (yellowRule).
   *  - "numeric"  -> compara números, mostra seta ⬆️/⬇️.
   *  - "ordinal"  -> lista ordenada (ex: nível de gamer), mostra seta
   *                  quando não é o valor exato mas está próximo.
   */
  const ATTRIBUTES = [
    { key: "idade", label: "Idade", type: "numeric", unit: " anos", tolerance: 3 },
    { key: "genero", label: "Gênero", type: "text" },
    { key: "profissao", label: "Profissão", type: "text" },
    { key: "faculdade", label: "Faculdade", type: "text" },
    { key: "curso", label: "Curso", type: "text", yellowRule: "faculdade" },
    { key: "altura", label: "Altura", type: "numeric", unit: "m", tolerance: 0.05, decimals: 2 },
    { key: "jogo_favorito", label: "Jogo Favorito", type: "text" },
    { key: "time", label: "Time", type: "text", yellowRule: "estado" },
    {
      key: "nivel_de_gamer",
      label: "Nível Gamer",
      type: "ordinal",
      order: ["Casual", "Intermediário", "Hardcore", "Prata", "Tryhard", "Tenta", "Troll"],
    },
  ];

  // Elementos do zodíaco, usados para dar "amarelo" quando o signo
  // é diferente mas do mesmo elemento (fogo/terra/ar/água).
  const ZODIAC_ELEMENT = {
    Áries: "fogo", Leão: "fogo", Sagitário: "fogo",
    Touro: "terra", Virgem: "terra", Capricórnio: "terra",
    Gêmeos: "ar", Libra: "ar", Aquário: "ar",
    Câncer: "água", Escorpião: "água", Peixes: "água",
  };

  let friends = [];

  /**
   * Carrega os amigos. Duas fontes possíveis, nessa ordem de prioridade:
   *  1) window.AMIGODLE_FRIENDS, definido em js/friends-data.js — funciona
   *     mesmo abrindo o index.html direto (clique duplo, protocolo file://),
   *     já que é um <script> comum e não sofre bloqueio de CORS.
   *  2) fetch("friends.json") — usado como alternativa/validação quando o
   *     jogo é servido por um servidor HTTP (útil se você preferir manter
   *     e editar só o .json). Se friends.json estiver mais atualizado que
   *     friends-data.js, ele é o que vale quando há servidor.
   */
  async function loadFriends() {
    if (friends.length) return friends;

    try {
      const res = await fetch("friends.json", { cache: "no-store" });
      if (res.ok) {
        friends = await res.json();
        return friends;
      }
    } catch {
      // Provavelmente rodando via file:// (sem servidor) — sem problema,
      // cai para os dados embutidos abaixo.
    }

    if (Array.isArray(window.AMIGODLE_FRIENDS) && window.AMIGODLE_FRIENDS.length) {
      friends = window.AMIGODLE_FRIENDS;
      return friends;
    }

    console.error(
      "[Amigodle] Não foi possível carregar os amigos nem via friends.json nem via js/friends-data.js."
    );
    throw new Error("Nenhuma fonte de dados de amigos disponível.");
  }

  function getFriends() {
    return friends;
  }

  function getFriendById(id) {
    return friends.find((f) => f.id === id) || null;
  }

  /** Normaliza texto para comparação/busca (remove acentos, minúsculas). */
  function normalize(str) {
    return (str ?? "")
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  /**
   * Índice do dia atual, de forma determinística e igual para
   * todo mundo — baseado apenas na data (não usa Math.random()).
   * Reinicia o ciclo automaticamente quando passa da lista de amigos.
   */
  function getDayIndex(dateObj = new Date(), total = friends.length) {
    const epoch = new Date(EPOCH + "T00:00:00");
    const d = new Date(
      dateObj.getFullYear(),
      dateObj.getMonth(),
      dateObj.getDate()
    );
    const e = new Date(epoch.getFullYear(), epoch.getMonth(), epoch.getDate());
    const diffDays = Math.round((d - e) / 86400000);
    const safeTotal = Math.max(total, 1);
    return ((diffDays % safeTotal) + safeTotal) % safeTotal;
  }

  function getTodayKey(dateObj = new Date()) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, "0");
    const d = String(dateObj.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function getDailyFriend(dateObj = new Date()) {
    if (!friends.length) return null;
    const idx = getDayIndex(dateObj, friends.length);
    return friends[idx];
  }

  /** Número do "episódio" do Amigodle, começando em #1 no dia do EPOCH. */
  function getPuzzleNumber(dateObj = new Date()) {
    const epoch = new Date(EPOCH + "T00:00:00");
    const d = new Date(
      dateObj.getFullYear(),
      dateObj.getMonth(),
      dateObj.getDate()
    );
    const e = new Date(epoch.getFullYear(), epoch.getMonth(), epoch.getDate());
    const diffDays = Math.round((d - e) / 86400000);
    return Math.max(diffDays + 1, 1);
  }

  function msUntilNextDay() {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return next - now;
  }

  /**
   * Compara um atributo do palpite com o atributo do amigo secreto.
   * Retorna { state: 'green'|'yellow'|'red', arrow: '⬆️'|'⬇️'|null, display: string }
   */
  function compareAttribute(attr, guessFriend, secretFriend) {
    const guessVal = guessFriend[attr.key];
    const secretVal = secretFriend[attr.key];

    if (attr.type === "numeric") {
      const g = Number(guessVal);
      const s = Number(secretVal);
      const decimals = attr.decimals ?? 0;
      const display = decimals ? g.toFixed(decimals) + (attr.unit || "") : g + (attr.unit || "");
      if (g === s) {
        return { state: "green", arrow: null, display };
      }
      const arrow = s > g ? "⬆️" : "⬇️";
      const diff = Math.abs(g - s);
      const state = diff <= (attr.tolerance ?? 0) ? "yellow" : "red";
      return { state, arrow, display };
    }

    if (attr.type === "ordinal") {
      const order = attr.order;
      const gi = order.indexOf(guessVal);
      const si = order.indexOf(secretVal);
      const display = guessVal;
      if (gi === si) return { state: "green", arrow: null, display };
      const arrow = si > gi ? "⬆️" : "⬇️";
      const state = Math.abs(gi - si) === 1 ? "yellow" : "red";
      return { state, arrow, display };
    }

    // type === "text"
    const display = guessVal;
    if (normalize(guessVal) === normalize(secretVal)) {
      return { state: "green", arrow: null, display };
    }

    if (attr.yellowRule) {
      if (attr.yellowRule === "elemento_zodiaco") {
        const ge = ZODIAC_ELEMENT[guessVal];
        const se = ZODIAC_ELEMENT[secretVal];
        if (ge && ge === se) return { state: "yellow", arrow: null, display };
      } else {
        // yellowRule referencia outro campo do próprio amigo (ex: estado, faculdade)
        const relatedKey = attr.yellowRule;
        if (
          guessFriend[relatedKey] !== undefined &&
          normalize(guessFriend[relatedKey]) === normalize(secretFriend[relatedKey])
        ) {
          return { state: "yellow", arrow: null, display };
        }
      }
    }

    return { state: "red", arrow: null, display };
  }

  /** Compara um palpite inteiro, atributo por atributo. */
  function evaluateGuess(guessFriend, secretFriend) {
    const isCorrect = guessFriend.id === secretFriend.id;
    const results = ATTRIBUTES.map((attr) => ({
      key: attr.key,
      ...compareAttribute(attr, guessFriend, secretFriend),
    }));
    return { isCorrect, results };
  }

  return {
    ATTRIBUTES,
    loadFriends,
    getFriends,
    getFriendById,
    getDayIndex,
    getDailyFriend,
    getTodayKey,
    getPuzzleNumber,
    msUntilNextDay,
    evaluateGuess,
    normalize,
  };
})();

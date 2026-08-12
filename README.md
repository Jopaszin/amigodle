# 🎯 Amigodle

Um jogo de adivinhação diário no estilo Wordle/OnePiecedle, mas com o elenco mais
importante de todos: **os seus amigos**. 100% front-end, sem backend, sem
servidores externos — tudo roda no navegador e os dados ficam salvos
apenas no `localStorage` do jogador.

---

## 1. Como rodar o jogo

**Boa notícia: pode simplesmente dar clique duplo em `index.html`.** Ele abre
direto no navegador (protocolo `file://`) e funciona normalmente, porque os
dados dos amigos vêm embutidos em `js/friends-data.js`, que não sofre o
bloqueio de CORS que arquivos `.json` carregados via `fetch()` sofrem.

Se preferir (opcional), também dá para servir a pasta por HTTP — nesse caso o
jogo tenta carregar `friends.json` primeiro e só usa o `js/friends-data.js`
como alternativa se isso falhar:

**Opção A — Python (já vem instalado na maioria dos sistemas):**
```bash
cd amigodle
python3 -m http.server 8080
```
Depois acesse `http://localhost:8080` no navegador.

**Opção B — VS Code:** instale a extensão "Live Server" e clique em
"Go Live" com a pasta `amigodle` aberta.

Qualquer outro servidor estático (Node `http-server`, Nginx, GitHub Pages,
Netlify, Vercel, etc.) também funciona, já que o projeto é 100% estático.

---

## 2. Estrutura do projeto

```
/amigodle
  /images                → fotos dos amigos (ficam só aqui, localmente)
  /css/style.css          → todo o visual do jogo
  /js/friends-data.js      → banco de dados dos amigos (EDITE AQUI)
  /js/data.js              → atributos e regras de comparação
  /js/storage.js            → leitura/escrita no localStorage
  /js/game.js                → lógica do jogo e interface
  index.html                  → página principal
  friends.json                 → cópia dos mesmos dados em JSON puro (opcional)
  README.md
```

---

## 3. Onde editar os dados dos meus amigos

Edite **o arquivo `js/friends-data.js`** — é a fonte principal de dados que o
jogo usa, e funciona tanto com clique duplo quanto servido por HTTP. Ele tem
exatamente a mesma estrutura de um JSON, só que começa com
`window.AMIGODLE_FRIENDS = [ ... ]` para o navegador conseguir carregá-lo sem
precisar de servidor.

Se você preferir rodar sempre com um servidor HTTP (seção 1, opções A/B),
pode editar `friends.json` em vez disso — nesse caso o jogo prioriza esse
arquivo automaticamente. Só não é obrigatório manter os dois em sincronia;
edite qualquer um dos dois, o que for mais conveniente para o seu fluxo.

Cada amigo é um objeto assim:

```json
{
  "id": 1,
  "nome": "João",
  "apelido": "JP",
  "foto": "images/joao.jpg",
  "idade": 22,
  "genero": "Masculino",
  "cidade": "Juiz de Fora",
  "estado": "MG",
  "profissao": "Programador",
  "faculdade": "UFJF",
  "curso": "Ciência da Computação",
  "signo": "Aquário",
  "altura": 1.78,
  "cor_favorita": "Azul",
  "jogo_favorito": "Tibia",
  "personagem_favorito": "Batman",
  "time": "Botafogo",
  "bebida_favorita": "Coca-Cola",
  "comida_favorita": "Pizza",
  "animal_favorito": "Cachorro",
  "plataforma": "PC",
  "personalidade": "Extrovertido",
  "nivel_de_gamer": "Hardcore"
}
```

Regras importantes:
- `id` precisa ser **único** e numérico.
- Para o campo `nivel_de_gamer`, use exatamente um destes três valores:
  `"Casual"`, `"Intermediário"` ou `"Hardcore"` (o jogo usa essa ordem
  para calcular as setas ⬆️/⬇️).
- Para `signo`, use os nomes em português (`Áries`, `Touro`, `Gêmeos`,
  `Câncer`, `Leão`, `Virgem`, `Libra`, `Escorpião`, `Sagitário`,
  `Capricórnio`, `Aquário`, `Peixes`) para que a comparação por
  "elemento do zodíaco" funcione.
- `altura` é em metros (ex: `1.78`).
- Você pode ter **quantos amigos quiser** (o exemplo vem com 10). Quanto
  mais amigos, mais dias o ciclo diário demora para repetir.
- Para remover um amigo, basta apagar o objeto correspondente do array.

### Se quiser adicionar/remover um atributo (coluna)

Abra `js/data.js` e edite a lista `ATTRIBUTES` no topo do arquivo. Cada
atributo tem:
- `key`: o nome do campo em `friends.json`.
- `label`: o texto mostrado no cabeçalho da tabela.
- `type`: `"text"` (comparação exata, com opção de regra de "amarelo"
  via `yellowRule`), `"numeric"` (mostra setas, use `tolerance` para
  definir a faixa que vira amarelo) ou `"ordinal"` (lista ordenada,
  como o nível de gamer).

Isso é o único lugar do projeto onde a lógica de comparação vive —
tudo centralizado, como pedido.

---

## 4. Onde colocar as fotos

Coloque os arquivos de imagem dentro da pasta `/images` e aponte o campo
`foto` de cada amigo para o caminho relativo, por exemplo:

```
images/joao.jpg
images/maria.png
```

O projeto já vem com **avatares de placeholder em SVG** (gerados
automaticamente, com iniciais e cores) para os 10 amigos de exemplo, só
para o jogo funcionar de imediato. Substitua esses arquivos pelas fotos
reais dos seus amigos (podem ser `.jpg`, `.png` ou `.webp` — só ajuste a
extensão no `foto` de cada amigo em `friends.json`).

Recomendações:
- Use fotos quadradas (ex: 400x400px) para o melhor enquadramento.
- Mantenha os arquivos leves (idealmente < 300KB cada) para carregar rápido.
- As fotos **nunca saem do seu projeto** — não há upload nem envio para
  nenhum servidor externo.

---

## 5. Privacidade

- O jogo não faz nenhuma chamada de rede além de carregar seus próprios
  arquivos locais (`friends.json`, imagens, CSS, JS) e as fontes do
  Google Fonts (que podem ser removidas do `index.html` se você quiser
  zero dependência externa).
- Não há analytics, cookies de rastreamento ou coleta de dados.
- Tudo que é salvo (estatísticas, progresso do dia, configurações) fica
  no `localStorage` do navegador de cada jogador — nunca é compartilhado
  com ninguém, nem entre dispositivos.
- O botão "Compartilhar resultado" gera apenas um texto com quadradinhos
  coloridos (🟩🟨🟥) e o número de tentativas — o nome do amigo secreto
  nunca aparece no texto compartilhado.
- Para remover um amigo do jogo (ex: a pedido da pessoa), basta apagar o
  objeto dele em `friends.json` e a foto correspondente em `/images`.

---

## 6. Modo Diário vs. Modo Livre

- **Modo Diário**: o amigo do dia é escolhido de forma **determinística**,
  com base apenas na data (não usa `Math.random()`), então todos os
  jogadores recebem o mesmo amigo no mesmo dia. O amigo muda
  automaticamente à meia-noite. As estatísticas (sequência, taxa de
  acerto etc.) só são atualizadas neste modo.
- **Modo Livre**: sorteia um amigo aleatório para praticar, sem limite de
  tentativas ou de partidas. Não afeta as estatísticas do modo diário.

---

## 7. Limitações por ser um projeto apenas front-end

Como pedido, o projeto não usa backend. Isso traz algumas limitações
inerentes, com as alternativas adotadas:

- **Sincronização entre dispositivos**: como tudo fica no `localStorage`,
  as estatísticas de um jogador não se sincronizam entre celular e
  computador, por exemplo. Alternativa: o jogo é local por dispositivo/
  navegador, exatamente como o Wordle original antes de ter conta.
- **"Trapaça" no amigo do dia**: como o cálculo do amigo do dia acontece
  no navegador do jogador, um usuário tecnicamente curioso poderia abrir
  o console e inspecionar `js/data.js` para descobrir a resposta. Não há
  como evitar isso 100% sem um servidor validando as respostas — é a
  mesma limitação de qualquer Wordle-like front-end-only.
- **Relógio do jogador**: o "amigo do dia" depende da data/hora do
  dispositivo do jogador. Se alguém alterar manualmente o relógio do
  computador, o jogo mostrará outro dia. Isso é aceitável para um jogo
  casual entre amigos.
- **Compartilhamento**: usamos a Web Share API quando disponível
  (celulares) e `navigator.clipboard` como alternativa em desktop, com
  um fallback manual de cópia caso o navegador bloqueie ambos.

---

## 8. Checklist de verificação (já testado)

- [x] Sem erros de JavaScript (`node --check` em todos os arquivos `.js`).
- [x] Todos os botões e modais funcionam (regras, configurações,
      estatísticas, vitória, confirmação de reset).
- [x] `localStorage` grava e lê estatísticas corretamente (testado com
      simulação).
- [x] Amigo do dia é determinístico para a mesma data e reinicia o ciclo
      corretamente quando passa da lista de amigos.
- [x] Sistema de comparação (verde/amarelo/vermelho + setas) validado
      com casos de teste.
- [x] Autocomplete filtra por nome/apelido, ignora acentuação/maiúsculas
      e bloqueia tentativas repetidas.
- [x] Compartilhamento gera grid de emojis sem revelar o nome do amigo.
- [x] Layout responsivo, com rolagem horizontal da tabela em telas
      pequenas.
- [x] Amigos são 100% substituíveis via `friends.json`, sem tocar em
      código.

Divirta-se descobrindo quem é o amigo do dia! 🎉

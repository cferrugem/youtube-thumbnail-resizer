// === YouTube Thumbnail Resizer - focus mode ===
// Pausa o video da watch page quando sua atencao sai dele: trocar de aba,
// minimizar, Alt+Tab pra outro app, ou rolar ate os comentarios.
// Retoma quando (e so quando) todos os motivos sumiram.

const FOCUS_DEFAULTS = {
  focusEnabled: true,
  focusOnBlur: true,      // trocar de aba / minimizar / janela perde o foco
  focusOnComments: true   // comentarios entram no viewport
};

let cfg = Object.assign({}, FOCUS_DEFAULTS);

// motivos ativos pra estar pausado: "hidden" | "blur" | "comments"
const reasons = new Set();

let pausedByUs = false;   // a pausa atual foi nossa?
let selfPauseAt = 0;      // quando chamamos .pause() por ultimo (ver onVideoPause)

// ---------------------------------------------------------------- helpers

function onWatchPage() {
  return location.pathname === "/watch";
}

function getVideo() {
  // o player da watch page; ignora previews de thumbnail da home
  return document.querySelector("#movie_player video") ||
         document.querySelector("video.html5-main-video");
}

// ---------------------------------------------------------------- core

function pauseNow() {
  const v = getVideo();
  if (!v || v.paused) return;
  selfPauseAt = Date.now();
  v.pause();
  pausedByUs = true;
}

function resumeNow() {
  const v = getVideo();
  if (!v || !v.paused) return;
  if (!pausedByUs) return;   // pausa manual do usuario: nao mexemos
  pausedByUs = false;
  const p = v.play();
  if (p && typeof p.catch === "function") p.catch(() => {});
}

function addReason(reason) {
  if (!cfg.focusEnabled || !onWatchPage()) return;
  if (reasons.has(reason)) return;
  reasons.add(reason);
  pauseNow();
}

function removeReason(reason) {
  if (!reasons.delete(reason)) return;
  if (reasons.size > 0) return;  // ainda tem outro motivo segurando a pausa
  if (!cfg.focusEnabled) return;
  resumeNow();
}

function clearAllReasons() {
  reasons.clear();
  pausedByUs = false;
}

// ---------------------------------------------------------------- video events
// Precisamos saber quando a pausa foi do usuario pra nunca dar play por conta.

let watchedVideo = null;

function onVideoPause() {
  // O evento "pause" e disparado de forma assincrona, entao nao da pra usar um
  // flag zerado logo apos o .pause(): o handler rodaria depois. Uma janela curta
  // de tempo distingue a nossa pausa da do usuario de forma confiavel.
  if (Date.now() - selfPauseAt < 200) return;  // fomos nos
  pausedByUs = false;                          // foi o usuario: a pausa e dele
}

function onVideoPlay() {
  pausedByUs = false;
}

function bindVideo() {
  const v = getVideo();
  if (v === watchedVideo) return;
  if (watchedVideo) {
    watchedVideo.removeEventListener("pause", onVideoPause);
    watchedVideo.removeEventListener("play", onVideoPlay);
  }
  watchedVideo = v;
  if (v) {
    v.addEventListener("pause", onVideoPause);
    v.addEventListener("play", onVideoPlay);
  }
}

// ---------------------------------------------------------------- gatilho: aba / janela

function onVisibilityChange() {
  if (!cfg.focusOnBlur) return;
  if (document.hidden) addReason("hidden");
  else removeReason("hidden");
}

function onWindowBlur() {
  if (!cfg.focusOnBlur) return;
  addReason("blur");
}

function onWindowFocus() {
  removeReason("blur");
}

document.addEventListener("visibilitychange", onVisibilityChange);
window.addEventListener("blur", onWindowBlur);
window.addEventListener("focus", onWindowFocus);

// ---------------------------------------------------------------- gatilho: comentarios

let commentsObserver = null;
let observedComments = null;

const onCommentsIntersect = (entries) => {
  if (!cfg.focusOnComments) return;
  for (const entry of entries) {
    if (entry.isIntersecting) addReason("comments");
    else removeReason("comments");
  }
};

function attachCommentsObserver() {
  const el = document.querySelector("#comments");
  if (!el || el === observedComments) return;
  detachCommentsObserver();
  observedComments = el;
  // #comments pode ter dezenas de milhares de pixels de altura, entao um
  // threshold por proporcao seria imprevisivel. Em vez disso encolhemos a borda
  // de baixo do viewport em 20%: o motivo so entra quando o topo dos comentarios
  // sobe alem de 80% da tela. Estavel, independente da altura da secao.
  commentsObserver = new IntersectionObserver(onCommentsIntersect, {
    root: null,
    rootMargin: "0px 0px -20% 0px",
    threshold: 0
  });
  commentsObserver.observe(el);
}

function detachCommentsObserver() {
  if (commentsObserver) commentsObserver.disconnect();
  commentsObserver = null;
  observedComments = null;
}

// ---------------------------------------------------------------- ciclo de vida

function sync() {
  if (!cfg.focusEnabled || !onWatchPage()) {
    detachCommentsObserver();
    clearAllReasons();
    return;
  }
  bindVideo();
  attachCommentsObserver();
}

// desligar um gatilho no popup limpa o motivo dele na hora
function applyConfig(next) {
  const prev = cfg;
  cfg = Object.assign({}, FOCUS_DEFAULTS, next || {});
  if (!cfg.focusEnabled) {
    const wasPaused = reasons.size > 0;
    reasons.clear();
    if (wasPaused) resumeNow();
    detachCommentsObserver();
    return;
  }
  if (!cfg.focusOnBlur) {
    removeReason("hidden");
    removeReason("blur");
  }
  if (!cfg.focusOnComments) removeReason("comments");
  // Religar um gatilho deve valer na hora. O IntersectionObserver so chama de
  // volta quando a intersecao muda, entao reanexamos pra forcar a avaliacao
  // inicial - senao, religar isso ja dentro dos comentarios nao faria nada.
  if (cfg.focusOnComments && !prev.focusOnComments) detachCommentsObserver();
  sync();
}

chrome.storage.local.get(FOCUS_DEFAULTS, applyConfig);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local") chrome.storage.local.get(FOCUS_DEFAULTS, applyConfig);
});

// YouTube troca de video sem recarregar; #comments nasce preguicoso.
// Mesmo padrao do content.js: evento de navegacao + recheque periodico.
window.addEventListener("yt-navigate-finish", () => {
  clearAllReasons();
  detachCommentsObserver();
  sync();
});
setInterval(sync, 2000);
sync();

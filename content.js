// === YouTube Thumbnail Resizer - content script ===

const DEFAULTS = {
  homeEnabled: true,
  homeCols: 5,          // columns on home/subscriptions (more columns = smaller)

  sideEnabled: true,
  sideWidth: 140,       // thumbnail width (px) in watch-page suggestions

  searchPreset: "medium" // search results: off | small | medium | large
};

const SEARCH_PX = { small: 160, medium: 220, large: 300 };

const STYLE_ID = "ytr-style";

function buildCSS(s) {
  const sideH = Math.round(s.sideWidth * 9 / 16);
  let css = "";

  // ---- HOME / INSCRICOES / CANAL (grid responsivo) ----
  if (s.homeEnabled) {
    css += `
    ytd-rich-grid-renderer {
      --ytd-rich-grid-items-per-row: ${s.homeCols} !important;
      --ytd-rich-grid-posts-per-row: ${s.homeCols} !important;
    }`;
  }

  // ---- SUGESTOES AO ASSISTIR (barra lateral / embaixo) ----
  // Layout NOVO do YouTube: lockups. A largura da coluna da imagem manda;
  // a altura segue sozinha por aspect-ratio (.ytThumbnailViewModelHost).
  if (s.sideEnabled) {
    css += `
    ytd-watch-next-secondary-results-renderer .ytLockupViewModelContentImage,
    #secondary .ytLockupViewModelContentImage,
    #related .ytLockupViewModelContentImage {
      flex: none !important;
      width: ${s.sideWidth}px !important;
      min-width: ${s.sideWidth}px !important;
      max-width: ${s.sideWidth}px !important;
    }
    /* fallback: superficies que ainda usam o componente antigo (fila, playlists) */
    ytd-compact-video-renderer ytd-thumbnail,
    ytd-compact-video-renderer a#thumbnail {
      flex: none !important;
      min-width: ${s.sideWidth}px !important;
      width: ${s.sideWidth}px !important;
      height: ${sideH}px !important;
    }
    ytd-compact-video-renderer ytd-thumbnail img,
    ytd-compact-video-renderer a#thumbnail img {
      width: 100% !important;
      height: 100% !important;
    }`;
  }

  // ---- RESULTADOS DE BUSCA ----
  // A thumbnail tem flex:1 + min-width:240 (cresce pra preencher). Por isso so
  // setar width era ignorado. Aqui forcamos flex:none com largura fixa; a altura
  // segue pelo :before (padding-top) que o proprio YouTube usa.
  // ---- SEARCH RESULTS (preset sizes) ----
  if (s.searchPreset && s.searchPreset !== "off") {
    const W = SEARCH_PX[s.searchPreset] || SEARCH_PX.medium;
    css += `
    ytd-video-renderer ytd-thumbnail,
    ytd-video-renderer ytd-thumbnail.ytd-video-renderer {
      flex: 0 0 ${W}px !important;
      width: ${W}px !important;
      min-width: ${W}px !important;
      max-width: ${W}px !important;
    }
    ytd-video-renderer ytd-thumbnail a#thumbnail,
    ytd-video-renderer ytd-thumbnail yt-image,
    ytd-video-renderer ytd-thumbnail .yt-core-image,
    ytd-video-renderer ytd-thumbnail img {
      width: 100% !important;
      height: 100% !important;
    }
    ytd-search .ytLockupViewModelHorizontal .ytLockupViewModelContentImage {
      flex: none !important;
      width: ${W}px !important;
      min-width: ${W}px !important;
      max-width: ${W}px !important;
    }`;
  }

  return css;
}

function applyStyle(settings) {
  const s = Object.assign({}, DEFAULTS, settings || {});
  let el = document.getElementById(STYLE_ID);
  if (!el) {
    el = document.createElement("style");
    el.id = STYLE_ID;
    (document.head || document.documentElement).appendChild(el);
  }
  el.textContent = buildCSS(s);
}

// aplica ao carregar
chrome.storage.local.get(DEFAULTS, applyStyle);

// reaplica ao mudar as preferencias no popup (ao vivo, sem reload)
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local") {
    chrome.storage.local.get(DEFAULTS, applyStyle);
  }
});

// garante que o <style> sobreviva caso o YouTube mexa no head durante navegacao SPA
const ensure = () => {
  if (!document.getElementById(STYLE_ID)) {
    chrome.storage.local.get(DEFAULTS, applyStyle);
  }
};
window.addEventListener("yt-navigate-finish", ensure);
setInterval(ensure, 2000);

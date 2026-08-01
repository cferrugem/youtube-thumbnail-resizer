const DEFAULTS = {
  homeEnabled: true,  homeCols: 5,
  sideEnabled: true,  sideWidth: 140,
  searchPreset: "medium",  // off | small | medium | large

  focusEnabled: false,     // opt-in: pausa o video quando sua atencao sai dele
  focusOnTabSwitch: true,  // trocar de aba / minimizar
  focusOnComments: true    // rolar ate os comentarios
};

const sliders = [
  { en: "homeEnabled", sl: "homeCols",  out: "homeColsVal" },
  { en: "sideEnabled", sl: "sideWidth", out: "sideWidthVal" }
];

// sub-toggles do modo foco, desligados junto com o master
const focusSubs = ["focusOnTabSwitch", "focusOnComments"];

let saveTimer = null;
function saveDebounced(obj) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => chrome.storage.local.set(obj), 80);
}

function refreshDisabled() {
  sliders.forEach(r => {
    document.getElementById(r.sl).disabled = !document.getElementById(r.en).checked;
  });
  const focusOn = document.getElementById("focusEnabled").checked;
  focusSubs.forEach(id => {
    const box = document.getElementById(id);
    box.disabled = !focusOn;
    box.closest(".row").classList.toggle("off", !focusOn);
  });
}

function markSearch(preset) {
  document.querySelectorAll("#searchSeg button").forEach(b => {
    b.classList.toggle("active", b.dataset.preset === preset);
  });
}

function render(s) {
  sliders.forEach(r => {
    document.getElementById(r.en).checked = s[r.en];
    document.getElementById(r.sl).value = s[r.sl];
    document.getElementById(r.out).textContent = s[r.sl];
  });
  markSearch(s.searchPreset);
  document.getElementById("focusEnabled").checked = s.focusEnabled;
  focusSubs.forEach(id => { document.getElementById(id).checked = s[id]; });
  refreshDisabled();
}

function collectSliders() {
  const obj = {};
  sliders.forEach(r => {
    obj[r.en] = document.getElementById(r.en).checked;
    obj[r.sl] = parseInt(document.getElementById(r.sl).value, 10);
    document.getElementById(r.out).textContent = obj[r.sl];
  });
  refreshDisabled();
  saveDebounced(obj);
}

// load
chrome.storage.local.get(DEFAULTS, render);

// slider + toggle listeners
sliders.forEach(r => {
  document.getElementById(r.en).addEventListener("change", collectSliders);
  document.getElementById(r.sl).addEventListener("input", collectSliders);
});

// focus mode toggles
["focusEnabled"].concat(focusSubs).forEach(id => {
  document.getElementById(id).addEventListener("change", () => {
    refreshDisabled();
    chrome.storage.local.set({ [id]: document.getElementById(id).checked });
  });
});

// search preset buttons
document.querySelectorAll("#searchSeg button").forEach(b => {
  b.addEventListener("click", () => {
    const preset = b.dataset.preset;
    markSearch(preset);
    chrome.storage.local.set({ searchPreset: preset });
  });
});

// reset
document.getElementById("reset").addEventListener("click", () => {
  chrome.storage.local.set(DEFAULTS, () => render(DEFAULTS));
});

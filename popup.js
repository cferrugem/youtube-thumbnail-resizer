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

// sub-toggles do modo foco, que seguem o master na UI
const focusSubs = ["focusOnTabSwitch", "focusOnComments"];

// Preferencia real de cada sub-toggle. Com o master desligado a UI mostra os
// dois apagados (senao parecem ativos sem estar), mas o valor escolhido fica
// guardado aqui e no storage - religar o master devolve a selecao de antes.
const focusPrefs = {};

let saveTimer = null;
function saveDebounced(obj) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => chrome.storage.local.set(obj), 80);
}

function refreshDisabled() {
  sliders.forEach(r => {
    document.getElementById(r.sl).disabled = !document.getElementById(r.en).checked;
  });
}

function paintFocus() {
  const on = document.getElementById("focusEnabled").checked;
  focusSubs.forEach(id => {
    const box = document.getElementById(id);
    box.checked = on && focusPrefs[id];
    box.disabled = !on;
    box.closest(".row").classList.toggle("off", !on);
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
  focusSubs.forEach(id => { focusPrefs[id] = s[id]; });
  paintFocus();
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

// focus mode: master repinta os sub-toggles, que so guardam a propria escolha
document.getElementById("focusEnabled").addEventListener("change", (e) => {
  paintFocus();
  chrome.storage.local.set({ focusEnabled: e.target.checked });
});

focusSubs.forEach(id => {
  document.getElementById(id).addEventListener("change", (e) => {
    focusPrefs[id] = e.target.checked;
    chrome.storage.local.set({ [id]: e.target.checked });
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

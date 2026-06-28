const DEFAULTS = {
  homeEnabled: true,  homeCols: 5,
  sideEnabled: true,  sideWidth: 140,
  searchPreset: "medium"   // off | small | medium | large
};

const sliders = [
  { en: "homeEnabled", sl: "homeCols",  out: "homeColsVal" },
  { en: "sideEnabled", sl: "sideWidth", out: "sideWidthVal" }
];

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

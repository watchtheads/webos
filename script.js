// TuffOS main script - window manager, dock, and all the little apps
// (yes it's a lot of vanilla JS in one file, i'll split it up eventually - probably)

var welcomeScreen = document.querySelector("#welcome");

// floating blue rectangle that shows up when you drag a window near an edge
var snapPreview = document.createElement("div");
snapPreview.id = "snapPreview";
snapPreview.style.position = "fixed";
snapPreview.style.background = "rgba(78,161,255,0.25)";
snapPreview.style.border = "2px solid #4ea1ff";
snapPreview.style.borderRadius = "8px";
snapPreview.style.zIndex = "999998";
snapPreview.style.display = "none";
snapPreview.style.pointerEvents = "none";
document.body.appendChild(snapPreview);

var SNAP_ZONE = 24; // how close to the edge (px) before it snaps

function getSnapZone(x, y) {
  var vw = window.innerWidth;
  var vh = window.innerHeight;
  // left edge -> snap to left half
  if (x < SNAP_ZONE) {
    return { top: 0, left: 0, width: vw / 2, height: vh };
  }
  // right edge -> right half
  if (x > vw - SNAP_ZONE) {
    return { top: 0, left: vw / 2, width: vw / 2, height: vh };
  }
  // top -> fullscreen basically
  if (y < SNAP_ZONE) {
    return { top: 0, left: 0, width: vw, height: vh };
  }
  return null;
}

var timezoneEntries = [];
var timezoneEntriesReady = false;
var timezoneEntriesPromise = loadTimezoneEntries();

function normalizeTimezoneSearch(text) {
  return (text || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function buildTimezoneEntries(data) {
  var countries = data && data.countries ? data.countries : {};
  var entries = [];

  Object.keys(countries).forEach(function(code) {
    var country = countries[code];
    if (!country || !country.name || !country.zones || !country.zones.length) return;

    country.zones.forEach(function(zone) {
      entries.push({
        country: country.name,
        abbr: country.abbr || code,
        zone: zone,
        searchText: normalizeTimezoneSearch(country.name + " " + (country.abbr || code) + " " + zone)
      });
    });
  });

  entries.sort(function(a, b) {
    return a.country.localeCompare(b.country) || a.zone.localeCompare(b.zone);
  });

  return entries;
}

function loadTimezoneEntries() {
  if (window.tuffosTimezoneData) {
    timezoneEntries = buildTimezoneEntries(window.tuffosTimezoneData);
    timezoneEntriesReady = true;
    return Promise.resolve(timezoneEntries);
  }

  return fetch("./latest.json")
    .then(function(response) {
      if (!response.ok) {
        throw new Error("Failed to load timezone data");
      }
      return response.json();
    })
    .then(function(data) {
      timezoneEntries = buildTimezoneEntries(data);
      timezoneEntriesReady = true;
      return timezoneEntries;
    })
    .catch(function() {
      timezoneEntries = [];
      timezoneEntriesReady = true;
      return timezoneEntries;
    });
}

function getSavedTimezone() {
  return localStorage.getItem("tuffos-timezone") || "";
}

function formatClockTime(date) {
  var savedTimezone = getSavedTimezone();
  if (!savedTimezone) {
    return date.toLocaleString();
  }

  try {
    return date.toLocaleString(undefined, { timeZone: savedTimezone });
  } catch (error) {
    return date.toLocaleString();
  }
}

// ---- dragging windows around (with the snap-to-edge thing above) ----
function dragElement(element, disableSnap) {
  var initialX = 0;
  var initialY = 0;
  var currentX = 0;
  var currentY = 0;
  var pendingSnap = null;

  var headerEl = document.getElementById(element.id + "header");

  if (headerEl) {
    element.addEventListener("mousedown", function(e) {
      if (e.target.closest('[id$="close"], [id$="minimize"], [id$="fullscreen"]')) {
        return;
      }
      var headerRect = headerEl.getBoundingClientRect();
      var elRect = element.getBoundingClientRect();
      // draggable if click is above the header's bottom edge (the divider line)
      if (e.clientY <= headerRect.bottom && e.clientY >= elRect.top) {
        startDragging(e);
      }
    });
  } else {
    element.onmousedown = startDragging;
  }

  function startDragging(e) {
    e = e || window.event;
    if (e.target.closest('[id$="close"], [id$="minimize"], [id$="fullscreen"]')) {
      return;
    }
    e.preventDefault();
    initialX = e.clientX;
    initialY = e.clientY;

    var rect = element.getBoundingClientRect();
    element.style.transform = "none";
    element.style.top = rect.top + "px";
    element.style.left = rect.left + "px";

    document.onmouseup = stopDragging;
    document.onmousemove = doDrag;
  }

  function doDrag(e) {
    e = e || window.event;
    e.preventDefault();
    currentX = initialX - e.clientX;
    currentY = initialY - e.clientY;
    initialX = e.clientX;
    initialY = e.clientY;
    element.style.top = (element.offsetTop - currentY) + "px";
    element.style.left = (element.offsetLeft - currentX) + "px";

    if (disableSnap) return; // this window isn't allowed to snap - skip the zone check

    var zone = getSnapZone(e.clientX, e.clientY);
    pendingSnap = zone;
    if (zone) {
      snapPreview.style.display = "block";
      snapPreview.style.top = zone.top + "px";
      snapPreview.style.left = zone.left + "px";
      snapPreview.style.width = zone.width + "px";
      snapPreview.style.height = zone.height + "px";
    } else {
      snapPreview.style.display = "none";
    }
  }

  function stopDragging() {
    document.onmouseup = null;
    document.onmousemove = null;
    snapPreview.style.display = "none";
    if (pendingSnap) {
      element.style.top = pendingSnap.top + "px";
      element.style.left = pendingSnap.left + "px";
      element.style.width = pendingSnap.width + "px";
      element.style.height = pendingSnap.height + "px";
      pendingSnap = null;
    }
  }
}

dragElement(document.getElementById("welcome"));

// ---- resizing windows via the little corner handle ----
function makeResizable(element) {
  var handle = element.querySelector(".resizeHandle");
  if (!handle) return;

  handle.addEventListener("mousedown", function(e) {
    e.preventDefault();
    e.stopPropagation();
    bringToFront(element);

    var startX = e.clientX;
    var startY = e.clientY;
    var startWidth = element.offsetWidth;
    var startHeight = element.offsetHeight;

    var rect = element.getBoundingClientRect();
    element.style.transform = "none";
    element.style.top = rect.top + "px";
    element.style.left = rect.left + "px";

    function onMouseMove(e) {
      var newWidth = Math.max(180, startWidth + (e.clientX - startX));
      var newHeight = Math.max(140, startHeight + (e.clientY - startY));
      element.style.width = newWidth + "px";
      element.style.height = newHeight + "px";
    }

    function onMouseUp() {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });
}

function updateTime() {
  var currentTime = formatClockTime(new Date());
  var timeText = document.querySelector("#timeElement");
  timeText.textContent = currentTime;
}
setInterval(updateTime, 1000);
updateTime();

var biggestIndex = 1;

function bringToFront(element) {
  biggestIndex++;
  element.style.zIndex = biggestIndex;
}

function toggleFullscreen(element) {
  var topBar = document.querySelector("#topBar");
var taskbar = document.querySelector("#taskbar");

  if (element.dataset.fullscreen === "true") {
    element.style.width = element.dataset.prevWidth;
    element.style.height = element.dataset.prevHeight || "";
    element.style.top = "50%";
    element.style.left = "50%";
    element.style.transform = "translate(-50%, -50%)";
    element.style.borderRadius = "16px";
    element.dataset.fullscreen = "false";

    topBar.style.display = "flex";
    taskbar.style.display = "flex";

    var headerEl = document.getElementById(element.id + "header");
    if (headerEl) {
      headerEl.style.position = "";
      headerEl.style.top = "";
      headerEl.style.left = "";
      headerEl.style.right = "";
      headerEl.style.zIndex = "";
      headerEl.style.background = "";
      headerEl.style.padding = "";
      headerEl.style.borderRadius = "";
      headerEl.style.transition = "";
      headerEl.style.transform = "";
      if (element._fsMouseMoveHandler) {
        document.removeEventListener("mousemove", element._fsMouseMoveHandler);
        element._fsMouseMoveHandler = null;
      }
    }
  } else {
    element.dataset.prevWidth = element.style.width;
    element.dataset.prevHeight = element.style.height;
    element.style.width = "100vw";
    element.style.height = "100vh";
    element.style.top = "0";
    element.style.left = "0";
    element.style.transform = "none";
    element.style.borderRadius = "0";
    element.dataset.fullscreen = "true";

    topBar.style.display = "none";
    taskbar.style.display = "none";

    var headerEl2 = document.getElementById(element.id + "header");
    if (headerEl2) {
      headerEl2.style.position = "fixed";
      headerEl2.style.top = "0";
      headerEl2.style.left = "0";
      headerEl2.style.right = "0";
      headerEl2.style.zIndex = "999997";
      headerEl2.style.background = "#2b2b2b";
      headerEl2.style.padding = "10px 16px 8px 16px";
      headerEl2.style.borderRadius = "0";
      headerEl2.style.transition = "transform 0.25s ease";
      headerEl2.style.transform = "translateY(-100%)";

      var revealZone = 40;
      var fsMouseMoveHandler = function(e) {
        if (element.dataset.fullscreen !== "true") return;
        if (e.clientY <= revealZone) {
          headerEl2.style.transform = "translateY(0)";
        } else {
          headerEl2.style.transform = "translateY(-100%)";
        }
      };
      element._fsMouseMoveHandler = fsMouseMoveHandler;
      document.addEventListener("mousemove", fsMouseMoveHandler);
    }
  }
}

var appScreens = {};

var taskbar = document.querySelector("#taskbar");
var dockOpenApps = document.querySelector("#dockOpenApps");
var dockMinimizedApps = document.querySelector("#dockMinimizedApps");
var dockDivider = document.querySelector("#dockDivider");
var dockIcons = {};

var appIcons = {
  welcome: "./idk.png",
  notes: "./notes.png",
  coffee: "./coffee.png",
  calc: "./calculator.png",
  settings: "./settings.png",
  browser: "./astrosearch.png",
  photobooth: "./photobooth.png",
  explorer: "./files.png"
};

function createDockIcon(id) {
  var wrapper = document.createElement("div");
  wrapper.style.display = "flex";
  wrapper.style.flexDirection = "column";
  wrapper.style.alignItems = "center";
  wrapper.style.cursor = "pointer";

  var icon = document.createElement("img");
  icon.src = appIcons[id] || "./notes.webp";
  icon.style.width = "40px";
  icon.style.height = "40px";
  icon.style.borderRadius = "10px";
  icon.style.objectFit = "cover";

  var dot = document.createElement("div");
  dot.style.width = "5px";
  dot.style.height = "5px";
  dot.style.borderRadius = "50%";
  dot.style.backgroundColor = "#fff";
  dot.style.marginTop = "3px";
  dot.style.visibility = "hidden";
  dot.className = "dockDot";

  wrapper.appendChild(icon);
  wrapper.appendChild(dot);

  wrapper.addEventListener("click", function() {
    var screen = appScreens[id];
    if (!screen) return;
    if (screen.style.display === "flex") {
      bringToFront(screen);
    } else {
      openWindow(screen);
      if (id === "photobooth") startCamera();
    }
  });

  dockIcons[id] = wrapper;
  return wrapper;
}

// build a dock icon for every app up front, even before its window opens
for (var appId in appIcons) {
  dockOpenApps.appendChild(createDockIcon(appId));
}

function refreshDockDot(element) {
  var dot = dockIcons[element.id].querySelector(".dockDot");
  dot.style.visibility = element.style.display === "flex" ? "visible" : "hidden";
}

function moveToMinimizedDock(id) {
  dockMinimizedApps.appendChild(dockIcons[id]);
  updateDivider();
}

function moveToOpenDock(id) {
  dockOpenApps.appendChild(dockIcons[id]);
  updateDivider();
}

function updateDivider() {
  dockDivider.style.display = dockMinimizedApps.children.length > 0 ? "block" : "none";
}

function closeWindow(element) {
  element.style.display = "none";
  refreshDockDot(element);
  moveToOpenDock(element.id);
}

function openWindow(element) {
  element.style.display = "flex";
  bringToFront(element);
  refreshDockDot(element);
  moveToOpenDock(element.id);
}

function minimizeWindow(element) {
  var iconWrapper = dockIcons[element.id];
  var iconRect = iconWrapper.getBoundingClientRect();
  var winRect = element.getBoundingClientRect();

  var clone = element.cloneNode(true);
  clone.removeAttribute("id");
  clone.style.position = "fixed";
  clone.style.top = winRect.top + "px";
  clone.style.left = winRect.left + "px";
  clone.style.width = winRect.width + "px";
  clone.style.height = winRect.height + "px";
  clone.style.margin = "0";
  clone.style.transform = "none";
  clone.style.zIndex = "99999";
  clone.style.transition = "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)";
  clone.style.pointerEvents = "none";
  document.body.appendChild(clone);

  element.style.display = "none";

  requestAnimationFrame(function() {
    clone.style.top = (iconRect.top + iconRect.height / 2) + "px";
    clone.style.left = (iconRect.left + iconRect.width / 2) + "px";
    clone.style.width = "10px";
    clone.style.height = "10px";
    clone.style.opacity = "0";
  });

  setTimeout(function() {
    clone.remove();
  }, 350);

  refreshDockDot(element);
  moveToMinimizedDock(element.id);
}

function toggleApp(screen) {
  if (screen.style.display === "flex") {
    closeWindow(screen);
  } else {
    openWindow(screen);
  }
}

var welcomeScreenClose = document.querySelector("#welcomeclose");
var welcomeScreenOpen = document.querySelector("#welcomeopen");
var welcomeScreenMinimize = document.querySelector("#welcomeminimize");
var welcomeScreenFullscreen = document.querySelector("#welcomefullscreen");
appScreens["welcome"] = welcomeScreen;

welcomeScreenClose.addEventListener("click", function() {
  closeWindow(welcomeScreen);
});

welcomeScreenMinimize.addEventListener("click", function() {
  minimizeWindow(welcomeScreen);
});

welcomeScreenFullscreen.addEventListener("click", function() {
  toggleFullscreen(welcomeScreen);
});

welcomeScreenOpen.addEventListener("click", function() {
  openWindow(welcomeScreen);
});

welcomeScreen.addEventListener("mousedown", function() {
  bringToFront(welcomeScreen);
});

dragElement(document.querySelector("#notes"));

var notesScreen = document.querySelector("#notes");
var notesScreenClose = document.querySelector("#notesclose");
var notesScreenMinimize = document.querySelector("#notesminimize");
var notesScreenFullscreen = document.querySelector("#notesfullscreen");
appScreens["notes"] = notesScreen;

notesScreenClose.addEventListener("click", function() {
  closeWindow(notesScreen);
});

notesScreenMinimize.addEventListener("click", function() {
  minimizeWindow(notesScreen);
});

notesScreenFullscreen.addEventListener("click", function() {
  toggleFullscreen(notesScreen);
});

notesScreen.addEventListener("mousedown", function() {
  bringToFront(notesScreen);
});

// notes just live in memory for now - no localStorage, no backend, refresh and it's gone
var notes = [
  { title: "Welcome", content: "Start typing your notes here..." }
];
var currentNoteIndex = 0;

var notesList = document.querySelector("#notesList");
var notesContent = document.querySelector("#notesContent");
var addNoteBtn = document.querySelector("#addNoteBtn");

function renderNotesList() {
  notesList.innerHTML = "";
  for (let i = 0; i < notes.length; i++) {
    var item = document.createElement("p");
    item.textContent = notes[i].title;
    item.style.margin = "4px 0";
    item.style.cursor = "pointer";
    item.style.color = i === currentNoteIndex ? "#4ea1ff" : "#fff";
    item.addEventListener("click", function() {
      selectNote(i);
    });
    notesList.appendChild(item);
  }
}

function selectNote(index) {
  var savedContent = notesContent.innerHTML === "Start typing your notes here..." ? "" : notesContent.innerHTML;
  notes[currentNoteIndex].content = savedContent;
  currentNoteIndex = index;
  notesContent.innerHTML = notes[currentNoteIndex].content || "Start typing your notes here...";
  renderNotesList();
}

addNoteBtn.addEventListener("click", function() {
  notes[currentNoteIndex].content = notesContent.innerHTML;
  notes.push({ title: "New Note " + notes.length, content: "" });
  currentNoteIndex = notes.length - 1;
  notesContent.innerHTML = "";
  renderNotesList();
  notesContent.focus();
});

notesContent.addEventListener("focus", function() {
  if (notesContent.innerHTML === "Start typing your notes here...") {
    notesContent.innerHTML = "";
  }
});

notesContent.addEventListener("blur", function() {
  if (notesContent.innerHTML.trim() === "") {
    notesContent.innerHTML = "Start typing your notes here...";
  }
});

renderNotesList();
notesContent.innerHTML = notes[currentNoteIndex].content;

dragElement(document.querySelector("#coffee"));

var coffeeScreen = document.querySelector("#coffee");
var coffeeScreenClose = document.querySelector("#coffeeclose");
var coffeeImg = document.querySelector("#coffeeImg");
var newCoffeeBtn = document.querySelector("#newCoffeeBtn");
var coffeeScreenMinimize = document.querySelector("#coffeeminimize");
var coffeeScreenFullscreen = document.querySelector("#coffeefullscreen");
appScreens["coffee"] = coffeeScreen;

coffeeScreenClose.addEventListener("click", function() {
  closeWindow(coffeeScreen);
});

coffeeScreenMinimize.addEventListener("click", function() {
  minimizeWindow(coffeeScreen);
});

coffeeScreenFullscreen.addEventListener("click", function() {
  toggleFullscreen(coffeeScreen);
});

coffeeScreen.addEventListener("mousedown", function() {
  bringToFront(coffeeScreen);
});

newCoffeeBtn.addEventListener("click", function() {
  // cache-bust with a timestamp or it just shows the same cached pic
  coffeeImg.src = "https://coffee.alexflipnote.dev/random?" + new Date().getTime();
});

dragElement(document.querySelector("#calc"), true); // no resizing, no snapping for the calc

var calcScreen = document.querySelector("#calc");
var calcClose = document.querySelector("#calculatorclose");
var calcDisplay = document.querySelector("#calcDisplay");
var calcScreenMinimize = document.querySelector("#calculatorminimize");
var calcScreenFullscreen = document.querySelector("#calculatorfullscreen");
appScreens["calc"] = calcScreen;

calcClose.addEventListener("click", function() {
  closeWindow(calcScreen);
});

calcScreenMinimize.addEventListener("click", function() {
  minimizeWindow(calcScreen);
});

// fullscreen disabled for the calculator on purpose - grey dot, does nothing on click

calcScreen.addEventListener("mousedown", function() {
  bringToFront(calcScreen);
});

// number pad + operators, all wired the same way off data-val
var calcButtons = document.querySelectorAll(".calcBtn");
calcButtons.forEach(function(btn) {
  btn.addEventListener("click", function() {
    if (calcDisplay.value === "0") {
      calcDisplay.value = btn.dataset.val;
    } else {
      calcDisplay.value += btn.dataset.val;
    }
  });
});

document.querySelector("#calcEquals").addEventListener("click", function() {
  // yeah it's eval, i know. it's a toy calculator, not a bank
  try {
    calcDisplay.value = eval(calcDisplay.value);
  } catch (e) {
    calcDisplay.value = "Error";
  }
});

document.querySelector("#calcClear").addEventListener("click", function() {
  calcDisplay.value = "0";
});

// toggles the sign on whatever number's currently at the end of the display - basic, no fancy parsing
document.querySelector("#calcSign").addEventListener("click", function() {
  var match = calcDisplay.value.match(/(-?\d+\.?\d*)$/);
  if (!match) return;
  var num = match[1];
  var flipped = num.startsWith("-") ? num.slice(1) : "-" + num;
  calcDisplay.value = calcDisplay.value.slice(0, match.index) + flipped;
});

document.querySelector("#calcBackspace").addEventListener("click", function() {
  calcDisplay.value = calcDisplay.value.length > 1 ? calcDisplay.value.slice(0, -1) : "0";
});

dragElement(document.querySelector("#settings"));

var settingsScreen = document.querySelector("#settings");
var settingsClose = document.querySelector("#settingsclose");
var settingsMinimize = document.querySelector("#settingsminimize");
var settingsFullscreen = document.querySelector("#settingsfullscreen");
appScreens["settings"] = settingsScreen;

settingsClose.addEventListener("click", function() {
  closeWindow(settingsScreen);
});

settingsMinimize.addEventListener("click", function() {
  minimizeWindow(settingsScreen);
});

settingsFullscreen.addEventListener("click", function() {
  toggleFullscreen(settingsScreen);
});

settingsScreen.addEventListener("mousedown", function() {
  bringToFront(settingsScreen);
});

// wallpaper picker - presets first, custom upload/url stuff further down
var bgOptions = document.querySelectorAll(".bgOption");
bgOptions.forEach(function(img) {
  img.addEventListener("click", function() {
    document.body.style.backgroundImage = "url(./" + img.dataset.bg + ")";
  });
});

var themeOptions = document.querySelectorAll(".themeOption");
themeOptions.forEach(function(btn) {
  btn.addEventListener("click", function() {
    document.body.style.backgroundColor = btn.dataset.theme;
  });
});

var uploadBgBtn = document.querySelector("#uploadBgBtn");
var bgUploadZone = document.querySelector("#bgUploadZone");
var bgFileInput = document.querySelector("#bgFileInput");
var bgUrlInput = document.querySelector("#bgUrlInput");

uploadBgBtn.addEventListener("click", function() {
  bgUploadZone.style.display = bgUploadZone.style.display === "none" ? "block" : "none";
});

bgUploadZone.addEventListener("click", function(e) {
  if (e.target === bgUploadZone) {
    bgFileInput.click();
  }
});

bgFileInput.addEventListener("change", function() {
  if (bgFileInput.files && bgFileInput.files[0]) {
    var reader = new FileReader();
    reader.onload = function(event) {
      document.body.style.backgroundImage = "url(" + event.target.result + ")";
    };
    reader.readAsDataURL(bgFileInput.files[0]);
  }
});

bgUrlInput.addEventListener("keydown", function(e) {
  if (e.key === "Enter" && bgUrlInput.value.trim() !== "") {
    document.body.style.backgroundImage = "url(" + bgUrlInput.value.trim() + ")";
  }
});

bgUploadZone.addEventListener("dragover", function(e) {
  e.preventDefault();
  bgUploadZone.style.borderColor = "#4ea1ff";
});

bgUploadZone.addEventListener("dragleave", function() {
  bgUploadZone.style.borderColor = "#888";
});

bgUploadZone.addEventListener("drop", function(e) {
  e.preventDefault();
  bgUploadZone.style.borderColor = "#888";
  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
    var reader = new FileReader();
    reader.onload = function(event) {
      document.body.style.backgroundImage = "url(" + event.target.result + ")";
    };
    reader.readAsDataURL(e.dataTransfer.files[0]);
  }
});

// ---- "browser" window - now just an iframe pinned to the new-tab site, no URL bar ----
dragElement(document.querySelector("#browser"));

var browserScreen = document.querySelector("#browser");
var browserClose = document.querySelector("#browserclose");
var browserMinimize = document.querySelector("#browserminimize");
var browserFullscreen = document.querySelector("#browserfullscreen");
appScreens["browser"] = browserScreen;

browserClose.addEventListener("click", function() {
  closeWindow(browserScreen);
});

browserMinimize.addEventListener("click", function() {
  minimizeWindow(browserScreen);
});

browserFullscreen.addEventListener("click", function() {
  toggleFullscreen(browserScreen);
});

browserScreen.addEventListener("mousedown", function() {
  bringToFront(browserScreen);
});

// show the "no internet" placeholder instead of the iframe if wifi was never connected during setup
(function() {
  var browserFrame = document.querySelector("#browserFrame");
  var browserOfflineMsg = document.querySelector("#browserOfflineMsg");
  var wifiConnectedFlag = localStorage.getItem("tuffos-wifi-connected") === "true";
  if (!wifiConnectedFlag) {
    browserFrame.style.display = "none";
    browserOfflineMsg.style.display = "flex";
  }
})();

// ---- right click menu on the desktop ----
var contextMenu = document.querySelector("#contextMenu");

document.body.addEventListener("contextmenu", function(e) {
  e.preventDefault();
  contextMenu.style.display = "block";
  contextMenu.style.top = e.pageY + "px";
  contextMenu.style.left = e.pageX + "px";
});

document.body.addEventListener("click", function() {
  contextMenu.style.display = "none";
});

document.querySelectorAll(".contextMenuItem").forEach(function(item) {
  item.addEventListener("click", function() {
    var action = item.dataset.action;
    if (action === "notes") openWindow(notesScreen);
    if (action === "coffee") openWindow(coffeeScreen);
    if (action === "settings") openWindow(settingsScreen);
    if (action === "browser") openWindow(browserScreen);
    if (action === "refresh") location.reload();
    contextMenu.style.display = "none";
  });
});

// hook up resizing on everything except the calculator, too lazy to call this individually per window
["welcome", "notes", "coffee", "settings", "browser", "photobooth", "explorer"].forEach(function(id) {
  var el = document.getElementById(id);
  if (el) makeResizable(el);
});

// ---- boot screen (just for show, fades out after ~1.8s) ----
var bootScreen = document.querySelector("#bootScreen");
var bootBar = document.querySelector("#bootBar");

setTimeout(function() {
  bootBar.style.transition = "width 0.4s ease-out";
  bootBar.style.width = "100%";
}, 80);

setTimeout(function() {
  bootScreen.style.display = "none"; // instant cut, no fade, so nothing peeks through underneath
  maybeShowSetupWizard();
}, 550);
dragElement(document.querySelector("#photobooth"));

// =====================================================================
// ---- first-run Setup Assistant (macOS-style, multi-step) ----
// =====================================================================

function applyTheme(theme) {
  document.body.classList.toggle("light-mode", theme === "light");
  localStorage.setItem("tuffos-theme", theme);
}

// apply a saved theme choice immediately on load, even before the wizard would show
(function() {
  var savedTheme = localStorage.getItem("tuffos-theme");
  if (savedTheme) applyTheme(savedTheme);
})();

function maybeShowSetupWizard() {
  if (localStorage.getItem("tuffos-setup-complete")) return;
  document.querySelector("#setupWizard").style.display = "flex";
  goToSetupStep("welcome", true);
}

// ---- step order + card transition helpers ----
var setupStepOrder = ["welcome", "privacy", "terms", "account", "timezone", "wifi", "migrate", "appearance", "installing", "complete"];
var setupCards = {};
document.querySelectorAll(".setupCard").forEach(function(card) {
  setupCards[card.dataset.step] = card;
});
var currentSetupStep = null;

function goToSetupStep(stepId, skipAnim) {
  if (!setupCards[stepId]) return;
  if (currentSetupStep && setupCards[currentSetupStep]) {
    setupCards[currentSetupStep].style.display = "none";
    setupCards[currentSetupStep].classList.remove("setupCardActive");
  }
  currentSetupStep = stepId;
  var card = setupCards[stepId];
  card.style.display = "flex";
  if (skipAnim) {
    card.classList.add("setupCardActive");
  } else {
    card.classList.remove("setupCardActive");
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        card.classList.add("setupCardActive");
      });
    });
  }
}

// wire up every plain [data-next] / [data-back] button (steps that have no extra validation)
document.querySelectorAll(".setupCard [data-next]").forEach(function(btn) {
  btn.addEventListener("click", function() {
    if (btn.disabled) return;
    goToSetupStep(btn.dataset.next);
    if (btn.dataset.next === "installing") {
      runSetupInstallSequence();
    }
  });
});
document.querySelectorAll(".setupCard [data-back]").forEach(function(btn) {
  btn.addEventListener("click", function() {
    goToSetupStep(btn.dataset.back);
  });
});

(function setupWireTimezoneField() {
  var input = document.querySelector("#setupTimezoneInput");
  var resultsEl = document.querySelector("#setupTimezoneResults");
  var continueBtn = document.querySelector('[data-step="timezone"] [data-requires="timezone"]');
  if (!input || !resultsEl || !continueBtn) return;

  // move results panel out to <body> so no ancestor's overflow/scroll clipping can hide it
  document.body.appendChild(resultsEl);

  var selectedZone = null;
  var hasTypedSearch = false;

  function updateContinueState() {
    continueBtn.disabled = !selectedZone;
  }

  function setSavedSelection() {
    var savedZone = getSavedTimezone();
    if (!savedZone || !timezoneEntriesReady) return;

    var savedEntry = timezoneEntries.filter(function(entry) {
      return entry.zone === savedZone;
    })[0];

    if (savedEntry) {
      input.value = savedEntry.country;
      selectedZone = savedEntry.zone;
      updateContinueState();
    }
  }

  function positionResults() {
    var rect = input.getBoundingClientRect();
    resultsEl.style.top = (rect.bottom + 6) + "px";
    resultsEl.style.left = rect.left + "px";
    resultsEl.style.width = rect.width + "px";
  }

  function labelFor(entry) {
    return entry.country;
  }

  function renderResults(query) {
    var q = normalizeTimezoneSearch(query);
    resultsEl.innerHTML = "";
    if (!timezoneEntriesReady) {
      var loading = document.createElement("div");
      loading.className = "setupComboEmpty";
      loading.textContent = "Loading time zones...";
      resultsEl.appendChild(loading);
      return;
    }

    var matches = timezoneEntries.filter(function(entry) {
      return !q || entry.searchText.indexOf(q) !== -1;
    });
    if (matches.length === 0) {
      var empty = document.createElement("div");
      empty.className = "setupComboEmpty";
      empty.textContent = q ? "No matches for '" + query + "'" : "No timezone data loaded";
      resultsEl.appendChild(empty);
      return;
    }
    matches.forEach(function(entry) {
      var row = document.createElement("div");
      row.className = "setupComboRow";
      var countryLabel = document.createElement("span");
      countryLabel.className = "setupComboRowMain";
      countryLabel.textContent = labelFor(entry);
      var zoneTag = document.createElement("span");
      zoneTag.className = "setupComboRowMeta";
      zoneTag.textContent = entry.zone;
      row.appendChild(countryLabel);
      row.appendChild(zoneTag);
      row.addEventListener("mousedown", function(e) {
        e.preventDefault();
        input.value = labelFor(entry);
        selectedZone = entry.zone;
        resultsEl.style.display = "none";
        localStorage.setItem("tuffos-timezone", entry.zone);
        updateContinueState();
      });
      resultsEl.appendChild(row);
    });
  }

  setSavedSelection();

  input.addEventListener("focus", function() {
    positionResults();
    renderResults(input.value);
    resultsEl.style.display = "block";
  });
  input.addEventListener("input", function() {
    hasTypedSearch = true;
    positionResults();
    renderResults(input.value);
    resultsEl.style.display = "block";
    // typing invalidates the previous selection until they click a result again
    selectedZone = null;
    updateContinueState();
  });
  input.addEventListener("blur", function() {
    setTimeout(function() { resultsEl.style.display = "none"; }, 150);
  });
  window.addEventListener("resize", function() {
    if (resultsEl.style.display === "block") positionResults();
  });

  timezoneEntriesPromise.then(function() {
    if (!hasTypedSearch) {
      setSavedSelection();
    }
    if (resultsEl.style.display === "block" || document.activeElement === input) {
      positionResults();
      renderResults(input.value);
      resultsEl.style.display = "block";
    }
  });
})();


// ---- Wi-Fi step ----
var setupFakeWifiNetworks = [
  { name: "67net-5g", bars: 4 },
  { name: "Pretty Fly for a WiFi", bars: 3 },
  { name: "Bandwidth of Brothers", bars: 3 },
  { name: "Loading...", bars: 2 },
  { name: "FBI Surveillance Van #4", bars: 1 },
  { name: "It Hurts When IP", bars: 2 }
];

var setupWifiListEl = document.querySelector("#setupWifiList");
var setupWifiContinueBtn = document.querySelector("#setupWifiContinue");
var setupWifiNotNowRadio = document.querySelector("#setupWifiNotNow");
var setupWifiRows = {};

setupFakeWifiNetworks.forEach(function(net) {
  var row = document.createElement("div");
  row.className = "setupWifiRow";
  row.innerHTML = "<span>" + net.name + "</span><span style='color:#888;'>" + "▂▄▆█".slice(0, net.bars) + "</span>";
  row.addEventListener("click", function() {
    setupWifiNotNowRadio.checked = false;
    Object.keys(setupWifiRows).forEach(function(n) { setupWifiRows[n].classList.remove("setupWifiActive"); });
    setupWifiContinueBtn.disabled = true;
    row.classList.add("setupWifiActive");
    var statusSpan = row.querySelector("span:last-child");
    statusSpan.textContent = "Connecting...";
    setTimeout(function() {
      statusSpan.textContent = "Connected";
      setupWifiContinueBtn.disabled = false;
      localStorage.setItem("tuffos-wifi-connected", "true");
      localStorage.setItem("tuffos-wifi-network", net.name);
    }, 1000);
  });
  setupWifiRows[net.name] = row;
  setupWifiListEl.appendChild(row);
});

setupWifiNotNowRadio.addEventListener("change", function() {
  if (setupWifiNotNowRadio.checked) {
    Object.keys(setupWifiRows).forEach(function(n) { setupWifiRows[n].classList.remove("setupWifiActive"); });
    localStorage.setItem("tuffos-wifi-connected", "false");
    localStorage.removeItem("tuffos-wifi-network");
    setupWifiContinueBtn.disabled = false;
  }
});

setupWifiContinueBtn.addEventListener("click", function() {
  if (setupWifiContinueBtn.disabled) return;
  goToSetupStep("migrate");
});

// ---- Migration Assistant step ----
var setupMigrateDropZone = document.querySelector("#setupMigrateDropZone");
var setupMigrateFileInput = document.querySelector("#setupMigrateFileInput");
var setupMigrateStatus = document.querySelector("#setupMigrateStatus");
var setupMigrateRestoreBtn = document.querySelector("#setupMigrateRestoreBtn");

setupMigrateDropZone.addEventListener("click", function() {
  setupMigrateFileInput.click();
});
setupMigrateRestoreBtn.addEventListener("click", function() {
  setupMigrateFileInput.click();
});

function restoreSetupBackupFile(file) {
  var reader = new FileReader();
  reader.onload = function(event) {
    try {
      var data = JSON.parse(event.target.result);
      Object.keys(data).forEach(function(key) {
        localStorage.setItem(key, typeof data[key] === "string" ? data[key] : JSON.stringify(data[key]));
      });
      setupMigrateStatus.textContent = "✓ Backup Restored Successfully";
      setupMigrateStatus.style.color = "#6bd97a";
    } catch (e) {
      setupMigrateStatus.textContent = "That doesn't appear to be a valid TuffOS backup.";
      setupMigrateStatus.style.color = "#ff8080";
    }
  };
  reader.readAsText(file);
}

setupMigrateFileInput.addEventListener("change", function() {
  if (setupMigrateFileInput.files && setupMigrateFileInput.files[0]) {
    restoreSetupBackupFile(setupMigrateFileInput.files[0]);
  }
});

setupMigrateDropZone.addEventListener("dragover", function(e) {
  e.preventDefault();
  setupMigrateDropZone.classList.add("setupDropZoneHover");
});
setupMigrateDropZone.addEventListener("dragleave", function() {
  setupMigrateDropZone.classList.remove("setupDropZoneHover");
});
setupMigrateDropZone.addEventListener("drop", function(e) {
  e.preventDefault();
  setupMigrateDropZone.classList.remove("setupDropZoneHover");
  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
    restoreSetupBackupFile(e.dataTransfer.files[0]);
  }
});

// ---- Terms & Conditions + agreement modal ----
var setupTermsCheckbox = document.querySelector("#setupTermsCheckbox");
var setupTermsContinueBtn = document.querySelector("#setupTermsContinue");
var setupAgreeModalOverlay = document.querySelector("#setupAgreeModalOverlay");
var setupAgreeCancelBtn = document.querySelector("#setupAgreeCancelBtn");
var setupAgreeConfirmBtn = document.querySelector("#setupAgreeConfirmBtn");

setupTermsCheckbox.addEventListener("change", function() {
  setupTermsContinueBtn.disabled = !setupTermsCheckbox.checked;
});

setupTermsContinueBtn.addEventListener("click", function() {
  if (setupTermsContinueBtn.disabled) return;
  setupAgreeModalOverlay.style.display = "flex";
});

setupAgreeCancelBtn.addEventListener("click", function() {
  setupAgreeModalOverlay.style.display = "none";
});

setupAgreeConfirmBtn.addEventListener("click", function() {
  setupAgreeModalOverlay.style.display = "none";
  localStorage.setItem("tuffos-terms-agreed", "true");
  goToSetupStep("account");
});

// ---- Create Account step ----
var setupUsernameInput = document.querySelector("#setupUsername");
var setupPasswordInput = document.querySelector("#setupPassword");
var setupPasswordHintInput = document.querySelector("#setupPasswordHint");
var setupAccountContinueBtn = document.querySelector("#setupAccountContinue");
var setupAvatarPreview = document.querySelector("#setupAvatarPreview");
var setupAvatarUploadBtn = document.querySelector("#setupAvatarUploadBtn");
var setupAvatarFileInput = document.querySelector("#setupAvatarFileInput");
var setupAvatarDropZone = document.querySelector("#setupAvatarDropZone");
var setupAvatarUrlInput = document.querySelector("#setupAvatarUrlInput");
var setupAvatarDataUrl = null;

function checkAccountFieldsValid() {
  var valid = setupUsernameInput.value.trim() !== "" && setupPasswordInput.value !== "";
  setupAccountContinueBtn.disabled = !valid;
}
setupUsernameInput.addEventListener("input", checkAccountFieldsValid);
setupPasswordInput.addEventListener("input", checkAccountFieldsValid);

function setSetupAvatar(dataUrl) {
  setupAvatarDataUrl = dataUrl;
  setupAvatarPreview.src = dataUrl;
}

setupAvatarUploadBtn.addEventListener("click", function() {
  setupAvatarFileInput.click();
});
setupAvatarFileInput.addEventListener("change", function() {
  if (setupAvatarFileInput.files && setupAvatarFileInput.files[0]) {
    var reader = new FileReader();
    reader.onload = function(event) { setSetupAvatar(event.target.result); };
    reader.readAsDataURL(setupAvatarFileInput.files[0]);
  }
});
setupAvatarUrlInput.addEventListener("keydown", function(e) {
  if (e.key === "Enter" && setupAvatarUrlInput.value.trim() !== "") {
    setSetupAvatar(setupAvatarUrlInput.value.trim());
  }
});
setupAvatarDropZone.addEventListener("dragover", function(e) {
  e.preventDefault();
  setupAvatarDropZone.classList.add("setupDropZoneHover");
});
setupAvatarDropZone.addEventListener("dragleave", function() {
  setupAvatarDropZone.classList.remove("setupDropZoneHover");
});
setupAvatarDropZone.addEventListener("drop", function(e) {
  e.preventDefault();
  setupAvatarDropZone.classList.remove("setupDropZoneHover");
  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
    var reader = new FileReader();
    reader.onload = function(event) { setSetupAvatar(event.target.result); };
    reader.readAsDataURL(e.dataTransfer.files[0]);
  }
});

setupAccountContinueBtn.addEventListener("click", function() {
  if (setupAccountContinueBtn.disabled) return;
  var username = setupUsernameInput.value.trim();
  var password = setupPasswordInput.value;
  var hint = setupPasswordHintInput.value.trim();

  localStorage.setItem("tuffos-username", username);
  // yeah this "password" is just sitting in localStorage in plain text - there's nothing real
  // behind this login, it's purely for show, so don't reuse a real password here
  localStorage.setItem("tuffos-password", password);
  if (hint) localStorage.setItem("tuffos-password-hint", hint);
  if (setupAvatarDataUrl) localStorage.setItem("tuffos-avatar", setupAvatarDataUrl);

  goToSetupStep("timezone");
});

// ---- Appearance step ----
var setupAppearanceCards = document.querySelectorAll(".setupAppearanceCard");
var setupPickedTheme = "dark";
setupAppearanceCards.forEach(function(card) {
  card.addEventListener("click", function() {
    setupAppearanceCards.forEach(function(c) { c.classList.remove("setupAppearanceActive"); });
    card.classList.add("setupAppearanceActive");
    setupPickedTheme = card.dataset.theme;
    applyTheme(setupPickedTheme); // live preview as you pick
  });
});

// ---- Installing step (terminal-style build-out of choices) ----
var setupTerminalTextEl = document.querySelector("#setupTerminalText");
var setupTerminalEl = document.querySelector("#setupTerminal");
var setupInstallContinueBtn = document.querySelector("#setupInstallContinue");
var setupInstallHasRun = false;

function buildSetupInstallLines() {
  var lines = [];
  lines.push("tuffos-installer v1.0 starting...");
  lines.push("");

  var username = localStorage.getItem("tuffos-username") || "guest";
  lines.push("[ OK ] Creating account for \"" + username + "\"");

  if (localStorage.getItem("tuffos-terms-agreed") === "true") {
    lines.push("[ OK ] Terms & Conditions accepted");
  }

  var tz = localStorage.getItem("tuffos-timezone");
  lines.push(tz ? "[ OK ] Setting time zone to " + tz : "[ SKIP ] No time zone selected");

  var wifiConnected = localStorage.getItem("tuffos-wifi-connected") === "true";
  var wifiNetwork = localStorage.getItem("tuffos-wifi-network");
  lines.push(wifiConnected && wifiNetwork ? "[ OK ] Connected to Wi-Fi network \"" + wifiNetwork + "\"" : "[ SKIP ] No Wi-Fi network connected");

  var docs = loadTextDocs();
  if (localStorage.getItem("tuffos-text-docs")) {
    lines.push("[ OK ] Restoring backed-up files");
  }

  lines.push("[ OK ] Applying " + (setupPickedTheme === "light" ? "Light" : "Dark") + " appearance");
  lines.push("[ OK ] Writing preferences to disk");
  lines.push("[ OK ] Finalizing setup");
  lines.push("");
  lines.push("TuffOS is ready. It's always time to eat cereal.");
  return lines;
}

function runSetupInstallSequence() {
  if (setupInstallHasRun) return;
  setupInstallHasRun = true;

  var lines = buildSetupInstallLines();
  var lineIndex = 0;
  var charIndex = 0;
  var builtText = "";

  function typeNextChar() {
    if (lineIndex >= lines.length) {
      setupInstallContinueBtn.disabled = false;
      return;
    }
    var currentLine = lines[lineIndex];
    if (charIndex < currentLine.length) {
      builtText += currentLine.charAt(charIndex);
      charIndex++;
      setupTerminalTextEl.textContent = builtText;
      setupTerminalEl.scrollTop = setupTerminalEl.scrollHeight;
      setTimeout(typeNextChar, 14);
    } else {
      builtText += "\n";
      lineIndex++;
      charIndex = 0;
      setupTerminalTextEl.textContent = builtText;
      setupTerminalEl.scrollTop = setupTerminalEl.scrollHeight;
      setTimeout(typeNextChar, 120);
    }
  }

  setupTerminalTextEl.textContent = "";
  setupInstallContinueBtn.disabled = true;
  setTimeout(typeNextChar, 200);
}

// ---- finish ----
document.querySelector("#setupFinishBtn").addEventListener("click", function() {
  applyTheme(setupPickedTheme);
  localStorage.setItem("tuffos-setup-complete", "true");
  document.querySelector("#setupWizard").style.display = "none";
  updateTopBarGreeting();
  applyAvatarToTopBar();
});

function updateTopBarGreeting() {
  var username = localStorage.getItem("tuffos-username");
  if (!username) return;
  document.querySelector("#welcomeopen").innerHTML = "TuffOS <span style=\"font-size: 12px;\">hey " + username + ", it's always time to eat cereal</span>";
}
updateTopBarGreeting(); // in case setup was already done in a past visit

function applyAvatarToTopBar() {
  // placeholder hook - avatar is stored in localStorage as tuffos-avatar if a future
  // profile UI wants to read it back out
}

// =====================================================================
// ---- /Setup Assistant ----
// =====================================================================

var photoboothScreen = document.querySelector("#photobooth");
var photoboothClose = document.querySelector("#photoboothclose");
var photoboothMinimize = document.querySelector("#photoboothminimize");
var photoboothFullscreen = document.querySelector("#photoboothfullscreen");
appScreens["photobooth"] = photoboothScreen;

photoboothClose.addEventListener("click", function () {
  stopCamera();
  closeWindow(photoboothScreen);
});
photoboothMinimize.addEventListener("click", function () {
  stopCamera();
  minimizeWindow(photoboothScreen);
});
photoboothFullscreen.addEventListener("click", function () {
  toggleFullscreen(photoboothScreen);
});
photoboothScreen.addEventListener("mousedown", function () {
  bringToFront(photoboothScreen);
});

// --- webcam logic ---
var video = document.querySelector("#videoElement");
var canvas = document.querySelector("#canvas");
var ctx = canvas.getContext("2d");
var cameraStarted = false;

function startCamera() {
  if (cameraStarted) return;
  cameraStarted = true;

  navigator.mediaDevices.getUserMedia({ video: true })
    .then(function (stream) {
      video.srcObject = stream;
    })
    .catch(function (error) {
      alert("Couldn't access webcam: " + error.name);
      cameraStarted = false;
    });
}

function stopCamera() {
  if (!cameraStarted) return;
  if (mediaRecorder && mediaRecorder.state === "recording") {
    stopRecording();
  }
  video.pause(); // freeze it instantly, don't wait on the stream teardown below
  var stream = video.srcObject;
  if (stream) {
    stream.getTracks().forEach(function (track) { track.stop(); }); // actually kills the webcam light, not just hiding the video
    video.srcObject = null;
  }
  cameraStarted = false;
}

function openPhotobooth() {
  toggleApp(photoboothScreen);
  if (photoboothScreen.style.display === "flex") {
    startCamera();
  }
}

function openBin() {
  openWindow(explorerScreen);
  setCurrentFolder(finderRoots.trash, false);
}

var currentPhotoMode = "movie";

document.querySelectorAll(".photoModeBtn").forEach(function(btn) {
  btn.addEventListener("click", function() {
    document.querySelectorAll(".photoModeBtn").forEach(function(b) {
      b.style.background = "transparent";
      b.querySelector("svg").setAttribute("stroke", "#ccc");
    });
    btn.style.background = "#4a4a4a";
    btn.querySelector("svg").setAttribute("stroke", "#fff");
    currentPhotoMode = btn.dataset.mode;
  });
});

var countdownOverlay = document.querySelector("#countdownOverlay");

function runCountdown(callback) {
  var count = 3;
  countdownOverlay.style.display = "flex";
  countdownOverlay.textContent = count;
  var timer = setInterval(function () {
    count--;
    if (count > 0) {
      countdownOverlay.textContent = count;
    } else {
      clearInterval(timer);
      countdownOverlay.style.display = "none";
      callback();
    }
  }, 800);
}

function captureFrame(targetCanvas) {
  targetCanvas.width = video.videoWidth;
  targetCanvas.height = video.videoHeight;
  var c = targetCanvas.getContext("2d");
  c.translate(targetCanvas.width, 0);
  c.scale(-1, 1);
  c.drawImage(video, 0, 0);
}

// photos/videos just pile up in this strip while the window's open, nothing
// gets saved to disk unless you click in and manually save the preview img/video
var photoThumbStrip = document.querySelector("#photoThumbStrip");
var photoPreviewOverlay = document.querySelector("#photoPreviewOverlay");
var photoPreviewImg = document.querySelector("#photoPreviewImg");
var photoPreviewClose = document.querySelector("#photoPreviewClose");

function addPhotoToStrip(sourceCanvas) {
  var dataUrl = sourceCanvas.toDataURL("image/png");

  var thumb = document.createElement("img");
  thumb.src = dataUrl;
  thumb.style.height = "56px";
  thumb.style.width = "56px";
  thumb.style.objectFit = "cover";
  thumb.style.borderRadius = "6px";
  thumb.style.cursor = "pointer";
  thumb.style.flexShrink = "0";
  thumb.addEventListener("click", function() {
    showPreview("image", dataUrl);
  });

  photoThumbStrip.insertBefore(thumb, photoThumbStrip.firstChild);

  addFinderFileToFolder(finderRoots.pictures, createFinderNode({
    name: "Photo " + new Date().toLocaleTimeString().replace(/:/g, "-") + ".png",
    type: "file",
    kind: "image",
    source: dataUrl,
    editable: false
  }));
}

function addVideoToStrip(blob) {
  var url = URL.createObjectURL(blob);

  var wrapper = document.createElement("div");
  wrapper.style.position = "relative";
  wrapper.style.height = "56px";
  wrapper.style.width = "56px";
  wrapper.style.flexShrink = "0";
  wrapper.style.cursor = "pointer";
  wrapper.style.borderRadius = "6px";
  wrapper.style.overflow = "hidden";
  wrapper.style.background = "#000";

  var thumbVideo = document.createElement("video");
  thumbVideo.src = url;
  thumbVideo.style.width = "100%";
  thumbVideo.style.height = "100%";
  thumbVideo.style.objectFit = "cover";
  thumbVideo.muted = true;
  thumbVideo.playsInline = true;
  // nudge the playhead a bit so the thumbnail isn't just a black frame
  thumbVideo.addEventListener("loadedmetadata", function() {
    thumbVideo.currentTime = Math.min(0.1, thumbVideo.duration || 0);
  });

  var playBadge = document.createElement("div");
  playBadge.style.position = "absolute";
  playBadge.style.inset = "0";
  playBadge.style.display = "flex";
  playBadge.style.alignItems = "center";
  playBadge.style.justifyContent = "center";
  playBadge.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="#fff" style="filter: drop-shadow(0 0 3px rgba(0,0,0,0.6));"><path d="M8 5v14l11-7z"/></svg>';

  wrapper.appendChild(thumbVideo);
  wrapper.appendChild(playBadge);

  wrapper.addEventListener("click", function() {
    showPreview("video", url);
  });

  photoThumbStrip.insertBefore(wrapper, photoThumbStrip.firstChild);

  addFinderFileToFolder(finderRoots.videos, createFinderNode({
    name: "Recording " + new Date().toLocaleTimeString().replace(/:/g, "-") + ".webm",
    type: "file",
    kind: "video",
    content: "Video preview not bundled in this demo.",
    editable: false
  }));
}

function showPreview(kind, url) {
  photoPreviewImg.style.display = "none";
  var existingVideo = document.querySelector("#photoPreviewVideo");
  if (existingVideo) existingVideo.remove();

  if (kind === "image") {
    photoPreviewImg.src = url;
    photoPreviewImg.style.display = "block";
  } else {
    var vid = document.createElement("video");
    vid.id = "photoPreviewVideo";
    vid.src = url;
    vid.controls = true;
    vid.autoplay = true;
    vid.style.maxWidth = "90%";
    vid.style.maxHeight = "80%";
    vid.style.borderRadius = "8px";
    vid.style.boxShadow = "0 8px 30px rgba(0,0,0,0.5)";
    photoPreviewOverlay.insertBefore(vid, photoPreviewClose);
  }
  photoPreviewOverlay.style.display = "flex";
}

photoPreviewClose.addEventListener("click", function() {
  photoPreviewOverlay.style.display = "none";
  var existingVideo = document.querySelector("#photoPreviewVideo");
  if (existingVideo) {
    existingVideo.pause();
    existingVideo.remove();
  }
});
photoPreviewOverlay.addEventListener("click", function(e) {
  if (e.target === photoPreviewOverlay) {
    photoPreviewOverlay.style.display = "none";
    var existingVideo = document.querySelector("#photoPreviewVideo");
    if (existingVideo) {
      existingVideo.pause();
      existingVideo.remove();
    }
  }
});

function takeStillShot() {
  captureFrame(canvas);
  addPhotoToStrip(canvas);
}

var gridFillOverlay = document.querySelector("#gridFillOverlay");
var gridFillQuads = document.querySelectorAll(".gridFillQuad");

function takeFourShot() {
  var shots = [];
  var shotIndex = 0;

  gridFillQuads.forEach(function(q) { q.src = ""; });
  gridFillOverlay.style.display = "grid";

  function takeOneShot() {
    var shotCanvas = document.createElement("canvas");
    captureFrame(shotCanvas);
    shots.push(shotCanvas);
    gridFillQuads[shotIndex].src = shotCanvas.toDataURL("image/png"); // fill that quarter in live
    shotIndex++;
    if (shotIndex < 4) {
      setTimeout(takeOneShot, 350);
    } else {
      setTimeout(function() {
        gridFillOverlay.style.display = "none";
        combineFourShots(shots);
      }, 350);
    }
  }
  takeOneShot();
}

function combineFourShots(shots) {
  var w = shots[0].width;
  var h = shots[0].height;
  var combined = document.createElement("canvas");
  combined.width = w * 2;
  combined.height = h * 2;
  var ctx2 = combined.getContext("2d");
  ctx2.drawImage(shots[0], 0, 0);
  ctx2.drawImage(shots[1], w, 0);
  ctx2.drawImage(shots[2], 0, h);
  ctx2.drawImage(shots[3], w, h);
  addPhotoToStrip(combined);
}

var mediaRecorder = null;
var recordedChunks = [];
var recordTimerInterval = null;
var recordSeconds = 0;
var recordTimerEl = document.querySelector("#recordTimer");
var modeSwitcherEl = document.querySelector("#photoModeSwitcher");
var shutterBtn = document.querySelector("#shutterBtn");

function formatTime(totalSeconds) {
  var h = Math.floor(totalSeconds / 3600);
  var m = Math.floor((totalSeconds % 3600) / 60);
  var s = totalSeconds % 60;
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  return pad(h) + ":" + pad(m) + ":" + pad(s);
}

function setShutterToRecordIcon() {
  shutterBtn.style.background = "#fff";
  shutterBtn.innerHTML = "";
  var stopSquare = document.createElement("div");
  stopSquare.style.width = "16px";
  stopSquare.style.height = "16px";
  stopSquare.style.borderRadius = "4px";
  stopSquare.style.background = "#EC6B5E";
  shutterBtn.appendChild(stopSquare);
}

function setShutterToCameraIcon() {
  shutterBtn.style.background = "red";
  shutterBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>';
}

function startRecording() {
  recordedChunks = [];
  var stream = video.srcObject;
  mediaRecorder = new MediaRecorder(stream);

  mediaRecorder.ondataavailable = function (e) {
    if (e.data.size > 0) recordedChunks.push(e.data);
  };

  mediaRecorder.onstop = function () {
    var blob = new Blob(recordedChunks, { type: "video/webm" });
    addVideoToStrip(blob);
  };

  mediaRecorder.start();

  recordSeconds = 0;
  recordTimerEl.textContent = formatTime(recordSeconds);
  recordTimerInterval = setInterval(function () {
    recordSeconds++;
    recordTimerEl.textContent = formatTime(recordSeconds);
  }, 1000);

  modeSwitcherEl.style.display = "none";
  recordTimerEl.style.display = "block";
  setShutterToRecordIcon();
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }
  clearInterval(recordTimerInterval);

  modeSwitcherEl.style.display = "flex";
  recordTimerEl.style.display = "none";
  setShutterToCameraIcon();
}

shutterBtn.addEventListener("click", function () {
  if (currentPhotoMode === "movie") {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      stopRecording();
    } else {
      runCountdown(startRecording);
    }
    return;
  }
  runCountdown(function () {
    if (currentPhotoMode === "four") {
      takeFourShot();
    } else {
      takeStillShot();
    }
  });
});

// ---- File Manager ----
// Finder-inspired browser file manager with a virtual filesystem and web OS
// app associations.
dragElement(document.querySelector("#explorer"));

var explorerScreen = document.querySelector("#explorer");
var explorerClose = document.querySelector("#explorerclose");
var explorerMinimize = document.querySelector("#explorerminimize");
var explorerFullscreen = document.querySelector("#explorerfullscreen");
var finderSidebarItemsEl = document.querySelector("#finderSidebarItems");
var finderSearchInput = document.querySelector("#finderSearchInput");
var finderGridEl = document.querySelector("#finderGrid");
var finderSelectionBoxEl = document.querySelector("#finderSelectionBox");
var finderState = {
  currentRootId: "documents",
  currentFolder: null,
  searchQuery: "",
  selectedIds: [],
  anchorId: null,
  focusId: null,
  viewItems: [],
  dragSelect: null
};
var finderTrashItems = [];
var finderNodeIdCounter = 0;
var finderDragState = null; // { ids: [...] } while a drag from the grid is in progress

appScreens["explorer"] = explorerScreen;

explorerClose.addEventListener("click", function() {
  closeWindow(explorerScreen);
});
explorerMinimize.addEventListener("click", function() {
  minimizeWindow(explorerScreen);
});
explorerFullscreen.addEventListener("click", function() {
  toggleFullscreen(explorerScreen);
});
explorerScreen.addEventListener("mousedown", function() {
  bringToFront(explorerScreen);
});

function createFinderNode(options) {
  return {
    id: options.id || ("finder-node-" + (++finderNodeIdCounter)),
    name: options.name,
    type: options.type || "file",
    kind: options.kind || "unknown",
    icon: options.icon || null,
    association: options.association || null,
    source: options.source || "",
    content: options.content || "",
    editable: options.editable !== false,
    children: options.children ? options.children.slice() : null,
    parent: null,
    meta: options.meta || "",
    trashOrigin: options.trashOrigin || null
  };
}

function attachFinderChildren(parent, children) {
  parent.children = children || [];
  parent.children.forEach(function(child) {
    child.parent = parent;
    if (child.children) attachFinderChildren(child, child.children);
  });
}

function buildFinderRoots() {
  var applications = createFinderNode({
    id: "applications",
    name: "Applications",
    type: "folder",
    kind: "folder",
    children: [
      createFinderNode({ name: "Notes", type: "file", kind: "app", association: "notes" }),
      createFinderNode({ name: "Coffee", type: "file", kind: "app", association: "coffee" }),
      createFinderNode({ name: "Calculator", type: "file", kind: "app", association: "calc" }),
      createFinderNode({ name: "Settings", type: "file", kind: "app", association: "settings" }),
      createFinderNode({ name: "Browser", type: "file", kind: "app", association: "browser" }),
      createFinderNode({ name: "Photo Booth", type: "file", kind: "app", association: "photobooth" }),
      createFinderNode({ name: "Files", type: "file", kind: "app", association: "explorer" })
    ]
  });

  // Desktop folder mirrors what's actually sitting on the OS desktop - the app icons
  var desktop = createFinderNode({
    id: "desktop",
    name: "Desktop",
    type: "folder",
    kind: "folder",
    children: [
      createFinderNode({ name: "Tuff notes", type: "file", kind: "app", association: "notes" }),
      createFinderNode({ name: "Coffee", type: "file", kind: "app", association: "coffee" }),
      createFinderNode({ name: "Calc short for calculator", type: "file", kind: "app", association: "calc" }),
      createFinderNode({ name: "Settings", type: "file", kind: "app", association: "settings" }),
      createFinderNode({ name: "Browser", type: "file", kind: "app", association: "browser" }),
      createFinderNode({ name: "PhotoBooth", type: "file", kind: "app", association: "photobooth" }),
      createFinderNode({ name: "Files", type: "file", kind: "app", association: "explorer" })
    ]
  });

  var documents = createFinderNode({
    id: "documents",
    name: "Documents",
    type: "folder",
    kind: "folder",
    children: []
  });

  var downloads = createFinderNode({
    id: "downloads",
    name: "Downloads",
    type: "folder",
    kind: "folder",
    children: []
  });

  // Pictures starts empty - PhotoBooth stills get dropped in here as you take them
  var pictures = createFinderNode({
    id: "pictures",
    name: "Pictures",
    type: "folder",
    kind: "folder",
    children: []
  });

  var music = createFinderNode({
    id: "music",
    name: "Music",
    type: "folder",
    kind: "folder",
    children: []
  });

  // Videos starts empty - PhotoBooth recordings get dropped in here as you record them
  var videos = createFinderNode({
    id: "videos",
    name: "Videos",
    type: "folder",
    kind: "folder",
    children: []
  });

  var trash = createFinderNode({
    id: "trash",
    name: "Trash",
    type: "folder",
    kind: "folder",
    children: []
  });

  var roots = {
    applications: applications,
    desktop: desktop,
    documents: documents,
    downloads: downloads,
    pictures: pictures,
    music: music,
    videos: videos,
    trash: trash
  };

  Object.keys(roots).forEach(function(key) {
    attachFinderChildren(roots[key], roots[key].children || []);
  });

  return roots;
}

var finderRoots = buildFinderRoots();
finderState.currentFolder = finderRoots.documents;

function loadTextDocs() {
  try {
    var raw = localStorage.getItem("tuffos-text-docs");
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveTextDocs(docs) {
  localStorage.setItem("tuffos-text-docs", JSON.stringify(docs));
}

function currentFolder() {
  return finderState.currentFolder;
}

function fileIconMarkup(name) {
  var icons = {
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>',
    folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2Z"/></svg>',
    monitor: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>',
    grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg>',
    fileText: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h8"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m8 11 4 4 4-4"/><path d="M5 21h14"/></svg>',
    image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>',
    music: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
    video: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="14" height="12" rx="2"/><path d="m16 13 6 4V7l-6 4"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m19 6-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>',
    archive: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="5" rx="1"/><path d="M8 9v11"/><path d="M16 9v11"/><path d="M3 9h18"/></svg>',
    code: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m10 18-6-6 6-6"/><path d="m14 6 6 6-6 6"/></svg>',
    braces: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4H7a2 2 0 0 0-2 2v2a2 2 0 0 1-2 2 2 2 0 0 1 2 2 2 2 0 0 1 2 2v2a2 2 0 0 0 2 2h1"/><path d="M16 4h1a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2 2 2 0 0 0-2 2 2 2 0 0 0-2 2v2a2 2 0 0 1-2 2h-1"/></svg>',
    file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>'
  };

  return icons[name] || icons.file;
}

function iconForNode(node) {
  if (node.type === "folder") return "folder";
  if (node.kind === "app") return "grid";
  if (node.kind === "image") return "image";
  if (node.kind === "video") return "video";
  if (node.kind === "audio") return "music";
  if (node.kind === "pdf") return "fileText";
  if (node.kind === "document" || node.kind === "text") return "fileText";
  if (node.kind === "archive") return "archive";
  if (node.kind === "html" || node.kind === "javascript" || node.kind === "css") return "code";
  if (node.kind === "json") return "braces";
  return "file";
}

function addFinderFileToFolder(folder, node) {
  if (!folder) return;
  node.parent = folder;
  if (!folder.children) folder.children = [];
  folder.children.unshift(node);
  if (finderState.currentFolder && finderState.currentFolder.id === folder.id) {
    renderFinder();
  }
}

function getFolderItems(folder) {
  if (!folder) return [];
  if (folder.id === "documents") {
    var docs = loadTextDocs();
    var dynamicDocs = Object.keys(docs).sort(function(a, b) {
      return a.localeCompare(b);
    }).map(function(name) {
      return createFinderNode({
        id: "doc:" + name,
        name: name,
        type: "file",
        kind: "text",
        content: docs[name],
        editable: true,
        meta: "Document"
      });
    });
    return folder.children.concat(dynamicDocs);
  }
  if (folder.id === "trash") {
    return finderTrashItems.slice();
  }
  return folder.children ? folder.children.slice() : [];
}

function getRootFolder(folder) {
  var current = folder;
  while (current && current.parent) {
    current = current.parent;
  }
  return current;
}

function getFolderPath(folder) {
  var path = [];
  var current = folder;
  while (current) {
    path.unshift(current);
    current = current.parent;
  }
  return path;
}

function setCurrentFolder(folder, keepSearch) {
  finderState.currentFolder = folder;
  finderState.currentRootId = getRootFolder(folder).id;
  if (!keepSearch) {
    finderState.searchQuery = "";
    finderSearchInput.value = "";
  }
  finderState.selectedIds = [];
  finderState.anchorId = null;
  finderState.focusId = null;
  renderFinder();
  finderGridEl.focus();
}

function getVisibleItems() {
  var items = getFolderItems(finderState.currentFolder).slice();
  items.sort(function(a, b) {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  var query = finderState.searchQuery.trim().toLowerCase();
  if (query) {
    items = items.filter(function(item) {
      return item.name.toLowerCase().indexOf(query) !== -1 || item.kind.toLowerCase().indexOf(query) !== -1;
    });
  }
  return items;
}

function setSelection(ids, options) {
  options = options || {};
  finderState.selectedIds = ids.slice();
  if (!options.keepAnchor) finderState.anchorId = ids.length ? ids[0] : null;
  if (!options.keepFocus) finderState.focusId = ids.length ? ids[ids.length - 1] : null;
  renderFinder();
}

function toggleSelection(id) {
  var existing = finderState.selectedIds.indexOf(id);
  if (existing >= 0) {
    finderState.selectedIds.splice(existing, 1);
  } else {
    finderState.selectedIds.push(id);
  }
  finderState.focusId = id;
  if (!finderState.anchorId) finderState.anchorId = id;
  renderFinder();
}

function selectRangeTo(id) {
  var items = finderState.viewItems;
  var anchorId = finderState.anchorId || finderState.focusId || id;
  var startIndex = items.findIndex(function(item) { return item.id === anchorId; });
  var endIndex = items.findIndex(function(item) { return item.id === id; });
  if (startIndex < 0 || endIndex < 0) {
    setSelection([id]);
    return;
  }
  var low = Math.min(startIndex, endIndex);
  var high = Math.max(startIndex, endIndex);
  var rangeIds = items.slice(low, high + 1).map(function(item) { return item.id; });
  finderState.selectedIds = rangeIds;
  finderState.focusId = id;
  renderFinder();
}

function getItemById(id) {
  return finderState.viewItems.filter(function(item) { return item.id === id; })[0] || null;
}

function openFinderItem(item) {
  if (!item) return;
  if (item.type === "folder") {
    setCurrentFolder(item, true);
    return;
  }

  if (item.kind === "app" && item.association && appScreens[item.association]) {
    openWindow(appScreens[item.association]);
    return;
  }

  if (item.kind === "image" && item.source) {
    showPreview("image", item.source);
    return;
  }

  var textKinds = ["text", "document", "pdf", "archive", "html", "javascript", "css", "json", "unknown", "audio", "video"];
  if (textKinds.indexOf(item.kind) !== -1) {
    var previewContent = item.content || (item.kind === "audio" || item.kind === "video" ? (item.name + "\n\nPreview not bundled in this demo.") : item.name);
    if (item.editable) {
      openTextFile(item.name, previewContent);
    } else {
      openTextViewer(item.name, previewContent);
    }
    return;
  }

  if (item.editable) {
    openTextFile(item.name, item.content || item.name);
  } else {
    openTextViewer(item.name, item.content || item.name);
  }
}

function getTrashEntrySource(item) {
  return item.trashOrigin || { folderId: finderState.currentFolder.id, index: 0 };
}

function cloneForTrash(item, origin) {
  var clone = createFinderNode({
    id: item.id,
    name: item.name,
    type: item.type,
    kind: item.kind,
    icon: item.icon,
    association: item.association,
    source: item.source,
    content: item.content,
    editable: item.editable,
    meta: item.meta,
    trashOrigin: origin
  });
  if (item.children && item.children.length) {
    clone.children = item.children.map(function(child) {
      return cloneForTrash(child, origin);
    });
  }
  return clone;
}

function removeItemFromFolder(folder, item) {
  if (!folder) return;
  if (folder.id === "documents" && item.id.indexOf("doc:") === 0) {
    var docs = loadTextDocs();
    delete docs[item.name];
    saveTextDocs(docs);
    return;
  }
  var list = folder.children || [];
  var index = list.findIndex(function(child) { return child.id === item.id; });
  if (index >= 0) list.splice(index, 1);
}

function moveFinderItemToTrash(item, sourceFolder) {
  var folder = sourceFolder || item.parent || finderState.currentFolder;

  if (folder.id === "trash") {
    var trashIndex = finderTrashItems.findIndex(function(entry) { return entry.id === item.id; });
    if (trashIndex >= 0) finderTrashItems.splice(trashIndex, 1);
    return;
  }

  var origin = {
    folderId: folder.id,
    index: getFolderItems(folder).findIndex(function(entry) { return entry.id === item.id; })
  };
  removeItemFromFolder(folder, item);
  finderTrashItems.unshift(cloneForTrash(item, origin));
}

function moveFinderItem(item, destinationFolder) {
  if (!item || !destinationFolder) return;
  if (destinationFolder.id === item.id) return; // can't drop a folder into itself
  var sourceFolder = item.parent || finderState.currentFolder;
  if (sourceFolder.id === destinationFolder.id) return;

  if (sourceFolder.id === "documents" && item.id.indexOf("doc:") === 0) {
    // moving a saved text doc out of Documents into another folder: copy its content in, drop the doc entry
    var docs = loadTextDocs();
    var content = docs[item.name] || item.content || "";
    delete docs[item.name];
    saveTextDocs(docs);
    var movedNode = createFinderNode({ name: item.name, type: "file", kind: "text", content: content, editable: true });
    addFinderFileToFolder(destinationFolder, movedNode);
    return;
  }

  removeItemFromFolder(sourceFolder, item);
  addFinderFileToFolder(destinationFolder, item);
}

function moveSelectionToTrash() {
  var folder = finderState.currentFolder;
  var selected = finderState.selectedIds.map(function(id) {
    return getItemById(id);
  }).filter(Boolean);
  if (!selected.length) return;

  selected.forEach(function(item) {
    moveFinderItemToTrash(item, folder);
  });

  finderState.selectedIds = [];
  finderState.anchorId = null;
  finderState.focusId = null;
  renderFinder();
}

function restoreTrashItem(item) {
  if (!item.trashOrigin) {
    return;
  }

  var destinationFolder = finderRoots[item.trashOrigin.folderId] || finderState.currentFolder;
  if (destinationFolder.id === "documents" && item.id.indexOf("doc:") === 0) {
    var docs = loadTextDocs();
    docs[item.name] = item.content || "";
    saveTextDocs(docs);
  } else if (destinationFolder.children) {
    var insertIndex = Math.max(0, Math.min(item.trashOrigin.index, destinationFolder.children.length));
    item.parent = destinationFolder;
    destinationFolder.children.splice(insertIndex, 0, item);
  }
}

function renameFinderItem(item, newName) {
  if (!item || !newName || newName === item.name) return;

  if (finderState.currentFolder.id === "documents" && item.id.indexOf("doc:") === 0) {
    var docs = loadTextDocs();
    docs[newName] = docs[item.name] || item.content || "";
    delete docs[item.name];
    saveTextDocs(docs);
    item.id = "doc:" + newName;
  } else {
    item.name = newName;
  }

  item.name = newName;
  renderFinder();
}

function createNewFolderInCurrent() {
  var folder = finderState.currentFolder;
  if (!folder || folder.id === "trash") return;
  var baseName = "New Folder";
  var existingNames = getFolderItems(folder).map(function(item) { return item.name; });
  var name = baseName;
  var counter = 2;
  while (existingNames.indexOf(name) !== -1) {
    name = baseName + " " + counter;
    counter++;
  }
  var node = createFinderNode({ name: name, type: "folder", kind: "folder", children: [] });
  addFinderFileToFolder(folder, node);
  setSelection([node.id]);
}

function openFinderSelected() {
  var selected = finderState.selectedIds.map(function(id) {
    return getItemById(id);
  }).filter(Boolean);
  if (!selected.length) return;
  openFinderItem(selected[0]);
}

function clearFinderSelection() {
  finderState.selectedIds = [];
  finderState.anchorId = null;
  finderState.focusId = null;
  renderFinder();
}

function finderItemMarkup(item) {
  var icon = fileIconMarkup(iconForNode(item));
  var meta = item.meta ? '<div class="finderItemMeta">' + item.meta + '</div>' : "";
  return '<div class="finderItemIcon">' + icon + '</div><div class="finderItemLabel">' + item.name + '</div>' + meta;
}

function renderSidebar() {
  var sidebarRoots = [
    { id: "applications", name: "Applications", icon: "grid" },
    { id: "desktop", name: "Desktop", icon: "monitor" },
    { id: "documents", name: "Documents", icon: "fileText" },
    { id: "downloads", name: "Downloads", icon: "download" },
    { id: "pictures", name: "Pictures", icon: "image" },
    { id: "music", name: "Music", icon: "music" },
    { id: "videos", name: "Videos", icon: "video" },
    { id: "trash", name: "Trash", icon: "trash" }
  ];

  var activeRoot = getRootFolder(finderState.currentFolder).id;
  finderSidebarItemsEl.innerHTML = "";
  sidebarRoots.forEach(function(root) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "finderSidebarItem" + (root.id === activeRoot ? " active" : "");
    button.dataset.root = root.id;

    var icon = document.createElement("span");
    icon.className = "finderSidebarIcon";
    icon.innerHTML = fileIconMarkup(root.icon);

    var label = document.createElement("span");
    label.className = "finderSidebarLabel";
    label.textContent = root.name;

    button.appendChild(icon);
    button.appendChild(label);
    button.addEventListener("click", function() {
      setCurrentFolder(finderRoots[root.id], false);
    });

    button.addEventListener("dragover", function(e) {
      if (!finderDragState) return;
      e.preventDefault();
      button.style.boxShadow = "inset 0 0 0 1px rgba(78,161,255,0.6)";
    });
    button.addEventListener("dragleave", function() {
      button.style.boxShadow = "";
    });
    button.addEventListener("drop", function(e) {
      e.preventDefault();
      button.style.boxShadow = "";
      if (!finderDragState) return;
      if (root.id === "trash") {
        finderDragState.ids.forEach(function(id) {
          var item = finderState.viewItems.filter(function(i) { return i.id === id; })[0];
          if (item) moveFinderItemToTrash(item);
        });
      } else {
        finderDragState.ids.forEach(function(id) {
          var item = finderState.viewItems.filter(function(i) { return i.id === id; })[0];
          if (item) moveFinderItem(item, finderRoots[root.id]);
        });
      }
      finderDragState = null;
      clearFinderSelection();
      renderFinder();
    });

    finderSidebarItemsEl.appendChild(button);
  });
}

function renderFinder() {
  renderSidebar();

  finderState.viewItems = getVisibleItems();
  finderGridEl.innerHTML = "";
  finderSelectionBoxEl.style.display = "none";

  if (!finderState.viewItems.length) {
    var empty = document.createElement("div");
    empty.className = "finderEmptyState";
    empty.innerHTML = '<strong>No items found</strong><span>Try a different folder or search term.</span>';
    finderGridEl.appendChild(empty);
    return;
  }

  finderState.viewItems.forEach(function(item) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "finderItem" + (item.type === "folder" ? " folder" : "") + (finderState.selectedIds.indexOf(item.id) >= 0 ? " selected" : "") + (finderState.focusId === item.id ? " focused" : "");
    button.dataset.itemId = item.id;
    button.innerHTML = finderItemMarkup(item);
    button.draggable = finderState.currentFolder.id !== "trash";

    button.addEventListener("contextmenu", function(e) {
      e.preventDefault();
      e.stopPropagation();
      if (finderState.selectedIds.indexOf(item.id) === -1) {
        setSelection([item.id]);
      }
      showFinderContextMenu(e.pageX, e.pageY, item);
    });

    button.addEventListener("dragstart", function(e) {
      var ids = finderState.selectedIds.indexOf(item.id) >= 0 ? finderState.selectedIds.slice() : [item.id];
      if (finderState.selectedIds.indexOf(item.id) === -1) setSelection([item.id]);
      finderDragState = { ids: ids };
      e.dataTransfer.effectAllowed = "move";
      try { e.dataTransfer.setData("text/plain", item.id); } catch (err) {}
    });

    button.addEventListener("dragend", function() {
      finderDragState = null;
    });

    if (item.type === "folder") {
      button.addEventListener("dragover", function(e) {
        if (!finderDragState || finderDragState.ids.indexOf(item.id) !== -1) return;
        e.preventDefault();
        e.stopPropagation();
        button.style.boxShadow = "inset 0 0 0 2px rgba(78,161,255,0.7)";
      });
      button.addEventListener("dragleave", function() {
        button.style.boxShadow = "";
      });
      button.addEventListener("drop", function(e) {
        e.preventDefault();
        e.stopPropagation();
        button.style.boxShadow = "";
        if (!finderDragState) return;
        finderDragState.ids.forEach(function(id) {
          if (id === item.id) return;
          var dragged = finderState.viewItems.filter(function(i) { return i.id === id; })[0];
          if (dragged) moveFinderItem(dragged, item);
        });
        finderDragState = null;
        clearFinderSelection();
        renderFinder();
      });
    }

    button.addEventListener("click", function(e) {
      e.preventDefault();
      e.stopPropagation();

      if (e.shiftKey) {
        if (!finderState.anchorId) finderState.anchorId = finderState.focusId || item.id;
        selectRangeTo(item.id);
        return;
      }

      if (e.metaKey || e.ctrlKey) {
        toggleSelection(item.id);
        return;
      }

      setSelection([item.id]);
    });

    button.addEventListener("dblclick", function(e) {
      e.preventDefault();
      e.stopPropagation();
      if (finderState.currentFolder.id === "trash") {
        var trashItem = getItemById(item.id);
        if (trashItem) {
          restoreTrashItem(trashItem);
          finderTrashItems = finderTrashItems.filter(function(entry) { return entry.id !== item.id; });
          clearFinderSelection();
          renderFinder();
        }
        return;
      }
      openFinderItem(item);
    });

    finderGridEl.appendChild(button);
  });
}

function startFinderSelectionBox(e) {
  if (e.target.closest(".finderItem")) return;
  var gridRect = finderGridEl.parentElement.getBoundingClientRect();
  var startX = e.clientX;
  var startY = e.clientY;
  finderState.dragSelect = {
    startX: startX,
    startY: startY,
    gridRect: gridRect,
    active: true
  };
  finderSelectionBoxEl.style.display = "block";
  finderSelectionBoxEl.style.left = (startX - gridRect.left) + "px";
  finderSelectionBoxEl.style.top = (startY - gridRect.top) + "px";
  finderSelectionBoxEl.style.width = "0px";
  finderSelectionBoxEl.style.height = "0px";

  function onMove(moveEvent) {
    if (!finderState.dragSelect || !finderState.dragSelect.active) return;
    var left = Math.min(startX, moveEvent.clientX);
    var top = Math.min(startY, moveEvent.clientY);
    var right = Math.max(startX, moveEvent.clientX);
    var bottom = Math.max(startY, moveEvent.clientY);

    finderSelectionBoxEl.style.left = (left - gridRect.left) + "px";
    finderSelectionBoxEl.style.top = (top - gridRect.top) + "px";
    finderSelectionBoxEl.style.width = (right - left) + "px";
    finderSelectionBoxEl.style.height = (bottom - top) + "px";

    var selected = finderState.viewItems.filter(function(item) {
      var el = finderGridEl.querySelector('[data-item-id="' + item.id + '"]');
      if (!el) return false;
      var rect = el.getBoundingClientRect();
      return !(
        rect.right < left ||
        rect.left > right ||
        rect.bottom < top ||
        rect.top > bottom
      );
    }).map(function(item) { return item.id; });

    finderState.selectedIds = selected;
    finderState.focusId = selected[selected.length - 1] || null;
    if (!finderState.anchorId && selected.length) finderState.anchorId = selected[0];
    renderFinder();
    finderSelectionBoxEl.style.display = "block";
  }

  function onUp() {
    finderState.dragSelect = null;
    finderSelectionBoxEl.style.display = "none";
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
  }

  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", onUp);
}

finderGridEl.addEventListener("mousedown", startFinderSelectionBox);

finderGridEl.addEventListener("contextmenu", function(e) {
  if (e.target.closest(".finderItem")) return; // handled by the item's own contextmenu listener
  e.preventDefault();
  e.stopPropagation();
  clearFinderSelection();
  showFinderContextMenu(e.pageX, e.pageY, null);
});

var finderContextMenuEl = document.querySelector("#finderContextMenu");

function hideFinderContextMenu() {
  if (finderContextMenuEl) finderContextMenuEl.style.display = "none";
}

function finderContextMenuAction(label, handler) {
  var row = document.createElement("div");
  row.className = "contextMenuItem";
  row.textContent = label;
  row.addEventListener("click", function() {
    hideFinderContextMenu();
    handler();
  });
  return row;
}

function showFinderContextMenu(x, y, item) {
  if (!finderContextMenuEl) return;
  finderContextMenuEl.innerHTML = "";
  var inTrash = finderState.currentFolder.id === "trash";

  if (item) {
    if (inTrash) {
      finderContextMenuEl.appendChild(finderContextMenuAction("↩️ Put Back", function() {
        restoreTrashItem(item);
        finderTrashItems = finderTrashItems.filter(function(entry) { return entry.id !== item.id; });
        clearFinderSelection();
        renderFinder();
      }));
      finderContextMenuEl.appendChild(finderContextMenuAction("🗑️ Delete Permanently", function() {
        finderTrashItems = finderTrashItems.filter(function(entry) { return entry.id !== item.id; });
        clearFinderSelection();
        renderFinder();
      }));
    } else {
      finderContextMenuEl.appendChild(finderContextMenuAction("📂 Open", function() {
        openFinderItem(item);
      }));
      finderContextMenuEl.appendChild(finderContextMenuAction("✏️ Rename", function() {
        var renamed = prompt("Rename:", item.name);
        if (renamed && renamed.trim()) renameFinderItem(item, renamed.trim());
      }));
      finderContextMenuEl.appendChild(finderContextMenuAction("🗑️ Delete", function() {
        moveFinderItemToTrash(item, finderState.currentFolder);
        clearFinderSelection();
        renderFinder();
      }));
    }
  } else if (!inTrash) {
    finderContextMenuEl.appendChild(finderContextMenuAction("📁 New Folder", function() {
      createNewFolderInCurrent();
    }));
  }

  if (!finderContextMenuEl.children.length) return;

  finderContextMenuEl.style.display = "block";
  finderContextMenuEl.style.top = y + "px";
  finderContextMenuEl.style.left = x + "px";
}

document.body.addEventListener("click", hideFinderContextMenu);

finderGridEl.addEventListener("keydown", function(e) {
  var items = finderState.viewItems;
  if (!items.length) return;

  var currentIndex = Math.max(0, items.findIndex(function(item) {
    return item.id === (finderState.focusId || finderState.selectedIds[0]);
  }));
  var columns = Math.max(1, Math.floor(finderGridEl.clientWidth / 118));
  var nextIndex = currentIndex;

  if (e.key === "ArrowLeft") nextIndex = Math.max(0, currentIndex - 1);
  if (e.key === "ArrowRight") nextIndex = Math.min(items.length - 1, currentIndex + 1);
  if (e.key === "ArrowUp") nextIndex = Math.max(0, currentIndex - columns);
  if (e.key === "ArrowDown") nextIndex = Math.min(items.length - 1, currentIndex + columns);

  if (nextIndex !== currentIndex) {
    e.preventDefault();
    if (e.shiftKey) {
      if (!finderState.anchorId) finderState.anchorId = items[currentIndex].id;
      selectRangeTo(items[nextIndex].id);
    } else {
      setSelection([items[nextIndex].id]);
    }
    var focused = finderGridEl.querySelector('[data-item-id="' + items[nextIndex].id + '"]');
    if (focused) focused.scrollIntoView({ block: "nearest", inline: "nearest" });
    return;
  }

  if (e.key === "Enter") {
    e.preventDefault();
    openFinderSelected();
    return;
  }

  if (e.key === "Escape") {
    e.preventDefault();
    clearFinderSelection();
    return;
  }

  if (e.key === "Delete") {
    e.preventDefault();
    moveSelectionToTrash();
    return;
  }

  if (e.key === "F2") {
    e.preventDefault();
    var target = getItemById(finderState.selectedIds[0] || finderState.focusId);
    if (!target || target.type === "folder" && target.parent === null) return;
    var renamed = prompt("Rename:", target.name);
    if (renamed && renamed.trim()) renameFinderItem(target, renamed.trim());
  }
});

finderSearchInput.addEventListener("input", function() {
  finderState.searchQuery = finderSearchInput.value;
  renderFinder();
});

finderSearchInput.addEventListener("keydown", function(e) {
  if (e.key === "Escape") {
    finderSearchInput.value = "";
    finderState.searchQuery = "";
    renderFinder();
  }
});

finderGridEl.addEventListener("click", function() {
  finderGridEl.focus();
});
finderSidebarItemsEl.addEventListener("click", function(e) {
  var button = e.target.closest(".finderSidebarItem");
  if (!button) return;
  var root = finderRoots[button.dataset.root];
  if (root) setCurrentFolder(root, false);
});

function openFinderSelectedItem() {
  var item = getItemById(finderState.focusId || finderState.selectedIds[0]);
  if (item) openFinderItem(item);
}

explorerScreen.addEventListener("keydown", function(e) {
  if (finderGridEl !== document.activeElement && finderSearchInput !== document.activeElement) return;
  if (e.key === "Enter") {
    e.preventDefault();
    openFinderSelectedItem();
  }
});

renderFinder();

// ---- Desktop Bin icon: quick access to Trash + drag-and-drop target ----
(function() {
  var binIcon = document.querySelector("#binDesktopIcon");
  var binGlyph = document.querySelector("#binDesktopIconGlyph");
  if (!binIcon) return;

  binIcon.addEventListener("dragover", function(e) {
    if (!finderDragState) return;
    e.preventDefault();
    binGlyph.style.boxShadow = "0 0 0 3px rgba(78,161,255,0.85)";
    binGlyph.style.filter = "brightness(1.15)";
  });
  binIcon.addEventListener("dragleave", function() {
    binGlyph.style.boxShadow = "";
    binGlyph.style.filter = "";
  });
  binIcon.addEventListener("drop", function(e) {
    e.preventDefault();
    binGlyph.style.boxShadow = "";
    binGlyph.style.filter = "";
    if (!finderDragState) return;
    finderDragState.ids.forEach(function(id) {
      var item = finderState.viewItems.filter(function(i) { return i.id === id; })[0];
      if (item) moveFinderItemToTrash(item, finderState.currentFolder);
    });
    finderDragState = null;
    clearFinderSelection();
    renderFinder();
  });
})();

// ---- basic text file editor overlay ----
var textFileOverlay = document.querySelector("#textFileOverlay");
var textFileNameInput = document.querySelector("#textFileNameInput");
var textFileBody = document.querySelector("#textFileBody");
var textFileClose = document.querySelector("#textFileClose");
var currentTextFileName = null;
var textFileViewerMode = false;

function openTextFile(name, content, options) {
  options = options || {};
  currentTextFileName = name;
  textFileViewerMode = !!options.readOnly;
  textFileNameInput.value = name;
  textFileBody.value = content;
  textFileNameInput.readOnly = textFileViewerMode;
  textFileBody.readOnly = textFileViewerMode;
  textFileOverlay.style.display = "flex";
  textFileBody.focus();
}

function openTextViewer(name, content) {
  openTextFile(name, content, { readOnly: true });
}

function saveCurrentTextFile() {
  if (!currentTextFileName || textFileViewerMode) return;
  var docs = loadTextDocs();
  var newName = textFileNameInput.value.trim() || currentTextFileName;
  if (newName !== currentTextFileName) {
    delete docs[currentTextFileName];
    currentTextFileName = newName;
  }
  docs[currentTextFileName] = textFileBody.value;
  saveTextDocs(docs);
}

textFileBody.addEventListener("input", saveCurrentTextFile);
textFileNameInput.addEventListener("blur", saveCurrentTextFile);

textFileClose.addEventListener("click", function() {
  saveCurrentTextFile();
  textFileOverlay.style.display = "none";
  currentTextFileName = null;
  textFileViewerMode = false;
  textFileNameInput.readOnly = false;
  textFileBody.readOnly = false;
  renderFinder(); // refresh in case a rename happened
});
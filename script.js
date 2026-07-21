var welcomeScreen = document.querySelector("#welcome");

// ---------- Snap preview overlay (shared across all windows) ----------
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

var SNAP_ZONE = 24; // px from edge that triggers a snap

function getSnapZone(x, y) {
  var vw = window.innerWidth;
  var vh = window.innerHeight;
  if (x < SNAP_ZONE) {
    return { top: 0, left: 0, width: vw / 2, height: vh };
  }
  if (x > vw - SNAP_ZONE) {
    return { top: 0, left: vw / 2, width: vw / 2, height: vh };
  }
  if (y < SNAP_ZONE) {
    return { top: 0, left: 0, width: vw, height: vh };
  }
  return null;
}

// ---------- Dragging (with snapping) ----------
function dragElement(element) {
  var initialX = 0;
  var initialY = 0;
  var currentX = 0;
  var currentY = 0;
  var pendingSnap = null;

  if (document.getElementById(element.id + "header")) {
    document.getElementById(element.id + "header").onmousedown = startDragging;
  } else {
    element.onmousedown = startDragging;
  }

  function startDragging(e) {
    e = e || window.event;
    e.preventDefault();
    initialX = e.clientX;
    initialY = e.clientY;

    // normalize to fixed top/left px so drag math is consistent,
    // whether the window is centered via transform or already snapped
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

// ---------- Resizing ----------
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
  var currentTime = new Date().toLocaleString();
  var timeText = document.querySelector("#timeElement");
  timeText.textContent = currentTime;
}
setInterval(updateTime, 1000);

var biggestIndex = 1;

function bringToFront(element) {
  biggestIndex++;
  element.style.zIndex = biggestIndex;
}

function toggleFullscreen(element) {
  if (element.dataset.fullscreen === "true") {
    element.style.width = element.dataset.prevWidth;
    element.style.height = element.dataset.prevHeight || "";
    element.style.top = "50%";
    element.style.left = "50%";
    element.style.transform = "translate(-50%, -50%)";
    element.dataset.fullscreen = "false";
  } else {
    element.dataset.prevWidth = element.style.width;
    element.dataset.prevHeight = element.style.height;
    element.style.width = "90vw";
    element.style.height = "90vh";
    element.style.top = "5vh";
    element.style.left = "5vw";
    element.style.transform = "none";
    element.dataset.fullscreen = "true";
  }
}

var appScreens = {};

var taskbar = document.querySelector("#taskbar");
var dockOpenApps = document.querySelector("#dockOpenApps");
var dockMinimizedApps = document.querySelector("#dockMinimizedApps");
var dockDivider = document.querySelector("#dockDivider");
var dockIcons = {};

var appIcons = {
  welcome: "./idk.jpg",
  notes: "./notes.webp",
  coffee: "./coffee.webp",
  calc: "./calculator.webp",
  settings: "./settings.webp",
  browser: "./image.webp"
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
    }
  });

  dockIcons[id] = wrapper;
  return wrapper;
}

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
  coffeeImg.src = "https://coffee.alexflipnote.dev/random?" + new Date().getTime();
});

dragElement(document.querySelector("#calc"));

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

calcScreenFullscreen.addEventListener("click", function() {
  toggleFullscreen(calcScreen);
});

calcScreen.addEventListener("mousedown", function() {
  bringToFront(calcScreen);
});

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
  try {
    calcDisplay.value = eval(calcDisplay.value);
  } catch (e) {
    calcDisplay.value = "Error";
  }
});

document.querySelector("#calcClear").addEventListener("click", function() {
  calcDisplay.value = "0";
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

// ---------- Browser app ----------
dragElement(document.querySelector("#browser"));

var browserScreen = document.querySelector("#browser");
var browserClose = document.querySelector("#browserclose");
var browserMinimize = document.querySelector("#browserminimize");
var browserFullscreen = document.querySelector("#browserfullscreen");
var browserUrl = document.querySelector("#browserUrl");
var browserGo = document.querySelector("#browserGo");
var browserFrame = document.querySelector("#browserFrame");
var browserError = document.querySelector("#browserError");
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

function loadBrowserUrl() {
  var val = browserUrl.value.trim();
  if (!val) return;
  if (!/^https?:\/\//i.test(val)) {
    val = "https://" + val;
  }
  browserUrl.value = val;
  browserError.style.display = "none";
  browserFrame.src = val;
}

browserGo.addEventListener("click", loadBrowserUrl);
browserUrl.addEventListener("keydown", function(e) {
  if (e.key === "Enter") loadBrowserUrl();
});

// Note: cross-origin iframes can't be introspected by JS, so a blocked
// embed (X-Frame-Options / CSP) usually just renders blank with no
// reliable error event. This "load" check is a soft heuristic only.
browserFrame.addEventListener("load", function() {
  try {
    // if this doesn't throw, it's same-origin (rare) — otherwise we can't know much
    var _ = browserFrame.contentWindow.location.href;
  } catch (err) {
    // cross-origin load succeeded, which is the normal/expected case — do nothing
  }
});

// ---------- Context menu ----------
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

// ---------- Wire up resizing for all windows ----------
["welcome", "notes", "coffee", "calc", "settings", "browser"].forEach(function(id) {
  var el = document.getElementById(id);
  if (el) makeResizable(el);
});

// ---------- Boot screen ----------
var bootScreen = document.querySelector("#bootScreen");
var bootBar = document.querySelector("#bootBar");

setTimeout(function() {
  bootBar.style.transition = "width 1s ease-out";
  bootBar.style.width = "100%";
}, 100);

setTimeout(function() {
  bootScreen.style.transition = "opacity 0.5s ease-out";
  bootScreen.style.opacity = "0";
}, 1300);

setTimeout(function() {
  bootScreen.style.display = "none";
}, 1800);
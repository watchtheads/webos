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

// ---- dragging windows around (with the snap-to-edge thing above) ----
function dragElement(element) {
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
  welcome: "./idk.jpg",
  notes: "./notes.webp",
  coffee: "./coffee.webp",
  calc: "./calculator.webp",
  settings: "./settings.webp",
  browser: "./astrosearch.webp",
  photobooth: "./photobooth.webp"
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

// hook up resizing on everything, too lazy to call this individually per window
["welcome", "notes", "coffee", "calc", "settings", "browser", "photobooth"].forEach(function(id) {
  var el = document.getElementById(id);
  if (el) makeResizable(el);
});

// ---- boot screen (just for show, fades out after ~1.8s) ----
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
dragElement(document.querySelector("#photobooth"));

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

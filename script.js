var welcomeScreen = document.querySelector("#welcome");
dragElement(document.getElementById("welcome"));

function dragElement(element) {
  var initialX = 0;
  var initialY = 0;
  var currentX = 0;
  var currentY = 0;

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
    document.onmouseup = stopDragging;
    document.onmousemove = dragElement;
  }

  function dragElement(e) {
    e = e || window.event;
    e.preventDefault();
    currentX = initialX - e.clientX;
    currentY = initialY - e.clientY;
    initialX = e.clientX;
    initialY = e.clientY;
    element.style.top = (element.offsetTop - currentY) + "px";
    element.style.left = (element.offsetLeft - currentX) + "px";
  }

  function stopDragging() {
    document.onmouseup = null;
    document.onmousemove = null;
  }
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
    element.style.top = "50%";
    element.style.left = "50%";
    element.style.transform = "translate(-50%, -50%)";
    element.dataset.fullscreen = "false";
  } else {
    element.dataset.prevWidth = element.style.width;
    element.style.width = "90vw";
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
  settings: "./settings.webp"
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
    if (action === "refresh") location.reload();
    contextMenu.style.display = "none";
  });
});
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
function makeResizable(element) {
  const handles = element.querySelectorAll('.resizeHandle');
  let isResizing = false;
  let currentHandle = null;
  let startX = 0;
  let startY = 0;
  let startWidth = 0;
  let startHeight = 0;

  handles.forEach(handle => {
    handle.addEventListener('mousedown', startResize);
  });

  function startResize(e) {
    e.preventDefault();
    e.stopPropagation();
    
    isResizing = true;
    currentHandle = e.target.classList;
    startX = e.clientX;
    startY = e.clientY;
    startWidth = element.offsetWidth;
    startHeight = element.offsetHeight;

    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResize);
  }

  function handleResize(e) {
    if (!isResizing) return;

    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    if (currentHandle.contains('se')) {
      element.style.width = Math.max(200, startWidth + deltaX) + 'px';
      element.style.height = Math.max(150, startHeight + deltaY) + 'px';
    } else if (currentHandle.contains('s')) {
      element.style.height = Math.max(150, startHeight + deltaY) + 'px';
    } else if (currentHandle.contains('e')) {
      element.style.width = Math.max(200, startWidth + deltaX) + 'px';
    }
  }

  function stopResize() {
    isResizing = false;
    currentHandle = null;
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
  }
}

// Apply to all windows
makeResizable(document.getElementById('welcome'));
makeResizable(document.getElementById('notes'));
makeResizable(document.getElementById('coffee'));
makeResizable(document.getElementById('calc'));
makeResizable(document.getElementById('settings'));
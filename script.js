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

var taskbar = document.querySelector("#taskbar");
var openApps = {};

function addToTaskbar(id, label, screen) {
  var btn = document.createElement("button");
  btn.textContent = label;
  btn.style.cursor = "pointer";
  btn.addEventListener("click", function() {
    if (screen.style.display === "flex") {
      bringToFront(screen);
    } else {
      openWindow(screen);
    }
  });
  taskbar.appendChild(btn);
  openApps[id] = btn;
}

function removeFromTaskbar(id) {
  if (openApps[id]) {
    openApps[id].remove();
    delete openApps[id];
  }
}

function closeWindow(element) {
  element.style.display = "none";
  removeFromTaskbar(element.id);
}

function openWindow(element) {
  element.style.display = "flex";
  bringToFront(element);
  if (!openApps[element.id]) {
    addToTaskbar(element.id, element.id.charAt(0).toUpperCase() + element.id.slice(1), element);
  }
}

var welcomeScreenClose = document.querySelector("#welcomeclose");
var welcomeScreenOpen = document.querySelector("#welcomeopen");

welcomeScreenClose.addEventListener("click", function() {
  closeWindow(welcomeScreen);
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

notesScreenClose.addEventListener("click", function() {
  closeWindow(notesScreen);
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

coffeeScreenClose.addEventListener("click", function() {
  closeWindow(coffeeScreen);
});

coffeeScreen.addEventListener("mousedown", function() {
  bringToFront(coffeeScreen);
});

newCoffeeBtn.addEventListener("click", function() {
  coffeeImg.src = "https://coffee.alexflipnote.dev/random?" + new Date().getTime();
});

dragElement(document.querySelector("#calc"));

var calcScreen = document.querySelector("#calc");
var calcClose = document.querySelector("#calcclose");
var calcDisplay = document.querySelector("#calcDisplay");

calcClose.addEventListener("click", function() {
  closeWindow(calcScreen);
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

function toggleApp(screen) {
  if (screen.style.display === "flex") {
    closeWindow(screen);
  } else {
    closeWindow(welcomeScreen);
    closeWindow(notesScreen);
    closeWindow(coffeeScreen);
    closeWindow(calcScreen);
    openWindow(screen);
  }
}
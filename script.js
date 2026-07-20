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

function closeWindow(element) {
  element.style.display = "none";
}

function openWindow(element) {
  element.style.display = "flex";
  bringToFront(element);
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
  notes[currentNoteIndex].content = notesContent.innerHTML;
  currentNoteIndex = index;
  notesContent.innerHTML = notes[currentNoteIndex].content;
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
// Flowboard — task board logic
// Data shape: { id, title, priority: 'low'|'med'|'high', lane: 'queued'|'active'|'shipped' }

const STORAGE_KEY = "flowboard-tasks";
const LANES = ["queued", "active", "shipped"];

let tasks = [];
let draggedId = null;

/* ---------- persistence ---------- */
function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function restore() {
  const raw = localStorage.getItem(STORAGE_KEY);
  tasks = raw ? JSON.parse(raw) : [];
}

/* ---------- rendering ---------- */
function render() {
  LANES.forEach((lane) => {
    document.getElementById(`zone-${lane}`).innerHTML = "";
  });

  tasks.forEach((task) => {
    const zone = document.getElementById(`zone-${task.lane}`);
    if (zone) zone.insertAdjacentHTML("beforeend", cardMarkup(task));
  });

  updateTallies();
}

function cardMarkup(task) {
  const nextLane = LANES[LANES.indexOf(task.lane) + 1];
  const advanceLabel = task.lane === "queued" ? "Start" : "Ship";

  return `
    <article
      class="task-card"
      id="card-${task.id}"
      data-priority="${task.priority}"
      draggable="true"
      ondragstart="handleDragStart(event, ${task.id})"
      ondragend="handleDragEnd(event)"
    >
      <div class="task-title" id="title-${task.id}">${escapeHtml(task.title)}</div>
      <div class="task-meta">
        <span class="priority-tag">${task.priority}</span>
        <div class="task-actions">
          ${nextLane ? `<button class="advance" onclick="advanceTask(${task.id})">${advanceLabel}</button>` : ""}
          <button onclick="beginEdit(${task.id})">Edit</button>
          <button class="danger" onclick="removeTask(${task.id})">Delete</button>
        </div>
      </div>
    </article>`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function updateTallies() {
  LANES.forEach((lane) => {
    const count = tasks.filter((t) => t.lane === lane).length;
    document.getElementById(`tally-${lane}`).textContent = count;
  });

  const total = tasks.length;
  LANES.forEach((lane) => {
    const count = tasks.filter((t) => t.lane === lane).length;
    const pct = total === 0 ? 0 : Math.round((count / total) * 100);
    document.getElementById(`bar-${lane}`).style.width = `${pct}%`;
  });
}

/* ---------- create / update / delete ---------- */
function handleComposerSubmit(event) {
  event.preventDefault();
  const titleInput = document.getElementById("task-title");
  const prioritySelect = document.getElementById("task-priority");
  const laneSelect = document.getElementById("task-lane");
  const errorEl = document.getElementById("composer-error");

  const title = titleInput.value.trim();
  if (!title) {
    errorEl.classList.add("show");
    return;
  }
  errorEl.classList.remove("show");

  tasks.push({
    id: Date.now(),
    title,
    priority: prioritySelect.value,
    lane: laneSelect.value,
  });

  persist();
  render();
  titleInput.value = "";
  titleInput.focus();
}

function removeTask(id) {
  tasks = tasks.filter((t) => t.id !== id);
  persist();
  render();
}

function advanceTask(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  const next = LANES[LANES.indexOf(task.lane) + 1];
  if (next) task.lane = next;
  persist();
  render();
}

function beginEdit(id) {
  const titleEl = document.getElementById(`title-${id}`);
  const task = tasks.find((t) => t.id === id);
  if (!task) return;

  titleEl.innerHTML = `
    <input class="edit-field" id="edit-${id}" value="${escapeHtml(task.title)}" />
    <button onclick="commitEdit(${id})">Save</button>`;
  document.getElementById(`edit-${id}`).focus();
}

function commitEdit(id) {
  const input = document.getElementById(`edit-${id}`);
  const newTitle = input.value.trim();
  if (!newTitle) return;

  const task = tasks.find((t) => t.id === id);
  if (task) task.title = newTitle;
  persist();
  render();
}

/* ---------- drag and drop ---------- */
function handleDragStart(event, id) {
  draggedId = id;
  document.getElementById(`card-${id}`).classList.add("dragging");
}

function handleDragEnd() {
  if (draggedId !== null) {
    const card = document.getElementById(`card-${draggedId}`);
    if (card) card.classList.remove("dragging");
  }
  draggedId = null;
}

function handleDragOver(event) {
  event.preventDefault();
  event.currentTarget.classList.add("hover");
}

function handleDragLeave(event) {
  event.currentTarget.classList.remove("hover");
}

function handleDrop(event, lane) {
  event.currentTarget.classList.remove("hover");
  if (draggedId === null) return;

  const task = tasks.find((t) => t.id === draggedId);
  if (task) task.lane = lane;

  draggedId = null;
  persist();
  render();
}

/* ---------- wiring ---------- */
function attachDropzones() {
  LANES.forEach((lane) => {
    const zone = document.getElementById(`zone-${lane}`);
    zone.addEventListener("dragover", handleDragOver);
    zone.addEventListener("dragleave", handleDragLeave);
    zone.addEventListener("drop", (e) => handleDrop(e, lane));
  });
}

function init() {
  restore();
  attachDropzones();
  document
    .getElementById("composer-form")
    .addEventListener("submit", handleComposerSubmit);
  render();
}

document.addEventListener("DOMContentLoaded", init);
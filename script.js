const STORAGE_KEY = "ai-test-tasks";

const form = document.getElementById("add-form");
const input = document.getElementById("task-input");
const list = document.getElementById("task-list");
const summary = document.getElementById("summary");
const emptyState = document.getElementById("empty-state");
const filtersEl = document.getElementById("filters");
const clearDoneBtn = document.getElementById("clear-done");

let tasks = loadTasks();
let filter = "all";

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function addTask(text) {
  tasks.push({ id: crypto.randomUUID(), text, done: false });
  saveTasks();
  render();
}

function toggleTask(id) {
  const task = tasks.find((t) => t.id === id);
  if (task) task.done = !task.done;
  saveTasks();
  render();
}

function deleteTask(id) {
  tasks = tasks.filter((t) => t.id !== id);
  saveTasks();
  render();
}

function clearDone() {
  tasks = tasks.filter((t) => !t.done);
  saveTasks();
  render();
}

function getFilteredTasks() {
  if (filter === "active") return tasks.filter((t) => !t.done);
  if (filter === "done") return tasks.filter((t) => t.done);
  return tasks;
}

function render() {
  const filtered = getFilteredTasks();
  list.innerHTML = "";

  for (const task of filtered) {
    const li = document.createElement("li");
    li.className = "task-item" + (task.done ? " is-done" : "");

    const checkbox = document.createElement("button");
    checkbox.className = "task-item__checkbox";
    checkbox.type = "button";
    checkbox.setAttribute("aria-label", "완료 표시");
    checkbox.textContent = task.done ? "✓" : "";
    checkbox.addEventListener("click", () => toggleTask(task.id));

    const text = document.createElement("span");
    text.className = "task-item__text";
    text.textContent = task.text;

    const del = document.createElement("button");
    del.className = "task-item__delete";
    del.type = "button";
    del.setAttribute("aria-label", "삭제");
    del.textContent = "×";
    del.addEventListener("click", () => deleteTask(task.id));

    li.append(checkbox, text, del);
    list.appendChild(li);
  }

  emptyState.classList.toggle("is-visible", filtered.length === 0);

  const doneCount = tasks.filter((t) => t.done).length;
  summary.textContent = `${tasks.length}개 중 ${doneCount}개 완료`;
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  addTask(text);
  input.value = "";
  input.focus();
});

filtersEl.addEventListener("click", (e) => {
  const btn = e.target.closest(".filter-btn");
  if (!btn) return;
  filter = btn.dataset.filter;
  for (const b of filtersEl.querySelectorAll(".filter-btn")) {
    b.classList.toggle("is-active", b === btn);
  }
  render();
});

clearDoneBtn.addEventListener("click", clearDone);

render();

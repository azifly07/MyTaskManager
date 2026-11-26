// ================================
// ふんわり ToDo - タスク管理アプリ
// ================================

// localStorageに保存するときに使う名前
const STORAGE_KEY = "funwariTodoTasks";
const CATEGORY_KEY = "funwariTodoCategories";

// 最初から用意しておくカテゴリ
const defaultCategories = ["大学", "プライベート", "仕事", "その他"];

// アプリで使うデータ
let tasks = loadData(STORAGE_KEY, []);
let categories = loadData(CATEGORY_KEY, defaultCategories);
let currentFilter = "all";       // all / today / upcoming / completed / category名
let currentStatus = "all";       // all / active / completed

// HTMLの要素を取得
const taskForm = document.getElementById("taskForm");
const taskInput = document.getElementById("taskInput");
const categoryInput = document.getElementById("categoryInput");
const priorityInput = document.getElementById("priorityInput");
const dueDateInput = document.getElementById("dueDateInput");
const taskList = document.getElementById("taskList");
const emptyState = document.getElementById("emptyState");
const sortSelect = document.getElementById("sortSelect");

// localStorageからデータを読み込む。データがなければ初期値を使う
function loadData(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : [...fallback];
  } catch (error) {
    console.error("保存データの読み込みに失敗しました:", error);
    return [...fallback];
  }
}

// タスクとカテゴリをブラウザに保存する
function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  localStorage.setItem(CATEGORY_KEY, JSON.stringify(categories));
}

// 今日の日付を YYYY-MM-DD 形式で取得
function getToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// 日付を「11/24」のような表示に変換
function formatDate(dateString) {
  if (!dateString) return "期限なし";
  const [year, month, day] = dateString.split("-");
  return `${Number(month)}/${Number(day)}`;
}

// 期限が過ぎているか調べる
function isOverdue(task) {
  return task.dueDate && task.dueDate < getToday() && !task.completed;
}

// タスク追加
taskForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = taskInput.value.trim();
  if (!title) return;

  const newTask = {
    id: Date.now().toString(),
    title: title,
    category: categoryInput.value,
    priority: priorityInput.value,
    dueDate: dueDateInput.value,
    completed: false,
    createdAt: Date.now()
  };

  tasks.unshift(newTask);
  saveData();
  taskForm.reset();
  priorityInput.value = "medium";
  render();
  taskInput.focus();
});

// タスクの完了・未完了を切り替える
function toggleTask(id) {
  tasks = tasks.map(task =>
    task.id === id ? { ...task, completed: !task.completed } : task
  );
  saveData();
  render();
}

// タスクを削除する
function deleteTask(id) {
  const target = tasks.find(task => task.id === id);
  if (!target) return;
  if (!confirm(`「${target.title}」を削除しますか？`)) return;

  tasks = tasks.filter(task => task.id !== id);
  saveData();
  render();
}

// カテゴリの選択肢をフォームとサイドバーに表示
function renderCategories() {
  categoryInput.innerHTML = "";
  categories.forEach(category => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categoryInput.appendChild(option);
  });

  const categoryList = document.getElementById("categoryList");
  categoryList.innerHTML = "";

  categories.forEach(category => {
    const button = document.createElement("button");
    button.className = "category-button" +
      (currentFilter === category ? " active" : "");
    button.type = "button";

    const dot = document.createElement("span");
    dot.className = "category-dot";
    const label = document.createElement("span");
    label.textContent = category;

    button.append(dot, label);
    button.addEventListener("click", () => {
      currentFilter = category;
      currentStatus = "all";
      updateActiveNavigation();
      render();
    });
    categoryList.appendChild(button);
  });
}

// サイドバーのメニューを押したときの処理
document.querySelectorAll(".nav-item").forEach(button => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;
    currentStatus = "all";
    updateActiveNavigation();
    render();
  });
});

// 未完了・完了済みタブ
document.querySelectorAll(".filter-tab").forEach(button => {
  button.addEventListener("click", () => {
    currentStatus = button.dataset.status;
    document.querySelectorAll(".filter-tab").forEach(tab => {
      tab.classList.toggle("active", tab === button);
    });
    render();
  });
});

// 表示中のメニューにactiveクラスを付ける
function updateActiveNavigation() {
  document.querySelectorAll(".nav-item").forEach(button => {
    button.classList.toggle("active", button.dataset.filter === currentFilter);
  });
  renderCategories();
}

// 表示するタスクを絞り込む
function getVisibleTasks() {
  let result = [...tasks];

  if (currentFilter === "today") {
    result = result.filter(task => task.dueDate === getToday() && !task.completed);
  } else if (currentFilter === "upcoming") {
    result = result.filter(task =>
      task.dueDate && task.dueDate >= getToday() && !task.completed
    );
  } else if (currentFilter === "completed") {
    result = result.filter(task => task.completed);
  } else if (categories.includes(currentFilter)) {
    result = result.filter(task => task.category === currentFilter);
  }

  if (currentStatus === "active") {
    result = result.filter(task => !task.completed);
  } else if (currentStatus === "completed") {
    result = result.filter(task => task.completed);
  }

  // 並び替え
  if (sortSelect.value === "due") {
    result.sort((a, b) => (a.dueDate || "9999-99-99").localeCompare(b.dueDate || "9999-99-99"));
  } else if (sortSelect.value === "priority") {
    const order = { high: 0, medium: 1, low: 2 };
    result.sort((a, b) => order[a.priority] - order[b.priority]);
  } else {
    result.sort((a, b) => b.createdAt - a.createdAt);
  }

  return result;
}

// タスク一覧を画面に描画する
function renderTasks() {
  const visibleTasks = getVisibleTasks();
  taskList.innerHTML = "";

  visibleTasks.forEach(task => {
    const item = document.createElement("article");
    item.className = "task-item" + (task.completed ? " done" : "");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-check";
    checkbox.checked = task.completed;
    checkbox.setAttribute("aria-label", `${task.title}を完了にする`);
    checkbox.addEventListener("change", () => toggleTask(task.id));

    const info = document.createElement("div");
    info.className = "task-info";

    const name = document.createElement("span");
    name.className = "task-name";
    name.textContent = task.title;

    const meta = document.createElement("div");
    meta.className = "task-meta";

    const category = document.createElement("span");
    category.className = "meta-chip";
    category.textContent = `✿ ${task.category}`;

    const priority = document.createElement("span");
    priority.className = `meta-chip priority-${task.priority}`;
    const priorityNames = { high: "優先度：高", medium: "優先度：中", low: "優先度：低" };
    priority.textContent = priorityNames[task.priority] || "優先度：中";

    const due = document.createElement("span");
    due.className = "meta-chip" + (isOverdue(task) ? " due-overdue" : "");
    due.textContent = task.dueDate
      ? `${isOverdue(task) ? "⚠ 期限切れ：" : "期限："}${formatDate(task.dueDate)}`
      : "期限なし";

    meta.append(category, priority, due);
    info.append(name, meta);

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-button";
    deleteButton.type = "button";
    deleteButton.textContent = "×";
    deleteButton.title = "タスクを削除";
    deleteButton.setAttribute("aria-label", `${task.title}を削除`);
    deleteButton.addEventListener("click", () => deleteTask(task.id));

    item.append(checkbox, info, deleteButton);
    taskList.appendChild(item);
  });

  emptyState.classList.toggle("show", visibleTasks.length === 0);
  document.getElementById("visibleCount").textContent = `${visibleTasks.length}件`;
}

// 統計と進捗を更新
function renderStats() {
  const total = tasks.length;
  const completed = tasks.filter(task => task.completed).length;
  const remaining = total - completed;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  document.getElementById("totalTasks").textContent = total;
  document.getElementById("completedTasks").textContent = completed;
  document.getElementById("remainingTasks").textContent = remaining;
  document.getElementById("allCount").textContent = total;
  document.getElementById("todayCount").textContent =
    tasks.filter(task => task.dueDate === getToday() && !task.completed).length;

  document.getElementById("progressPercent").textContent = `${percent}%`;
  document.getElementById("progressRing").style.setProperty("--progress", `${percent}%`);
  document.getElementById("progressCount").textContent = `${completed} / ${total}`;

  let message = "まずはひとつ、始めてみよう！";
  if (total > 0 && percent === 100) message = "すべて完了！今日もおつかれさま ✨";
  else if (percent >= 70) message = "あと少し！ゴールが見えてきたね 🌷";
  else if (percent >= 30) message = "いい調子！そのまま進めよう 🌱";
  document.getElementById("progressMessage").textContent = message;
}

// 見出しを現在のメニューに合わせる
function renderTitle() {
  const titles = {
    all: "すべてのタスク",
    today: "今日のタスク",
    upcoming: "期限が近いタスク",
    completed: "完了済み"
  };
  document.getElementById("listTitle").textContent =
    titles[currentFilter] || currentFilter;
}

// 画面全体を更新
function render() {
  renderCategories();
  renderTasks();
  renderStats();
  renderTitle();
}

// カテゴリ追加ダイアログ
const categoryDialog = document.getElementById("categoryDialog");
document.getElementById("addCategoryBtn").addEventListener("click", () => {
  document.getElementById("newCategoryInput").value = "";
  categoryDialog.showModal();
  document.getElementById("newCategoryInput").focus();
});

document.getElementById("cancelCategoryBtn").addEventListener("click", () => {
  categoryDialog.close();
});

document.getElementById("categoryForm").addEventListener("submit", event => {
  event.preventDefault();
  const input = document.getElementById("newCategoryInput");
  const name = input.value.trim();

  if (!name) return;
  if (categories.includes(name)) {
    alert("そのカテゴリはすでに登録されています。");
    return;
  }

  categories.push(name);
  saveData();
  categoryDialog.close();
  render();
  categoryInput.value = name;
});

// 並び替えを変更したら一覧を再描画
sortSelect.addEventListener("change", renderTasks);

// 今日の日付をヘッダーに表示
const now = new Date();
document.getElementById("todayLabel").textContent =
  `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日  •  MY PLANNER`;

// 最初の画面を表示
render();

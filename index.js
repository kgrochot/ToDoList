let items = [];
let currentFilter = 'all';
let dragStartIndex = null;

const storageKey = "items";

document.addEventListener("DOMContentLoaded", () => {

    const itemsDiv = document.getElementById("items");
    const input = document.getElementById("itemInput");
    const searchInput = document.getElementById("searchInput");
    const dateInput = document.getElementById("dateInput");
    const categoryInput = document.getElementById("categoryInput");
    const addBtn = document.getElementById("addBtn");
    const darkBtn = document.getElementById("darkMode");

    // --- INITIAL LOAD ---
    loadItems();

    // --- DARK MODE ---
    if (localStorage.getItem("darkMode") === "true") {
        document.body.classList.add("dark");
        darkBtn.textContent = "☀️ Light Mode";
    }

    darkBtn.addEventListener("click", toggleDarkMode);

    // --- ENABLE/DISABLE ADD BUTTON ---
    input.addEventListener("input", () => {
        addBtn.disabled = !input.value.trim();
    });

    // --- ADD ITEM ---
    window.addItem = () => {
        const value = input.value.trim();
        const date = dateInput.value;
        const category = categoryInput.value;

        if (!value) return;

        items.push({ text: value, done: false, date: date || null, category: category || null });
        saveItems();
        renderItems();

        input.value = "";
        dateInput.value = "";
        categoryInput.value = "";
        addBtn.disabled = true;
    };

    // --- RENDER ITEMS ---
    function renderItems() {
        itemsDiv.innerHTML = "";
        const searchValue = searchInput.value.toLowerCase();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        items.forEach((item, idx) => {

            // --- FILTERS ---
            if (currentFilter === 'active' && item.done) return;
            if (currentFilter === 'done' && !item.done) return;
            if (searchValue && !item.text.toLowerCase().includes(searchValue)) return;

            // --- TODO ITEM CARD ---
            const card = document.createElement("div");
            card.className = "todo-item";
            card.draggable = true;

            // --- DRAG & DROP ---
            card.addEventListener("dragstart", () => { dragStartIndex = idx; card.classList.add("dragging"); });
            card.addEventListener("dragend", () => { card.classList.remove("dragging"); dragStartIndex = null; });
            card.addEventListener("dragover", e => e.preventDefault());
            card.addEventListener("drop", () => {
                if (dragStartIndex === null) return;
                const dragged = items.splice(dragStartIndex, 1)[0];
                items.splice(idx, 0, dragged);
                saveItems();
                renderItems();
            });

            // --- LEFT SIDE (text + badge + category) ---
            const left = document.createElement("div");
            left.className = "item-left";

            const textP = document.createElement("p");
            textP.textContent = item.text;
            if (item.done) textP.style.textDecoration = "line-through";

            const badge = document.createElement("span");
            badge.className = "badge";

            if (!item.done && item.date) {
                const itemDate = new Date(item.date);
                itemDate.setHours(0,0,0,0);

                if (itemDate < today) {
                    badge.textContent = `📅 ${item.date} OVERDUE`;
                    badge.style.backgroundColor = "red";
                } else if (itemDate.getTime() === today.getTime()) {
                    badge.textContent = `📅 ${item.date} TODAY`;
                    badge.style.backgroundColor = "orange";
                } else {
                    badge.textContent = `📅 ${item.date}`;
                    badge.style.backgroundColor = "#999";
                }
            }

            const categorySmall = document.createElement("small");
            categorySmall.className = "item-category";
            categorySmall.textContent = item.category ? `🏷️ ${item.category}` : "";

            left.appendChild(textP);
            if (badge.textContent) left.appendChild(badge);
            if (categorySmall.textContent) left.appendChild(categorySmall);

            // --- BUTTONS ---
            const btns = document.createElement("div");
            btns.className = "item-buttons";

            const editBtn = document.createElement("button");
            editBtn.textContent = "Edit";
            editBtn.onclick = () => editItem(idx);

            const delBtn = document.createElement("button");
            delBtn.textContent = "Delete";
            delBtn.onclick = () => { items.splice(idx, 1); saveItems(); renderItems(); };

            const upBtn = document.createElement("button");
            upBtn.textContent = "↑";
            upBtn.onclick = () => {
                if (idx === 0) return;
                [items[idx -1], items[idx]] = [items[idx], items[idx -1]];
                saveItems(); renderItems();
            };

            const downBtn = document.createElement("button");
            downBtn.textContent = "↓";
            downBtn.onclick = () => {
                if (idx === items.length -1) return;
                [items[idx], items[idx +1]] = [items[idx +1], items[idx]];
                saveItems(); renderItems();
            };

            btns.append(editBtn, delBtn, upBtn, downBtn);

            // --- ASSEMBLE CARD ---
            card.append(left, btns);
            itemsDiv.appendChild(card);
        });
    }

    // --- EDIT ITEM FUNCTION ---
    function editItem(idx) {
        const item = items[idx];
        const newText = prompt("Edit task:", item.text);
        if (newText !== null) {
            items[idx].text = newText.trim() || item.text;
            saveItems();
            renderItems();
        }
    }

    // --- FILTERS ---
    window.setFilter = (filter) => { currentFilter = filter; renderItems(); };

    // --- CLEAR COMPLETED ---
    window.clearCompleted = () => {
        items = items.filter(i => !i.done);
        saveItems();
        renderItems();
    };

    // --- DARK MODE ---
    function toggleDarkMode() {
        document.body.classList.toggle("dark");
        localStorage.setItem("darkMode", document.body.classList.contains("dark"));
        darkBtn.textContent = document.body.classList.contains("dark") ? "☀️ Light Mode" : "🌙 Dark Mode";
    }

    // --- LOCALSTORAGE ---
    function loadItems() {
        const oldItems = localStorage.getItem(storageKey);
        if (oldItems) {
            items = JSON.parse(oldItems).map(i => ({
                text: i.text,
                done: i.done || false,
                date: i.date || null,
                category: i.category || null
            }));
        }
        renderItems();
    }

    function saveItems() { localStorage.setItem(storageKey, JSON.stringify(items)); }

});
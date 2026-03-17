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

    // --- INITIALIZE ---
    loadItems();

    // --- DARK MODE ---
    const darkMode = localStorage.getItem("darkMode") === "true";
    if (darkMode) document.body.classList.add("dark");

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

        items.push({
            text: value,
            done: false,
            date: date || null,
            category: category || null
        });
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

        items.forEach((item, idx) => {
            if (currentFilter === 'active' && item.done) return;
            if (currentFilter === 'done' && !item.done) return;
            if (searchValue && !item.text.toLowerCase().includes(searchValue)) return;

            const container = document.createElement("div");
            container.draggable = true;

            // DRAG & DROP
            container.addEventListener("dragstart", () => {
                dragStartIndex = idx;
                container.classList.add("dragging");
            });
            container.addEventListener("dragend", () => {
                container.classList.remove("dragging");
                dragStartIndex = null;
            });
            container.addEventListener("dragover", e => e.preventDefault());
            container.addEventListener("dragenter", () => container.style.backgroundColor = "#e0f7fa");
            container.addEventListener("dragleave", () => container.style.backgroundColor = item.done ? "#f0f0f0" : "#fff");
            container.addEventListener("drop", () => {
                if (dragStartIndex === null) return;
                const dragged = items.splice(dragStartIndex, 1)[0];
                items.splice(idx, 0, dragged);
                saveItems();
                renderItems();
                container.style.backgroundColor = item.done ? "#f0f0f0" : "#fff";
                dragStartIndex = null;
            });

            // CHECKBOX
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.checked = item.done;
            checkbox.onchange = () => { item.done = checkbox.checked; saveItems(); renderItems(); };

            // TEXT & META
            const textWrapper = document.createElement("div");
            textWrapper.style.flexGrow = "1";

            const text = document.createElement("p");
            text.textContent = item.text;

            const meta = document.createElement("small");
            meta.style.color = "gray";
            meta.textContent = (item.date ? `📅 ${item.date} ` : "") + (item.category ? `🏷️ ${item.category}` : "");

            if (item.done) {
                text.style.textDecoration = "line-through";
                text.style.color = "gray";
            }

            textWrapper.appendChild(text);
            textWrapper.appendChild(meta);

            // DELETE / EDIT / UP / DOWN
            const deleteButton = document.createElement("button");
            deleteButton.textContent = "Delete";
            deleteButton.onclick = () => removeItems(idx);

            const editButton = document.createElement("button");
            editButton.textContent = "Edit";
            editButton.onclick = () => {
                const editInput = document.createElement("input");
                editInput.type = "text";
                editInput.value = item.text;
                editInput.style.flexGrow = "1";
                editInput.style.marginRight = "10px";

                const saveButton = document.createElement("button");
                saveButton.textContent = "Save";
                saveButton.onclick = () => {
                    const newValue = editInput.value.trim();
                    if (newValue) { item.text = newValue; saveItems(); renderItems(); }
                };

                editInput.addEventListener("keypress", e => { if (e.key === "Enter") saveButton.click(); });

                const editCheckbox = document.createElement("input");
                editCheckbox.type = "checkbox";
                editCheckbox.checked = item.done;
                editCheckbox.onchange = () => { item.done = editCheckbox.checked; saveItems(); renderItems(); };

                container.replaceChildren(editCheckbox, editInput, saveButton);
            };

            const upButton = document.createElement("button");
            upButton.textContent = "↑";
            upButton.onclick = () => {
                if (idx === 0) return;
                [items[idx - 1], items[idx]] = [items[idx], items[idx - 1]];
                saveItems(); renderItems();
            };

            const downButton = document.createElement("button");
            downButton.textContent = "↓";
            downButton.onclick = () => {
                if (idx === items.length - 1) return;
                [items[idx], items[idx + 1]] = [items[idx + 1], items[idx]];
                saveItems(); renderItems();
            };

            container.appendChild(checkbox);
            container.appendChild(textWrapper);
            container.appendChild(deleteButton);
            container.appendChild(editButton);
            container.appendChild(upButton);
            container.appendChild(downButton);

            itemsDiv.appendChild(container);
        });
    }

    // --- FILTER ---
    window.setFilter = (filter) => { currentFilter = filter; renderItems(); };

    // --- REMOVE / CLEAR ---
    function removeItems(idx) {
        items.splice(idx, 1);
        saveItems();
        renderItems();
    }

    function clearCompleted() {
        items = items.filter(item => !item.done);
        saveItems();
        renderItems();
    }

    // --- LOCALSTORAGE ---
    function loadItems() {
        const oldItems = localStorage.getItem(storageKey);
        if (oldItems)
            items = JSON.parse(oldItems).map(item =>
                typeof item === "string" ? {
                    text: item, done: false, date: null, category: null
                } : {
                    text: item.text,
                    done: item.done || false,
                    date: item.date || null,
                    category: item.category || null
                }
            );
        renderItems();
    }

    function saveItems() { localStorage.setItem(storageKey, JSON.stringify(items)); }

});
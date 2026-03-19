let items = [];
let currentFilter = 'all';
let currentTab = 'all'; // 'today', 'week', 'all'
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

    // --- FUNKTION DEFINIEREN ---
    async function importICSfromURL(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Fehler: ${response.status}`);
            const icsText = await response.text();
            const parsedEvents = parseICS(icsText);

            parsedEvents.forEach(ev => {
                items.push({
                    text: ev.summary || "No title",
                    done: false,
                    date: ev.start || null,
                    category: ev.category || null,
                    note: ev.description || "",
                    image: null
                });
            });

            saveItems();
            renderItems();
            console.log(`ICS importiert: ${parsedEvents.length} Termine`);
        } catch (err) {
            console.error("ICS Import fehlgeschlagen:", err);
        }
    }

    // --- ZUERST ITEMS LADEN ---
    loadItems();

    // --- DANN ICS IMPORTIEREN ---
    importICSfromURL('http://localhost:3000/calendar-proxy');

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

    searchInput.addEventListener("input", () => {
        renderItems();
    });

    // 'today', 'week', 'all'
    window.setTab = (tab, event) => {
        currentTab = tab;
        renderItems();

        // Active-Tab markieren
        document.querySelectorAll("#tabs button").forEach(b => b.classList.remove("active"));
        if (event) event.currentTarget.classList.add("active");
    };

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
            category: category || null,
            note: "",
            image: null
        });
        saveItems();
        renderItems();

        input.value = "";
        dateInput.value = "";
        categoryInput.value = "";
        addBtn.disabled = true;
    };

    // Innerhalb von DOMContentLoaded
    window.printTasks = () => {
        const itemsDiv = document.getElementById('items');
        const todoCards = Array.from(itemsDiv.getElementsByClassName('todo-item'));

        let printHTML = '<h1>Zu tun & zu lassen</h1>';

        todoCards.forEach(card => {
            const left = card.querySelector('.item-left');
            const details = card.querySelector('.task-details');

            const text = left.querySelector('p')?.textContent || '';
            const badge = left.querySelector('.badge')?.textContent || '';
            const category = left.querySelector('.item-category')?.textContent || '';
            const note = details?.querySelector('textarea')?.value || '';
            const imgSrc = details?.querySelector('img')?.src || '';

            printHTML += `<div style="border:1px solid #ccc; padding:10px; margin:5px; border-radius:5px;">
            <strong>${text}</strong><br>
            ${badge ? badge + '<br>' : ''}
            ${category ? category + '<br>' : ''}
            ${note ? '📝 ' + note + '<br>' : ''}
            ${imgSrc ? '<img src="' + imgSrc + '" style="max-width:150px; display:block; margin-top:5px;">' : ''}
        </div>`;
        });

        const printWindow = window.open('', '', 'height=600,width=800');
        printWindow.document.write('<html><head><title>ToDo Liste</title>');
        printWindow.document.write('<style>body{font-family:sans-serif;}</style>');
        printWindow.document.write('</head><body>');
        printWindow.document.write(printHTML);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    };

    window.exportJSON = function () {
        const dataStr = JSON.stringify(items, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "todo_list.json";
        a.click();
        URL.revokeObjectURL(url);
    }

    window.exportCSV = function () {
        const header = ["Text", "Datum", "Kategorie", "Erledigt"];
        const rows = items.map(i => [
            `"${i.text}"`,
            i.date || "",
            `"${i.category || ""}"`,
            i.done ? "Ja" : "Nein"
        ]);

        const csvContent = [header, ...rows].map(e => e.join(",")).join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "todo_list.csv";
        a.click();
        URL.revokeObjectURL(url);
    }

    // HTML: <input type="file" id="icsInput" accept=".ics">
    const icsInput = document.getElementById('icsInput');

    icsInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const icsText = event.target.result;
            const parsedEvents = parseICS(icsText);

            parsedEvents.forEach(ev => {
                // Neue Items in dein Todo-Array einfügen
                items.push({
                    text: ev.summary || "No title",
                    done: false,
                    date: ev.start || null,
                    category: ev.category || null,
                    note: ev.description || "",
                    image: null
                });
            });

            saveItems();
            renderItems();
        };
        reader.readAsText(file);
    });
    function parseICS(icsText) {
        const events = [];
        const lines = icsText.split(/\r?\n/);
        let currentEvent = null;

        lines.forEach(line => {
            if (line === "BEGIN:VEVENT") {
                currentEvent = {};
            } else if (line === "END:VEVENT") {
                events.push(currentEvent);
                currentEvent = null;
            } else if (currentEvent) {
                if (line.startsWith("SUMMARY:")) currentEvent.summary = line.replace("SUMMARY:", "");
                else if (line.startsWith("DTSTART")) currentEvent.start = parseICSTime(line.replace(/DTSTART.*:/, ""));
                else if (line.startsWith("DESCRIPTION:")) currentEvent.description = line.replace("DESCRIPTION:", "");
            }
        });

        return events;
    }

    function parseICSTime(dt) {
        // z.B. 20260319T090000Z → YYYY-MM-DD
        return dt.slice(0, 4) + "-" + dt.slice(4, 6) + "-" + dt.slice(6, 8);
    }
    // --- RENDER ITEMS ---
    function renderItems() {
        itemsDiv.innerHTML = "";
        const searchValue = searchInput.value.toLowerCase();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        items.forEach((item, idx) => {
            const itemDate = item.date ? new Date(item.date) : null;
            if (itemDate) itemDate.setHours(0, 0, 0, 0);

            // TAB Filter
            if (currentTab === 'today' && (!itemDate || itemDate.getTime() !== today.getTime())) return;
            if (currentTab === 'week' && (!itemDate || itemDate - today < 0 || itemDate - today > 6 * 24 * 60 * 60 * 1000)) return;

            // FILTERS
            if (currentFilter === 'active' && item.done) return;
            if (currentFilter === 'done' && !item.done) return;

            // SEARCH
            if (searchValue && !item.text.toLowerCase().includes(searchValue)) return;

            // --- CARD ---
            const card = document.createElement("div");
            card.className = "todo-item";

            card.setAttribute("tabindex", "0");
            card.setAttribute("role", "button");
            card.setAttribute("aria-expanded", "false");

            // Click auf Card toggelt Details
            card.addEventListener("click", (e) => {
                if (e.target.closest("button")) return; // Buttons nicht
                toggleDetails(card);
            });

            card.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleDetails(card);
                }
            });

            // DRAG & DROP
            card.draggable = true;
            card.addEventListener("dragstart", () => dragStartIndex = idx);
            card.addEventListener("dragover", e => e.preventDefault());
            card.addEventListener("drop", () => {
                if (dragStartIndex === null) return;
                const dragged = items.splice(dragStartIndex, 1)[0];
                items.splice(idx, 0, dragged);
                saveItems();
                renderItems();
            });

            // --- LEFT ---
            const left = document.createElement("div");
            left.className = "item-left";

            const textP = document.createElement("p");
            textP.textContent = item.text;
            if (item.done) textP.style.textDecoration = "line-through";

            const badge = document.createElement("span");
            badge.className = "badge";

            if (!item.done && item.date) {
                const d = new Date(item.date);
                d.setHours(0, 0, 0, 0);

                if (d < today) {
                    badge.textContent = `📅 ${item.date} Wichtig`;
                    badge.style.backgroundColor = "#b33822"; // dunkelrot für Badge
                    badge.style.color = "#ffffff";           // Weißer Text für Kontrast
                }
                else if (d.getTime() === today.getTime()) {
                    badge.textContent = `📅 ${item.date} Heute`;
                    badge.style.backgroundColor = "#269fcf";  // dunkleres Gelb / Ocker
                    badge.style.color = "#ffffff";            // Weißer Text
                }
                else {
                    badge.textContent = `📅 ${item.date}`;
                    left.style.backgroundColor = "#dbeafe";   // sanftes Blau
                    badge.style.backgroundColor = "#2f6f9f";  // dunkleres Blau für Badge
                    badge.style.color = "#ffffff";            // Weißer Text
                }
            }

            const category = document.createElement("small");
            category.className = "item-category";
            category.textContent = item.category ? `🏷️ ${item.category}` : "";

            left.append(textP);
            if (badge.textContent) left.append(badge);
            if (category.textContent) left.append(category);

            // --- Notiz-Preview direkt auf der Card ---
            const notePreview = document.createElement("div");
            notePreview.className = "item-note-preview";
            notePreview.textContent = item.note || "";
            left.appendChild(notePreview);

            // --- DETAILS ---
            const details = document.createElement("div");
            details.className = "task-details";
            details.style.display = "none";

            // stop click propagation auf Details
            details.addEventListener("click", e => e.stopPropagation());

            const textarea = document.createElement("textarea");
            textarea.value = item.note || "";
            textarea.placeholder = "Notiz...";
            textarea.addEventListener("click", e => e.stopPropagation());
            textarea.addEventListener("keydown", e => e.stopPropagation()); // verhindert Enter/Leertaste schließen
            textarea.oninput = () => {
                items[idx].note = textarea.value;
                notePreview.textContent = textarea.value; // Preview aktualisieren
                saveItems();
            };

            const imgInput = document.createElement("input");
            imgInput.type = "file";
            imgInput.accept = "image/*";
            imgInput.addEventListener("click", e => e.stopPropagation());
            imgInput.onchange = (e) => {
                const file = e.target.files[0]; if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => { items[idx].image = ev.target.result; saveItems(); renderItems(); };
                reader.readAsDataURL(file);
            };

            if (item.image) {
                const img = document.createElement("img");
                img.src = item.image;
                img.style.maxWidth = "100px";
                img.style.display = "block";
                img.style.marginTop = "5px";
                details.appendChild(img);
            }

            details.append(textarea, imgInput);

            // --- BUTTONS ---
            const btns = document.createElement("div");
            btns.className = "item-buttons";

            const doneBtn = document.createElement("button");
            doneBtn.textContent = item.done ? "Undo" : "Done";
            doneBtn.onclick = (e) => { e.stopPropagation(); items[idx].done = !item.done; saveItems(); renderItems(); };

            const editBtn = document.createElement("button");
            editBtn.textContent = "Edit";
            editBtn.onclick = (e) => { e.stopPropagation(); editItem(idx); };

            const delBtn = document.createElement("button");
            delBtn.textContent = "Delete";
            delBtn.onclick = (e) => { e.stopPropagation(); items.splice(idx, 1); saveItems(); renderItems(); };

            const upBtn = document.createElement("button");
            upBtn.textContent = "↑";
            upBtn.onclick = (e) => { e.stopPropagation(); if (idx === 0) return;[items[idx - 1], items[idx]] = [items[idx], items[idx - 1]]; saveItems(); renderItems(); };

            const downBtn = document.createElement("button");
            downBtn.textContent = "↓";
            downBtn.onclick = (e) => { e.stopPropagation(); if (idx === items.length - 1) return;[items[idx], items[idx + 1]] = [items[idx + 1], items[idx]]; saveItems(); renderItems(); };

            btns.append(doneBtn, editBtn, delBtn, upBtn, downBtn);

            // --- APPEND ---
            card.append(left, btns, details);
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

    function toggleDetails(card) {
        const details = card.querySelector(".task-details");
        if (!details) return;

        const isOpen = details.style.display === "block";

        details.style.display = isOpen ? "none" : "block";
        card.setAttribute("aria-expanded", !isOpen);
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
                category: i.category || null,
                note: i.note || "",
                image: i.image || null
            }));
        }
        renderItems();
    }



    function saveItems() { localStorage.setItem(storageKey, JSON.stringify(items)); }


});
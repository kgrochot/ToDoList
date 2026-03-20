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
    //const icsInput = document.getElementById('icsInput');

    // --- LOAD ITEMS ---
    loadItems();

    // --- DARK MODE ---
    if (localStorage.getItem("darkMode") === "true") {
        document.body.classList.add("dark");
        darkBtn.textContent = "☀️ Light Mode";
    }
    darkBtn.addEventListener("click", toggleDarkMode);

    // --- ENABLE/DISABLE ADD BUTTON ---
    input.addEventListener("input", () => { addBtn.disabled = !input.value.trim(); });
    searchInput.addEventListener("input", () => renderItems());

    // --- ADD ITEM ---
    window.addItem = () => {
        const value = input.value.trim();
        if (!value) return;
        items.push({
            text: value,
            done: false,
            date: dateInput.value || null,
            category: categoryInput.value || null,
            note: ""
        });
        saveItems();
        renderItems();
        input.value = "";
        dateInput.value = "";
        categoryInput.value = "";
        addBtn.disabled = true;
    };

    // --- FILTERS ---
    window.setFilter = (filter, event) => {
        currentFilter = filter;
        renderItems();
        document.querySelectorAll(".filters button").forEach(btn => btn.classList.remove("active"));
        if (event) event.currentTarget.classList.add("active");
    };

    // --- TAB SWITCHING ---
    window.setTab = (tab, event) => {
        currentTab = tab;
        renderItems();
        document.querySelectorAll("#tabs button").forEach(b => b.classList.remove("active"));
        if (event) event.currentTarget.classList.add("active");
    };

    // --- CLEAR COMPLETED ---
    window.clearCompleted = () => {
        items = items.filter(i => !i.done);
        saveItems();
        renderItems();
    };

    // --- PRINT / EXPORT ---
    window.printTasks = () => {
        let printHTML = '<h1>Zu tun & zu lassen</h1>';
        items.forEach(item => {
            printHTML += `<div style="border:1px solid #ccc; padding:10px; margin:5px; border-radius:5px;">
            <strong>${item.text}</strong><br>
            ${item.date ? item.date + '<br>' : ''}
            ${item.category ? item.category + '<br>' : ''}
            ${item.note ? '📝 ' + item.note + '<br>' : ''}
            ${item.done ? '✅ Erledigt' : '❌ Offen'}
            </div>`;
        });
        const printWindow = window.open('', '', 'height=600,width=800');
        printWindow.document.write('<html><head><title>ToDo Liste</title><style>body{font-family:sans-serif;}</style></head><body>');
        printWindow.document.write(printHTML);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    };

    window.exportJSON = () => {
        const blob = new Blob([JSON.stringify(items, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "todo_list.json";
        a.click();
        URL.revokeObjectURL(url);
    };

    window.exportCSV = () => {
        const header = ["Text", "Datum", "Kategorie", "Erledigt"];
        const rows = items.map(i => [i.text, i.date || "", i.category || "", i.done ? "Ja" : "Nein"]);
        const csvContent = [header, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "todo_list.csv";
        a.click();
        URL.revokeObjectURL(url);
    };

    const icsFileInput = document.getElementById('icsFileInput');
    const importBtn = document.getElementById('importBtn');

    importBtn.addEventListener('click', () => {
        icsFileInput.click(); // Öffnet den Datei-Dialog
    });

    icsFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const parsedEvents = parseICS(event.target.result);
            parsedEvents.forEach(ev => items.push({
                text: ev.summary || "No title",
                done: false,
                date: ev.start || null,
                category: ev.category || null,
                note: ev.description || ""
            }));
            saveItems();
            renderItems();
        };
        reader.readAsText(file);
    });

    // --- RENDER ITEMS ---
    function renderItems() {
        itemsDiv.innerHTML = "";
        const searchValue = searchInput.value.toLowerCase();
        const today = new Date(); today.setHours(0, 0, 0, 0);

        items.forEach((item, idx) => {
            const itemDate = item.date ? new Date(item.date) : null;
            if (itemDate) itemDate.setHours(0, 0, 0, 0);

            // TAB FILTER
            if (currentTab === 'today' && (!itemDate || itemDate.getTime() !== today.getTime())) return;

            function getWeekNumber(d) {
                const date = new Date(d.getTime());
                date.setHours(0, 0, 0, 0);
                // Donnerstag der Woche nehmen, um ISO-Woche zu berechnen
                date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
                const week1 = new Date(date.getFullYear(), 0, 4);
                return 1 + Math.round(((date - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
            }

            if (currentTab === 'week') {
                if (!itemDate) return;
                const itemWeek = getWeekNumber(itemDate);
                const todayWeek = getWeekNumber(today);
                if (itemWeek !== todayWeek || itemDate.getFullYear() !== today.getFullYear()) return;
            }

            if (currentTab === 'month') {
                if (!itemDate) return;
                if (itemDate.getMonth() !== today.getMonth() || itemDate.getFullYear() !== today.getFullYear()) return;
            }

            // FILTER
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
            card.classList.add("category-" + (item.category || "default").toLowerCase());

            // Click toggles details
            card.addEventListener("click", e => { if (!e.target.closest("button")) toggleDetails(card); });
            card.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleDetails(card); } });

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
            const left = document.createElement("div"); left.className = "item-left";
            const textP = document.createElement("p"); textP.textContent = item.text;
            if (item.done) textP.style.textDecoration = "line-through";

            const badge = document.createElement("span"); badge.className = "badge";
            if (item.date) badge.textContent = `📅 ${item.date}`;

            const category = document.createElement("small"); category.className = "item-category";
            category.textContent = item.category ? `🏷️ ${item.category}` : "";

            const notePreview = document.createElement("div"); notePreview.className = "item-note-preview"; notePreview.textContent = item.note || "";

            left.append(textP); if (badge.textContent) left.append(badge);
            if (category.textContent) left.append(category); left.appendChild(notePreview);

            // --- DETAILS ---
            const details = document.createElement("div"); details.className = "task-details"; details.style.display = "none";
            const textarea = document.createElement("textarea");
            textarea.value = item.note || ""; textarea.placeholder = "Notiz...";
            textarea.addEventListener("click", e => e.stopPropagation());
            textarea.addEventListener("keydown", e => e.stopPropagation());
            textarea.oninput = () => { items[idx].note = textarea.value; notePreview.textContent = textarea.value; saveItems(); };
            details.append(textarea);

            // --- BUTTONS CONTAINER ---
            const btns = document.createElement("div");
            btns.className = "item-buttons";

            // DONE
            const doneBtn = document.createElement("button");
            doneBtn.innerHTML = item.done
                ? `<svg viewBox="0 0 24 24" width="16" height="16" fill="green">
         <path d="M20 6L9 17l-5-5"/>
       </svg>`
                : `<svg viewBox="0 0 24 24" width="16" height="16" fill="gray">
         <path d="M20 6L9 17l-5-5"/>
       </svg>`;
            doneBtn.title = item.done ? "Undo" : "Done";
            doneBtn.onclick = (e) => {
                e.stopPropagation();
                items[idx].done = !items[idx].done;
                saveItems();
                renderItems();
            };

            // EDIT
            const editBtn = document.createElement("button");
            editBtn.innerHTML = `
    <svg viewBox="0 0 24 24" width="16" height="16" fill="blue">
        <path d="M3 17.25V21h3.75L17.8 9.94l-3.75-3.75L3 17.25z"/>
    </svg>`;
            editBtn.title = "Edit";
            editBtn.onclick = (e) => {
                e.stopPropagation();
                editItem(idx);
            };

            // DELETE
            const delBtn = document.createElement("button");
            delBtn.innerHTML = `
    <svg viewBox="0 0 24 24" width="16" height="16" fill="red">
        <path d="M3 6h18v2H3V6zm2 3h14v12H5V9z"/>
    </svg>`;
            delBtn.title = "Delete";
            delBtn.onclick = (e) => {
                e.stopPropagation();
                items.splice(idx, 1);
                saveItems();
                renderItems();
            };

            btns.append(doneBtn, editBtn, delBtn);
            card.append(left, btns, details);
            itemsDiv.appendChild(card);
        });
    }

    // --- EDIT ITEM ---
    function editItem(idx) {
        const newText = prompt("Edit task:", items[idx].text);
        if (newText !== null) { items[idx].text = newText.trim() || items[idx].text; saveItems(); renderItems(); }
    }

    function toggleDetails(card) {
        const details = card.querySelector(".task-details");
        if (!details) return;
        const isOpen = details.style.display === "block";
        details.style.display = isOpen ? "none" : "block";
        card.setAttribute("aria-expanded", !isOpen);
    }

    // --- DARK MODE ---
    function toggleDarkMode() {
        document.body.classList.toggle("dark");
        localStorage.setItem("darkMode", document.body.classList.contains("dark"));
        darkBtn.textContent = document.body.classList.contains("dark") ? "☀️ Light Mode" : "🌙 Dark Mode";
    }

    // --- LOCALSTORAGE ---
    function loadItems() {
        const oldItems = localStorage.getItem(storageKey);
        if (oldItems) items = JSON.parse(oldItems).map(i => ({ text: i.text, done: i.done || false, date: i.date || null, category: i.category || null, note: i.note || "" }));
        renderItems();
    }
    function saveItems() { localStorage.setItem(storageKey, JSON.stringify(items)); }

    //Clear Completed
    window.clearAll = () => {
        if (!confirm("Alle Aufgaben wirklich löschen?")) return;
        items = [];
        saveItems();
        renderItems();
    };

    // --- ICS PARSER --
    function parseICS(icsText) {
        const events = []; const lines = icsText.split(/\r?\n/); let current = null;
        lines.forEach(line => {
            if (line === "BEGIN:VEVENT") current = {};
            else if (line === "END:VEVENT") { events.push(current); current = null; }
            else if (current) {
                if (line.startsWith("SUMMARY:")) current.summary = line.replace("SUMMARY:", "");
                else if (line.startsWith("DTSTART")) current.start = parseICSTime(line.replace(/DTSTART.*:/, ""));
                else if (line.startsWith("DESCRIPTION")) current.description = line.split(":").slice(1).join(":");
            }
        });
        return events;
    }
    function parseICSTime(dt) { return dt.slice(0, 4) + "-" + dt.slice(4, 6) + "-" + dt.slice(6, 8); }
});
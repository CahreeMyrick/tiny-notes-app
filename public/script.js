// script.js

const notesContainer = document.getElementById("notes-container");
const form = document.getElementById("note-form");
const titleInput = document.getElementById("note-title");
const bodyInput = document.getElementById("note-body");
const errorEl = document.getElementById("error");

// Fetch and render notes on load
document.addEventListener("DOMContentLoaded", fetchNotes);

async function fetchNotes() {
  try {
    const res = await fetch("/api/notes");
    const data = await res.json();
    renderNotes(data);
  } catch (err) {
    console.error(err);
    errorEl.textContent = "Failed to load notes.";
  }
}

function renderNotes(notes) {
  notesContainer.innerHTML = "";

  if (notes.length === 0) {
    notesContainer.innerHTML = "<p>No notes yet. Add one above!</p>";
    return;
  }

  for (const note of notes) {
    const card = document.createElement("div");
    card.className = "note-card";

    const main = document.createElement("div");
    main.className = "note-main";

    const title = document.createElement("div");
    title.className = "note-title";
    title.textContent = note.title;

    const body = document.createElement("div");
    body.className = "note-body";
    body.textContent = note.body;

    const meta = document.createElement("div");
    meta.className = "note-meta";
    const date = new Date(note.createdAt);
    meta.textContent = `Created: ${date.toLocaleString()}`;

    // --- AI tools area ---
    const tools = document.createElement("div");
    tools.className = "note-tools";

    const summarizeBtn = document.createElement("button");
    summarizeBtn.className = "ai-btn secondary";
    summarizeBtn.textContent = "Summarize";

    const rewriteBtn = document.createElement("button");
    rewriteBtn.className = "ai-btn";
    rewriteBtn.textContent = "Rewrite";

    // Where to show AI output (summary)
    const summaryEl = document.createElement("div");
    summaryEl.className = "note-meta";
    summaryEl.style.marginTop = "0.25rem";

    summarizeBtn.addEventListener("click", () =>
      summarizeNote(note.id, summarizeBtn, summaryEl)
    );

    rewriteBtn.addEventListener("click", () =>
      rewriteNote(note.id, rewriteBtn, body)
    );

    tools.appendChild(summarizeBtn);
    tools.appendChild(rewriteBtn);

    main.appendChild(title);
    main.appendChild(body);
    main.appendChild(meta);
    main.appendChild(tools);
    main.appendChild(summaryEl);

    const actions = document.createElement("div");
    actions.className = "note-actions";

    const delBtn = document.createElement("button");
    delBtn.className = "delete-btn";
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", () => deleteNote(note.id));

    actions.appendChild(delBtn);

    card.appendChild(main);
    card.appendChild(actions);

    notesContainer.appendChild(card);
  }
}

// Handle form submit (create note)
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.textContent = "";

  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();

  if (!title || !body) {
    errorEl.textContent = "Please enter both a title and some text.";
    return;
  }

  try {
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title, body }),
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || "Failed to create note");
    }

    titleInput.value = "";
    bodyInput.value = "";

    fetchNotes();
  } catch (err) {
    console.error(err);
    errorEl.textContent = err.message;
  }
});

// Delete note
async function deleteNote(id) {
  errorEl.textContent = "";
  try {
    const res = await fetch(`/api/notes/${id}`, {
      method: "DELETE",
    });

    if (!res.ok && res.status !== 204) {
      throw new Error("Failed to delete note");
    }

    fetchNotes();
  } catch (err) {
    console.error(err);
    errorEl.textContent = err.message;
  }
}

// ===== AI actions =====

async function summarizeNote(id, buttonEl, summaryEl) {
  errorEl.textContent = "";
  summaryEl.textContent = "";
  buttonEl.disabled = true;
  const originalText = buttonEl.textContent;
  buttonEl.textContent = "Summarizing...";

  try {
    const res = await fetch(`/api/notes/${id}/summarize`, {
      method: "POST",
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Failed to summarize note");
    }

    const data = await res.json();
    summaryEl.textContent = `AI summary: ${data.summary}`;
  } catch (err) {
    console.error(err);
    errorEl.textContent = err.message;
  } finally {
    buttonEl.disabled = false;
    buttonEl.textContent = originalText;
  }
}

async function rewriteNote(id, buttonEl, bodyEl) {
  errorEl.textContent = "";
  buttonEl.disabled = true;
  const originalText = buttonEl.textContent;
  buttonEl.textContent = "Rewriting...";

  try {
    const res = await fetch(`/api/notes/${id}/rewrite`, {
      method: "POST",
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Failed to rewrite note");
    }

    const data = await res.json();
    // Backend already updates note; we also update UI body text
    bodyEl.textContent = data.rewritten;
  } catch (err) {
    console.error(err);
    errorEl.textContent = err.message;
  } finally {
    buttonEl.disabled = false;
    buttonEl.textContent = originalText;
  }
}


// server.js
require("dotenv").config();
const express = require("express");
const path = require("path");

// ---- OpenAI client setup ----
const OpenAI = require("openai");
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const app = express();
const PORT = 3000;

// In-memory "database"
let notes = [];
let nextId = 1;

// Middlewares
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ========== Helper to call OpenAI ==========
async function callLLM({ system, user }) {
  const response = await openai.responses.create({
    model: "gpt-5.1",
    input: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  // Node SDK exposes structured output; `output_text` is a convenience prop. :contentReference[oaicite:1]{index=1}
  const text =
    response.output_text ??
    response.output?.[0]?.content?.[0]?.text?.value ??
    "";

  return text.trim();
}

// ========== Basic notes API ==========

// Get all notes
app.get("/api/notes", (req, res) => {
  res.json(notes);
});

// Create a new note
app.post("/api/notes", (req, res) => {
  const { title, body } = req.body;
  if (!title || !body) {
    return res.status(400).json({ error: "Title and body are required" });
  }

  const newNote = {
    id: nextId++,
    title,
    body,
    createdAt: new Date().toISOString(),
  };
  notes.push(newNote);
  res.status(201).json(newNote);
});

// Delete a note
app.delete("/api/notes/:id", (req, res) => {
  const id = Number(req.params.id);
  const prevLength = notes.length;
  notes = notes.filter((note) => note.id !== id);

  if (notes.length === prevLength) {
    return res.status(404).json({ error: "Note not found" });
  }

  res.status(204).send();
});

// ========== AI endpoints ==========

// Summarize a note
app.post("/api/notes/:id/summarize", async (req, res) => {
  const id = Number(req.params.id);
  const note = notes.find((n) => n.id === id);
  if (!note) {
    return res.status(404).json({ error: "Note not found" });
  }

  try {
    const summary = await callLLM({
      system:
        "You summarize personal notes. Return a 1–2 sentence summary. Be concise and helpful.",
      user: `Here is the note:\n\n${note.body}`,
    });

    res.json({ summary });
  } catch (err) {
    console.error("Summarize error:", err);
    res.status(500).json({ error: "Failed to summarize note" });
  }
});

// Rewrite a note (clear + concise)
app.post("/api/notes/:id/rewrite", async (req, res) => {
  const id = Number(req.params.id);
  const note = notes.find((n) => n.id === id);
  if (!note) {
    return res.status(404).json({ error: "Note not found" });
  }

  try {
    const rewritten = await callLLM({
      system:
        "You rewrite personal notes to be clearer and more concise while preserving all important details.",
      user: `Rewrite this note:\n\n${note.body}`,
    });

    // Option 1: just return the rewritten text, let frontend decide whether to replace
    // Option 2: actually update the note body on the backend:
    note.body = rewritten;

    res.json({ rewritten });
  } catch (err) {
    console.error("Rewrite error:", err);
    res.status(500).json({ error: "Failed to rewrite note" });
  }
});

// --- Start server ---
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});


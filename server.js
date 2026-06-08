import express from "express";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, "Data", "seed.json");

// Middleware to parse JSON
app.use(express.json({ limit: "50mb" }));

// Serve static files from the root directory
app.use(express.static(__dirname));

// API to get the database
app.get("/api/data", async (req, res) => {
    try {
        const data = await fs.readFile(DB_PATH, "utf-8");
        res.json(JSON.parse(data));
    } catch (error) {
        console.error("Error reading database:", error);
        res.status(500).json({ error: "Failed to read database" });
    }
});

// API to save the database
app.post("/api/data", async (req, res) => {
    try {
        await fs.writeFile(DB_PATH, JSON.stringify(req.body, null, 2), "utf-8");
        res.json({ success: true });
    } catch (error) {
        console.error("Error writing to database:", error);
        res.status(500).json({ error: "Failed to save database" });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
    console.log(`Serving static files from ${__dirname}`);
    console.log(`Database path: ${DB_PATH}`);
});

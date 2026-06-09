import express from "express";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, "Data", "seed.json");
const DB_TMP_PATH = `${DB_PATH}.tmp`;
const DIST_PATH = path.join(__dirname, "dist");

const REQUIRED_COLLECTIONS = ["admins", "teachers", "students", "clubs", "groups", "lessons", "assignments", "submissions"];

function cleanText(value) {
    return String(value ?? "").trim();
}

function sameCredential(left, right) {
    return cleanText(left) === cleanText(right);
}

function nextId(items) {
    return items.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
}

function validateDatabaseShape(data) {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
        return "Database payload must be an object";
    }

    const missing = REQUIRED_COLLECTIONS.filter((key) => !Array.isArray(data[key]));
    if (missing.length) {
        return `Missing or invalid collections: ${missing.join(", ")}`;
    }

    return null;
}

async function readDatabase() {
    const data = (await fs.readFile(DB_PATH, "utf-8")).replace(/^\uFEFF/, "");
    return JSON.parse(data);
}

async function writeDatabase(data) {
    const validationError = validateDatabaseShape(data);
    if (validationError) {
        throw new Error(validationError);
    }

    await fs.writeFile(DB_TMP_PATH, JSON.stringify(data, null, 2), "utf-8");
    await fs.rename(DB_TMP_PATH, DB_PATH);
}

// Middleware to parse JSON
app.use(express.json({ limit: "50mb" }));

// API to get the database
app.get("/api/data", async (req, res) => {
    try {
        res.json(await readDatabase());
    } catch (error) {
        console.error("Error reading database:", error);
        res.status(500).json({ error: "Failed to read database" });
    }
});

app.post("/api/login", async (req, res) => {
    try {
        const { username, password, role } = req.body ?? {};
        const cleanUsername = cleanText(username);
        const cleanPassword = cleanText(password);
        const expectedRole = cleanText(role);

        if (!cleanUsername || !cleanPassword) {
            res.status(400).json({ error: "Login va parol majburiy." });
            return;
        }

        const data = await readDatabase();
        const admin = data.admins.find((item) => sameCredential(item.username, cleanUsername) && sameCredential(item.password, cleanPassword));
        if (admin && (!expectedRole || expectedRole === "admin")) {
            res.json({ role: "admin", userId: admin.id, username: admin.username, displayName: admin.displayName });
            return;
        }

        const teacher = data.teachers.find((item) => sameCredential(item.username, cleanUsername) && sameCredential(item.password, cleanPassword));
        if (teacher && (!expectedRole || expectedRole === "teacher")) {
            res.json({ role: "teacher", userId: teacher.id, username: teacher.username, displayName: `${teacher.firstName} ${teacher.lastName}` });
            return;
        }

        const student = data.students.find((item) => sameCredential(item.username, cleanUsername) && sameCredential(item.password, cleanPassword));
        if (student && (!expectedRole || expectedRole === "student")) {
            res.json({ role: "student", userId: student.id, username: student.username, displayName: `${student.firstName} ${student.lastName}` });
            return;
        }

        res.status(401).json({ error: "Login yoki parol noto'g'ri." });
    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ error: "Login tekshirishda xatolik" });
    }
});

app.post("/api/register", async (req, res) => {
    try {
        const payload = {
            firstName: cleanText(req.body?.firstName),
            lastName: cleanText(req.body?.lastName),
            age: req.body?.age === undefined || req.body?.age === "" ? undefined : Number(req.body.age),
            phone: cleanText(req.body?.phone),
            school: cleanText(req.body?.school),
            clubInterest: cleanText(req.body?.clubInterest),
            clubId: Number(req.body?.clubId),
            username: cleanText(req.body?.username),
            password: cleanText(req.body?.password)
        };

        if (!payload.firstName || !payload.lastName || !payload.phone || !payload.clubInterest || !payload.username || !payload.password) {
            res.status(400).json({ error: "Majburiy maydonlarni to'ldiring." });
            return;
        }

        if (payload.age !== undefined && (!Number.isFinite(payload.age) || payload.age < 5 || payload.age > 100)) {
            res.status(400).json({ error: "Yosh qiymatini to'g'ri kiriting." });
            return;
        }

        const data = await readDatabase();
        const club = data.clubs.find((item) => item.id === payload.clubId);
        if (!club) {
            res.status(400).json({ error: "To'garakni tanlang." });
            return;
        }

        const usernameExists = [...data.admins, ...data.teachers, ...data.students].some((item) => sameCredential(item.username, payload.username));
        if (usernameExists) {
            res.status(409).json({ error: "Bu login allaqachon band." });
            return;
        }

        const student = { ...payload, id: nextId(data.students) };
        data.students.push(student);

        let group = data.groups.find((item) => item.clubId === club.id);
        if (!group) {
            group = {
                id: nextId(data.groups),
                name: `${club.title} guruhi`,
                clubId: club.id,
                teacherId: club.teacherId ?? null,
                schedule: "Jadval belgilanmagan",
                studentIds: []
            };
            data.groups.push(group);
        }
        if (!group.studentIds.includes(student.id)) {
            group.studentIds.push(student.id);
        }

        await writeDatabase(data);

        res.status(201).json({
            ok: true,
            message: "Ro'yxatdan o'tish muvaffaqiyatli yakunlandi.",
            student: { id: student.id, username: student.username, firstName: student.firstName, lastName: student.lastName }
        });
    } catch (error) {
        console.error("Error during registration:", error);
        res.status(500).json({ error: "Ro'yxatdan o'tishda xatolik" });
    }
});

// Serve the built React app. Run `npm run build` before `npm start`.
app.use(express.static(DIST_PATH));
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(DIST_PATH, "index.html"));
});

// API to save the database
app.post("/api/data", async (req, res) => {
    try {
        await writeDatabase(req.body);
        res.json({ success: true });
    } catch (error) {
        console.error("Error writing to database:", error);
        res.status(500).json({ error: "Failed to save database" });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
    console.log(`Serving built app from ${DIST_PATH}`);
    console.log(`Database path: ${DB_PATH}`);
});

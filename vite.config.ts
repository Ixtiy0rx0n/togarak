import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, "Data", "seed.json");
const DB_TMP_PATH = `${DB_PATH}.tmp`;
const REQUIRED_COLLECTIONS = ["admins", "teachers", "students", "clubs", "groups", "lessons", "assignments", "submissions"];

function cleanText(value: unknown): string {
    return String(value ?? "").trim();
}

function sameCredential(left: unknown, right: unknown): boolean {
    return cleanText(left) === cleanText(right);
}

function nextId(items: Array<{ id: number }>): number {
    return items.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
}

function validateDatabaseShape(data: unknown): string | null {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
        return "Database payload must be an object";
    }

    const record = data as Record<string, unknown>;
    const missing = REQUIRED_COLLECTIONS.filter((key) => !Array.isArray(record[key]));
    return missing.length ? `Missing or invalid collections: ${missing.join(", ")}` : null;
}

async function readDatabase() {
    const data = (await fs.readFile(DB_PATH, "utf-8")).replace(/^\uFEFF/, "");
    return JSON.parse(data);
}

async function writeDatabase(data: unknown) {
    const validationError = validateDatabaseShape(data);
    if (validationError) {
        throw new Error(validationError);
    }

    await fs.writeFile(DB_TMP_PATH, JSON.stringify(data, null, 2), "utf-8");
    await fs.rename(DB_TMP_PATH, DB_PATH);
}

function readRequestBody(request: import("node:http").IncomingMessage): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
        let body = "";
        request.on("data", (chunk) => {
            body += String(chunk);
        });
        request.on("end", () => {
            if (!body.trim()) {
                resolve({});
                return;
            }

            try {
                resolve(JSON.parse(body) as Record<string, unknown>);
            } catch (error) {
                reject(error);
            }
        });
        request.on("error", reject);
    });
}

function sendJson(response: import("node:http").ServerResponse, status: number, payload: unknown) {
    response.statusCode = status;
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.end(JSON.stringify(payload));
}

function devJsonApi(): Plugin {
    return {
        name: "dev-json-api",
        configureServer(server) {
            server.middlewares.use("/api/data", async (request, response) => {
                try {
                    if (request.method === "GET") {
                        sendJson(response, 200, await readDatabase());
                        return;
                    }

                    if (request.method === "POST") {
                        await writeDatabase(await readRequestBody(request));
                        sendJson(response, 200, { success: true });
                        return;
                    }

                    sendJson(response, 405, { error: "Method not allowed" });
                } catch (error) {
                    sendJson(response, 500, { error: error instanceof Error ? error.message : "Database error" });
                }
            });

            server.middlewares.use("/api/login", async (request, response) => {
                if (request.method !== "POST") {
                    sendJson(response, 405, { error: "Method not allowed" });
                    return;
                }

                try {
                    const body = await readRequestBody(request);
                    const username = cleanText(body.username);
                    const password = cleanText(body.password);
                    const expectedRole = cleanText(body.role);

                    if (!username || !password) {
                        sendJson(response, 400, { error: "Login va parol majburiy." });
                        return;
                    }

                    const data = await readDatabase();
                    const admin = data.admins.find((item: any) => sameCredential(item.username, username) && sameCredential(item.password, password));
                    if (admin && (!expectedRole || expectedRole === "admin")) {
                        sendJson(response, 200, { role: "admin", userId: admin.id, username: admin.username, displayName: admin.displayName });
                        return;
                    }

                    const teacher = data.teachers.find((item: any) => sameCredential(item.username, username) && sameCredential(item.password, password));
                    if (teacher && (!expectedRole || expectedRole === "teacher")) {
                        sendJson(response, 200, { role: "teacher", userId: teacher.id, username: teacher.username, displayName: `${teacher.firstName} ${teacher.lastName}` });
                        return;
                    }

                    const student = data.students.find((item: any) => sameCredential(item.username, username) && sameCredential(item.password, password));
                    if (student && (!expectedRole || expectedRole === "student")) {
                        sendJson(response, 200, { role: "student", userId: student.id, username: student.username, displayName: `${student.firstName} ${student.lastName}` });
                        return;
                    }

                    sendJson(response, 401, { error: "Login yoki parol noto'g'ri." });
                } catch {
                    sendJson(response, 500, { error: "Login tekshirishda xatolik" });
                }
            });

            server.middlewares.use("/api/register", async (request, response) => {
                if (request.method !== "POST") {
                    sendJson(response, 405, { error: "Method not allowed" });
                    return;
                }

                try {
                    const body = await readRequestBody(request);
                    const payload = {
                        firstName: cleanText(body.firstName),
                        lastName: cleanText(body.lastName),
                        age: body.age === undefined || body.age === "" ? undefined : Number(body.age),
                        phone: cleanText(body.phone),
                        school: cleanText(body.school),
                        clubInterest: cleanText(body.clubInterest),
                        clubId: Number(body.clubId),
                        username: cleanText(body.username),
                        password: cleanText(body.password)
                    };

                    if (!payload.firstName || !payload.lastName || !payload.phone || !payload.clubInterest || !payload.username || !payload.password) {
                        sendJson(response, 400, { error: "Majburiy maydonlarni to'ldiring." });
                        return;
                    }

                    if (payload.age !== undefined && (!Number.isFinite(payload.age) || payload.age < 5 || payload.age > 100)) {
                        sendJson(response, 400, { error: "Yosh qiymatini to'g'ri kiriting." });
                        return;
                    }

                    const data = await readDatabase();
                    const club = data.clubs.find((item: any) => item.id === payload.clubId);
                    if (!club) {
                        sendJson(response, 400, { error: "To'garakni tanlang." });
                        return;
                    }

                    const usernameExists = [...data.admins, ...data.teachers, ...data.students].some((item: any) => sameCredential(item.username, payload.username));
                    if (usernameExists) {
                        sendJson(response, 409, { error: "Bu login allaqachon band." });
                        return;
                    }

                    const student = { ...payload, id: nextId(data.students) };
                    data.students.push(student);

                    let group = data.groups.find((item: any) => item.clubId === club.id);
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
                    sendJson(response, 201, {
                        ok: true,
                        message: "Ro'yxatdan o'tish muvaffaqiyatli yakunlandi.",
                        student: { id: student.id, username: student.username, firstName: student.firstName, lastName: student.lastName }
                    });
                } catch {
                    sendJson(response, 500, { error: "Ro'yxatdan o'tishda xatolik" });
                }
            });
        }
    };
}

export default defineConfig({
    plugins: [react(), devJsonApi()],
    build: {
        outDir: "dist"
    },
    server: {
        port: 5173,
        host: "0.0.0.0"
    }
});

import { readFileAsDataUrl } from "../core/files.js";
import { clearSession, getSession, setSession } from "../core/session.js";
import {
    createAssignment,
    createLesson,
    findAssignmentSubmissions,
    findLessonAssignments,
    getTeacherWorkspace,
    login
} from "../core/store.js";
import { byId, escapeHtml, formatDate, setVisible, showMessage, youtubeEmbed } from "../core/utils.js";
import { initWeatherBg } from "../shared/weather-bg.js";

let currentTeacherId = 0;
let currentGroupId = 0;
let currentGroupName = "";
let chartGroupStudents: any = null;
let chartSubmissionRate: any = null;

// ─── Live clock ────────────────────────────────────────────────────────────────
function startTeacherClock(): void {
    const tick = () => {
        const now = new Date();
        const t = document.getElementById("teacherClockTime");
        const d = document.getElementById("teacherClockDate");
        if (t) t.textContent = now.toLocaleTimeString("uz-UZ");
        if (d) d.textContent = now.toLocaleDateString("uz-UZ", { weekday: "short", month: "long", day: "numeric" });
    };
    tick();
    setInterval(tick, 1000);
}

// ─── KPI stat card ─────────────────────────────────────────────────────────────
function statCard(icon: string, label: string, value: number | string, color: string, sub = ""): string {
    return `
        <div class="stat-t p-4 flex items-start gap-3">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0" style="background:${color}22;">${icon}</div>
            <div>
                <div class="text-2xl font-extrabold text-white leading-none">${value}</div>
                <div class="text-slate-400 text-xs mt-1">${label}</div>
                ${sub ? `<div class="text-slate-600 text-xs mt-0.5">${sub}</div>` : ""}
            </div>
        </div>`;
}

// ─── Render overview dashboard ─────────────────────────────────────────────────
async function renderOverview(): Promise<void> {
    const ws = await getTeacherWorkspace(currentTeacherId);
    const myGroups = ws.groups;
    const myGroupIds = myGroups.map(g => g.id);
    const myLessons = ws.lessons.filter(l => myGroupIds.includes(l.groupId));
    const myLessonIds = myLessons.map(l => l.id);
    const myAssignments = ws.assignments.filter(a => myLessonIds.includes(a.lessonId));
    const myAssignmentIds = myAssignments.map(a => a.id);
    const mySubmissions = ws.submissions.filter(s => myAssignmentIds.includes(s.assignmentId));

    // Sidebar stats
    const sideGroups = document.getElementById("sideStatGroups");
    const sideLessons = document.getElementById("sideStatLessons");
    const sideAssignments = document.getElementById("sideStatAssignments");
    const sideSubmissions = document.getElementById("sideStatSubmissions");
    if (sideGroups) sideGroups.textContent = String(myGroups.length);
    if (sideLessons) sideLessons.textContent = String(myLessons.length);
    if (sideAssignments) sideAssignments.textContent = String(myAssignments.length);
    if (sideSubmissions) sideSubmissions.textContent = String(mySubmissions.length);

    // KPI cards
    const totalStudents = new Set(myGroups.flatMap(g => g.studentIds)).size;
    const submissionPct = myAssignments.length
        ? Math.round((mySubmissions.length / (myAssignments.length * Math.max(totalStudents, 1))) * 100)
        : 0;
    byId("teacherKpiCards").innerHTML = [
        statCard("👥", "Guruhlar", myGroups.length, "#3b82f6", `${totalStudents} ta o'quvchi`),
        statCard("📚", "Darslar", myLessons.length, "#10b981", `Barcha guruhlar bo'yicha`),
        statCard("📝", "Topshiriqlar", myAssignments.length, "#8b5cf6", `${myGroups.length} ta guruh uchun`),
        statCard("✅", "Javoblar", mySubmissions.length, "#f59e0b", `~${submissionPct}% bajarilish`),
    ].join("");

    // Bar chart: students per group
    const groupLabels = myGroups.map(g => g.name.length > 16 ? g.name.slice(0, 15) + "…" : g.name);
    const groupStudentCounts = myGroups.map(g => g.studentIds.length);

    const ctxBar = byId<HTMLCanvasElement>("chartGroupStudents").getContext("2d")!;
    if (chartGroupStudents) chartGroupStudents.destroy();
    chartGroupStudents = new (window as any).Chart(ctxBar, {
        type: "bar",
        data: {
            labels: groupLabels.length ? groupLabels : ["Guruhlar yo'q"],
            datasets: [{
                label: "O'quvchilar",
                data: groupStudentCounts.length ? groupStudentCounts : [0],
                backgroundColor: ["#3b82f6aa", "#8b5cf6aa", "#10b981aa", "#f59e0baa", "#ec4899aa"],
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: "#6b7280", font: { size: 11 } }, grid: { display: false } },
                y: { ticks: { color: "#6b7280", font: { size: 11 }, stepSize: 1 }, grid: { color: "#1e293b" } }
            }
        }
    });

    // Doughnut chart: submission rate per group
    const groupSubRates = myGroups.map(g => {
        const gLessons = ws.lessons.filter(l => l.groupId === g.id);
        const gAssignments = ws.assignments.filter(a => gLessons.map(l => l.id).includes(a.lessonId));
        const gSubs = ws.submissions.filter(s => gAssignments.map(a => a.id).includes(s.assignmentId));
        return gAssignments.length ? Math.round((gSubs.length / (gAssignments.length * Math.max(g.studentIds.length, 1))) * 100) : 0;
    });

    const ctxDonut = byId<HTMLCanvasElement>("chartSubmissionRate").getContext("2d")!;
    if (chartSubmissionRate) chartSubmissionRate.destroy();
    chartSubmissionRate = new (window as any).Chart(ctxDonut, {
        type: "doughnut",
        data: {
            labels: groupLabels.length ? groupLabels : ["Ma'lumot yo'q"],
            datasets: [{
                data: groupSubRates.length ? groupSubRates : [0],
                backgroundColor: ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ec4899"],
                borderWidth: 0,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            cutout: "65%",
            plugins: {
                legend: { position: "bottom", labels: { color: "#94a3b8", padding: 12, boxWidth: 10 } },
                tooltip: {
                    callbacks: { label: (ctx: any) => ` ${ctx.label}: ${ctx.raw}%` }
                }
            }
        }
    });

    // Group activity progress bars
    const colors = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ec4899"];
    const maxStudents = Math.max(...myGroups.map(g => g.studentIds.length), 1);
    byId("teacherGroupActivity").innerHTML = myGroups.length ? myGroups.map((g, i) => {
        const gLessons = ws.lessons.filter(l => l.groupId === g.id);
        const gAssignments = ws.assignments.filter(a => gLessons.map(l => l.id).includes(a.lessonId));
        const gSubs = ws.submissions.filter(s => gAssignments.map(a => a.id).includes(s.assignmentId));
        const pct = Math.round((g.studentIds.length / maxStudents) * 100);
        const color = colors[i % colors.length];
        return `
            <div class="border border-slate-700/40 rounded-xl p-4">
                <div class="flex items-center justify-between mb-2">
                    <div>
                        <span class="text-white font-semibold text-sm">${escapeHtml(g.name)}</span>
                        <span class="ml-2 text-slate-500 text-xs">${escapeHtml(g.clubName)}</span>
                    </div>
                    <span class="text-xs text-slate-500">${g.studentIds.length} o'quvchi</span>
                </div>
                <div class="prog-bar-bg mb-3"><div class="prog-bar" style="width:${pct}%;background:${color};"></div></div>
                <div class="grid grid-cols-3 gap-2 text-xs">
                    <div class="bg-slate-800/50 rounded-lg p-2 text-center">
                        <div class="text-white font-bold">${gLessons.length}</div>
                        <div class="text-slate-500">Darslar</div>
                    </div>
                    <div class="bg-slate-800/50 rounded-lg p-2 text-center">
                        <div class="text-white font-bold">${gAssignments.length}</div>
                        <div class="text-slate-500">Topshiriqlar</div>
                    </div>
                    <div class="bg-slate-800/50 rounded-lg p-2 text-center">
                        <div class="text-white font-bold">${gSubs.length}</div>
                        <div class="text-slate-500">Javoblar</div>
                    </div>
                </div>
            </div>`;
    }).join("") : '<p class="text-slate-500 text-sm">Sizga hali guruh biriktirilmagan.</p>';

    // Recent activity feed
    const recentItems: Array<{ icon: string; text: string; sub: string }> = [];
    myLessons.slice(0, 3).forEach(l => {
        const g = myGroups.find(g => g.id === l.groupId);
        recentItems.push({ icon: "📚", text: l.title, sub: g?.name ?? "" });
    });
    mySubmissions.slice(0, 3).forEach(s => {
        const student = ws.students.find(st => st.id === s.studentId);
        recentItems.push({ icon: "📩", text: `${student?.firstName ?? "?"} javob yubordi`, sub: formatDate(s.submittedAt) });
    });
    byId("teacherRecentActivity").innerHTML = recentItems.length
        ? recentItems.slice(0, 6).map(item => `
            <div class="flex items-start gap-2 bg-slate-800/30 rounded-lg p-2.5">
                <span>${item.icon}</span>
                <div class="min-w-0">
                    <div class="text-slate-300 truncate">${escapeHtml(item.text)}</div>
                    <div class="text-slate-600 text-xs">${escapeHtml(item.sub)}</div>
                </div>
            </div>`).join("")
        : '<p class="text-slate-600">Hali faoliyat yo\'q</p>';

    // Recent lessons table
    byId("teacherLessonsTableBody").innerHTML = myLessons.slice(0, 8).length
        ? myLessons.slice(0, 8).map(l => {
            const g = myGroups.find(g => g.id === l.groupId);
            const assigns = ws.assignments.filter(a => a.lessonId === l.id);
            const subs = ws.submissions.filter(s => assigns.map(a => a.id).includes(s.assignmentId));
            return `
                <tr class="border-t border-slate-700/40 hover:bg-slate-800/20">
                    <td class="py-2.5 pr-4 text-white font-medium">${escapeHtml(l.title)}</td>
                    <td class="py-2.5 pr-4 text-slate-400">${escapeHtml(g?.name ?? "—")}</td>
                    <td class="py-2.5 pr-4 text-center">
                        <span class="bg-purple-600/20 text-purple-300 text-xs px-2 py-0.5 rounded-full">${assigns.length}</span>
                    </td>
                    <td class="py-2.5 pr-4 text-center">
                        <span class="bg-green-600/20 text-green-300 text-xs px-2 py-0.5 rounded-full">${subs.length}</span>
                    </td>
                    <td class="py-2.5 text-slate-500 text-xs">${formatDate(l.createdAt)}</td>
                </tr>`;
        }).join("")
        : '<tr><td colspan="5" class="py-4 text-center text-slate-600">Hali dars qo\'shilmagan</td></tr>';
}

// ─── Render groups list ────────────────────────────────────────────────────────
async function renderGroups(): Promise<void> {
    const workspace = await getTeacherWorkspace(currentTeacherId);
    const container = byId("groupsContainer");

    if (!workspace.groups.length) {
        container.innerHTML = `<div class="glass rounded-2xl border border-slate-700/50 p-8 text-center"><p class="text-slate-400">Sizga hali guruh biriktirilmagan.</p></div>`;
        return;
    }

    container.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">${
        workspace.groups.map((group) => {
            const gLessons = workspace.lessons.filter(l => l.groupId === group.id);
            const gAssigns = workspace.assignments.filter(a => gLessons.map(l => l.id).includes(a.lessonId));
            const gSubs = workspace.submissions.filter(s => gAssigns.map(a => a.id).includes(s.assignmentId));
            return `
            <article class="glass p-6 rounded-2xl border border-slate-700/50 hover:border-blue-500/40 transition-all">
                <div class="text-sm text-blue-400 mb-2">${escapeHtml(group.clubName)}</div>
                <h3 class="text-xl font-bold text-white mb-1">${escapeHtml(group.name)}</h3>
                <p class="text-sm text-slate-400 mb-4">${escapeHtml(group.schedule)}</p>
                <div class="grid grid-cols-3 gap-2 mb-4 text-xs text-center">
                    <div class="bg-slate-800/60 rounded-lg p-2"><div class="text-white font-bold">${group.studentIds.length}</div><div class="text-slate-500">O'quvchi</div></div>
                    <div class="bg-slate-800/60 rounded-lg p-2"><div class="text-white font-bold">${gLessons.length}</div><div class="text-slate-500">Dars</div></div>
                    <div class="bg-slate-800/60 rounded-lg p-2"><div class="text-white font-bold">${gSubs.length}</div><div class="text-slate-500">Javob</div></div>
                </div>
                <button data-open-group="${group.id}" data-group-name="${escapeHtml(group.name)}" class="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-2.5 rounded-xl transition-colors text-sm">Darslarni ko'rish →</button>
            </article>`;
        }).join("")
    }</div>`;
}

// ─── Render lessons ────────────────────────────────────────────────────────────
async function renderLessons(groupId: number, groupName: string): Promise<void> {
    currentGroupId = groupId;
    currentGroupName = groupName;
    const workspace = await getTeacherWorkspace(currentTeacherId);
    const lessons = workspace.lessons.filter((lesson) => lesson.groupId === groupId);
    const list = byId("lessonsList");
    byId("pageTitle").textContent = groupName;
    byId("currentGroupTitle").textContent = `${groupName} darslari`;

    if (!lessons.length) {
        list.innerHTML = `<div class="glass rounded-2xl p-8 text-slate-400 col-span-full text-center">Hali dars qo'shilmagan.</div>`;
        return;
    }

    list.innerHTML = lessons.map((lesson) => {
        const assignments = findLessonAssignments(workspace.assignments, lesson.id);
        const assignmentHtml = assignments.length
            ? assignments.map((assignment) => {
                const submissions = findAssignmentSubmissions(workspace.submissions, assignment.id, workspace.students);
                return `
                    <div class="mt-4 rounded-xl bg-slate-900/60 border border-slate-700/50 p-4">
                        <div class="flex items-start justify-between gap-4 mb-3">
                            <div>
                                <h5 class="text-white font-semibold">${escapeHtml(assignment.title)}</h5>
                                <p class="text-sm text-slate-400 mt-1">${escapeHtml(assignment.description)}</p>
                                <p class="text-xs text-purple-400 mt-2">⏰ Deadline: ${escapeHtml(assignment.deadline)}</p>
                                ${assignment.fileDataUrl ? `<a href="${assignment.fileDataUrl}" download="${escapeHtml(assignment.fileName)}" class="text-xs text-blue-400 mt-2 inline-block hover:text-blue-300">📎 Biriktirilgan fayl</a>` : ""}
                            </div>
                            <span class="shrink-0 bg-slate-700 text-slate-300 text-xs px-2 py-1 rounded-lg">${submissions.length} javob</span>
                        </div>
                        ${submissions.length ? `
                            <div class="space-y-1.5">
                                ${submissions.map((submission) => `
                                    <div class="text-xs text-slate-300 flex items-center justify-between gap-3 bg-slate-800/60 rounded-lg px-3 py-2">
                                        <span>✅ ${escapeHtml(submission.studentName)}</span>
                                        <a href="${submission.fileDataUrl}" download="${escapeHtml(submission.fileName)}" class="text-green-400 hover:text-green-300">Yuklab olish</a>
                                    </div>
                                `).join("")}
                            </div>
                        ` : '<div class="mt-2 text-xs text-slate-600">Javoblar hali kelmagan.</div>'}
                    </div>
                `;
            }).join("")
            : `<div class="mt-4 text-sm text-slate-500">Vazifalar mavjud emas.</div>`;

        return `
            <article class="glass rounded-2xl border border-slate-700/50 overflow-hidden">
                ${lesson.videoUrl ? `<iframe class="w-full h-52" src="${youtubeEmbed(lesson.videoUrl)}" title="${escapeHtml(lesson.title)}" allowfullscreen></iframe>` : `<div class="w-full h-52 bg-slate-900 flex items-center justify-center text-slate-500 text-sm">📹 Video mavjud emas</div>`}
                <div class="p-5">
                    <div class="flex items-center justify-between gap-4 mb-2">
                        <div>
                            <h4 class="text-lg font-bold text-white">${escapeHtml(lesson.title)}</h4>
                            <p class="text-xs text-slate-500 mt-0.5">${formatDate(lesson.createdAt)}</p>
                        </div>
                        <button data-add-assignment="${lesson.id}" class="shrink-0 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 px-3 py-2 rounded-xl text-xs font-medium transition-colors">+ Vazifa</button>
                    </div>
                    ${assignmentHtml}
                </div>
            </article>
        `;
    }).join("");
}

// ─── Section navigation helper ─────────────────────────────────────────────────
function showSection(which: "overview" | "groups" | "lessons"): void {
    setVisible(byId("overviewSection"), which === "overview");
    setVisible(byId("groupsContainer"), which === "groups");
    setVisible(byId("lessonsContainer"), which === "lessons");
}

// ─── Bootstrap ─────────────────────────────────────────────────────────────────
async function bootstrap(): Promise<void> {
    startTeacherClock();
    const session = getSession();
    if (session?.role === "teacher") {
        currentTeacherId = session.userId;
        setVisible(byId("loginSection"), false);
        setVisible(byId("dashboardSection"), true);
        byId("userNameDisplay").textContent = session.displayName;
        showSection("overview");
        await renderOverview();
    }

    byId<HTMLFormElement>("loginForm").addEventListener("submit", async (event) => {
        event.preventDefault();
        const result = await login(byId<HTMLInputElement>("username").value.trim(), byId<HTMLInputElement>("password").value.trim(), "teacher");
        if (!result) {
            showMessage(byId("loginError"), "Teacher logini yoki paroli noto'g'ri.", "error");
            return;
        }
        setSession(result);
        window.location.reload();
    });

    byId("logoutBtn").addEventListener("click", () => {
        clearSession();
        window.location.reload();
    });

    // Nav: show overview
    document.querySelectorAll<HTMLElement>('[data-action="show-overview"]').forEach((btn) => {
        btn.addEventListener("click", async () => {
            showSection("overview");
            byId("pageTitle").textContent = "Umumiy ko'rinish";
            byId("pageSubtitle").textContent = "Sizning o'qitish faoliyati";
            await renderOverview();
        });
    });

    // Nav: show groups
    document.querySelectorAll<HTMLElement>('[data-action="show-groups"]').forEach((btn) => {
        btn.addEventListener("click", async () => {
            showSection("groups");
            byId("pageTitle").textContent = "Guruhlarim";
            byId("pageSubtitle").textContent = "Barcha biriktirilgan guruhlar";
            await renderGroups();
        });
    });

    // Lesson modal open
    document.querySelectorAll<HTMLElement>('[data-action="open-lesson-modal"]').forEach((btn) => {
        btn.addEventListener("click", () => {
            byId("lessonModal").classList.remove("hidden");
        });
    });

    byId("closeLessonModalBtn").addEventListener("click", () => byId("lessonModal").classList.add("hidden"));
    byId("closeAssignmentModalBtn").addEventListener("click", () => byId("assignmentModal").classList.add("hidden"));

    byId<HTMLFormElement>("lessonForm").addEventListener("submit", async (event) => {
        event.preventDefault();
        await createLesson(
            currentGroupId,
            byId<HTMLInputElement>("l_title").value.trim(),
            byId<HTMLInputElement>("l_video").value.trim()
        );
        byId("lessonModal").classList.add("hidden");
        byId<HTMLFormElement>("lessonForm").reset();
        await renderLessons(currentGroupId, currentGroupName);
    });

    byId<HTMLFormElement>("assignmentForm").addEventListener("submit", async (event) => {
        event.preventDefault();
        const file = byId<HTMLInputElement>("a_file").files?.[0];
        await createAssignment({
            lessonId: Number(byId<HTMLInputElement>("a_lesson_id").value),
            title: byId<HTMLInputElement>("a_title").value.trim(),
            description: byId<HTMLTextAreaElement>("a_desc").value.trim(),
            deadline: byId<HTMLInputElement>("a_deadline").value,
            fileName: file?.name ?? "",
            fileDataUrl: file ? await readFileAsDataUrl(file) : ""
        });
        byId("assignmentModal").classList.add("hidden");
        byId<HTMLFormElement>("assignmentForm").reset();
        await renderLessons(currentGroupId, currentGroupName);
    });

    document.addEventListener("click", async (event) => {
        const target = event.target as HTMLElement;

        if (target.dataset.openGroup) {
            showSection("lessons");
            await renderLessons(Number(target.dataset.openGroup), target.dataset.groupName ?? "Guruh");
        }

        if (target.dataset.addAssignment) {
            byId<HTMLInputElement>("a_lesson_id").value = target.dataset.addAssignment;
            byId("assignmentModal").classList.remove("hidden");
        }
    });

    // await initWeatherBg();
}

void bootstrap();

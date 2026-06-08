import { readFileAsDataUrl } from "../core/files.js";
import { clearSession, getSession, setSession } from "../core/session.js";
import {
    assignStudentToGroup,
    clubImageSrc,
    createAdmin,
    deleteAdmin,
    deleteClub,
    deleteGroup,
    deleteStudent,
    deleteTeacher,
    getAdminDashboardData,
    getStore,
    login,
    resetStore,
    updateStudent,
    upsertClub,
    upsertGroup,
    upsertTeacher
} from "../core/store.js";
import type { Club, Student, Teacher } from "../core/types.js";
import { byId, escapeHtml, setVisible, showMessage } from "../core/utils.js";
import { initWeatherBg } from "../shared/weather-bg.js";

// Chart.js CDN orqali yuklanadi, shuning uchun qo'lda declare qilamiz
declare const Chart: {
    new (ctx: CanvasRenderingContext2D, config: object): { destroy(): void };
};

let editingTeacherId: number | null = null;
let editingStudentId: number | null = null;
let editingClubId: number | null = null;

// ─── Modal helpers ────────────────────────────────────────────────────────────
function openModal(id: string): void {
    byId(id).classList.remove("hidden");
}

function closeModal(id: string): void {
    byId(id).classList.add("hidden");
}

// ─── Render functions ─────────────────────────────────────────────────────────
function renderTeachers(teachers: Teacher[]): void {
    byId("teachersTableBody").innerHTML = teachers.map((teacher) => `
        <tr class="border-t border-gray-800 hover:bg-gray-800/30 transition-colors">
            <td class="px-4 py-3 text-white font-medium">${escapeHtml(`${teacher.firstName} ${teacher.lastName}`)}</td>
            <td class="px-4 py-3 text-gray-400">${escapeHtml(teacher.subject)}</td>
            <td class="px-4 py-3 text-gray-400">${escapeHtml(teacher.phone)}</td>
            <td class="px-4 py-3 text-gray-400">${escapeHtml(teacher.username)}</td>
            <td class="px-4 py-3 text-right space-x-2">
                <button data-edit-teacher="${teacher.id}" class="px-3 py-1.5 bg-blue-600/20 text-blue-400 rounded-lg text-sm hover:bg-blue-600/30 transition-colors">Tahrirlash</button>
                <button data-delete-teacher="${teacher.id}" class="px-3 py-1.5 bg-red-600/20 text-red-400 rounded-lg text-sm hover:bg-red-600/30 transition-colors">O'chirish</button>
            </td>
        </tr>
    `).join("");
}

function renderStudents(students: Student[]): void {
    byId("studentsTableBody").innerHTML = students.map((student) => `
        <tr class="border-t border-gray-800 hover:bg-gray-800/30 transition-colors">
            <td class="px-4 py-3 text-white font-medium">${escapeHtml(`${student.firstName} ${student.lastName}`)}</td>
            <td class="px-4 py-3 text-gray-400">${escapeHtml(student.phone)}</td>
            <td class="px-4 py-3 text-gray-400">${escapeHtml(student.school ?? "-")}</td>
            <td class="px-4 py-3 text-gray-400">${escapeHtml(student.clubInterest)}</td>
            <td class="px-4 py-3 text-gray-400">${escapeHtml(student.username)}</td>
            <td class="px-4 py-3 text-right space-x-2">
                <button data-edit-student="${student.id}" class="px-3 py-1.5 bg-blue-600/20 text-blue-400 rounded-lg text-sm hover:bg-blue-600/30 transition-colors">Tahrirlash</button>
                <button data-delete-student="${student.id}" class="px-3 py-1.5 bg-red-600/20 text-red-400 rounded-lg text-sm hover:bg-red-600/30 transition-colors">O'chirish</button>
            </td>
        </tr>
    `).join("");
}

function renderAdmins(admins: Array<{ id: number; username: string; displayName: string }>): void {
    byId("adminsTableBody").innerHTML = admins.map((admin) => `
        <tr class="border-t border-gray-800 hover:bg-gray-800/30 transition-colors">
            <td class="px-4 py-3 text-gray-500 text-sm">${admin.id}</td>
            <td class="px-4 py-3 text-white font-medium">${escapeHtml(admin.displayName)}</td>
            <td class="px-4 py-3 text-gray-400">${escapeHtml(admin.username)}</td>
            <td class="px-4 py-3 text-right">
                ${admin.id === 1 ? '<span class="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded-lg">Asosiy admin</span>' : `<button data-delete-admin="${admin.id}" class="px-3 py-1.5 bg-red-600/20 text-red-400 rounded-lg text-sm hover:bg-red-600/30 transition-colors">O'chirish</button>`}
            </td>
        </tr>
    `).join("");
}

function renderClubs(clubs: Array<Club & { teacherName: string }>): void {
    byId("clubsTableBody").innerHTML = clubs.map((club) => `
        <tr class="border-t border-gray-800 hover:bg-gray-800/30 transition-colors">
            <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                    <img src="${escapeHtml(clubImageSrc(club.imagePath, "../"))}" alt="${escapeHtml(club.title)}" class="w-12 h-12 rounded-xl object-cover border border-gray-700">
                    <div>
                        <div class="text-white font-medium">${escapeHtml(club.title)}</div>
                        <div class="text-xs text-gray-500 mt-0.5">${escapeHtml(club.paragraph)}</div>
                    </div>
                </div>
            </td>
            <td class="px-4 py-3 text-gray-400">${escapeHtml(club.teacherName)}</td>
            <td class="px-4 py-3 text-right space-x-2">
                <button data-edit-club="${club.id}" class="px-3 py-1.5 bg-blue-600/20 text-blue-400 rounded-lg text-sm hover:bg-blue-600/30 transition-colors">Tahrirlash</button>
                <button data-delete-club="${club.id}" class="px-3 py-1.5 bg-red-600/20 text-red-400 rounded-lg text-sm hover:bg-red-600/30 transition-colors">O'chirish</button>
            </td>
        </tr>
    `).join("");
}

function renderGroups(groups: Array<{ id: number; name: string; clubName: string; teacherName: string; schedule: string; studentCount: number }>): void {
    byId("groupsTableBody").innerHTML = groups.map((group) => `
        <tr class="border-t border-gray-800 hover:bg-gray-800/30 transition-colors">
            <td class="px-4 py-3 text-white font-medium">${escapeHtml(group.name)}</td>
            <td class="px-4 py-3 text-gray-400">${escapeHtml(group.clubName)}</td>
            <td class="px-4 py-3 text-gray-400">${escapeHtml(group.teacherName)}</td>
            <td class="px-4 py-3 text-gray-400">${escapeHtml(group.schedule)}</td>
            <td class="px-4 py-3 text-center">
                <span class="bg-blue-600/20 text-blue-300 text-xs px-2 py-1 rounded-full">${group.studentCount} ta</span>
            </td>
            <td class="px-4 py-3 text-right space-x-2">
                <button data-assign-group="${group.id}" class="px-3 py-1.5 bg-purple-600/20 text-purple-400 rounded-lg text-sm hover:bg-purple-600/30 transition-colors">O'quvchi qo'shish</button>
                <button data-delete-group="${group.id}" class="px-3 py-1.5 bg-red-600/20 text-red-400 rounded-lg text-sm hover:bg-red-600/30 transition-colors">O'chirish</button>
            </td>
        </tr>
    `).join("");
}

// ─── Chart instances (keep refs to destroy on re-render) ─────────────────────
let chartClubStudents: { destroy(): void } | null = null;
let chartUserRoles: { destroy(): void } | null = null;

// ─── Live clock ───────────────────────────────────────────────────────────────
function startClock(): void {
    const tick = () => {
        const now = new Date();
        const clockEl = document.getElementById("adminClock");
        const dateEl = document.getElementById("adminDate");
        if (clockEl) clockEl.textContent = now.toLocaleTimeString("uz-UZ");
        if (dateEl) dateEl.textContent = now.toLocaleDateString("uz-UZ", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    };
    tick();
    setInterval(tick, 1000);
}

// ─── KPI stat card ─────────────────────────────────────────────────────────────
function statCard(icon: string, label: string, value: number | string, color: string, sub = ""): string {
    return `
        <div class="stat-card p-5 flex items-start gap-4">
            <div class="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0" style="background:${color}22;">${icon}</div>
            <div class="min-w-0">
                <div class="text-2xl font-extrabold text-white leading-none">${value}</div>
                <div class="text-gray-400 text-xs mt-1 font-medium">${label}</div>
                ${sub ? `<div class="text-gray-600 text-xs mt-1">${sub}</div>` : ""}
            </div>
        </div>`;
}

async function refreshDashboard(): Promise<void> {
    const data = await getAdminDashboardData();
    renderAdmins(data.admins);
    renderTeachers(data.teachers);
    renderStudents(data.students);
    renderClubs(data.clubs);
    renderGroups(data.groups);

    const teacherOptions = ['<option value="">Tanlang</option>', ...data.teachers.map((teacher) => `<option value="${teacher.id}">${escapeHtml(`${teacher.firstName} ${teacher.lastName}`)}</option>`)];
    byId<HTMLSelectElement>("c_teacher").innerHTML = teacherOptions.join("");
    byId<HTMLSelectElement>("g_teacher").innerHTML = teacherOptions.join("");
    byId<HTMLSelectElement>("g_club").innerHTML = ['<option value="">Tanlang</option>', ...data.clubs.map((club) => `<option value="${club.id}">${escapeHtml(club.title)}</option>`)].join("");
    byId<HTMLSelectElement>("modalStudentSelect").innerHTML = ['<option value="">Tanlang</option>', ...data.students.map((student) => `<option value="${student.id}">${escapeHtml(`${student.firstName} ${student.lastName}`)}</option>`)].join("");

    // ── KPI cards ──────────────────────────────────────────────────────────────
    const totalUsers = data.admins.length + data.teachers.length + data.students.length;
    const avgStudPerGroup = data.groups.length ? (data.students.length / data.groups.length).toFixed(1) : "0";
    const raw = await getStore();
    const totalLessons = raw.lessons.length;
    const totalAssignments = raw.assignments.length;
    const totalSubmissions = raw.submissions.length;

    byId("overviewStats").innerHTML = [
        statCard("👥", "Jami foydalanuvchilar", totalUsers, "#3b82f6", `${data.admins.length} admin · ${data.teachers.length} o'q · ${data.students.length} o'quvchi`),
        statCard("🏫", "To'garaklar", data.clubs.length, "#8b5cf6", `${data.groups.length} ta guruh bilan`),
        statCard("📚", "Darslar", totalLessons, "#10b981", `${totalAssignments} ta topshiriq`),
        statCard("📝", "Topshiriqlar", totalAssignments, "#f59e0b", `${totalSubmissions} ta javob yuborilgan`),
        statCard("🎓", "O'quvchilar", data.students.length, "#06b6d4", `O'rtacha ${avgStudPerGroup} ta/guruh`),
        statCard("👨‍🏫", "O'qituvchilar", data.teachers.length, "#ec4899", `${data.groups.filter(g => g.teacherName !== "Biriktirilmagan").length} ta guruhga biriktirilgan`),
        statCard("📋", "Guruhlar", data.groups.length, "#84cc16", `${data.clubs.length} ta to'garak bo'yicha`),
        statCard("✅", "Bajarilgan javoblar", totalSubmissions, "#f97316", totalAssignments ? `${Math.round((totalSubmissions / totalAssignments) * 100)}% bajarilish` : ""),
    ].join("");

    // ── Bar chart: students count per club ─────────────────────────────────────
    const clubLabels = data.clubs.map(c => c.title.length > 18 ? c.title.slice(0, 17) + "…" : c.title);
    const clubStudentCounts = data.clubs.map(club => {
        const groupIds = raw.groups.filter(g => g.clubId === club.id).map(g => g.id);
        const studentSet = new Set<number>();
        raw.groups.filter(g => groupIds.includes(g.id)).forEach(g => g.studentIds.forEach(id => studentSet.add(id)));
        return studentSet.size;
    });

    const ctxBar = byId<HTMLCanvasElement>("chartClubStudents").getContext("2d")!;
    if (chartClubStudents) chartClubStudents.destroy();
    chartClubStudents = new Chart(ctxBar, {
        type: "bar",
        data: {
            labels: clubLabels,
            datasets: [{
                label: "O'quvchilar",
                data: clubStudentCounts,
                backgroundColor: ["#3b82f6aa","#8b5cf6aa","#10b981aa","#f59e0baa","#ec4899aa","#06b6d4aa"],
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: "#6b7280", font: { size: 11 } }, grid: { display: false } },
                y: { ticks: { color: "#6b7280", font: { size: 11 }, stepSize: 1 }, grid: { color: "#1f2937" } }
            }
        }
    });

    // ── Doughnut: user roles ────────────────────────────────────────────────────
    const ctxDonut = byId<HTMLCanvasElement>("chartUserRoles").getContext("2d")!;
    if (chartUserRoles) chartUserRoles.destroy();
    chartUserRoles = new Chart(ctxDonut, {
        type: "doughnut",
        data: {
            labels: ["Adminlar", "O'qituvchilar", "O'quvchilar"],
            datasets: [{
                data: [data.admins.length, data.teachers.length, data.students.length],
                backgroundColor: ["#3b82f6", "#8b5cf6", "#10b981"],
                borderWidth: 0,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            cutout: "68%",
            plugins: {
                legend: { position: "bottom", labels: { color: "#9ca3af", padding: 16, boxWidth: 12 } }
            }
        }
    });

    // ── Club ranking progress bars ──────────────────────────────────────────────
    const maxGroups = Math.max(...data.clubs.map(c => data.groups.filter(g => g.clubId === c.id).length), 1);
    const colors = ["#3b82f6","#8b5cf6","#10b981","#f59e0b","#ec4899","#06b6d4"];
    byId("clubRankingList").innerHTML = data.clubs.map((club, i) => {
        const groupCount = data.groups.filter(g => g.clubId === club.id).length;
        const pct = Math.round((groupCount / maxGroups) * 100);
        const color = colors[i % colors.length];
        return `
            <div>
                <div class="flex justify-between items-center mb-1">
                    <span class="text-gray-300 text-sm truncate mr-4">${escapeHtml(club.title)}</span>
                    <span class="text-gray-500 text-xs shrink-0">${groupCount} guruh</span>
                </div>
                <div class="prog-bar-bg"><div class="prog-bar" style="width:${pct}%;background:${color};"></div></div>
            </div>`;
    }).join("") || '<p class="text-gray-600 text-sm">To\'garaklar yo\'q</p>';

    // ── System info panel ────────────────────────────────────────────────────────
    const sysInfoItems: [string, string, string][] = [
        ["📁", "Ma'lumotlar bazasi", "Data/seed.json"],
        ["🕐", "Hozirgi vaqt", new Date().toLocaleString("uz-UZ")],
        ["🔐", "Adminlar soni", `${data.admins.length} ta`],
        ["📊", "Jami yozuvlar", `${totalUsers + data.clubs.length + data.groups.length + totalLessons + totalAssignments + totalSubmissions} ta`],
        ["✉️", "Javoblar", `${totalSubmissions} / ${totalAssignments} ta`],
    ];
    byId("sysInfoList").innerHTML = sysInfoItems.map(([icon, label, val]) => `
        <div class="flex items-start justify-between gap-2 text-xs">
            <span class="text-gray-500">${icon} ${label}</span>
            <span class="text-gray-300 text-right font-medium">${val}</span>
        </div>`).join('<div class="border-t border-gray-800/60"></div>');

    // ── Recent students table ────────────────────────────────────────────────────
    const lastStudents = [...data.students].slice(-5).reverse();
    byId("recentStudentsBody").innerHTML = lastStudents.length
        ? lastStudents.map(s => `
            <tr class="border-t border-gray-800/50 hover:bg-gray-800/20">
                <td class="py-2.5 pr-4 text-white font-medium">${escapeHtml(`${s.firstName} ${s.lastName}`)}</td>
                <td class="py-2.5 pr-4 text-gray-400">${escapeHtml(s.phone)}</td>
                <td class="py-2.5 pr-4 text-gray-400">${escapeHtml(s.clubInterest)}</td>
                <td class="py-2.5 text-gray-500">${escapeHtml(s.school ?? "—")}</td>
            </tr>`).join("")
        : '<tr><td colspan="4" class="py-4 text-center text-gray-600">O\'quvchilar yo\'q</td></tr>';
}

function openDashboard(): void {
    setVisible(byId("loginSection"), false);
    setVisible(byId("dashboardSection"), true);
}

function resetTeacherForm(): void {
    editingTeacherId = null;
    byId<HTMLFormElement>("teacherForm").reset();
    byId("teacherModalTitle").textContent = "Yangi o'qituvchi";
}

function resetStudentForm(): void {
    editingStudentId = null;
    byId<HTMLFormElement>("studentForm").reset();
    byId("studentModalTitle").textContent = "O'quvchini tahrirlash";
}

function resetClubForm(): void {
    editingClubId = null;
    byId<HTMLFormElement>("clubForm").reset();
    byId("clubModalTitle").textContent = "Yangi to'garak";
}

async function bootstrap(): Promise<void> {
    startClock();
    const session = getSession();
    if (session?.role === "admin") {
        byId("adminDisplayName").textContent = session.displayName;
        openDashboard();
        await refreshDashboard();
    }

    byId<HTMLFormElement>("loginForm").addEventListener("submit", async (event) => {
        event.preventDefault();
        const result = await login(byId<HTMLInputElement>("username").value.trim(), byId<HTMLInputElement>("password").value.trim(), "admin");
        if (!result) {
            showMessage(byId("loginError"), "Login yoki parol noto'g'ri.", "error");
            return;
        }
        setSession(result);
        byId("adminDisplayName").textContent = result.displayName;
        openDashboard();
        await refreshDashboard();
    });

    byId("logoutBtn").addEventListener("click", () => {
        clearSession();
        window.location.reload();
    });

    // Tab navigation
    document.querySelectorAll<HTMLElement>("[data-tab]").forEach((button) => {
        button.addEventListener("click", () => {
            const tab = button.dataset.tab;
            document.querySelectorAll<HTMLElement>(".view-panel").forEach((panel) => panel.classList.add("hidden"));
            document.querySelectorAll<HTMLElement>("[data-tab]").forEach((item) => item.classList.remove("active-tab"));
            button.classList.add("active-tab");
            if (tab) {
                byId(`view-${tab}`).classList.remove("hidden");
                byId("pageTitle").textContent = button.dataset.title ?? "Dashboard";
            }
        });
    });

    // ─── Admin form (modal) ───────────────────────────────────────────────────
    byId("openAdminModalBtn").addEventListener("click", () => openModal("adminModal"));
    byId("closeAdminModal").addEventListener("click", () => closeModal("adminModal"));

    byId<HTMLFormElement>("adminForm").addEventListener("submit", async (event) => {
        event.preventDefault();
        const result = await createAdmin(
            byId<HTMLInputElement>("a_username").value.trim(),
            byId<HTMLInputElement>("a_password").value.trim(),
            byId<HTMLInputElement>("a_display_name").value.trim()
        );
        if (result.ok) {
            byId<HTMLFormElement>("adminForm").reset();
            closeModal("adminModal");
            await refreshDashboard();
            showMessage(byId("overviewMessage"), result.message, "success");
        } else {
            showMessage(byId("adminModalError"), result.message, "error");
        }
    });

    // ─── Teacher form (modal) ─────────────────────────────────────────────────
    byId("openTeacherModalBtn").addEventListener("click", () => {
        resetTeacherForm();
        openModal("teacherModal");
    });
    byId("closeTeacherModal").addEventListener("click", () => {
        resetTeacherForm();
        closeModal("teacherModal");
    });

    byId<HTMLFormElement>("teacherForm").addEventListener("submit", async (event) => {
        event.preventDefault();
        const result = await upsertTeacher({
            id: editingTeacherId ?? undefined,
            firstName: byId<HTMLInputElement>("t_first_name").value.trim(),
            lastName: byId<HTMLInputElement>("t_last_name").value.trim(),
            phone: byId<HTMLInputElement>("t_phone").value.trim(),
            subject: byId<HTMLInputElement>("t_subject").value.trim(),
            username: byId<HTMLInputElement>("t_username").value.trim(),
            password: byId<HTMLInputElement>("t_password").value.trim()
        });
        if (result.ok) {
            resetTeacherForm();
            closeModal("teacherModal");
            await refreshDashboard();
        } else {
            showMessage(byId("teacherModalError"), result.message, "error");
        }
    });

    // ─── Student form (modal) ─────────────────────────────────────────────────
    byId("closeStudentModal").addEventListener("click", () => {
        resetStudentForm();
        closeModal("studentModal");
    });

    byId<HTMLFormElement>("studentForm").addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!editingStudentId) return;

        const result = await updateStudent(editingStudentId, {
            firstName: byId<HTMLInputElement>("s_first_name").value.trim(),
            lastName: byId<HTMLInputElement>("s_last_name").value.trim(),
            age: Number(byId<HTMLInputElement>("s_age").value) || undefined,
            phone: byId<HTMLInputElement>("s_phone").value.trim(),
            school: byId<HTMLInputElement>("s_school").value.trim(),
            clubInterest: byId<HTMLInputElement>("s_interest").value.trim(),
            username: byId<HTMLInputElement>("s_username").value.trim(),
            password: byId<HTMLInputElement>("s_password").value.trim()
        });

        if (result.ok) {
            resetStudentForm();
            closeModal("studentModal");
            await refreshDashboard();
        } else {
            showMessage(byId("studentModalError"), result.message, "error");
        }
    });

    // ─── Club form (modal) ────────────────────────────────────────────────────
    byId("openClubModalBtn").addEventListener("click", () => {
        resetClubForm();
        openModal("clubModal");
    });
    byId("closeClubModal").addEventListener("click", () => {
        resetClubForm();
        closeModal("clubModal");
    });

    byId<HTMLFormElement>("clubForm").addEventListener("submit", async (event) => {
        event.preventDefault();
        const file = byId<HTMLInputElement>("c_image").files?.[0];
        let imagePath = byId<HTMLInputElement>("c_existing_image").value.trim();
        if (file) imagePath = await readFileAsDataUrl(file);

        await upsertClub({
            id: editingClubId ?? undefined,
            title: byId<HTMLInputElement>("c_title").value.trim(),
            paragraph: byId<HTMLInputElement>("c_paragraph").value.trim(),
            description: byId<HTMLTextAreaElement>("c_description").value.trim(),
            teacherId: Number(byId<HTMLSelectElement>("c_teacher").value) || null,
            imagePath
        });
        resetClubForm();
        closeModal("clubModal");
        await refreshDashboard();
    });

    // ─── Group form (modal) ───────────────────────────────────────────────────
    byId("openGroupModalBtn").addEventListener("click", () => openModal("groupModal"));
    byId("closeGroupModal").addEventListener("click", () => closeModal("groupModal"));

    byId<HTMLFormElement>("groupForm").addEventListener("submit", async (event) => {
        event.preventDefault();
        await upsertGroup({
            name: byId<HTMLInputElement>("g_name").value.trim(),
            clubId: Number(byId<HTMLSelectElement>("g_club").value),
            teacherId: Number(byId<HTMLSelectElement>("g_teacher").value) || null,
            schedule: byId<HTMLInputElement>("g_schedule").value.trim()
        });
        byId<HTMLFormElement>("groupForm").reset();
        closeModal("groupModal");
        await refreshDashboard();
    });

    // ─── Reset seed ───────────────────────────────────────────────────────────
    byId("resetSeedBtn").addEventListener("click", async () => {
        if (!confirm("Barcha ma'lumotlar boshlang'ich holatga qaytariladi. Davom etasizmi?")) return;
        await resetStore();
        await refreshDashboard();
        showMessage(byId("overviewMessage"), "Seed ma'lumotlar qayta yuklandi.", "success");
    });

    // ─── Assign student modal ─────────────────────────────────────────────────
    byId("closeStudentGroupModal").addEventListener("click", () => closeModal("studentGroupModal"));
    byId("assignStudentBtn").addEventListener("click", async () => {
        const groupId = Number(byId<HTMLInputElement>("modalGroupId").value);
        const studentId = Number(byId<HTMLSelectElement>("modalStudentSelect").value);
        if (!groupId || !studentId) return;

        const result = await assignStudentToGroup(groupId, studentId);
        closeModal("studentGroupModal");
        await refreshDashboard();
        showMessage(byId("overviewMessage"), result.message, "success");
    });

    // ─── Delegated click handler ──────────────────────────────────────────────
    document.addEventListener("click", async (event) => {
        const target = event.target as HTMLElement;
        const data = await getAdminDashboardData();

        if (target.dataset.deleteAdmin) {
            if (!confirm("Bu adminni o'chirishni tasdiqlaysizmi?")) return;
            await deleteAdmin(Number(target.dataset.deleteAdmin));
            await refreshDashboard();
        }
        if (target.dataset.editTeacher) {
            const teacher = data.teachers.find((item) => item.id === Number(target.dataset.editTeacher));
            if (!teacher) return;
            editingTeacherId = teacher.id;
            byId("teacherModalTitle").textContent = "O'qituvchini tahrirlash";
            byId<HTMLInputElement>("t_first_name").value = teacher.firstName;
            byId<HTMLInputElement>("t_last_name").value = teacher.lastName;
            byId<HTMLInputElement>("t_phone").value = teacher.phone;
            byId<HTMLInputElement>("t_subject").value = teacher.subject;
            byId<HTMLInputElement>("t_username").value = teacher.username;
            byId<HTMLInputElement>("t_password").value = teacher.password;
            openModal("teacherModal");
        }
        if (target.dataset.deleteTeacher) {
            if (!confirm("Bu o'qituvchini o'chirishni tasdiqlaysizmi?")) return;
            await deleteTeacher(Number(target.dataset.deleteTeacher));
            await refreshDashboard();
        }
        if (target.dataset.editStudent) {
            const student = data.students.find((item) => item.id === Number(target.dataset.editStudent));
            if (!student) return;
            editingStudentId = student.id;
            byId("studentModalTitle").textContent = `${student.firstName} ${student.lastName} ni tahrirlash`;
            byId<HTMLInputElement>("s_first_name").value = student.firstName;
            byId<HTMLInputElement>("s_last_name").value = student.lastName;
            byId<HTMLInputElement>("s_age").value = String(student.age ?? "");
            byId<HTMLInputElement>("s_phone").value = student.phone;
            byId<HTMLInputElement>("s_school").value = student.school ?? "";
            byId<HTMLInputElement>("s_interest").value = student.clubInterest;
            byId<HTMLInputElement>("s_username").value = student.username;
            byId<HTMLInputElement>("s_password").value = student.password;
            openModal("studentModal");
        }
        if (target.dataset.deleteStudent) {
            if (!confirm("Bu o'quvchini o'chirishni tasdiqlaysizmi?")) return;
            await deleteStudent(Number(target.dataset.deleteStudent));
            await refreshDashboard();
        }
        if (target.dataset.editClub) {
            const club = data.clubs.find((item) => item.id === Number(target.dataset.editClub));
            if (!club) return;
            editingClubId = club.id;
            byId("clubModalTitle").textContent = "To'garakni tahrirlash";
            byId<HTMLInputElement>("c_title").value = club.title;
            byId<HTMLInputElement>("c_paragraph").value = club.paragraph;
            byId<HTMLTextAreaElement>("c_description").value = club.description;
            byId<HTMLSelectElement>("c_teacher").value = String(club.teacherId ?? "");
            byId<HTMLInputElement>("c_existing_image").value = club.imagePath;
            openModal("clubModal");
        }
        if (target.dataset.deleteClub) {
            if (!confirm("Bu to'garakni o'chirishni tasdiqlaysizmi?")) return;
            await deleteClub(Number(target.dataset.deleteClub));
            await refreshDashboard();
        }
        if (target.dataset.deleteGroup) {
            if (!confirm("Bu guruhni o'chirishni tasdiqlaysizmi?")) return;
            await deleteGroup(Number(target.dataset.deleteGroup));
            await refreshDashboard();
        }
        if (target.dataset.assignGroup) {
            byId<HTMLInputElement>("modalGroupId").value = target.dataset.assignGroup;
            openModal("studentGroupModal");
        }
    });

    // await initWeatherBg();
}

void bootstrap();
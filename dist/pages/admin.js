import { readFileAsDataUrl } from "../core/files.js";
import { clearSession, getSession, setSession } from "../core/session.js";
import {
    assignStudentToGroup, clubImageSrc, createAdmin, deleteAdmin, deleteClub,
    deleteGroup, deleteStudent, deleteTeacher, getAdminDashboardData, login,
    resetStore, updateStudent, upsertClub, upsertGroup, upsertTeacher
} from "../core/store.js";
import { byId, escapeHtml, setVisible, showMessage } from "../core/utils.js";
import { initWeatherBg } from "../shared/weather-bg.js";

let editingTeacherId = null;
let editingStudentId = null;
let editingClubId = null;
let chartInstances = {};

// ─── Chart.js loader ──────────────────────────────────────────────────────────
async function loadChartJs() {
    if (window.Chart) return window.Chart;
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js";
        script.onload = () => resolve(window.Chart);
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// ─── Modal helpers ─────────────────────────────────────────────────────────────
function openModal(id) { byId(id).classList.remove("hidden"); }
function closeModal(id) { byId(id).classList.add("hidden"); }

// ─── Destroy old chart safely ──────────────────────────────────────────────────
function destroyChart(key) {
    if (chartInstances[key]) {
        chartInstances[key].destroy();
        delete chartInstances[key];
    }
}

// ─── Statistics computation ────────────────────────────────────────────────────
function computeStats(data) {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    // Students per club
    const studentsPerClub = data.clubs.map(club => {
        const clubGroups = data.groups.filter(g => g.clubId === club.id);
        const count = clubGroups.reduce((s, g) => s + g.studentIds.length, 0);
        return { name: club.title, count };
    });

    // Students per group
    const studentsPerGroup = data.groups.map(g => ({
        name: g.name,
        count: g.studentIds.length
    }));

    // Age distribution
    const ageGroups = { "14-15": 0, "16-17": 0, "18-19": 0, "20+": 0 };
    data.students.forEach(s => {
        const age = s.age ?? 0;
        if (age <= 15) ageGroups["14-15"]++;
        else if (age <= 17) ageGroups["16-17"]++;
        else if (age <= 19) ageGroups["18-19"]++;
        else ageGroups["20+"]++;
    });

    // Club interests
    const interestMap = {};
    data.students.forEach(s => {
        const k = s.clubInterest || "Boshqa";
        interestMap[k] = (interestMap[k] || 0) + 1;
    });

    // Teachers with groups
    const teacherLoad = data.teachers.map(t => ({
        name: `${t.firstName} ${t.lastName}`,
        groups: data.groups.filter(g => g.teacherId === t.id).length,
        students: data.groups
            .filter(g => g.teacherId === t.id)
            .reduce((s, g) => s + g.studentIds.length, 0)
    }));

    // Monthly activity (simulate using lesson createdAt)
    const monthlyActivity = Array(6).fill(0).map((_, i) => {
        const d = new Date(thisYear, thisMonth - 5 + i, 1);
        return {
            label: d.toLocaleDateString("uz-UZ", { month: "short", year: "2-digit" }),
            lessons: data.lessons ? data.lessons.filter(l => {
                const ld = new Date(l.createdAt);
                return ld.getMonth() === d.getMonth() && ld.getFullYear() === d.getFullYear();
            }).length : 0
        };
    });

    // School distribution
    const schoolMap = {};
    data.students.forEach(s => {
        const k = s.school || "Boshqa";
        schoolMap[k] = (schoolMap[k] || 0) + 1;
    });

    return { studentsPerClub, studentsPerGroup, ageGroups, interestMap, teacherLoad, monthlyActivity, schoolMap };
}

// ─── Render dashboard charts ───────────────────────────────────────────────────
async function renderCharts(data) {
    const Chart = await loadChartJs();
    const stats = computeStats(data);

    const chartDefaults = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: { color: "#94a3b8", font: { family: "'Segoe UI', sans-serif", size: 11 } }
            }
        }
    };

    const COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899"];
    const GRID_COLOR = "rgba(148,163,184,0.08)";

    // 1. O'quvchilar / To'garaklar (Bar)
    destroyChart("clubStudents");
    const ctxClub = byId("chartClubStudents").getContext("2d");
    chartInstances["clubStudents"] = new Chart(ctxClub, {
        type: "bar",
        data: {
            labels: stats.studentsPerClub.map(c => c.name),
            datasets: [{
                label: "O'quvchilar soni",
                data: stats.studentsPerClub.map(c => c.count),
                backgroundColor: COLORS.map(c => c + "cc"),
                borderColor: COLORS,
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            ...chartDefaults,
            scales: {
                x: { ticks: { color: "#94a3b8" }, grid: { color: GRID_COLOR } },
                y: { ticks: { color: "#94a3b8", stepSize: 1 }, grid: { color: GRID_COLOR }, beginAtZero: true }
            }
        }
    });

    // 2. Yosh taqsimoti (Doughnut)
    destroyChart("ageChart");
    const ctxAge = byId("chartAge").getContext("2d");
    chartInstances["ageChart"] = new Chart(ctxAge, {
        type: "doughnut",
        data: {
            labels: Object.keys(stats.ageGroups),
            datasets: [{
                data: Object.values(stats.ageGroups),
                backgroundColor: COLORS.slice(0, 4).map(c => c + "dd"),
                borderColor: "#1e293b",
                borderWidth: 3,
                hoverOffset: 8
            }]
        },
        options: {
            ...chartDefaults,
            cutout: "68%",
            plugins: {
                ...chartDefaults.plugins,
                legend: { ...chartDefaults.plugins.legend, position: "bottom" }
            }
        }
    });

    // 3. Qiziqish sohalari (Pie)
    destroyChart("interestChart");
    const ctxInterest = byId("chartInterest").getContext("2d");
    const interestKeys = Object.keys(stats.interestMap);
    const interestVals = Object.values(stats.interestMap);
    chartInstances["interestChart"] = new Chart(ctxInterest, {
        type: "pie",
        data: {
            labels: interestKeys,
            datasets: [{
                data: interestVals,
                backgroundColor: COLORS.slice(0, interestKeys.length).map(c => c + "cc"),
                borderColor: "#1e293b",
                borderWidth: 2,
                hoverOffset: 8
            }]
        },
        options: {
            ...chartDefaults,
            plugins: {
                ...chartDefaults.plugins,
                legend: { ...chartDefaults.plugins.legend, position: "bottom" }
            }
        }
    });

    // 4. O'qituvchi yuki (Horizontal Bar)
    destroyChart("teacherChart");
    const ctxTeacher = byId("chartTeacher").getContext("2d");
    chartInstances["teacherChart"] = new Chart(ctxTeacher, {
        type: "bar",
        data: {
            labels: stats.teacherLoad.map(t => t.name),
            datasets: [
                {
                    label: "Guruhlar",
                    data: stats.teacherLoad.map(t => t.groups),
                    backgroundColor: "#3b82f6cc",
                    borderColor: "#3b82f6",
                    borderWidth: 2,
                    borderRadius: 6
                },
                {
                    label: "O'quvchilar",
                    data: stats.teacherLoad.map(t => t.students),
                    backgroundColor: "#8b5cf6cc",
                    borderColor: "#8b5cf6",
                    borderWidth: 2,
                    borderRadius: 6
                }
            ]
        },
        options: {
            ...chartDefaults,
            indexAxis: "y",
            scales: {
                x: { ticks: { color: "#94a3b8", stepSize: 1 }, grid: { color: GRID_COLOR }, beginAtZero: true },
                y: { ticks: { color: "#94a3b8" }, grid: { color: GRID_COLOR } }
            }
        }
    });

    // 5. Oylik faollik (Line)
    destroyChart("activityChart");
    const ctxActivity = byId("chartActivity").getContext("2d");
    chartInstances["activityChart"] = new Chart(ctxActivity, {
        type: "line",
        data: {
            labels: stats.monthlyActivity.map(m => m.label),
            datasets: [{
                label: "Darslar",
                data: stats.monthlyActivity.map(m => m.lessons),
                borderColor: "#10b981",
                backgroundColor: "rgba(16,185,129,0.12)",
                borderWidth: 2.5,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: "#10b981",
                pointRadius: 5,
                pointHoverRadius: 8
            }]
        },
        options: {
            ...chartDefaults,
            scales: {
                x: { ticks: { color: "#94a3b8" }, grid: { color: GRID_COLOR } },
                y: { ticks: { color: "#94a3b8", stepSize: 1 }, grid: { color: GRID_COLOR }, beginAtZero: true }
            }
        }
    });

    // 6. Maktablar taqsimoti (Bar)
    destroyChart("schoolChart");
    const ctxSchool = byId("chartSchool").getContext("2d");
    const schoolKeys = Object.keys(stats.schoolMap);
    chartInstances["schoolChart"] = new Chart(ctxSchool, {
        type: "bar",
        data: {
            labels: schoolKeys,
            datasets: [{
                label: "O'quvchilar",
                data: schoolKeys.map(k => stats.schoolMap[k]),
                backgroundColor: COLORS.slice(0, schoolKeys.length).map(c => c + "bb"),
                borderColor: COLORS.slice(0, schoolKeys.length),
                borderWidth: 2,
                borderRadius: 6
            }]
        },
        options: {
            ...chartDefaults,
            scales: {
                x: { ticks: { color: "#94a3b8" }, grid: { color: GRID_COLOR } },
                y: { ticks: { color: "#94a3b8", stepSize: 1 }, grid: { color: GRID_COLOR }, beginAtZero: true }
            }
        }
    });
}

// ─── Stats overview cards (kengaytirilgan) ────────────────────────────────────
function renderOverviewStats(data) {
    const stats = computeStats(data);
    const totalStudents = data.students.length;
    const totalTeachers = data.teachers.length;
    const totalClubs = data.clubs.length;
    const totalGroups = data.groups.length;
    const totalLessons = data.lessons ? data.lessons.length : 0;
    const totalAssignments = data.assignments ? data.assignments.length : 0;
    const avgGroupSize = totalGroups > 0
        ? (data.groups.reduce((s, g) => s + g.studentIds.length, 0) / totalGroups).toFixed(1)
        : 0;
    const activeTeachers = data.teachers.filter(t =>
        data.groups.some(g => g.teacherId === t.id)
    ).length;

    const el = byId("overviewStats");
    if (!el) return;

    el.innerHTML = `
        <!-- Qator 1: Asosiy raqamlar -->
        <div class="stat-card animate-in" style="--delay:0.05s">
            <div class="stat-icon" style="background:rgba(59,130,246,0.15)">
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#3b82f6" stroke-width="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
            </div>
            <div class="stat-body">
                <div class="stat-value counter" data-target="${totalTeachers}">${totalTeachers}</div>
                <div class="stat-label">O'qituvchilar</div>
                <div class="stat-sub">${activeTeachers} faol</div>
            </div>
        </div>

        <div class="stat-card animate-in" style="--delay:0.1s">
            <div class="stat-icon" style="background:rgba(16,185,129,0.15)">
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#10b981" stroke-width="2">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
                </svg>
            </div>
            <div class="stat-body">
                <div class="stat-value counter" data-target="${totalStudents}">${totalStudents}</div>
                <div class="stat-label">O'quvchilar</div>
                <div class="stat-sub">Jami ro'yxatda</div>
            </div>
        </div>

        <div class="stat-card animate-in" style="--delay:0.15s">
            <div class="stat-icon" style="background:rgba(139,92,246,0.15)">
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#8b5cf6" stroke-width="2">
                    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                </svg>
            </div>
            <div class="stat-body">
                <div class="stat-value counter" data-target="${totalClubs}">${totalClubs}</div>
                <div class="stat-label">To'garaklar</div>
                <div class="stat-sub">${data.clubs.filter(c=>c.teacherId).length} o'qituvchili</div>
            </div>
        </div>

        <div class="stat-card animate-in" style="--delay:0.2s">
            <div class="stat-icon" style="background:rgba(245,158,11,0.15)">
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#f59e0b" stroke-width="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                </svg>
            </div>
            <div class="stat-body">
                <div class="stat-value counter" data-target="${totalGroups}">${totalGroups}</div>
                <div class="stat-label">Guruhlar</div>
                <div class="stat-sub">O'rtacha: ${avgGroupSize} ta</div>
            </div>
        </div>

        <div class="stat-card animate-in" style="--delay:0.25s">
            <div class="stat-icon" style="background:rgba(6,182,212,0.15)">
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#06b6d4" stroke-width="2">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                </svg>
            </div>
            <div class="stat-body">
                <div class="stat-value counter" data-target="${totalLessons}">${totalLessons}</div>
                <div class="stat-label">Darslar</div>
                <div class="stat-sub">Jami o'tilgan</div>
            </div>
        </div>

        <div class="stat-card animate-in" style="--delay:0.3s">
            <div class="stat-icon" style="background:rgba(236,72,153,0.15)">
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#ec4899" stroke-width="2">
                    <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                </svg>
            </div>
            <div class="stat-body">
                <div class="stat-value counter" data-target="${totalAssignments}">${totalAssignments}</div>
                <div class="stat-label">Vazifalar</div>
                <div class="stat-sub">Berilgan topshiriqlar</div>
            </div>
        </div>

        <div class="stat-card animate-in" style="--delay:0.35s">
            <div class="stat-icon" style="background:rgba(239,68,68,0.15)">
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#ef4444" stroke-width="2">
                    <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 6v6l4 2"/>
                </svg>
            </div>
            <div class="stat-body">
                <div class="stat-value">${new Date().toLocaleTimeString("uz-UZ", {hour:"2-digit",minute:"2-digit"})}</div>
                <div class="stat-label">Hozirgi vaqt</div>
                <div class="stat-sub">${new Date().toLocaleDateString("uz-UZ", {weekday:"long"})}</div>
            </div>
        </div>

        <div class="stat-card animate-in" style="--delay:0.4s">
            <div class="stat-icon" style="background:rgba(16,185,129,0.15)">
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#10b981" stroke-width="2">
                    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
                </svg>
            </div>
            <div class="stat-body">
                <div class="stat-value">${totalStudents > 0 ? ((totalStudents / Math.max(totalClubs,1))).toFixed(1) : 0}</div>
                <div class="stat-label">Nisbat</div>
                <div class="stat-sub">O'quvchi / to'garak</div>
            </div>
        </div>
    `;

    // Inject stat card styles if not yet present
    if (!document.getElementById("stat-styles")) {
        const style = document.createElement("style");
        style.id = "stat-styles";
        style.textContent = `
            #overviewStats {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
                gap: 14px;
                margin-bottom: 28px;
            }
            .stat-card {
                background: linear-gradient(135deg, rgba(30,41,59,0.95), rgba(15,23,42,0.9));
                border: 1px solid rgba(148,163,184,0.1);
                border-radius: 14px;
                padding: 18px;
                display: flex;
                align-items: center;
                gap: 14px;
                transition: transform 0.2s, box-shadow 0.2s;
                animation: fadeSlideIn 0.4s ease forwards;
                opacity: 0;
                animation-delay: var(--delay, 0s);
            }
            .stat-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 24px rgba(0,0,0,0.3);
            }
            .stat-icon {
                width: 44px; height: 44px;
                border-radius: 10px;
                display: flex; align-items: center; justify-content: center;
                flex-shrink: 0;
            }
            .stat-body { flex: 1; min-width: 0; }
            .stat-value {
                font-size: 1.6rem;
                font-weight: 700;
                color: #f1f5f9;
                line-height: 1;
            }
            .stat-label {
                font-size: 0.75rem;
                color: #94a3b8;
                margin-top: 4px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .stat-sub {
                font-size: 0.68rem;
                color: #475569;
                margin-top: 2px;
            }
            @keyframes fadeSlideIn {
                from { opacity: 0; transform: translateY(10px); }
                to   { opacity: 1; transform: translateY(0); }
            }
            .charts-section {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
                gap: 18px;
                margin-bottom: 28px;
            }
            .chart-card {
                background: linear-gradient(135deg, rgba(30,41,59,0.95), rgba(15,23,42,0.9));
                border: 1px solid rgba(148,163,184,0.1);
                border-radius: 14px;
                padding: 20px;
            }
            .chart-card h3 {
                font-size: 0.85rem;
                font-weight: 600;
                color: #94a3b8;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                margin-bottom: 14px;
            }
            .chart-wrap { position: relative; height: 200px; }
            .kpi-row {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
                margin-bottom: 20px;
            }
            .kpi-badge {
                flex: 1;
                min-width: 120px;
                background: rgba(30,41,59,0.7);
                border: 1px solid rgba(148,163,184,0.1);
                border-radius: 10px;
                padding: 12px 14px;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .kpi-dot {
                width: 8px; height: 8px;
                border-radius: 50%;
                flex-shrink: 0;
            }
            .kpi-text { font-size: 0.78rem; color: #94a3b8; }
            .kpi-num { font-size: 1.2rem; font-weight: 700; color: #f1f5f9; }
            .teacher-table-wrap { overflow-x: auto; margin-bottom: 20px; }
            .teacher-table { width: 100%; font-size: 0.82rem; border-collapse: collapse; }
            .teacher-table th {
                text-align: left; padding: 8px 12px;
                color: #64748b; font-weight: 500;
                border-bottom: 1px solid rgba(148,163,184,0.1);
            }
            .teacher-table td {
                padding: 8px 12px; color: #cbd5e1;
                border-bottom: 1px solid rgba(148,163,184,0.06);
            }
            .teacher-table tr:hover td { background: rgba(148,163,184,0.04); }
            .progress-bar-bg {
                background: rgba(148,163,184,0.1);
                border-radius: 99px; height: 6px; flex: 1;
            }
            .progress-bar-fill {
                height: 6px; border-radius: 99px;
                transition: width 0.8s ease;
            }
            .tag-chip {
                display: inline-block;
                padding: 3px 8px;
                border-radius: 6px;
                font-size: 0.7rem;
                font-weight: 500;
            }
        `;
        document.head.appendChild(style);
    }
}

// ─── Render analytics section ──────────────────────────────────────────────────
async function renderAnalytics(data) {
    const analyticsEl = byId("analyticsSection");
    if (!analyticsEl) return;

    const stats = computeStats(data);
    const totalStudentsInGroups = data.groups.reduce((s, g) => s + g.studentIds.length, 0);
    const maxTeacherStudents = Math.max(...stats.teacherLoad.map(t => t.students), 1);

    analyticsEl.innerHTML = `
        <!-- KPI qatori -->
        <div class="kpi-row">
            <div class="kpi-badge">
                <div class="kpi-dot" style="background:#3b82f6"></div>
                <div><div class="kpi-num">${data.teachers.length}</div><div class="kpi-text">Jami o'qituvchi</div></div>
            </div>
            <div class="kpi-badge">
                <div class="kpi-dot" style="background:#10b981"></div>
                <div><div class="kpi-num">${data.students.length}</div><div class="kpi-text">Jami o'quvchi</div></div>
            </div>
            <div class="kpi-badge">
                <div class="kpi-dot" style="background:#f59e0b"></div>
                <div><div class="kpi-num">${totalStudentsInGroups}</div><div class="kpi-text">Guruhlarda</div></div>
            </div>
            <div class="kpi-badge">
                <div class="kpi-dot" style="background:#8b5cf6"></div>
                <div><div class="kpi-num">${data.students.length > 0 ? Math.round(totalStudentsInGroups / data.students.length * 100) : 0}%</div><div class="kpi-text">Qamrab olish</div></div>
            </div>
        </div>

        <!-- Grafiklar paneli -->
        <div class="charts-section">
            <div class="chart-card">
                <h3>📊 To'garak bo'yicha o'quvchilar</h3>
                <div class="chart-wrap"><canvas id="chartClubStudents"></canvas></div>
            </div>
            <div class="chart-card">
                <h3>🎂 Yosh taqsimoti</h3>
                <div class="chart-wrap"><canvas id="chartAge"></canvas></div>
            </div>
            <div class="chart-card">
                <h3>💡 Qiziqish sohalari</h3>
                <div class="chart-wrap"><canvas id="chartInterest"></canvas></div>
            </div>
            <div class="chart-card">
                <h3>📅 Oylik dars faolligi</h3>
                <div class="chart-wrap"><canvas id="chartActivity"></canvas></div>
            </div>
            <div class="chart-card">
                <h3>👩‍🏫 O'qituvchi yuki</h3>
                <div class="chart-wrap"><canvas id="chartTeacher"></canvas></div>
            </div>
            <div class="chart-card">
                <h3>🏫 Maktablar bo'yicha</h3>
                <div class="chart-wrap"><canvas id="chartSchool"></canvas></div>
            </div>
        </div>

        <!-- O'qituvchilar jadvali -->
        <div class="chart-card" style="margin-bottom:18px">
            <h3>👩‍🏫 O'qituvchilar ko'rsatkichlari</h3>
            <div class="teacher-table-wrap">
                <table class="teacher-table">
                    <thead>
                        <tr>
                            <th>Ism</th>
                            <th>Fan</th>
                            <th>Guruhlar</th>
                            <th>O'quvchilar</th>
                            <th>Yuklanish</th>
                            <th>Holat</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${stats.teacherLoad.map((t, i) => {
                            const pct = maxTeacherStudents > 0 ? Math.round(t.students / maxTeacherStudents * 100) : 0;
                            const teacher = data.teachers[i];
                            const colors = ["#3b82f6","#10b981","#8b5cf6","#f59e0b","#ef4444","#06b6d4"];
                            const color = colors[i % colors.length];
                            const status = t.groups > 0
                                ? `<span class="tag-chip" style="background:rgba(16,185,129,0.15);color:#10b981">Faol</span>`
                                : `<span class="tag-chip" style="background:rgba(148,163,184,0.1);color:#64748b">Biriktirilmagan</span>`;
                            return `
                                <tr>
                                    <td><strong style="color:#e2e8f0">${escapeHtml(t.name)}</strong></td>
                                    <td>${escapeHtml(teacher?.subject || "—")}</td>
                                    <td><span style="color:#f59e0b;font-weight:600">${t.groups}</span></td>
                                    <td><span style="color:#3b82f6;font-weight:600">${t.students}</span></td>
                                    <td>
                                        <div style="display:flex;align-items:center;gap:8px;min-width:100px">
                                            <div class="progress-bar-bg">
                                                <div class="progress-bar-fill" style="width:${pct}%;background:${color}"></div>
                                            </div>
                                            <span style="font-size:0.72rem;color:#94a3b8;white-space:nowrap">${pct}%</span>
                                        </div>
                                    </td>
                                    <td>${status}</td>
                                </tr>
                            `;
                        }).join("")}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- O'quvchilar ro'yxati -->
        <div class="chart-card">
            <h3>🎓 O'quvchilar holati</h3>
            <div class="teacher-table-wrap">
                <table class="teacher-table">
                    <thead>
                        <tr>
                            <th>Ism</th>
                            <th>Yosh</th>
                            <th>Maktab</th>
                            <th>Qiziqish</th>
                            <th>Guruh</th>
                            <th>Holat</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.students.map(s => {
                            const group = data.groups.find(g => g.studentIds.includes(s.id));
                            const club = group ? data.clubs.find(c => c.id === group?.clubId) : null;
                            const inGroup = group
                                ? `<span style="color:#10b981;font-size:0.75rem">${escapeHtml(group.name)}</span>`
                                : `<span style="color:#64748b;font-size:0.75rem">Yo'q</span>`;
                            const status = group
                                ? `<span class="tag-chip" style="background:rgba(16,185,129,0.15);color:#10b981">Faol</span>`
                                : `<span class="tag-chip" style="background:rgba(245,158,11,0.15);color:#f59e0b">Kutmoqda</span>`;
                            return `
                                <tr>
                                    <td><strong style="color:#e2e8f0">${escapeHtml(s.firstName + " " + s.lastName)}</strong></td>
                                    <td>${s.age ?? "—"}</td>
                                    <td>${escapeHtml(s.school || "—")}</td>
                                    <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(s.clubInterest)}</td>
                                    <td>${inGroup}</td>
                                    <td>${status}</td>
                                </tr>
                            `;
                        }).join("")}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // Render charts after DOM is updated
    setTimeout(() => renderCharts(data), 50);
}

// ─── Render functions ──────────────────────────────────────────────────────────
function renderTeachers(teachers) {
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

function renderStudents(students) {
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

function renderAdmins(admins) {
    byId("adminsTableBody").innerHTML = admins.map((admin) => `
        <tr class="border-t border-gray-800 hover:bg-gray-800/30 transition-colors">
            <td class="px-4 py-3 text-gray-500 text-sm">${admin.id}</td>
            <td class="px-4 py-3 text-white font-medium">${escapeHtml(admin.displayName)}</td>
            <td class="px-4 py-3 text-gray-400">${escapeHtml(admin.username)}</td>
            <td class="px-4 py-3 text-right">
                ${admin.id === 1
                    ? '<span class="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded-lg">Asosiy admin</span>'
                    : `<button data-delete-admin="${admin.id}" class="px-3 py-1.5 bg-red-600/20 text-red-400 rounded-lg text-sm hover:bg-red-600/30 transition-colors">O'chirish</button>`}
            </td>
        </tr>
    `).join("");
}

function renderClubs(clubs) {
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

function renderGroups(groups) {
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

async function refreshDashboard() {
    const data = await getAdminDashboardData();
    renderAdmins(data.admins);
    renderTeachers(data.teachers);
    renderStudents(data.students);
    renderClubs(data.clubs);
    renderGroups(data.groups);

    const teacherOptions = [
        '<option value="">Tanlang</option>',
        ...data.teachers.map((teacher) => `<option value="${teacher.id}">${escapeHtml(`${teacher.firstName} ${teacher.lastName}`)}</option>`)
    ];
    byId("c_teacher").innerHTML = teacherOptions.join("");
    byId("g_teacher").innerHTML = teacherOptions.join("");
    byId("g_club").innerHTML = [
        '<option value="">Tanlang</option>',
        ...data.clubs.map((club) => `<option value="${club.id}">${escapeHtml(club.title)}</option>`)
    ].join("");
    byId("modalStudentSelect").innerHTML = [
        '<option value="">Tanlang</option>',
        ...data.students.map((student) => `<option value="${student.id}">${escapeHtml(`${student.firstName} ${student.lastName}`)}</option>`)
    ].join("");

    renderOverviewStats(data);
    await renderAnalytics(data);
}

function openDashboard() {
    setVisible(byId("loginSection"), false);
    setVisible(byId("dashboardSection"), true);
}

function resetTeacherForm() {
    editingTeacherId = null;
    byId("teacherForm").reset();
    byId("teacherModalTitle").textContent = "Yangi o'qituvchi";
}
function resetStudentForm() {
    editingStudentId = null;
    byId("studentForm").reset();
    byId("studentModalTitle").textContent = "O'quvchini tahrirlash";
}
function resetClubForm() {
    editingClubId = null;
    byId("clubForm").reset();
    byId("clubModalTitle").textContent = "Yangi to'garak";
}

// ─── Inject analytics section into DOM ───────────────────────────────────────
function injectAnalyticsSection() {
    const overviewStats = byId("overviewStats");
    if (!overviewStats || document.getElementById("analyticsSection")) return;
    const section = document.createElement("div");
    section.id = "analyticsSection";
    overviewStats.insertAdjacentElement("afterend", section);
}

async function bootstrap() {
    const session = getSession();
    if (session?.role === "admin") {
        byId("adminDisplayName").textContent = session.displayName;
        openDashboard();
        injectAnalyticsSection();
        await refreshDashboard();
    }

    byId("loginForm").addEventListener("submit", async (event) => {
        event.preventDefault();
        const result = await login(byId("username").value.trim(), byId("password").value.trim(), "admin");
        if (!result) {
            showMessage(byId("loginError"), "Login yoki parol noto'g'ri.", "error");
            return;
        }
        setSession(result);
        byId("adminDisplayName").textContent = result.displayName;
        openDashboard();
        injectAnalyticsSection();
        await refreshDashboard();
    });

    byId("logoutBtn").addEventListener("click", () => {
        clearSession();
        window.location.reload();
    });

    // Tab navigation
    document.querySelectorAll("[data-tab]").forEach((button) => {
        button.addEventListener("click", () => {
            const tab = button.dataset.tab;
            document.querySelectorAll(".view-panel").forEach((panel) => panel.classList.add("hidden"));
            document.querySelectorAll("[data-tab]").forEach((item) => item.classList.remove("active-tab"));
            button.classList.add("active-tab");
            if (tab) {
                byId(`view-${tab}`).classList.remove("hidden");
                byId("pageTitle").textContent = button.dataset.title ?? "Dashboard";
            }
        });
    });

    byId("openAdminModalBtn").addEventListener("click", () => openModal("adminModal"));
    byId("closeAdminModal").addEventListener("click", () => closeModal("adminModal"));
    byId("adminForm").addEventListener("submit", async (event) => {
        event.preventDefault();
        const result = await createAdmin(byId("a_username").value.trim(), byId("a_password").value.trim(), byId("a_display_name").value.trim());
        if (result.ok) {
            byId("adminForm").reset();
            closeModal("adminModal");
            await refreshDashboard();
            showMessage(byId("overviewMessage"), result.message, "success");
        } else {
            showMessage(byId("adminModalError"), result.message, "error");
        }
    });

    byId("openTeacherModalBtn").addEventListener("click", () => { resetTeacherForm(); openModal("teacherModal"); });
    byId("closeTeacherModal").addEventListener("click", () => { resetTeacherForm(); closeModal("teacherModal"); });
    byId("teacherForm").addEventListener("submit", async (event) => {
        event.preventDefault();
        const result = await upsertTeacher({
            id: editingTeacherId ?? undefined,
            firstName: byId("t_first_name").value.trim(),
            lastName: byId("t_last_name").value.trim(),
            phone: byId("t_phone").value.trim(),
            subject: byId("t_subject").value.trim(),
            username: byId("t_username").value.trim(),
            password: byId("t_password").value.trim()
        });
        if (result.ok) {
            resetTeacherForm();
            closeModal("teacherModal");
            await refreshDashboard();
        } else {
            showMessage(byId("teacherModalError"), result.message, "error");
        }
    });

    byId("closeStudentModal").addEventListener("click", () => { resetStudentForm(); closeModal("studentModal"); });
    byId("studentForm").addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!editingStudentId) return;
        const result = await updateStudent(editingStudentId, {
            firstName: byId("s_first_name").value.trim(),
            lastName: byId("s_last_name").value.trim(),
            age: Number(byId("s_age").value) || undefined,
            phone: byId("s_phone").value.trim(),
            school: byId("s_school").value.trim(),
            clubInterest: byId("s_interest").value.trim(),
            username: byId("s_username").value.trim(),
            password: byId("s_password").value.trim()
        });
        if (result.ok) {
            resetStudentForm();
            closeModal("studentModal");
            await refreshDashboard();
        } else {
            showMessage(byId("studentModalError"), result.message, "error");
        }
    });

    byId("openClubModalBtn").addEventListener("click", () => { resetClubForm(); openModal("clubModal"); });
    byId("closeClubModal").addEventListener("click", () => { resetClubForm(); closeModal("clubModal"); });
    byId("clubForm").addEventListener("submit", async (event) => {
        event.preventDefault();
        const file = byId("c_image").files?.[0];
        let imagePath = byId("c_existing_image").value.trim();
        if (file) imagePath = await readFileAsDataUrl(file);
        await upsertClub({
            id: editingClubId ?? undefined,
            title: byId("c_title").value.trim(),
            paragraph: byId("c_paragraph").value.trim(),
            description: byId("c_description").value.trim(),
            teacherId: Number(byId("c_teacher").value) || null,
            imagePath
        });
        resetClubForm();
        closeModal("clubModal");
        await refreshDashboard();
    });

    byId("openGroupModalBtn").addEventListener("click", () => openModal("groupModal"));
    byId("closeGroupModal").addEventListener("click", () => closeModal("groupModal"));
    byId("groupForm").addEventListener("submit", async (event) => {
        event.preventDefault();
        await upsertGroup({
            name: byId("g_name").value.trim(),
            clubId: Number(byId("g_club").value),
            teacherId: Number(byId("g_teacher").value) || null,
            schedule: byId("g_schedule").value.trim()
        });
        byId("groupForm").reset();
        closeModal("groupModal");
        await refreshDashboard();
    });

    byId("resetSeedBtn").addEventListener("click", async () => {
        if (!confirm("Barcha ma'lumotlar boshlang'ich holatga qaytariladi. Davom etasizmi?")) return;
        await resetStore();
        await refreshDashboard();
        showMessage(byId("overviewMessage"), "Seed ma'lumotlar qayta yuklandi.", "success");
    });

    byId("closeStudentGroupModal").addEventListener("click", () => closeModal("studentGroupModal"));
    byId("assignStudentBtn").addEventListener("click", async () => {
        const groupId = Number(byId("modalGroupId").value);
        const studentId = Number(byId("modalStudentSelect").value);
        if (!groupId || !studentId) return;
        const result = await assignStudentToGroup(groupId, studentId);
        closeModal("studentGroupModal");
        await refreshDashboard();
        showMessage(byId("overviewMessage"), result.message, "success");
    });

    document.addEventListener("click", async (event) => {
        const target = event.target;
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
            byId("t_first_name").value = teacher.firstName;
            byId("t_last_name").value = teacher.lastName;
            byId("t_phone").value = teacher.phone;
            byId("t_subject").value = teacher.subject;
            byId("t_username").value = teacher.username;
            byId("t_password").value = teacher.password;
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
            byId("s_first_name").value = student.firstName;
            byId("s_last_name").value = student.lastName;
            byId("s_age").value = String(student.age ?? "");
            byId("s_phone").value = student.phone;
            byId("s_school").value = student.school ?? "";
            byId("s_interest").value = student.clubInterest;
            byId("s_username").value = student.username;
            byId("s_password").value = student.password;
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
            byId("c_title").value = club.title;
            byId("c_paragraph").value = club.paragraph;
            byId("c_description").value = club.description;
            byId("c_teacher").value = String(club.teacherId ?? "");
            byId("c_existing_image").value = club.imagePath;
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
            byId("modalGroupId").value = target.dataset.assignGroup;
            openModal("studentGroupModal");
        }
    });

    await initWeatherBg();
}

void bootstrap();

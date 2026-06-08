import { readFileAsDataUrl } from "../core/files.js";
import { clearSession, getSession, setSession } from "../core/session.js";
import {
    createAssignment, createLesson, findAssignmentSubmissions,
    findLessonAssignments, getTeacherWorkspace, login
} from "../core/store.js";
import { byId, escapeHtml, formatDate, setVisible, showMessage, youtubeEmbed } from "../core/utils.js";
import { initWeatherBg } from "../shared/weather-bg.js";

let currentTeacherId = 0;
let currentGroupId = 0;
let currentGroupName = "";
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

function destroyChart(key) {
    if (chartInstances[key]) {
        chartInstances[key].destroy();
        delete chartInstances[key];
    }
}

// ─── Teacher Statistics ────────────────────────────────────────────────────────
function computeTeacherStats(workspace) {
    const { teacher, groups, lessons, assignments, submissions, students } = workspace;

    // My lessons (only for my groups)
    const myGroupIds = new Set(groups.map(g => g.id));
    const myLessons = lessons.filter(l => myGroupIds.has(l.groupId));
    const myLessonIds = new Set(myLessons.map(l => l.id));
    const myAssignments = assignments.filter(a => myLessonIds.has(a.lessonId));
    const myAssignmentIds = new Set(myAssignments.map(a => a.id));
    const mySubmissions = submissions.filter(s => myAssignmentIds.has(s.assignmentId));

    // Students in my groups
    const myStudentIds = new Set(groups.flatMap(g => g.studentIds));
    const myStudents = students.filter(s => myStudentIds.has(s.id));

    // Submission rate per assignment
    const assignmentStats = myAssignments.map(a => {
        const totalStudents = groups.find(g =>
            myLessons.find(l => l.id === a.lessonId)?.groupId === g.id
        )?.studentIds.length ?? 0;
        const submitted = mySubmissions.filter(s => s.assignmentId === a.id).length;
        return {
            title: a.title,
            total: totalStudents,
            submitted,
            rate: totalStudents > 0 ? Math.round(submitted / totalStudents * 100) : 0,
            deadline: a.deadline
        };
    });

    // Lessons per group
    const lessonsPerGroup = groups.map(g => ({
        name: g.name,
        clubName: g.clubName,
        lessons: myLessons.filter(l => l.groupId === g.id).length,
        students: g.studentIds.length
    }));

    // Monthly lesson trend (last 6 months)
    const now = new Date();
    const monthlyLessons = Array(6).fill(0).map((_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
        return {
            label: d.toLocaleDateString("uz-UZ", { month: "short" }),
            count: myLessons.filter(l => {
                const ld = new Date(l.createdAt);
                return ld.getMonth() === d.getMonth() && ld.getFullYear() === d.getFullYear();
            }).length
        };
    });

    // Submission trend
    const monthlySubmissions = Array(6).fill(0).map((_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
        return {
            label: d.toLocaleDateString("uz-UZ", { month: "short" }),
            count: mySubmissions.filter(s => {
                const sd = new Date(s.submittedAt);
                return sd.getMonth() === d.getMonth() && sd.getFullYear() === d.getFullYear();
            }).length
        };
    });

    // Upcoming deadlines
    const upcomingDeadlines = myAssignments
        .filter(a => a.deadline && new Date(a.deadline) > now)
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
        .slice(0, 5);

    return {
        totalGroups: groups.length,
        totalLessons: myLessons.length,
        totalStudents: myStudents.length,
        totalAssignments: myAssignments.length,
        totalSubmissions: mySubmissions.length,
        avgSubmissionRate: myAssignments.length > 0
            ? Math.round(assignmentStats.reduce((s, a) => s + a.rate, 0) / myAssignments.length)
            : 0,
        assignmentStats,
        lessonsPerGroup,
        monthlyLessons,
        monthlySubmissions,
        upcomingDeadlines,
        myStudents
    };
}

// ─── Render teacher overview stats ────────────────────────────────────────────
function renderTeacherOverviewStats(workspace, stats) {
    const el = document.getElementById("teacherOverviewStats");
    if (!el) return;

    const now = new Date();
    const upcomingCount = stats.upcomingDeadlines.length;
    const overdueCount = workspace.assignments
        ? workspace.assignments.filter(a => a.deadline && new Date(a.deadline) < now).length
        : 0;

    el.innerHTML = `
        <div class="t-stat-card" style="--c:#3b82f6">
            <div class="t-stat-icon" style="background:rgba(59,130,246,0.12)">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#3b82f6" stroke-width="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
            </div>
            <div>
                <div class="t-stat-val">${stats.totalStudents}</div>
                <div class="t-stat-lbl">O'quvchilarim</div>
                <div class="t-stat-sub">${stats.totalGroups} guruhda</div>
            </div>
        </div>

        <div class="t-stat-card" style="--c:#10b981">
            <div class="t-stat-icon" style="background:rgba(16,185,129,0.12)">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#10b981" stroke-width="2">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                </svg>
            </div>
            <div>
                <div class="t-stat-val">${stats.totalLessons}</div>
                <div class="t-stat-lbl">Darslarim</div>
                <div class="t-stat-sub">O'tilgan darslar</div>
            </div>
        </div>

        <div class="t-stat-card" style="--c:#8b5cf6">
            <div class="t-stat-icon" style="background:rgba(139,92,246,0.12)">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#8b5cf6" stroke-width="2">
                    <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                </svg>
            </div>
            <div>
                <div class="t-stat-val">${stats.totalAssignments}</div>
                <div class="t-stat-lbl">Vazifalar</div>
                <div class="t-stat-sub">${stats.totalSubmissions} javob keldi</div>
            </div>
        </div>

        <div class="t-stat-card" style="--c:#f59e0b">
            <div class="t-stat-icon" style="background:rgba(245,158,11,0.12)">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#f59e0b" stroke-width="2">
                    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
                </svg>
            </div>
            <div>
                <div class="t-stat-val">${stats.avgSubmissionRate}%</div>
                <div class="t-stat-lbl">Topshirish darajasi</div>
                <div class="t-stat-sub">O'rtacha ko'rsatkich</div>
            </div>
        </div>

        <div class="t-stat-card" style="--c:#ef4444">
            <div class="t-stat-icon" style="background:rgba(239,68,68,0.12)">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#ef4444" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
            </div>
            <div>
                <div class="t-stat-val">${upcomingCount}</div>
                <div class="t-stat-lbl">Kelayotgan deadline</div>
                <div class="t-stat-sub">${overdueCount} muddati o'tgan</div>
            </div>
        </div>

        <div class="t-stat-card" style="--c:#06b6d4">
            <div class="t-stat-icon" style="background:rgba(6,182,212,0.12)">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#06b6d4" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
            </div>
            <div>
                <div class="t-stat-val">${new Date().toLocaleDateString("uz-UZ", {day:"2-digit",month:"short"})}</div>
                <div class="t-stat-lbl">Bugungi sana</div>
                <div class="t-stat-sub">${new Date().toLocaleTimeString("uz-UZ",{hour:"2-digit",minute:"2-digit"})}</div>
            </div>
        </div>
    `;

    // Inject teacher stat styles
    if (!document.getElementById("t-stat-styles")) {
        const style = document.createElement("style");
        style.id = "t-stat-styles";
        style.textContent = `
            #teacherOverviewStats {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
                gap: 12px;
                margin-bottom: 24px;
            }
            .t-stat-card {
                background: linear-gradient(135deg, rgba(30,41,59,0.95), rgba(15,23,42,0.9));
                border: 1px solid rgba(148,163,184,0.1);
                border-radius: 14px;
                padding: 16px;
                display: flex;
                align-items: center;
                gap: 12px;
                transition: transform 0.2s, box-shadow 0.2s;
                border-left: 3px solid var(--c);
            }
            .t-stat-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(0,0,0,0.25);
            }
            .t-stat-icon {
                width: 40px; height: 40px;
                border-radius: 10px;
                display: flex; align-items: center; justify-content: center;
                flex-shrink: 0;
            }
            .t-stat-val { font-size: 1.5rem; font-weight: 700; color: #f1f5f9; line-height: 1; }
            .t-stat-lbl { font-size: 0.72rem; color: #94a3b8; margin-top: 3px; }
            .t-stat-sub { font-size: 0.67rem; color: #475569; margin-top: 2px; }

            #teacherAnalyticsSection {
                margin-top: 24px;
            }
            .t-charts-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
                gap: 16px;
                margin-bottom: 20px;
            }
            .t-chart-card {
                background: linear-gradient(135deg, rgba(30,41,59,0.95), rgba(15,23,42,0.9));
                border: 1px solid rgba(148,163,184,0.1);
                border-radius: 14px;
                padding: 18px;
            }
            .t-chart-card h3 {
                font-size: 0.8rem;
                font-weight: 600;
                color: #94a3b8;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                margin-bottom: 12px;
            }
            .t-chart-wrap { position: relative; height: 190px; }
            .t-section-title {
                font-size: 0.85rem;
                font-weight: 600;
                color: #94a3b8;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                margin: 20px 0 10px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .t-table { width: 100%; font-size: 0.81rem; border-collapse: collapse; }
            .t-table th {
                text-align: left; padding: 8px 12px;
                color: #64748b; font-weight: 500;
                border-bottom: 1px solid rgba(148,163,184,0.1);
            }
            .t-table td {
                padding: 8px 12px; color: #cbd5e1;
                border-bottom: 1px solid rgba(148,163,184,0.06);
            }
            .t-table tr:hover td { background: rgba(148,163,184,0.04); }
            .t-progress-bg { background: rgba(148,163,184,0.1); border-radius: 99px; height: 5px; flex: 1; min-width: 60px; }
            .t-progress-fill { height: 5px; border-radius: 99px; transition: width 0.8s ease; }
            .t-badge {
                display: inline-block;
                padding: 2px 8px;
                border-radius: 5px;
                font-size: 0.69rem;
                font-weight: 500;
            }
            .deadline-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 10px 14px;
                border-radius: 10px;
                background: rgba(30,41,59,0.6);
                border: 1px solid rgba(148,163,184,0.08);
                margin-bottom: 8px;
            }
            .deadline-item:last-child { margin-bottom: 0; }
            .group-card-stat {
                background: rgba(30,41,59,0.6);
                border: 1px solid rgba(148,163,184,0.08);
                border-radius: 12px;
                padding: 14px;
                margin-bottom: 10px;
                display: flex;
                align-items: center;
                gap: 14px;
            }
        `;
        document.head.appendChild(style);
    }
}

// ─── Render teacher analytics charts ─────────────────────────────────────────
async function renderTeacherCharts(stats) {
    const Chart = await loadChartJs();
    const GRID = "rgba(148,163,184,0.07)";
    const opts = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { labels: { color: "#94a3b8", font: { size: 11 } } }
        }
    };

    // 1. Oylik darslar + topshiriqlar
    destroyChart("tActivityChart");
    const ctx1 = document.getElementById("tChartActivity");
    if (ctx1) {
        chartInstances["tActivityChart"] = new Chart(ctx1.getContext("2d"), {
            type: "line",
            data: {
                labels: stats.monthlyLessons.map(m => m.label),
                datasets: [
                    {
                        label: "Darslar",
                        data: stats.monthlyLessons.map(m => m.count),
                        borderColor: "#3b82f6",
                        backgroundColor: "rgba(59,130,246,0.1)",
                        fill: true, tension: 0.4, borderWidth: 2.5,
                        pointBackgroundColor: "#3b82f6", pointRadius: 4, pointHoverRadius: 7
                    },
                    {
                        label: "Javoblar",
                        data: stats.monthlySubmissions.map(m => m.count),
                        borderColor: "#10b981",
                        backgroundColor: "rgba(16,185,129,0.1)",
                        fill: true, tension: 0.4, borderWidth: 2.5,
                        pointBackgroundColor: "#10b981", pointRadius: 4, pointHoverRadius: 7
                    }
                ]
            },
            options: {
                ...opts,
                scales: {
                    x: { ticks: { color: "#94a3b8" }, grid: { color: GRID } },
                    y: { ticks: { color: "#94a3b8", stepSize: 1 }, grid: { color: GRID }, beginAtZero: true }
                }
            }
        });
    }

    // 2. Guruhlar bo'yicha darslar (Bar)
    destroyChart("tGroupChart");
    const ctx2 = document.getElementById("tChartGroups");
    if (ctx2 && stats.lessonsPerGroup.length > 0) {
        const COLORS = ["#3b82f6","#8b5cf6","#10b981","#f59e0b","#ef4444","#06b6d4"];
        chartInstances["tGroupChart"] = new Chart(ctx2.getContext("2d"), {
            type: "bar",
            data: {
                labels: stats.lessonsPerGroup.map(g => g.name),
                datasets: [
                    {
                        label: "Darslar",
                        data: stats.lessonsPerGroup.map(g => g.lessons),
                        backgroundColor: COLORS.map(c => c + "cc"),
                        borderColor: COLORS,
                        borderWidth: 2, borderRadius: 7
                    },
                    {
                        label: "O'quvchilar",
                        data: stats.lessonsPerGroup.map(g => g.students),
                        backgroundColor: COLORS.map(c => c + "55"),
                        borderColor: COLORS.map(c => c + "88"),
                        borderWidth: 2, borderRadius: 7
                    }
                ]
            },
            options: {
                ...opts,
                scales: {
                    x: { ticks: { color: "#94a3b8" }, grid: { color: GRID } },
                    y: { ticks: { color: "#94a3b8", stepSize: 1 }, grid: { color: GRID }, beginAtZero: true }
                }
            }
        });
    }

    // 3. Vazifa topshirish nisbati (Horizontal bar)
    destroyChart("tAssignChart");
    const ctx3 = document.getElementById("tChartAssignments");
    if (ctx3 && stats.assignmentStats.length > 0) {
        chartInstances["tAssignChart"] = new Chart(ctx3.getContext("2d"), {
            type: "bar",
            data: {
                labels: stats.assignmentStats.map(a => a.title.slice(0, 20) + (a.title.length > 20 ? "…" : "")),
                datasets: [{
                    label: "Topshirish %",
                    data: stats.assignmentStats.map(a => a.rate),
                    backgroundColor: stats.assignmentStats.map(a =>
                        a.rate >= 80 ? "rgba(16,185,129,0.7)"
                        : a.rate >= 50 ? "rgba(245,158,11,0.7)"
                        : "rgba(239,68,68,0.7)"
                    ),
                    borderColor: stats.assignmentStats.map(a =>
                        a.rate >= 80 ? "#10b981" : a.rate >= 50 ? "#f59e0b" : "#ef4444"
                    ),
                    borderWidth: 2, borderRadius: 6
                }]
            },
            options: {
                ...opts,
                indexAxis: "y",
                scales: {
                    x: { ticks: { color: "#94a3b8" }, grid: { color: GRID }, max: 100, beginAtZero: true },
                    y: { ticks: { color: "#94a3b8", font: { size: 10 } }, grid: { color: GRID } }
                }
            }
        });
    }
}

// ─── Render full teacher analytics section ────────────────────────────────────
async function renderTeacherAnalytics(workspace) {
    let el = document.getElementById("teacherAnalyticsSection");
    if (!el) {
        el = document.createElement("div");
        el.id = "teacherAnalyticsSection";
        const container = document.getElementById("groupsContainer");
        if (container) container.insertAdjacentElement("beforebegin", el);
        else document.body.appendChild(el);
    }

    const stats = computeTeacherStats(workspace);
    renderTeacherOverviewStats(workspace, stats);

    const now = new Date();

    el.innerHTML = `
        <!-- Charts grid -->
        <div class="t-charts-grid">
            <div class="t-chart-card">
                <h3>📈 Oylik faollik</h3>
                <div class="t-chart-wrap"><canvas id="tChartActivity"></canvas></div>
            </div>
            <div class="t-chart-card">
                <h3>🏫 Guruhlar ko'rsatkichi</h3>
                <div class="t-chart-wrap"><canvas id="tChartGroups"></canvas></div>
            </div>
            <div class="t-chart-card">
                <h3>📋 Vazifa topshirish darajasi</h3>
                <div class="t-chart-wrap"><canvas id="tChartAssignments"></canvas></div>
            </div>
        </div>

        <!-- Guruhlar detail -->
        <div class="t-section-title">🏫 Guruhlarim statistikasi</div>
        ${stats.lessonsPerGroup.map((g, i) => {
            const colors = ["#3b82f6","#10b981","#8b5cf6","#f59e0b","#ef4444","#06b6d4"];
            const color = colors[i % colors.length];
            const maxLessons = Math.max(...stats.lessonsPerGroup.map(x => x.lessons), 1);
            const pct = Math.round(g.lessons / maxLessons * 100);
            return `
                <div class="group-card-stat">
                    <div style="width:4px;height:44px;border-radius:2px;background:${color};flex-shrink:0"></div>
                    <div style="flex:1">
                        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
                            <div>
                                <div style="color:#e2e8f0;font-weight:600;font-size:0.9rem">${escapeHtml(g.name)}</div>
                                <div style="color:#64748b;font-size:0.72rem">${escapeHtml(g.clubName)}</div>
                            </div>
                            <div style="text-align:right">
                                <span style="color:${color};font-weight:700;font-size:1.1rem">${g.lessons}</span>
                                <span style="color:#64748b;font-size:0.72rem"> dars</span>
                                <span style="margin-left:8px;color:#3b82f6;font-weight:600">${g.students}</span>
                                <span style="color:#64748b;font-size:0.72rem"> o'quvchi</span>
                            </div>
                        </div>
                        <div style="display:flex;align-items:center;gap:8px">
                            <div class="t-progress-bg">
                                <div class="t-progress-fill" style="width:${pct}%;background:${color}"></div>
                            </div>
                            <span style="font-size:0.7rem;color:#64748b;white-space:nowrap">${pct}%</span>
                        </div>
                    </div>
                </div>
            `;
        }).join("")}

        <!-- Upcoming deadlines -->
        ${stats.upcomingDeadlines.length > 0 ? `
            <div class="t-section-title">⏰ Kelayotgan deadlinelar</div>
            ${stats.upcomingDeadlines.map(a => {
                const dl = new Date(a.deadline);
                const daysLeft = Math.ceil((dl - now) / (1000 * 60 * 60 * 24));
                const urgColor = daysLeft <= 1 ? "#ef4444" : daysLeft <= 3 ? "#f59e0b" : "#10b981";
                return `
                    <div class="deadline-item">
                        <div>
                            <div style="color:#e2e8f0;font-weight:500;font-size:0.85rem">${escapeHtml(a.title)}</div>
                            <div style="color:#64748b;font-size:0.72rem;margin-top:2px">
                                ${dl.toLocaleDateString("uz-UZ", {day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}
                            </div>
                        </div>
                        <span class="t-badge" style="background:${urgColor}22;color:${urgColor}">
                            ${daysLeft === 0 ? "Bugun!" : daysLeft === 1 ? "Ertaga" : `${daysLeft} kun`}
                        </span>
                    </div>
                `;
            }).join("")}
        ` : ""}

        <!-- O'quvchilar jadvali -->
        <div class="t-section-title">🎓 O'quvchilarim</div>
        <div class="t-chart-card">
            <div style="overflow-x:auto">
                <table class="t-table">
                    <thead>
                        <tr>
                            <th>Ism</th>
                            <th>Guruh</th>
                            <th>Yoshi</th>
                            <th>Maktab</th>
                            <th>Javoblar</th>
                            <th>Faollik</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${stats.myStudents.map(s => {
                            const group = workspace.groups.find(g => g.studentIds.includes(s.id));
                            const myGroupLessonIds = new Set(
                                workspace.lessons
                                    .filter(l => l.groupId === group?.id)
                                    .map(l => l.id)
                            );
                            const myGroupAssignIds = new Set(
                                workspace.assignments
                                    .filter(a => myGroupLessonIds.has(a.lessonId))
                                    .map(a => a.id)
                            );
                            const studentSubmissions = workspace.submissions.filter(
                                sub => sub.studentId === s.id && myGroupAssignIds.has(sub.assignmentId)
                            ).length;
                            const totalAsgn = myGroupAssignIds.size;
                            const rate = totalAsgn > 0 ? Math.round(studentSubmissions / totalAsgn * 100) : 0;
                            const rateColor = rate >= 80 ? "#10b981" : rate >= 50 ? "#f59e0b" : "#94a3b8";
                            return `
                                <tr>
                                    <td><strong style="color:#e2e8f0">${escapeHtml(s.firstName + " " + s.lastName)}</strong></td>
                                    <td style="color:#8b5cf6;font-size:0.78rem">${escapeHtml(group?.name || "—")}</td>
                                    <td>${s.age ?? "—"}</td>
                                    <td style="color:#94a3b8;font-size:0.78rem">${escapeHtml(s.school || "—")}</td>
                                    <td><span style="color:#3b82f6;font-weight:600">${studentSubmissions}</span><span style="color:#475569">/${totalAsgn}</span></td>
                                    <td>
                                        <div style="display:flex;align-items:center;gap:6px">
                                            <div class="t-progress-bg" style="min-width:60px">
                                                <div class="t-progress-fill" style="width:${rate}%;background:${rateColor}"></div>
                                            </div>
                                            <span style="font-size:0.7rem;color:${rateColor};white-space:nowrap">${rate}%</span>
                                        </div>
                                    </td>
                                </tr>
                            `;
                        }).join("")}
                        ${stats.myStudents.length === 0 ? `
                            <tr><td colspan="6" style="text-align:center;color:#475569;padding:24px">Hali o'quvchi biriktirilmagan</td></tr>
                        ` : ""}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Vazifalar jadvali -->
        ${stats.assignmentStats.length > 0 ? `
            <div class="t-section-title">📝 Vazifalar holati</div>
            <div class="t-chart-card">
                <div style="overflow-x:auto">
                    <table class="t-table">
                        <thead>
                            <tr>
                                <th>Vazifa</th>
                                <th>Deadline</th>
                                <th>Javoblar</th>
                                <th>Topshirish %</th>
                                <th>Holat</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${stats.assignmentStats.map(a => {
                                const dl = a.deadline ? new Date(a.deadline) : null;
                                const isOverdue = dl && dl < now;
                                const statusBadge = isOverdue
                                    ? `<span class="t-badge" style="background:rgba(239,68,68,0.15);color:#ef4444">Muddati o'tdi</span>`
                                    : `<span class="t-badge" style="background:rgba(16,185,129,0.15);color:#10b981">Faol</span>`;
                                const rateColor = a.rate >= 80 ? "#10b981" : a.rate >= 50 ? "#f59e0b" : "#ef4444";
                                return `
                                    <tr>
                                        <td><strong style="color:#e2e8f0">${escapeHtml(a.title)}</strong></td>
                                        <td style="font-size:0.78rem;color:${isOverdue ? "#ef4444" : "#94a3b8"}">
                                            ${dl ? dl.toLocaleDateString("uz-UZ",{day:"2-digit",month:"short"}) : "—"}
                                        </td>
                                        <td><span style="color:#3b82f6;font-weight:600">${a.submitted}</span><span style="color:#475569">/${a.total}</span></td>
                                        <td>
                                            <div style="display:flex;align-items:center;gap:6px">
                                                <div class="t-progress-bg">
                                                    <div class="t-progress-fill" style="width:${a.rate}%;background:${rateColor}"></div>
                                                </div>
                                                <span style="font-size:0.72rem;color:${rateColor};white-space:nowrap">${a.rate}%</span>
                                            </div>
                                        </td>
                                        <td>${statusBadge}</td>
                                    </tr>
                                `;
                            }).join("")}
                        </tbody>
                    </table>
                </div>
            </div>
        ` : ""}
    `;

    // Inject stats bar above the analytics
    let statsBar = document.getElementById("teacherOverviewStats");
    if (!statsBar) {
        statsBar = document.createElement("div");
        statsBar.id = "teacherOverviewStats";
        el.insertAdjacentElement("beforebegin", statsBar);
    }
    renderTeacherOverviewStats(workspace, stats);

    // Render charts after DOM settles
    setTimeout(() => renderTeacherCharts(stats), 60);
}

// ─── Render groups ─────────────────────────────────────────────────────────────
async function renderGroups() {
    const workspace = await getTeacherWorkspace(currentTeacherId);
    const container = byId("groupsContainer");

    // Render analytics first
    await renderTeacherAnalytics(workspace);

    if (!workspace.groups.length) {
        container.innerHTML = `<div class="glass rounded-2xl border border-slate-700/50 p-8 text-center"><p class="text-slate-400">Sizga hali guruh biriktirilmagan.</p></div>`;
        return;
    }
    container.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">${workspace.groups.map((group) => `
            <article class="glass p-6 rounded-2xl border border-slate-700/50">
                <div class="text-sm text-blue-400 mb-2">${escapeHtml(group.clubName)}</div>
                <h3 class="text-xl font-bold text-white mb-2">${escapeHtml(group.name)}</h3>
                <p class="text-sm text-slate-400 mb-3">${escapeHtml(group.schedule)}</p>
                <div class="flex items-center gap-4 mb-5 text-sm">
                    <span style="color:#10b981">${workspace.lessons.filter(l => l.groupId === group.id).length} dars</span>
                    <span style="color:#8b5cf6">${group.studentIds.length} o'quvchi</span>
                </div>
                <button data-open-group="${group.id}" data-group-name="${escapeHtml(group.name)}" class="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-3 rounded-xl transition-colors">Darslarni ko'rish</button>
            </article>
        `).join("")}</div>`;
}

// ─── Render lessons ────────────────────────────────────────────────────────────
async function renderLessons(groupId, groupName) {
    currentGroupId = groupId;
    currentGroupName = groupName;
    const workspace = await getTeacherWorkspace(currentTeacherId);
    const lessons = workspace.lessons.filter((lesson) => lesson.groupId === groupId);
    const list = byId("lessonsList");
    byId("pageTitle").textContent = groupName;
    byId("currentGroupTitle").textContent = `${groupName} darslari`;

    // Stats for this specific group
    const groupStudents = workspace.groups.find(g => g.id === groupId)?.studentIds ?? [];
    const myLessonIds = new Set(lessons.map(l => l.id));
    const myAssignments = workspace.assignments.filter(a => myLessonIds.has(a.lessonId));
    const myAssignIds = new Set(myAssignments.map(a => a.id));
    const mySubmissions = workspace.submissions.filter(s => myAssignIds.has(s.assignmentId));

    // Mini stats bar for the group
    const miniStats = document.getElementById("groupMiniStats");
    if (miniStats) {
        const submRate = myAssignments.length > 0
            ? Math.round(
                myAssignments.reduce((sum, a) => {
                    const subs = mySubmissions.filter(s => s.assignmentId === a.id).length;
                    return sum + (groupStudents.length > 0 ? subs / groupStudents.length * 100 : 0);
                }, 0) / myAssignments.length
            )
            : 0;
        miniStats.innerHTML = `
            <div class="mini-stat-row">
                <div class="mini-stat"><span class="mini-val" style="color:#3b82f6">${groupStudents.length}</span><span class="mini-lbl">O'quvchi</span></div>
                <div class="mini-stat"><span class="mini-val" style="color:#10b981">${lessons.length}</span><span class="mini-lbl">Dars</span></div>
                <div class="mini-stat"><span class="mini-val" style="color:#8b5cf6">${myAssignments.length}</span><span class="mini-lbl">Vazifa</span></div>
                <div class="mini-stat"><span class="mini-val" style="color:#f59e0b">${mySubmissions.length}</span><span class="mini-lbl">Javob</span></div>
                <div class="mini-stat"><span class="mini-val" style="color:#06b6d4">${submRate}%</span><span class="mini-lbl">Topshirish</span></div>
            </div>
        `;
        if (!document.getElementById("mini-stat-styles")) {
            const s = document.createElement("style");
            s.id = "mini-stat-styles";
            s.textContent = `
                .mini-stat-row { display:flex; gap:10px; flex-wrap:wrap; margin-bottom:16px; }
                .mini-stat {
                    background: rgba(30,41,59,0.7);
                    border: 1px solid rgba(148,163,184,0.1);
                    border-radius: 10px; padding: 10px 14px;
                    display: flex; flex-direction: column; align-items: center; gap: 3px;
                    min-width: 80px;
                }
                .mini-val { font-size: 1.3rem; font-weight: 700; line-height: 1; }
                .mini-lbl { font-size: 0.68rem; color: #64748b; }
            `;
            document.head.appendChild(s);
        }
    }

    if (!lessons.length) {
        list.innerHTML = `<div class="glass rounded-2xl p-8 text-slate-400">Hali dars qo'shilmagan.</div>`;
        return;
    }

    list.innerHTML = lessons.map((lesson) => {
        const assignments = findLessonAssignments(workspace.assignments, lesson.id);
        const lessonSubmissions = workspace.submissions.filter(s =>
            assignments.some(a => a.id === s.assignmentId)
        ).length;

        const assignmentHtml = assignments.length
            ? assignments.map((assignment) => {
                const submissions = findAssignmentSubmissions(workspace.submissions, assignment.id, workspace.students);
                const submitRate = groupStudents.length > 0
                    ? Math.round(submissions.length / groupStudents.length * 100)
                    : 0;
                const dl = assignment.deadline ? new Date(assignment.deadline) : null;
                const isOverdue = dl && dl < new Date();
                return `
                    <div class="mt-4 rounded-xl bg-slate-900/60 border border-slate-700/50 p-4">
                        <div class="flex items-start justify-between gap-4">
                            <div style="flex:1">
                                <h5 class="text-white font-semibold">${escapeHtml(assignment.title)}</h5>
                                <p class="text-sm text-slate-400 mt-1">${escapeHtml(assignment.description)}</p>
                                <div style="display:flex;align-items:center;gap:12px;margin-top:8px;flex-wrap:wrap">
                                    <p class="text-xs" style="color:${isOverdue ? '#ef4444' : '#a78bfa'}">
                                        ⏰ Deadline: ${escapeHtml(assignment.deadline)}
                                    </p>
                                    <span class="text-xs" style="color:#10b981">${submissions.length}/${groupStudents.length} javob</span>
                                    <span class="text-xs" style="background:rgba(59,130,246,0.15);color:#93c5fd;padding:1px 6px;border-radius:4px">${submitRate}%</span>
                                </div>
                                ${assignment.fileDataUrl ? `<a href="${assignment.fileDataUrl}" download="${escapeHtml(assignment.fileName)}" class="text-xs text-blue-400 mt-2 inline-block">📎 Biriktirilgan fayl</a>` : ""}
                            </div>
                        </div>
                        ${submissions.length ? `
                            <div class="mt-3 space-y-2">
                                ${submissions.map((submission) => `
                                    <div class="text-xs text-slate-300 flex items-center justify-between gap-3 bg-slate-800/60 rounded-lg px-3 py-2">
                                        <span>✅ ${escapeHtml(submission.studentName)}</span>
                                        <span style="color:#64748b;font-size:0.65rem">${new Date(submission.submittedAt).toLocaleDateString("uz-UZ")}</span>
                                        <a href="${submission.fileDataUrl}" download="${escapeHtml(submission.fileName)}" class="text-green-400">⬇ Yuklab olish</a>
                                    </div>
                                `).join("")}
                            </div>
                        ` : '<div class="mt-3 text-xs text-slate-500">Javoblar hali kelmagan.</div>'}
                    </div>
                `;
            }).join("")
            : `<div class="mt-4 text-sm text-slate-500">Vazifalar mavjud emas.</div>`;

        return `
            <article class="glass rounded-2xl border border-slate-700/50 overflow-hidden">
                ${lesson.videoUrl
                    ? `<iframe class="w-full h-56" src="${youtubeEmbed(lesson.videoUrl)}" title="${escapeHtml(lesson.title)}"></iframe>`
                    : `<div class="w-full h-56 bg-slate-900 flex items-center justify-center text-slate-500">Video mavjud emas</div>`}
                <div class="p-6">
                    <div class="flex items-center justify-between gap-4">
                        <div>
                            <h4 class="text-xl font-bold text-white">${escapeHtml(lesson.title)}</h4>
                            <div style="display:flex;align-items:center;gap:10px;margin-top:4px">
                                <p class="text-xs text-slate-500">${formatDate(lesson.createdAt)}</p>
                                ${assignments.length > 0 ? `<span style="background:rgba(139,92,246,0.15);color:#a78bfa;font-size:0.7rem;padding:1px 6px;border-radius:4px">${assignments.length} vazifa</span>` : ""}
                                ${lessonSubmissions > 0 ? `<span style="background:rgba(16,185,129,0.15);color:#6ee7b7;font-size:0.7rem;padding:1px 6px;border-radius:4px">${lessonSubmissions} javob</span>` : ""}
                            </div>
                        </div>
                        <button data-add-assignment="${lesson.id}" class="bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 px-4 py-2 rounded-xl text-sm">+ Vazifa</button>
                    </div>
                    ${assignmentHtml}
                </div>
            </article>
        `;
    }).join("");
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────
async function bootstrap() {
    const session = getSession();
    if (session?.role === "teacher") {
        currentTeacherId = session.userId;
        setVisible(byId("loginSection"), false);
        setVisible(byId("dashboardSection"), true);
        byId("userNameDisplay").textContent = session.displayName;
        await renderGroups();
    }

    byId("loginForm").addEventListener("submit", async (event) => {
        event.preventDefault();
        const result = await login(byId("username").value.trim(), byId("password").value.trim(), "teacher");
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

    document.querySelectorAll('[data-action="show-groups"]').forEach((button) => {
        button.addEventListener("click", async () => {
            setVisible(byId("lessonsContainer"), false);
            setVisible(byId("groupsContainer"), true);
            byId("pageTitle").textContent = "Guruhlarim";
            await renderGroups();
        });
    });

    document.querySelectorAll('[data-action="open-lesson-modal"]').forEach((button) => {
        button.addEventListener("click", () => {
            byId("lessonModal").classList.remove("hidden");
        });
    });

    byId("closeLessonModalBtn").addEventListener("click", () => byId("lessonModal").classList.add("hidden"));
    byId("closeAssignmentModalBtn").addEventListener("click", () => byId("assignmentModal").classList.add("hidden"));

    byId("lessonForm").addEventListener("submit", async (event) => {
        event.preventDefault();
        await createLesson(currentGroupId, byId("l_title").value.trim(), byId("l_video").value.trim());
        byId("lessonModal").classList.add("hidden");
        byId("lessonForm").reset();
        await renderLessons(currentGroupId, currentGroupName);
    });

    byId("assignmentForm").addEventListener("submit", async (event) => {
        event.preventDefault();
        const file = byId("a_file").files?.[0];
        await createAssignment({
            lessonId: Number(byId("a_lesson_id").value),
            title: byId("a_title").value.trim(),
            description: byId("a_desc").value.trim(),
            deadline: byId("a_deadline").value,
            fileName: file?.name ?? "",
            fileDataUrl: file ? await readFileAsDataUrl(file) : ""
        });
        byId("assignmentModal").classList.add("hidden");
        byId("assignmentForm").reset();
        await renderLessons(currentGroupId, currentGroupName);
    });

    document.addEventListener("click", async (event) => {
        const target = event.target;
        if (target.dataset.openGroup) {
            setVisible(byId("groupsContainer"), false);
            setVisible(byId("lessonsContainer"), true);
            await renderLessons(Number(target.dataset.openGroup), target.dataset.groupName ?? "Guruh");
        }
        if (target.dataset.addAssignment) {
            byId("a_lesson_id").value = target.dataset.addAssignment;
            byId("assignmentModal").classList.remove("hidden");
        }
    });

    await initWeatherBg();
}

void bootstrap();

import { readFileAsDataUrl } from "../core/files.js";
import { clearSession, getSession, setSession } from "../core/session.js";
import { findLessonAssignments, getStudentWorkspace, login, submitAssignment } from "../core/store.js";
import { byId, escapeHtml, formatDate, setVisible, showMessage, youtubeEmbed } from "../core/utils.js";
let currentStudentId = 0;
async function renderGroups() {
    const workspace = await getStudentWorkspace(currentStudentId);
    const list = byId("groupsList");
    if (!workspace.groups.length) {
        list.innerHTML = `<div class="glass rounded-2xl border border-slate-700/50 p-8 text-center col-span-full"><p class="text-slate-400">Siz hali biror guruhga biriktirilmagansiz.</p></div>`;
        return;
    }
    list.innerHTML = workspace.groups.map((group) => `
        <article class="glass p-6 rounded-2xl border border-slate-700/50 cursor-pointer" data-open-group="${group.id}" data-group-name="${escapeHtml(group.name)}">
            <div class="text-green-400 text-sm mb-2">${escapeHtml(group.clubName)}</div>
            <h3 class="text-xl font-bold text-white mb-2">${escapeHtml(group.name)}</h3>
            <p class="text-sm text-slate-400 mb-1">O'qituvchi: ${escapeHtml(group.teacherName)}</p>
            <p class="text-sm text-slate-500">${escapeHtml(group.schedule)}</p>
        </article>
    `).join("");
}
async function renderLessons(groupId, groupName) {
    const workspace = await getStudentWorkspace(currentStudentId);
    const lessons = workspace.lessons.filter((lesson) => lesson.groupId === groupId);
    const submissions = workspace.submissions.filter((submission) => submission.studentId === currentStudentId);
    byId("pageTitle").textContent = groupName;
    byId("lessonsTitle").textContent = `${groupName} darslari`;
    if (!lessons.length) {
        byId("lessonsList").innerHTML = `<div class="glass rounded-2xl border border-slate-700/50 p-8 text-slate-400">Hali dars joylanmagan.</div>`;
        return;
    }
    byId("lessonsList").innerHTML = lessons.map((lesson) => {
        const assignments = findLessonAssignments(workspace.assignments, lesson.id);
        return `
            <article class="glass p-6 rounded-2xl border border-slate-700/50">
                <div class="grid lg:grid-cols-2 gap-6">
                    <div>
                        ${lesson.videoUrl ? `<iframe class="w-full h-64 rounded-xl" src="${youtubeEmbed(lesson.videoUrl)}" title="${escapeHtml(lesson.title)}"></iframe>` : `<div class="w-full h-64 rounded-xl bg-slate-900 flex items-center justify-center text-slate-500">Video mavjud emas</div>`}
                    </div>
                    <div>
                        <h4 class="text-xl font-bold text-white">${escapeHtml(lesson.title)}</h4>
                        <p class="text-xs text-slate-500 mt-1 mb-5">${formatDate(lesson.createdAt)}</p>
                        ${assignments.length ? assignments.map((assignment) => {
            const done = submissions.find((submission) => submission.assignmentId === assignment.id);
            return `
                                <div class="rounded-xl bg-slate-900/60 border border-slate-700/50 p-4 mb-3">
                                    <div class="flex items-start justify-between gap-4">
                                        <div>
                                            <h5 class="font-semibold text-white">${escapeHtml(assignment.title)}</h5>
                                            <p class="text-sm text-slate-400 mt-1">${escapeHtml(assignment.description)}</p>
                                            <p class="text-xs text-purple-400 mt-2">Deadline: ${escapeHtml(assignment.deadline)}</p>
                                            ${assignment.fileDataUrl ? `<a href="${assignment.fileDataUrl}" download="${escapeHtml(assignment.fileName)}" class="text-xs text-blue-400 mt-2 inline-block">Topshiriq fayli</a>` : ""}
                                        </div>
                                        <button data-submit-assignment="${assignment.id}" class="bg-green-600/20 hover:bg-green-600/30 text-green-300 px-3 py-2 rounded-lg text-xs">${done ? "Qayta yuborish" : "Javob yuborish"}</button>
                                    </div>
                                    ${done ? `<div class="mt-3 text-xs text-green-400">Yuborilgan: ${formatDate(done.submittedAt)}</div>` : ""}
                                </div>
                            `;
        }).join("") : `<div class="text-sm text-slate-500">Topshiriqlar mavjud emas.</div>`}
                    </div>
                </div>
            </article>
        `;
    }).join("");
}
async function bootstrap() {
    const session = getSession();
    if (session?.role === "student") {
        currentStudentId = session.userId;
        setVisible(byId("loginSection"), false);
        setVisible(byId("dashboardSection"), true);
        byId("userNameDisplay").textContent = session.displayName;
        await renderGroups();
    }
    byId("loginForm").addEventListener("submit", async (event) => {
        event.preventDefault();
        const result = await login(byId("username").value.trim(), byId("password").value.trim(), "student");
        if (!result) {
            showMessage(byId("loginError"), "O'quvchi logini yoki paroli noto'g'ri.", "error");
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
            setVisible(byId("lessonsSection"), false);
            setVisible(byId("groupsSection"), true);
            byId("pageTitle").textContent = "Guruhlarim";
            await renderGroups();
        });
    });
    byId("closeSubmitModalBtn").addEventListener("click", () => byId("submitModal").classList.add("hidden"));
    byId("submitForm").addEventListener("submit", async (event) => {
        event.preventDefault();
        const file = byId("s_file").files?.[0];
        if (!file) {
            showMessage(byId("submitMessage"), "Fayl tanlang.", "error");
            return;
        }
        await submitAssignment({
            assignmentId: Number(byId("s_assignment_id").value),
            studentId: currentStudentId,
            fileName: file.name,
            fileDataUrl: await readFileAsDataUrl(file)
        });
        byId("submitModal").classList.add("hidden");
        byId("submitForm").reset();
        showMessage(byId("submitMessage"), "Javob muvaffaqiyatli yuborildi.", "success");
    });
    document.addEventListener("click", async (event) => {
        const target = event.target;
        if (target.dataset.openGroup) {
            setVisible(byId("groupsSection"), false);
            setVisible(byId("lessonsSection"), true);
            await renderLessons(Number(target.dataset.openGroup), target.dataset.groupName ?? "Guruh");
        }
        if (target.dataset.submitAssignment) {
            byId("s_assignment_id").value = target.dataset.submitAssignment;
            byId("submitModal").classList.remove("hidden");
        }
    });
    // await initWeatherBg();
}
void bootstrap();

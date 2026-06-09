import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { clearSession, getSession } from "../../core/session.js";
import { createAssignment, createLesson, findLessonAssignments, getTeacherWorkspace } from "../../core/store.js";
import { BarChart, DonutChart, MetricCard, ProgressList } from "../components/Analytics.js";

type Workspace = Awaited<ReturnType<typeof getTeacherWorkspace>>;

export default function TeacherPanel({ setPage, goBack }: { setPage: (page: string) => void; goBack: () => void }) {
    const session = getSession();
    const [workspace, setWorkspace] = useState<Workspace | null>(null);
    const [groupId, setGroupId] = useState<number>(0);
    const [lessonTitle, setLessonTitle] = useState("");
    const [videoUrl, setVideoUrl] = useState("");
    const [assignment, setAssignment] = useState({ lessonId: 0, title: "", description: "", deadline: "" });

    useEffect(() => {
        if (session?.role !== "teacher") {
            setPage("teacherLogin");
            return;
        }
        void getTeacherWorkspace(session.userId).then((data) => {
            setWorkspace(data);
            setGroupId(data.groups[0]?.id ?? 0);
        });
    }, []);

    const currentLessons = useMemo(() => workspace?.lessons.filter((lesson) => lesson.groupId === groupId) ?? [], [workspace, groupId]);

    async function refresh() {
        if (session?.role === "teacher") setWorkspace(await getTeacherWorkspace(session.userId));
    }

    async function addLesson(event: FormEvent) {
        event.preventDefault();
        if (!groupId) return;
        await createLesson(groupId, lessonTitle.trim(), videoUrl.trim());
        setLessonTitle("");
        setVideoUrl("");
        await refresh();
    }

    async function addAssignment(event: FormEvent) {
        event.preventDefault();
        if (!assignment.lessonId) return;
        await createAssignment({ ...assignment, fileName: "", fileDataUrl: "" });
        setAssignment({ lessonId: 0, title: "", description: "", deadline: "" });
        await refresh();
    }

    if (!workspace) return <div className="p-10 text-center text-gray-400">Yuklanmoqda...</div>;

    return (
        <DashboardShell title="O'qituvchi paneli" name={session?.displayName ?? ""} setPage={setPage} goBack={goBack}>
            <div className="grid lg:grid-cols-[280px_1fr] gap-6">
                <aside className="bg-[#0d1520] border border-gray-800 rounded-2xl p-4 space-y-2">
                    {workspace.groups.map((group) => (
                        <button key={group.id} onClick={() => setGroupId(group.id)} className={`w-full text-left rounded-xl px-4 py-3 text-sm ${groupId === group.id ? "bg-blue-600 text-white" : "bg-[#111827] text-gray-400"}`}>
                            <div className="font-semibold">{group.name}</div>
                            <div className="text-xs opacity-70">{group.clubName}</div>
                        </button>
                    ))}
                    {!workspace.groups.length && <p className="text-sm text-gray-500">Sizga guruh biriktirilmagan.</p>}
                </aside>
                <section className="space-y-6">
                    <TeacherAnalytics workspace={workspace} />
                    <form onSubmit={addLesson} className="bg-[#0d1520] border border-gray-800 rounded-2xl p-5 grid md:grid-cols-[1fr_1fr_auto] gap-3">
                        <input value={lessonTitle} onChange={(event) => setLessonTitle(event.target.value)} placeholder="Dars nomi" className="field" required />
                        <input value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} placeholder="Video URL" className="field" />
                        <button className="bg-blue-600 text-white rounded-xl px-5">Dars qo'shish</button>
                    </form>
                    <div className="grid gap-4">
                        {currentLessons.map((lesson) => (
                            <article key={lesson.id} className="bg-[#0d1520] border border-gray-800 rounded-2xl p-5">
                                <h2 className="text-lg font-bold text-white">{lesson.title}</h2>
                                <p className="text-xs text-gray-500 mt-1">{new Date(lesson.createdAt).toLocaleString("uz-UZ")}</p>
                                <div className="mt-4 space-y-2">
                                    {findLessonAssignments(workspace.assignments, lesson.id).map((item) => (
                                        <div key={item.id} className="rounded-xl bg-[#111827] border border-gray-800 p-3 text-sm text-gray-300">
                                            <div className="text-white font-medium">{item.title}</div>
                                            <div className="text-gray-500">{item.description}</div>
                                        </div>
                                    ))}
                                </div>
                                <form onSubmit={addAssignment} className="mt-4 grid md:grid-cols-[1fr_1fr_180px_auto] gap-3">
                                    <input placeholder="Vazifa nomi" className="field" value={assignment.lessonId === lesson.id ? assignment.title : ""} onChange={(event) => setAssignment({ ...assignment, lessonId: lesson.id, title: event.target.value })} required />
                                    <input placeholder="Tavsif" className="field" value={assignment.lessonId === lesson.id ? assignment.description : ""} onChange={(event) => setAssignment({ ...assignment, lessonId: lesson.id, description: event.target.value })} required />
                                    <input type="datetime-local" className="field" value={assignment.lessonId === lesson.id ? assignment.deadline : ""} onChange={(event) => setAssignment({ ...assignment, lessonId: lesson.id, deadline: event.target.value })} required />
                                    <button className="bg-purple-600 text-white rounded-xl px-4">Vazifa</button>
                                </form>
                            </article>
                        ))}
                    </div>
                </section>
            </div>
        </DashboardShell>
    );
}

function TeacherAnalytics({ workspace }: { workspace: Workspace }) {
    const groupIds = workspace.groups.map((group) => group.id);
    const lessons = workspace.lessons.filter((lesson) => groupIds.includes(lesson.groupId));
    const lessonIds = lessons.map((lesson) => lesson.id);
    const assignments = workspace.assignments.filter((assignment) => lessonIds.includes(assignment.lessonId));
    const assignmentIds = assignments.map((assignment) => assignment.id);
    const submissions = workspace.submissions.filter((submission) => assignmentIds.includes(submission.assignmentId));
    const uniqueStudentIds = new Set(workspace.groups.flatMap((group) => group.studentIds));
    const expectedSubmissions = assignments.length * Math.max(uniqueStudentIds.size, 1);
    const submissionRate = expectedSubmissions ? Math.round((submissions.length / expectedSubmissions) * 100) : 0;

    const groupStudentItems = workspace.groups.map((group) => ({
        label: group.name,
        value: group.studentIds.length
    }));

    const groupLessonItems = workspace.groups.map((group) => ({
        label: group.name,
        value: lessons.filter((lesson) => lesson.groupId === group.id).length
    }));

    const groupAssignmentItems = workspace.groups.map((group) => {
        const groupLessons = lessons.filter((lesson) => lesson.groupId === group.id).map((lesson) => lesson.id);
        return {
            label: group.name,
            value: assignments.filter((assignment) => groupLessons.includes(assignment.lessonId)).length
        };
    });

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                <MetricCard label="Mening guruhlarim" value={workspace.groups.length} sub="GDPI to'garak guruhlari" color="blue" />
                <MetricCard label="Talabalar" value={uniqueStudentIds.size} sub="ustoz nazoratidagi ishtirokchilar" color="cyan" />
                <MetricCard label="Darslar" value={lessons.length} sub="joylangan o'quv materiallari" color="green" />
                <MetricCard label="Amaliy ishlar" value={assignments.length} sub="talabalarga berilgan topshiriqlar" color="purple" />
                <MetricCard label="Javoblar" value={submissions.length} sub={`${submissionRate}% bajarilish intizomi`} color="orange" />
            </div>

            <div className="grid xl:grid-cols-2 gap-6">
                <BarChart title="Guruhlar bo'yicha talabalar soni" items={groupStudentItems} />
                <DonutChart
                    title="Ustoz faoliyati balansi"
                    centerLabel="yozuv"
                    items={[
                        { label: "Darslar", value: lessons.length, color: "#06b6d4" },
                        { label: "Vazifalar", value: assignments.length, color: "#8b5cf6" },
                        { label: "Javoblar", value: submissions.length, color: "#10b981" }
                    ]}
                />
            </div>

            <div className="grid xl:grid-cols-2 gap-6">
                <ProgressList title="Har bir guruhga joylangan darslar" items={groupLessonItems} />
                <ProgressList title="Har bir guruhga berilgan amaliy ishlar" items={groupAssignmentItems} />
            </div>
        </div>
    );
}

function DashboardShell({ title, name, setPage, goBack, children }: { title: string; name: string; setPage: (page: string) => void; goBack: () => void; children: ReactNode }) {
    function logout() {
        clearSession();
        setPage("home");
    }

    return (
        <div className="min-h-screen bg-[#0a0f1e]">
            <header className="bg-[#0d1520] border-b border-gray-800 px-6 py-4 flex justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={goBack} className="rounded-xl border border-gray-800 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800">Orqaga</button>
                    <div>
                        <h1 className="text-white font-bold">{title}</h1>
                        <p className="text-sm text-gray-500">{name}</p>
                    </div>
                </div>
                <button onClick={logout} className="text-red-400 text-sm">Chiqish</button>
            </header>
            <main className="p-6">{children}</main>
        </div>
    );
}

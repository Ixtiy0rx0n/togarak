import { useEffect, useState } from "react";
import { clearSession, getSession } from "../../core/session.js";
import { findLessonAssignments, getStudentWorkspace } from "../../core/store.js";
import { BarChart, DonutChart, MetricCard, ProgressList } from "../components/Analytics.js";

type Workspace = Awaited<ReturnType<typeof getStudentWorkspace>>;

export default function StudentPanel({ setPage, goBack }: { setPage: (page: string) => void; goBack: () => void }) {
    const session = getSession();
    const [workspace, setWorkspace] = useState<Workspace | null>(null);
    const [groupId, setGroupId] = useState(0);

    useEffect(() => {
        if (session?.role !== "student") {
            setPage("studentLogin");
            return;
        }
        void getStudentWorkspace(session.userId).then((data) => {
            setWorkspace(data);
            setGroupId(data.groups[0]?.id ?? 0);
        });
    }, []);

    if (!workspace) return <div className="p-10 text-center text-gray-400">Yuklanmoqda...</div>;

    const lessons = workspace.lessons.filter((lesson) => lesson.groupId === groupId);

    return (
        <div className="min-h-screen bg-[#0a0f1e]">
            <header className="bg-[#0d1520] border-b border-gray-800 px-6 py-4 flex justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={goBack} className="rounded-xl border border-gray-800 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800">Orqaga</button>
                    <div>
                        <h1 className="text-white font-bold">O'quvchi paneli</h1>
                        <p className="text-sm text-gray-500">{session?.displayName}</p>
                    </div>
                </div>
                <button onClick={() => { clearSession(); setPage("home"); }} className="text-red-400 text-sm">Chiqish</button>
            </header>
            <main className="p-6 grid lg:grid-cols-[280px_1fr] gap-6">
                <aside className="bg-[#0d1520] border border-gray-800 rounded-2xl p-4 space-y-2">
                    {workspace.groups.map((group) => (
                        <button key={group.id} onClick={() => setGroupId(group.id)} className={`w-full text-left rounded-xl px-4 py-3 text-sm ${groupId === group.id ? "bg-blue-600 text-white" : "bg-[#111827] text-gray-400"}`}>
                            <div className="font-semibold">{group.name}</div>
                            <div className="text-xs opacity-70">{group.teacherName}</div>
                        </button>
                    ))}
                    {!workspace.groups.length && <p className="text-sm text-gray-500">Siz hali guruhga biriktirilmagansiz.</p>}
                </aside>
                <section className="space-y-6">
                    <StudentAnalytics workspace={workspace} studentId={session?.userId ?? 0} />
                    {lessons.map((lesson) => (
                        <article key={lesson.id} className="bg-[#0d1520] border border-gray-800 rounded-2xl p-5">
                            <h2 className="text-lg font-bold text-white">{lesson.title}</h2>
                            {lesson.videoUrl && <a className="text-sm text-blue-400 mt-2 inline-block" href={lesson.videoUrl} target="_blank" rel="noreferrer">Videoni ochish</a>}
                            <div className="mt-4 space-y-2">
                                {findLessonAssignments(workspace.assignments, lesson.id).map((assignment) => (
                                    <div key={assignment.id} className="rounded-xl bg-[#111827] border border-gray-800 p-3 text-sm">
                                        <div className="text-white font-medium">{assignment.title}</div>
                                        <div className="text-gray-500">{assignment.description}</div>
                                        <div className="text-purple-400 text-xs mt-2">Deadline: {assignment.deadline}</div>
                                    </div>
                                ))}
                            </div>
                        </article>
                    ))}
                </section>
            </main>
        </div>
    );
}

function StudentAnalytics({ workspace, studentId }: { workspace: Workspace; studentId: number }) {
    const groupIds = workspace.groups.map((group) => group.id);
    const lessons = workspace.lessons.filter((lesson) => groupIds.includes(lesson.groupId));
    const lessonIds = lessons.map((lesson) => lesson.id);
    const assignments = workspace.assignments.filter((assignment) => lessonIds.includes(assignment.lessonId));
    const submissions = workspace.submissions.filter((submission) => submission.studentId === studentId);
    const submittedAssignmentIds = new Set(submissions.map((submission) => submission.assignmentId));
    const completed = assignments.filter((assignment) => submittedAssignmentIds.has(assignment.id)).length;
    const pending = Math.max(assignments.length - completed, 0);
    const completionRate = assignments.length ? Math.round((completed / assignments.length) * 100) : 0;

    const lessonsByGroup = workspace.groups.map((group) => ({
        label: group.name,
        value: lessons.filter((lesson) => lesson.groupId === group.id).length
    }));

    const assignmentsByGroup = workspace.groups.map((group) => {
        const groupLessonIds = lessons.filter((lesson) => lesson.groupId === group.id).map((lesson) => lesson.id);
        return {
            label: group.name,
            value: assignments.filter((assignment) => groupLessonIds.includes(assignment.lessonId)).length
        };
    });

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                <MetricCard label="To'garak guruhlarim" value={workspace.groups.length} sub="GDPI faoliyat yo'nalishlari" color="blue" />
                <MetricCard label="Darslar" value={lessons.length} sub="o'rganish uchun materiallar" color="cyan" />
                <MetricCard label="Topshiriqlar" value={assignments.length} sub="amaliy portfel ishlari" color="purple" />
                <MetricCard label="Bajarilgan" value={completed} sub={`${completionRate}% shaxsiy faollik`} color="green" />
                <MetricCard label="Rejada" value={pending} sub="hali topshirilmagan ishlar" color="orange" />
            </div>

            <div className="grid xl:grid-cols-2 gap-6">
                <DonutChart
                    title="Mening topshiriq intizomim"
                    centerLabel="vazifa"
                    items={[
                        { label: "Bajarilgan", value: completed, color: "#10b981" },
                        { label: "Kutilmoqda", value: pending, color: "#f59e0b" }
                    ]}
                />
                <BarChart title="Guruhlarimdagi darslar xaritasi" items={lessonsByGroup} />
            </div>

            <ProgressList title="Qaysi guruhda qancha amaliy ish bor" items={assignmentsByGroup} />
        </div>
    );
}

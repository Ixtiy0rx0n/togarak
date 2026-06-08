import type {
    Admin,
    AppData,
    Assignment,
    Club,
    Group,
    Lesson,
    SessionData,
    Student,
    Submission,
    Teacher,
    UserRole
} from "./types.js";

let cache: AppData | null = null;

async function loadFromServer(): Promise<AppData> {
    const response = await fetch("/api/data");
    if (!response.ok) {
        throw new Error("Ma'lumotlarni serverdan yuklab bo'lmadi");
    }
    return response.json() as Promise<AppData>;
}

async function saveToServer(data: AppData): Promise<void> {
    cache = structuredClone(data);
    const response = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        throw new Error("Ma'lumotlarni saqlashda xatolik");
    }
}

export async function getStore(): Promise<AppData> {
    if (cache) {
        return structuredClone(cache);
    }
    const data = await loadFromServer();
    cache = structuredClone(data);
    return structuredClone(data);
}

export async function updateStore(mutator: (draft: AppData) => void): Promise<AppData> {
    const draft = await getStore();
    mutator(draft);
    await saveToServer(draft);
    return structuredClone(draft);
}

export async function resetStore(): Promise<AppData> {
    cache = null;
    const data = await loadFromServer();
    return structuredClone(data);
}

function nextId(items: Array<{ id: number }>): number {
    return items.reduce((max, item) => Math.max(max, item.id), 0) + 1;
}

function teacherName(teacher?: Teacher): string {
    return teacher ? `${teacher.firstName} ${teacher.lastName}` : "Biriktirilmagan";
}

function studentName(student?: Student): string {
    return student ? `${student.firstName} ${student.lastName}` : "Noma'lum";
}

function clubView(data: AppData, club: Club) {
    const teacher = data.teachers.find((item) => item.id === club.teacherId);
    return {
        ...club,
        teacherName: teacherName(teacher)
    };
}

export function clubImageSrc(path: string, prefix = ""): string {
    if (path.startsWith("data:") || path.startsWith("http://") || path.startsWith("https://")) {
        return path;
    }
    return `${prefix}${path}`;
}

export async function getPublicSnapshot() {
    const data = await getStore();
    return {
        clubs: data.clubs.map((club) => clubView(data, club)),
        stats: {
            clubs: data.clubs.length,
            students: data.students.length
        }
    };
}

export async function login(username: string, password: string, expectedRole?: UserRole): Promise<SessionData | null> {
    const data = await getStore();

    const admin = data.admins.find((item) => item.username === username && item.password === password);
    if (admin && (!expectedRole || expectedRole === "admin")) {
        return {
            role: "admin",
            userId: admin.id,
            username: admin.username,
            displayName: admin.displayName
        };
    }

    const teacher = data.teachers.find((item) => item.username === username && item.password === password);
    if (teacher && (!expectedRole || expectedRole === "teacher")) {
        return {
            role: "teacher",
            userId: teacher.id,
            username: teacher.username,
            displayName: `${teacher.firstName} ${teacher.lastName}`
        };
    }

    const student = data.students.find((item) => item.username === username && item.password === password);
    if (student && (!expectedRole || expectedRole === "student")) {
        return {
            role: "student",
            userId: student.id,
            username: student.username,
            displayName: `${student.firstName} ${student.lastName}`
        };
    }

    return null;
}

export async function registerStudent(payload: Omit<Student, "id">): Promise<{ ok: boolean; message: string }> {
    const data = await getStore();
    const usernameExists = data.students.some((item) => item.username === payload.username)
        || data.teachers.some((item) => item.username === payload.username)
        || data.admins.some((item) => item.username === payload.username);

    if (usernameExists) {
        return { ok: false, message: "Bu login allaqachon band." };
    }

    await updateStore((draft) => {
        draft.students.push({
            ...payload,
            id: nextId(draft.students)
        });
    });

    return { ok: true, message: "Ro'yxatdan o'tish muvaffaqiyatli yakunlandi." };
}

export async function getAdminDashboardData() {
    const data = await getStore();
    return {
        admins: data.admins,
        teachers: data.teachers,
        students: data.students,
        clubs: data.clubs.map((club) => clubView(data, club)),
        groups: data.groups.map((group) => {
            const club = data.clubs.find((item) => item.id === group.clubId);
            const teacher = data.teachers.find((item) => item.id === group.teacherId);
            return {
                ...group,
                clubName: club?.title ?? "Noma'lum",
                teacherName: teacherName(teacher),
                studentCount: group.studentIds.length
            };
        })
    };
}

export async function createAdmin(username: string, password: string, displayName: string): Promise<{ ok: boolean; message: string }> {
    if (!username || !password) {
        return { ok: false, message: "Login va parol majburiy." };
    }

    const data = await getStore();
    const exists = [...data.admins, ...data.teachers, ...data.students].some((item) => item.username === username);
    if (exists) {
        return { ok: false, message: "Bu login allaqachon mavjud." };
    }

    await updateStore((draft) => {
        draft.admins.push({
            id: nextId(draft.admins),
            username,
            password,
            displayName
        });
    });

    return { ok: true, message: "Admin qo'shildi." };
}

export async function deleteAdmin(adminId: number): Promise<void> {
    await updateStore((draft) => {
        draft.admins = draft.admins.filter((item) => item.id !== adminId || item.id === 1);
    });
}

export async function upsertTeacher(payload: Omit<Teacher, "id"> & { id?: number }): Promise<{ ok: boolean; message: string }> {
    const data = await getStore();
    const takenByOther = [...data.admins, ...data.teachers, ...data.students].some(
        (item) => item.username === payload.username && (!("id" in item) || item.id !== payload.id)
    );
    if (takenByOther) {
        return { ok: false, message: "Bu login band." };
    }

    await updateStore((draft) => {
        if (payload.id) {
            const target = draft.teachers.find((item) => item.id === payload.id);
            if (!target) {
                return;
            }
            Object.assign(target, payload);
            return;
        }

        draft.teachers.push({
            ...payload,
            id: nextId(draft.teachers)
        });
    });

    return { ok: true, message: payload.id ? "O'qituvchi yangilandi." : "O'qituvchi qo'shildi." };
}

export async function deleteTeacher(teacherId: number): Promise<void> {
    await updateStore((draft) => {
        draft.teachers = draft.teachers.filter((item) => item.id !== teacherId);
        draft.clubs.forEach((club) => {
            if (club.teacherId === teacherId) {
                club.teacherId = null;
            }
        });
        draft.groups.forEach((group) => {
            if (group.teacherId === teacherId) {
                group.teacherId = null;
            }
        });
    });
}

export async function updateStudent(studentId: number, payload: Omit<Student, "id">): Promise<{ ok: boolean; message: string }> {
    const data = await getStore();
    const takenByOther = [...data.admins, ...data.teachers, ...data.students].some(
        (item) => item.username === payload.username && (!("id" in item) || item.id !== studentId)
    );
    if (takenByOther) {
        return { ok: false, message: "Bu login band." };
    }

    await updateStore((draft) => {
        const target = draft.students.find((item) => item.id === studentId);
        if (target) {
            Object.assign(target, payload);
        }
    });

    return { ok: true, message: "O'quvchi yangilandi." };
}

export async function deleteStudent(studentId: number): Promise<void> {
    await updateStore((draft) => {
        draft.students = draft.students.filter((item) => item.id !== studentId);
        draft.groups.forEach((group) => {
            group.studentIds = group.studentIds.filter((id) => id !== studentId);
        });
        draft.submissions = draft.submissions.filter((submission) => submission.studentId !== studentId);
    });
}

export async function upsertClub(payload: Omit<Club, "id"> & { id?: number }): Promise<void> {
    await updateStore((draft) => {
        if (payload.id) {
            const target = draft.clubs.find((item) => item.id === payload.id);
            if (target) {
                Object.assign(target, payload);
            }
            return;
        }

        draft.clubs.push({
            ...payload,
            id: nextId(draft.clubs)
        });
    });
}

export async function deleteClub(clubId: number): Promise<void> {
    await updateStore((draft) => {
        const removedGroupIds = new Set(draft.groups.filter((group) => group.clubId === clubId).map((group) => group.id));
        const removedLessonIds = new Set(draft.lessons.filter((lesson) => removedGroupIds.has(lesson.groupId)).map((lesson) => lesson.id));
        draft.clubs = draft.clubs.filter((item) => item.id !== clubId);
        draft.groups = draft.groups.filter((group) => !removedGroupIds.has(group.id));
        draft.lessons = draft.lessons.filter((lesson) => !removedGroupIds.has(lesson.groupId));
        draft.assignments = draft.assignments.filter((assignment) => !removedLessonIds.has(assignment.lessonId));
        draft.submissions = draft.submissions.filter((submission) => {
            const assignment = draft.assignments.find((item) => item.id === submission.assignmentId);
            return Boolean(assignment);
        });
    });
}

export async function upsertGroup(payload: Omit<Group, "id" | "studentIds"> & { id?: number; studentIds?: number[] }): Promise<void> {
    await updateStore((draft) => {
        if (payload.id) {
            const target = draft.groups.find((item) => item.id === payload.id);
            if (target) {
                target.name = payload.name;
                target.clubId = payload.clubId;
                target.teacherId = payload.teacherId;
                target.schedule = payload.schedule;
                target.studentIds = payload.studentIds ?? target.studentIds;
            }
            return;
        }

        draft.groups.push({
            id: nextId(draft.groups),
            name: payload.name,
            clubId: payload.clubId,
            teacherId: payload.teacherId,
            schedule: payload.schedule,
            studentIds: payload.studentIds ?? []
        });
    });
}

export async function deleteGroup(groupId: number): Promise<void> {
    await updateStore((draft) => {
        draft.groups = draft.groups.filter((item) => item.id !== groupId);
        const lessonIds = draft.lessons.filter((lesson) => lesson.groupId === groupId).map((lesson) => lesson.id);
        draft.lessons = draft.lessons.filter((lesson) => lesson.groupId !== groupId);
        draft.assignments = draft.assignments.filter((assignment) => !lessonIds.includes(assignment.lessonId));
        draft.submissions = draft.submissions.filter((submission) => {
            const assignment = draft.assignments.find((item) => item.id === submission.assignmentId);
            return Boolean(assignment);
        });
    });
}

export async function assignStudentToGroup(groupId: number, studentId: number): Promise<{ ok: boolean; message: string }> {
    await updateStore((draft) => {
        const group = draft.groups.find((item) => item.id === groupId);
        if (group && !group.studentIds.includes(studentId)) {
            group.studentIds.push(studentId);
        }
    });

    return { ok: true, message: "O'quvchi guruhga biriktirildi." };
}

export async function getTeacherWorkspace(teacherId: number) {
    const data = await getStore();
    const groups = data.groups
        .filter((group) => group.teacherId === teacherId)
        .map((group) => {
            const club = data.clubs.find((item) => item.id === group.clubId);
            return {
                ...group,
                clubName: club?.title ?? "Noma'lum"
            };
        });

    return {
        teacher: data.teachers.find((item) => item.id === teacherId),
        groups,
        lessons: data.lessons,
        assignments: data.assignments,
        submissions: data.submissions,
        students: data.students
    };
}

export async function createLesson(groupId: number, title: string, videoUrl: string): Promise<void> {
    await updateStore((draft) => {
        draft.lessons.unshift({
            id: nextId(draft.lessons),
            groupId,
            title,
            videoUrl,
            createdAt: new Date().toISOString()
        });
    });
}

export async function createAssignment(payload: Omit<Assignment, "id" | "createdAt">): Promise<void> {
    await updateStore((draft) => {
        draft.assignments.unshift({
            ...payload,
            id: nextId(draft.assignments),
            createdAt: new Date().toISOString()
        });
    });
}

export async function getStudentWorkspace(studentId: number) {
    const data = await getStore();
    const groups = data.groups
        .filter((group) => group.studentIds.includes(studentId))
        .map((group) => {
            const club = data.clubs.find((item) => item.id === group.clubId);
            const teacher = data.teachers.find((item) => item.id === group.teacherId);
            return {
                ...group,
                clubName: club?.title ?? "Noma'lum",
                teacherName: teacherName(teacher)
            };
        });

    return {
        student: data.students.find((item) => item.id === studentId),
        groups,
        lessons: data.lessons,
        assignments: data.assignments,
        submissions: data.submissions
    };
}

export async function submitAssignment(payload: Omit<Submission, "id" | "submittedAt">): Promise<void> {
    await updateStore((draft) => {
        const existing = draft.submissions.find(
            (submission) => submission.assignmentId === payload.assignmentId && submission.studentId === payload.studentId
        );

        if (existing) {
            existing.fileName = payload.fileName;
            existing.fileDataUrl = payload.fileDataUrl;
            existing.submittedAt = new Date().toISOString();
            return;
        }

        draft.submissions.unshift({
            ...payload,
            id: nextId(draft.submissions),
            submittedAt: new Date().toISOString()
        });
    });
}

export function findLessonAssignments(assignments: Assignment[], lessonId: number): Assignment[] {
    return assignments.filter((assignment) => assignment.lessonId === lessonId);
}

export function findAssignmentSubmissions(
    submissions: Submission[],
    assignmentId: number,
    students: Student[]
): Array<Submission & { studentName: string }> {
    return submissions
        .filter((submission) => submission.assignmentId === assignmentId)
        .map((submission) => ({
            ...submission,
            studentName: studentName(students.find((item) => item.id === submission.studentId))
        }));
}

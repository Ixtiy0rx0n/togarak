export type UserRole = "admin" | "teacher" | "student";

export interface Admin {
    id: number;
    username: string;
    password: string;
    displayName: string;
}

export interface Teacher {
    id: number;
    firstName: string;
    lastName: string;
    phone: string;
    subject: string;
    username: string;
    password: string;
}

export interface Student {
    id: number;
    firstName: string;
    lastName: string;
    age?: number;
    phone: string;
    school?: string;
    clubInterest: string;
    username: string;
    password: string;
}

export interface Club {
    id: number;
    title: string;
    paragraph: string;
    description: string;
    imagePath: string;
    teacherId: number | null;
}

export interface Group {
    id: number;
    name: string;
    clubId: number;
    teacherId: number | null;
    schedule: string;
    studentIds: number[];
}

export interface Lesson {
    id: number;
    groupId: number;
    title: string;
    videoUrl: string;
    createdAt: string;
}

export interface Assignment {
    id: number;
    lessonId: number;
    title: string;
    description: string;
    deadline: string;
    createdAt: string;
    fileName: string;
    fileDataUrl: string;
}

export interface Submission {
    id: number;
    assignmentId: number;
    studentId: number;
    fileName: string;
    fileDataUrl: string;
    submittedAt: string;
}

export interface AppData {
    admins: Admin[];
    teachers: Teacher[];
    students: Student[];
    clubs: Club[];
    groups: Group[];
    lessons: Lesson[];
    assignments: Assignment[];
    submissions: Submission[];
}

export interface SessionData {
    role: UserRole;
    userId: number;
    username: string;
    displayName: string;
}

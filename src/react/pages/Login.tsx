import { useState } from "react";
import type { FormEvent } from "react";
import { login } from "../../core/store.js";
import { setSession } from "../../core/session.js";
import type { UserRole } from "../../core/types.js";

const roleLabels: Record<UserRole, string> = {
    admin: "Admin",
    teacher: "O'qituvchi",
    student: "O'quvchi"
};

const roleHints: Record<UserRole, string> = {
    admin: "Demo: admin / admin123",
    teacher: "Demo: teacher_math / teacher123",
    student: "Demo: student_aziz / student123"
};

type LoginProps = {
    setPage: (page: string) => void;
    goBack: () => void;
    initialRole?: UserRole;
};

export default function Login({ setPage, goBack, initialRole = "student" }: LoginProps) {
    const [role, setRole] = useState<UserRole>(initialRole);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const cleanUsername = username.trim();
        const cleanPassword = password.trim();

        if (!cleanUsername || !cleanPassword) {
            setMessage("Login va parolni kiriting.");
            return;
        }

        setLoading(true);
        setMessage("");

        try {
            const session = await login(cleanUsername, cleanPassword, role);
            if (!session) {
                setMessage(`${roleLabels[role]} login yoki paroli noto'g'ri.`);
                return;
            }

            setSession(session);
            setPage(session.role);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Login tekshirishda xatolik yuz berdi.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#0a0f1e]">
            <form onSubmit={handleSubmit} className="w-full max-w-md bg-[#0d1520] border border-gray-800 rounded-2xl p-8 shadow-2xl">
                <button type="button" onClick={goBack} className="text-sm text-gray-500 hover:text-white mb-6">
                    Orqaga
                </button>

                <img src="/logo.png" className="w-16 h-16 object-contain bg-white rounded-full p-1.5 mx-auto mb-4" alt="Logo" />
                <h1 className="text-2xl font-bold text-white text-center">Tizimga kirish</h1>
                <p className="text-center text-sm text-gray-500 mt-2 mb-6">{roleHints[role]}</p>

                <div className="grid grid-cols-3 gap-2 mb-5">
                    {(Object.keys(roleLabels) as UserRole[]).map((item) => (
                        <button
                            key={item}
                            type="button"
                            onClick={() => {
                                setRole(item);
                                setMessage("");
                            }}
                            className={`rounded-xl py-2 text-sm border ${role === item ? "bg-blue-600 border-blue-500 text-white" : "bg-[#111827] border-gray-800 text-gray-400 hover:text-white"}`}
                        >
                            {roleLabels[item]}
                        </button>
                    ))}
                </div>

                {message && <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">{message}</div>}

                <label className="block text-xs text-gray-500 mb-1">Login</label>
                <input
                    className="mb-4 w-full bg-[#111827] border border-gray-800 text-white p-3 rounded-xl outline-none focus:border-blue-600"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    autoComplete="username"
                    required
                />

                <label className="block text-xs text-gray-500 mb-1">Parol</label>
                <input
                    className="mb-6 w-full bg-[#111827] border border-gray-800 text-white p-3 rounded-xl outline-none focus:border-blue-600"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    required
                />

                <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-500 disabled:opacity-60">
                    {loading ? "Tekshirilmoqda..." : `${roleLabels[role]} paneliga kirish`}
                </button>
            </form>
        </div>
    );
}

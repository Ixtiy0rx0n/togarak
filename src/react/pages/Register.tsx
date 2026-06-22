import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { getPublicSnapshot, registerStudent } from "../../core/store.js";

type RegisterProps = {
    setPage: (page: string) => void;
    goBack: () => void;
};

type Message = {
    type: "success" | "error";
    text: string;
};

export default function Register({ setPage, goBack }: RegisterProps) {
    const [clubs, setClubs] = useState<Array<{ id: number; title: string }>>([]);
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        age: "",
        phone: "",
        school: "",
        clubInterest: "",
        clubId: "",
        username: "",
        password: ""
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<Message | null>(null);

    useEffect(() => {
        void getPublicSnapshot().then((snapshot) => {
            setClubs(snapshot.clubs.map((club) => ({ id: club.id, title: club.title })));
        });
    }, []);

    function updateField(field: keyof typeof formData, value: string) {
        setFormData((current) => ({ ...current, [field]: value }));
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setMessage(null);

        const payload = {
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            age: formData.age ? Number(formData.age) : undefined,
            phone: formData.phone.trim(),
            school: formData.school.trim(),
            clubInterest: formData.clubInterest.trim(),
            clubId: Number(formData.clubId),
            username: formData.username.trim(),
            password: formData.password.trim()
        };

        if (!payload.firstName || !payload.lastName || !payload.phone || !payload.clubInterest || !payload.clubId || !payload.username || !payload.password) {
            setMessage({ type: "error", text: "Majburiy maydonlarni to'ldiring." });
            return;
        }

        if (payload.age !== undefined && (!Number.isFinite(payload.age) || payload.age < 5 || payload.age > 100)) {
            setMessage({ type: "error", text: "Yosh qiymatini to'g'ri kiriting." });
            return;
        }

        setLoading(true);
        try {
            const result = await registerStudent(payload);
            if (!result.ok) {
                setMessage({ type: "error", text: result.message });
                return;
            }

            setMessage({ type: "success", text: `${result.message} Endi login orqali kiring.` });
            setFormData({
                firstName: "",
                lastName: "",
                age: "",
                phone: "",
                school: "",
                clubInterest: "",
                clubId: "",
                username: "",
                password: ""
            });
            window.setTimeout(() => setPage("studentLogin"), 1200);
        } catch (error) {
            setMessage({ type: "error", text: error instanceof Error ? error.message : "Ro'yxatdan o'tishda xatolik yuz berdi." });
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#0a0f1e]">
            <div className="bg-[#0d1520] border border-gray-800 rounded-2xl w-full max-w-md p-8 shadow-2xl">
                <button type="button" onClick={goBack} className="text-sm text-gray-500 hover:text-white mb-6">Orqaga</button>
                <div className="text-center mb-8">
                    <img src="/logo.jpg" className="w-16 h-16 object-contain bg-white rounded-full p-1.5 mx-auto mb-4" alt="Logo" />
                    <h1 className="text-2xl font-bold text-white">GDPI to'garagiga yozilish</h1>
                    <p className="text-gray-500 text-sm mt-1">Yo'nalishni tanlang, tizim sizni avtomatik mos guruhga biriktiradi.</p>
                </div>

                {message && (
                    <div className={`p-3 rounded-xl text-sm mb-6 border ${message.type === "success" ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Ism" value={formData.firstName} onChange={(value) => updateField("firstName", value)} required />
                        <Field label="Familiya" value={formData.lastName} onChange={(value) => updateField("lastName", value)} required />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Yosh" type="number" value={formData.age} onChange={(value) => updateField("age", value)} />
                        <Field label="Telefon" value={formData.phone} onChange={(value) => updateField("phone", value)} required />
                    </div>
                    <Field label="O'qish joyi" value={formData.school} onChange={(value) => updateField("school", value)} />
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-500">To'garak</label>
                        <select
                            required
                            value={formData.clubId}
                            onChange={(event) => {
                                const club = clubs.find((item) => item.id === Number(event.target.value));
                                setFormData((current) => ({
                                    ...current,
                                    clubId: event.target.value,
                                    clubInterest: club?.title ?? current.clubInterest
                                }));
                            }}
                            className="bg-[#111827] border border-gray-800 text-white p-3 rounded-xl outline-none focus:border-blue-600 transition-all"
                        >
                            <option value="">To'garakni tanlang</option>
                            {clubs.map((club) => (
                                <option key={club.id} value={club.id}>{club.title}</option>
                            ))}
                        </select>
                    </div>
                    <Field label="Qiziqishi" value={formData.clubInterest} onChange={(value) => updateField("clubInterest", value)} required />
                    <Field label="Login" value={formData.username} onChange={(value) => updateField("username", value)} required autoComplete="username" />
                    <Field label="Parol" type="password" value={formData.password} onChange={(value) => updateField("password", value)} required autoComplete="new-password" />

                    <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-500 transition-colors disabled:opacity-50">
                        {loading ? "Yuborilmoqda..." : "Ro'yxatdan o'tish"}
                    </button>
                    <button type="button" onClick={goBack} className="w-full text-gray-500 text-sm hover:text-white transition-colors">Orqaga qaytish</button>
                </form>
            </div>
        </div>
    );
}

function Field({
    label,
    value,
    onChange,
    type = "text",
    required = false,
    autoComplete
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
    required?: boolean;
    autoComplete?: string;
}) {
    return (
        <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">{label}</label>
            <input
                type={type}
                required={required}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                autoComplete={autoComplete}
                className="bg-[#111827] border border-gray-800 text-white p-3 rounded-xl outline-none focus:border-blue-600 transition-all"
            />
        </div>
    );
}

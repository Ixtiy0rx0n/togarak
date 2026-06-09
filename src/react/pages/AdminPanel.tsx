import React, { useState, useEffect } from 'react';
import {
    getAdminDashboardData,
    createAdmin,
    createStudent,
    updateAdmin,
    deleteAdmin,
    upsertTeacher,
    deleteTeacher,
    updateStudent,
    deleteStudent,
    upsertClub,
    deleteClub,
    upsertGroup,
    deleteGroup,
    assignStudentToGroup
} from '../../core/store.js';
import { clearSession, getSession } from '../../core/session.js';
import { BarChart, DonutChart, MetricCard, ProgressList } from '../components/Analytics.js';
import type { Admin, Assignment, Club, Group, Lesson, Student, Submission, Teacher } from '../../core/types.js';

type DashboardData = {
    admins: Admin[];
    teachers: Teacher[];
    students: Student[];
    lessons: Lesson[];
    assignments: Assignment[];
    submissions: Submission[];
    clubs: Array<Club & { teacherName: string }>;
    groups: Array<Group & { clubName: string; teacherName: string; studentCount: number }>;
};

type EntityType = 'admin' | 'teacher' | 'student' | 'club' | 'group';

function toRecord<T extends object>(item: T | undefined): Record<string, unknown> | null {
    return item ? { ...item } as Record<string, unknown> : null;
}

const AdminPanel = ({ setPage, goBack }: { setPage: (page: string) => void; goBack: () => void }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const session = getSession();

    // Modal States
    const [modal, setModal] = useState<{ type: string | null, id: number | null }>({ type: null, id: null });
    const [viewModal, setViewModal] = useState<{ type: EntityType; item: Record<string, unknown> } | null>(null);
    const [formData, setFormData] = useState<any>({});

    useEffect(() => {
        if (session?.role !== 'admin') {
            setPage('adminLogin');
            return;
        }
        refreshData();
    }, []);

    const refreshData = async () => {
        setLoading(true);
        try {
            const result = await getAdminDashboardData();
            setData(result);
        } catch (e) {
            console.error("Failed to refresh data", e);
        } finally {
            setLoading(false);
        }
    };

    const findEntityById = (type: EntityType, id: number): Record<string, unknown> | null => {
        if (!data) return null;
        if (type === 'admin') return toRecord(data.admins.find(item => item.id === id));
        if (type === 'teacher') return toRecord(data.teachers.find(item => item.id === id));
        if (type === 'student') return toRecord(data.students.find(item => item.id === id));
        if (type === 'club') return toRecord(data.clubs.find(item => item.id === id));
        return toRecord(data.groups.find(item => item.id === id));
    };

    const handleViewById = (type: EntityType, id: number) => {
        const item = findEntityById(type, id);
        if (!item) {
            alert(`ID ${id} bo'yicha ma'lumot topilmadi.`);
            return;
        }
        setViewModal({ type, item });
    };

    const handleOpenModal = (type: EntityType, id: number | null = null) => {
        setModal({ type, id });
        if (id && data) {
            let item;
            if (type === 'admin') item = data.admins.find(a => a.id === id);
            if (type === 'teacher') item = data.teachers.find(t => t.id === id);
            if (type === 'student') item = data.students.find(s => s.id === id);
            if (type === 'club') item = data.clubs.find(c => c.id === id);
            if (type === 'group') item = data.groups.find(g => g.id === id);
            setFormData(item ? { ...item } : {});
        } else {
            setFormData({});
        }
    };

    const handleCloseModal = () => {
        setModal({ type: null, id: null });
        setFormData({});
    };

    const handleDelete = async (type: string, id: number) => {
        if (!confirm(`Haqiqatan ham ushbu ${type}ni o'chirmoqchimisiz?`)) return;

        try {
            if (type === 'admin') await deleteAdmin(id);
            if (type === 'teacher') await deleteTeacher(id);
            if (type === 'student') await deleteStudent(id);
            if (type === 'club') await deleteClub(id);
            if (type === 'group') await deleteGroup(id);
            await refreshData();
        } catch (e) {
            alert("O'chirishda xatolik yuz berdi");
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (modal.type === 'admin') {
                const result = modal.id
                    ? await updateAdmin(modal.id, formData.username, formData.password, formData.displayName)
                    : await createAdmin(formData.username, formData.password, formData.displayName);
                if (!result.ok) throw new Error(result.message);
            } else if (modal.type === 'teacher') {
                const result = await upsertTeacher({ ...formData, id: modal.id || undefined });
                if (!result.ok) throw new Error(result.message);
            } else if (modal.type === 'student') {
                const payload = { ...formData, age: formData.age ? Number(formData.age) : undefined, clubId: formData.clubId ? Number(formData.clubId) : undefined };
                const result = modal.id ? await updateStudent(modal.id, payload) : await createStudent(payload);
                if (!result.ok) throw new Error(result.message);
            } else if (modal.type === 'club') {
                await upsertClub({
                    id: modal.id || undefined,
                    title: formData.title,
                    paragraph: formData.paragraph,
                    description: formData.description,
                    imagePath: formData.imagePath || '/logo.png',
                    teacherId: formData.teacherId ? Number(formData.teacherId) : null
                });
            } else if (modal.type === 'group') {
                await upsertGroup({
                    id: modal.id || undefined,
                    name: formData.name,
                    clubId: Number(formData.clubId),
                    teacherId: formData.teacherId ? Number(formData.teacherId) : null,
                    schedule: formData.schedule,
                    studentIds: formData.studentIds
                });
            }
            handleCloseModal();
            await refreshData();
        } catch (e: any) {
            alert(e.message || "Saqlashda xatolik");
        }
    };

    if (loading && !data) return <div className="p-10 text-center">Yuklanmoqda...</div>;

    return (
        <div className="flex h-screen overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 bg-[#0d1520] border-r border-gray-800 flex flex-col shrink-0">
                <div className="p-5 border-b border-gray-800 flex items-center gap-3">
                    <img src="/logo.png" className="w-9 h-9 rounded-full bg-white p-1" alt="Logo" />
                    <span className="text-lg font-bold text-white">Tugarak.uz</span>
                </div>
                <nav className="flex-1 p-3 space-y-1">
                    {[
                        { id: 'overview', label: '📊 Umumiy ko\'rinish' },
                        { id: 'admins', label: '🔐 Adminlar' },
                        { id: 'teachers', label: '👨‍🏫 O\'qituvchilar' },
                        { id: 'students', label: '🎓 O\'quvchilar' },
                        { id: 'clubs', label: '🏫 To\'garaklar' },
                        { id: 'groups', label: '📋 Guruhlar' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30' : 'text-gray-400 hover:bg-gray-800/50'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
                <div className="p-3 border-t border-gray-800">
                    <button onClick={() => { clearSession(); setPage('home'); }} className="w-full text-red-400 bg-red-500/10 py-2.5 rounded-xl text-sm hover:bg-red-500/20 transition-colors">Chiqish</button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden">
                <header className="bg-[#0d1520] border-b border-gray-800 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={goBack} className="rounded-xl border border-gray-800 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800">Orqaga</button>
                        <h2 className="text-lg font-bold text-white capitalize">{activeTab.replace('_', ' ')}</h2>
                    </div>
                    <button onClick={() => setPage('home')} className="text-sm text-gray-500 hover:text-white">← Saytga qaytish</button>
                </header>

                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'overview' && data && <AdminAnalytics data={data} />}

                    {activeTab === 'admins' && (
                        <div className="space-y-4">
                            <div className="flex justify-between">
                                <h3 className="text-lg font-bold text-white">Adminlar</h3>
                                <button onClick={() => handleOpenModal('admin')} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm">+ Yangi admin</button>
                            </div>
                            <Table data={data?.admins} columns={['ID', 'Ism', 'Login']}
                                renderRow={(item) => (
                                    <tr onClick={() => handleViewById('admin', item.id)} className="border-t border-gray-800 cursor-pointer hover:bg-gray-800/30 transition-colors">
                                        <td className="px-4 py-3 text-gray-500">{item.id}</td>
                                        <td className="px-4 py-3 text-white font-medium">{item.displayName}</td>
                                        <td className="px-4 py-3 text-gray-400">{item.username}</td>
                                        <td className="px-4 py-3 text-right space-x-2">
                                            <ActionButton variant="edit" onClick={() => handleOpenModal('admin', item.id)}>Tahrirlash</ActionButton>
                                            {item.id !== 1 && (
                                                <ActionButton variant="danger" onClick={() => handleDelete('admin', item.id)}>O'chirish</ActionButton>
                                            )}
                                        </td>
                                    </tr>
                                )}
                            />
                        </div>
                    )}

                    {activeTab === 'teachers' && (
                        <div className="space-y-4">
                            <div className="flex justify-between">
                                <h3 className="text-lg font-bold text-white">O'qituvchilar</h3>
                                <button onClick={() => handleOpenModal('teacher')} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm">+ Yangi o'qituvchi</button>
                            </div>
                            <Table data={data?.teachers} columns={['Ism', 'Fan', 'Telefon', 'Login', 'Amal']}
                                renderRow={(item) => (
                                    <tr onClick={() => handleViewById('teacher', item.id)} className="border-t border-gray-800 cursor-pointer hover:bg-gray-800/30 transition-colors">
                                        <td className="px-4 py-3 text-white font-medium">{item.firstName} {item.lastName}</td>
                                        <td className="px-4 py-3 text-gray-400">{item.subject}</td>
                                        <td className="px-4 py-3 text-gray-400">{item.phone}</td>
                                        <td className="px-4 py-3 text-gray-400">{item.username}</td>
                                        <td className="px-4 py-3 text-right space-x-2">
                                            <ActionButton variant="edit" onClick={() => handleOpenModal('teacher', item.id)}>Tahrirlash</ActionButton>
                                            <ActionButton variant="danger" onClick={() => handleDelete('teacher', item.id)}>O'chirish</ActionButton>
                                        </td>
                                    </tr>
                                )}
                            />
                        </div>
                    )}

                    {activeTab === 'students' && (
                        <div className="space-y-4">
                            <div className="flex justify-between">
                                <h3 className="text-lg font-bold text-white">O'quvchilar</h3>
                                <button onClick={() => handleOpenModal('student')} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm">+ Yangi o'quvchi</button>
                            </div>
                            <Table data={data?.students} columns={['Ism', 'Telefon', 'O\'qish joyi', 'Qiziqishi', 'Login', 'Amal']}
                                renderRow={(item) => (
                                    <tr onClick={() => handleViewById('student', item.id)} className="border-t border-gray-800 cursor-pointer hover:bg-gray-800/30 transition-colors">
                                        <td className="px-4 py-3 text-white font-medium">{item.firstName} {item.lastName}</td>
                                        <td className="px-4 py-3 text-gray-400">{item.phone}</td>
                                        <td className="px-4 py-3 text-gray-400">{item.school || '-'}</td>
                                        <td className="px-4 py-3 text-gray-400">{item.clubInterest}</td>
                                        <td className="px-4 py-3 text-gray-400">{item.username}</td>
                                        <td className="px-4 py-3 text-right space-x-2">
                                            <ActionButton variant="edit" onClick={() => handleOpenModal('student', item.id)}>Tahrirlash</ActionButton>
                                            <ActionButton variant="danger" onClick={() => handleDelete('student', item.id)}>O'chirish</ActionButton>
                                        </td>
                                    </tr>
                                )}
                            />
                        </div>
                    )}

                    {activeTab === 'clubs' && (
                        <div className="space-y-4">
                            <div className="flex justify-between">
                                <h3 className="text-lg font-bold text-white">To'garaklar</h3>
                                <button onClick={() => handleOpenModal('club')} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm">+ Yangi to'garak</button>
                            </div>
                            <Table data={data?.clubs} columns={['To\'garak', 'O\'qituvchi', 'Amal']}
                                renderRow={(item) => (
                                    <tr onClick={() => handleViewById('club', item.id)} className="border-t border-gray-800 cursor-pointer hover:bg-gray-800/30 transition-colors">
                                        <td className="px-4 py-3 text-white font-medium">{item.title}</td>
                                        <td className="px-4 py-3 text-gray-400">{item.teacherName || 'Biriktirilmagan'}</td>
                                        <td className="px-4 py-3 text-right space-x-2">
                                            <ActionButton variant="edit" onClick={() => handleOpenModal('club', item.id)}>Tahrirlash</ActionButton>
                                            <ActionButton variant="danger" onClick={() => handleDelete('club', item.id)}>O'chirish</ActionButton>
                                        </td>
                                    </tr>
                                )}
                            />
                        </div>
                    )}

                    {activeTab === 'groups' && (
                        <div className="space-y-4">
                            <div className="flex justify-between">
                                <h3 className="text-lg font-bold text-white">Guruhlar</h3>
                                <button onClick={() => handleOpenModal('group')} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm">+ Yangi guruh</button>
                            </div>
                            <Table data={data?.groups} columns={['Guruh', 'To\'garak', 'O\'qituvchi', 'Jadval', 'Amal']}
                                renderRow={(item) => (
                                    <tr onClick={() => handleViewById('group', item.id)} className="border-t border-gray-800 cursor-pointer hover:bg-gray-800/30 transition-colors">
                                        <td className="px-4 py-3 text-white font-medium">{item.name}</td>
                                        <td className="px-4 py-3 text-gray-400">{item.clubName}</td>
                                        <td className="px-4 py-3 text-gray-400">{item.teacherName}</td>
                                        <td className="px-4 py-3 text-gray-400">{item.schedule}</td>
                                        <td className="px-4 py-3 text-right space-x-2">
                                            <ActionButton variant="edit" onClick={() => handleOpenModal('group', item.id)}>Tahrirlash</ActionButton>
                                            <ActionButton variant="danger" onClick={() => handleDelete('group', item.id)}>O'chirish</ActionButton>
                                        </td>
                                    </tr>
                                )}
                            />
                        </div>
                    )}
                </div>
            </main>

            {/* Modals */}
            {modal.type && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#0d1520] border border-gray-800 rounded-2xl w-full max-w-md p-6">
                        <div className="flex justify-between mb-5">
                            <button type="button" onClick={handleCloseModal} className="text-sm text-gray-500 hover:text-white">Orqaga</button>
                            <h3 className="text-lg font-bold text-white">
                                {modal.id ? `${modal.type}ni tahrirlash` : `Yangi ${modal.type} qo'shish`}
                            </h3>
                            <button onClick={handleCloseModal} className="text-gray-500 hover:text-white text-2xl">&times;</button>
                        </div>
                        <form onSubmit={handleSave} className="space-y-4">
                            {modal.type === 'admin' && (
                                <>
                                    <InputField label="Ko'rsatiladigan ism" value={formData.displayName} onChange={v => setFormData({...formData, displayName: v})} required />
                                    <InputField label="Login" value={formData.username} onChange={v => setFormData({...formData, username: v})} required />
                                    <InputField label="Parol" type="password" value={formData.password} onChange={v => setFormData({...formData, password: v})} required />
                                </>
                            )}
                            {modal.type === 'teacher' && (
                                <>
                                    <div className="grid grid-cols-2 gap-3">
                                        <InputField label="Ism" value={formData.firstName} onChange={v => setFormData({...formData, firstName: v})} required />
                                        <InputField label="Familiya" value={formData.lastName} onChange={v => setFormData({...formData, lastName: v})} required />
                                    </div>
                                    <InputField label="Telefon raqami" value={formData.phone} onChange={v => setFormData({...formData, phone: v})} required />
                                    <InputField label="O'qitiladigan fan" value={formData.subject} onChange={v => setFormData({...formData, subject: v})} required />
                                    <InputField label="Login" value={formData.username} onChange={v => setFormData({...formData, username: v})} required />
                                    <InputField label="Parol" type="password" value={formData.password} onChange={v => setFormData({...formData, password: v})} required />
                                </>
                            )}
                            {modal.type === 'student' && (
                                <>
                                    <div className="grid grid-cols-2 gap-3">
                                        <InputField label="Ism" value={formData.firstName} onChange={v => setFormData({...formData, firstName: v})} />
                                        <InputField label="Familiya" value={formData.lastName} onChange={v => setFormData({...formData, lastName: v})} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <InputField label="Yosh" type="number" value={formData.age} onChange={v => setFormData({...formData, age: Number(v)})} />
                                        <InputField label="Telefon" value={formData.phone} onChange={v => setFormData({...formData, phone: v})} />
                                    </div>
                                    <InputField label="O'qish joyi" value={formData.school} onChange={v => setFormData({...formData, school: v})} />
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs text-gray-500">To'garak</label>
                                        <select
                                            className="w-full bg-[#111827] border border-gray-800 text-white p-3 rounded-xl outline-none focus:border-blue-600"
                                            value={formData.clubId || ''}
                                            onChange={e => {
                                                const club = data?.clubs.find(c => c.id === Number(e.target.value));
                                                setFormData({...formData, clubId: e.target.value ? Number(e.target.value) : undefined, clubInterest: club?.title ?? formData.clubInterest});
                                            }}
                                            required={!modal.id}
                                        >
                                            <option value="">Tanlang</option>
                                            {data?.clubs.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                                        </select>
                                    </div>
                                    <InputField label="Qiziqishi" value={formData.clubInterest} onChange={v => setFormData({...formData, clubInterest: v})} />
                                    <InputField label="Login" value={formData.username} onChange={v => setFormData({...formData, username: v})} />
                                    <InputField label="Parol" type="password" value={formData.password} onChange={v => setFormData({...formData, password: v})} />
                                </>
                            )}
                            {modal.type === 'club' && (
                                <>
                                    <InputField label="To'garak sarlavhasi" value={formData.title} onChange={v => setFormData({...formData, title: v})} required />
                                    <InputField label="Qisqa tavsif" value={formData.paragraph} onChange={v => setFormData({...formData, paragraph: v})} required />
                                    <InputField label="Rasm yo'li yoki data URL" value={formData.imagePath} onChange={v => setFormData({...formData, imagePath: v})} required />
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs text-gray-500">To'liq tavsif</label>
                                        <textarea
                                            className="w-full bg-[#111827] border border-gray-800 text-white p-3 rounded-xl outline-none focus:border-blue-600 transition-all"
                                            value={formData.description}
                                            onChange={e => setFormData({...formData, description: e.target.value})}
                                            required
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs text-gray-500">O'qituvchi</label>
                                        <select
                                            className="w-full bg-[#111827] border border-gray-800 text-white p-3 rounded-xl outline-none focus:border-blue-600"
                                            value={formData.teacherId || ''}
                                            onChange={e => setFormData({...formData, teacherId: e.target.value ? Number(e.target.value) : null})}
                                        >
                                            <option value="">Tanlang</option>
                                            {data?.teachers.map(t => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
                                        </select>
                                    </div>
                                </>
                            )}
                            {modal.type === 'group' && (
                                <>
                                    <InputField label="Guruh nomi" value={formData.name} onChange={v => setFormData({...formData, name: v})} required />
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs text-gray-500">To'garak</label>
                                        <select
                                            className="w-full bg-[#111827] border border-gray-800 text-white p-3 rounded-xl outline-none focus:border-blue-600"
                                            value={formData.clubId || ''}
                                            onChange={e => setFormData({...formData, clubId: Number(e.target.value)})}
                                            required
                                        >
                                            <option value="">Tanlang</option>
                                            {data?.clubs.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs text-gray-500">O'qituvchi</label>
                                        <select
                                            className="w-full bg-[#111827] border border-gray-800 text-white p-3 rounded-xl outline-none focus:border-blue-600"
                                            value={formData.teacherId || ''}
                                            onChange={e => setFormData({...formData, teacherId: e.target.value ? Number(e.target.value) : null})}
                                        >
                                            <option value="">Tanlang</option>
                                            {data?.teachers.map(t => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
                                        </select>
                                    </div>
                                    <InputField label="Dars jadvali" value={formData.schedule} onChange={v => setFormData({...formData, schedule: v})} required />
                                </>
                            )}
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={handleCloseModal} className="flex-1 bg-gray-700 hover:bg-gray-600 py-2.5 rounded-xl text-white text-sm transition-colors">Bekor qilish</button>
                                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors">Saqlash</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {viewModal && (
                <EntityViewModal
                    type={viewModal.type}
                    item={viewModal.item}
                    onClose={() => setViewModal(null)}
                />
            )}
        </div>
    );
};

const entityTitles: Record<EntityType, string> = {
    admin: "Admin",
    teacher: "O'qituvchi",
    student: "O'quvchi",
    club: "To'garak",
    group: "Guruh"
};

function AdminAnalytics({ data }: { data: DashboardData }) {
    const totalUsers = data.admins.length + data.teachers.length + data.students.length;
    const totalGroupStudents = data.groups.reduce((sum, group) => sum + group.studentCount, 0);
    const avgStudentsPerGroup = data.groups.length ? (totalGroupStudents / data.groups.length).toFixed(1) : "0";
    const assignedTeachers = new Set(data.groups.map((group) => group.teacherId).filter(Boolean)).size;
    const submissionRate = data.assignments.length && data.students.length
        ? Math.round((data.submissions.length / (data.assignments.length * data.students.length)) * 100)
        : 0;

    const clubStudentItems = data.clubs.map((club) => ({
        label: club.title,
        value: data.groups
            .filter((group) => group.clubId === club.id)
            .reduce((sum, group) => sum + group.studentCount, 0)
    }));

    const teacherLoadItems = data.teachers.map((teacher) => ({
        label: `${teacher.firstName} ${teacher.lastName}`,
        value: data.groups.filter((group) => group.teacherId === teacher.id).length
    }));

    const lessonByGroup = data.groups.map((group) => ({
        label: group.name,
        value: data.lessons.filter((lesson) => lesson.groupId === group.id).length
    }));

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
                <MetricCard label="Jami ishtirokchi" value={totalUsers} sub="GDPI to'garak ekotizimidagi akkauntlar" color="blue" />
                <MetricCard label="Talabalar" value={data.students.length} sub={`Har guruhda o'rtacha ${avgStudentsPerGroup} nafar`} color="cyan" />
                <MetricCard label="Yo'nalishlar" value={data.clubs.length} sub={`${data.groups.length} ta faol o'quv guruhi`} color="purple" />
                <MetricCard label="Dars materiallari" value={data.lessons.length} sub={`${data.assignments.length} ta amaliy topshiriq`} color="green" />
                <MetricCard label="Yuborilgan ishlar" value={data.submissions.length} sub={`${submissionRate}% umumiy faollik ko'rsatkichi`} color="orange" />
                <MetricCard label="Faol ustozlar" value={assignedTeachers} sub={`${data.teachers.length} ustozdan guruhlarga biriktirilgan`} color="pink" />
            </div>

            <div className="grid xl:grid-cols-2 gap-6">
                <DonutChart
                    title="GDPI platformasidagi rollar"
                    centerLabel="foydalanuvchi"
                    items={[
                        { label: "Adminlar", value: data.admins.length, color: "#3b82f6" },
                        { label: "O'qituvchilar", value: data.teachers.length, color: "#8b5cf6" },
                        { label: "O'quvchilar", value: data.students.length, color: "#10b981" }
                    ]}
                />
                <BarChart title="Yo'nalishlar bo'yicha talabalar qiziqishi" items={clubStudentItems} />
            </div>

            <div className="grid xl:grid-cols-3 gap-6">
                <ProgressList title="Ustozlar bo'yicha guruh yuklamasi" items={teacherLoadItems} />
                <ProgressList title="Guruhlar bo'yicha yaratilgan darslar" items={lessonByGroup} />
                <DonutChart
                    title="Ta'lim kontenti balansi"
                    centerLabel="yozuv"
                    items={[
                        { label: "Darslar", value: data.lessons.length, color: "#06b6d4" },
                        { label: "Vazifalar", value: data.assignments.length, color: "#f59e0b" },
                        { label: "Javoblar", value: data.submissions.length, color: "#10b981" }
                    ]}
                />
            </div>
        </div>
    );
}

const entityLabels: Record<EntityType, Record<string, string>> = {
    admin: {
        id: "ID",
        displayName: "Ko'rsatiladigan ism",
        username: "Login",
        password: "Parol"
    },
    teacher: {
        id: "ID",
        firstName: "Ism",
        lastName: "Familiya",
        phone: "Telefon",
        subject: "Fan",
        username: "Login",
        password: "Parol"
    },
    student: {
        id: "ID",
        firstName: "Ism",
        lastName: "Familiya",
        age: "Yosh",
        phone: "Telefon",
        school: "O'qish joyi",
        clubInterest: "Qiziqishi",
        username: "Login",
        password: "Parol"
    },
    club: {
        id: "ID",
        title: "Nomi",
        paragraph: "Qisqa tavsif",
        description: "To'liq tavsif",
        imagePath: "Rasm",
        teacherId: "O'qituvchi ID",
        teacherName: "O'qituvchi"
    },
    group: {
        id: "ID",
        name: "Nomi",
        clubId: "To'garak ID",
        clubName: "To'garak",
        teacherId: "O'qituvchi ID",
        teacherName: "O'qituvchi",
        schedule: "Jadval",
        studentIds: "O'quvchi IDlari",
        studentCount: "O'quvchilar soni"
    }
};

const entityFieldOrder: Record<EntityType, string[]> = {
    admin: ["id", "displayName", "username", "password"],
    teacher: ["id", "firstName", "lastName", "phone", "subject", "username", "password"],
    student: ["id", "firstName", "lastName", "age", "phone", "school", "clubInterest", "username", "password"],
    club: ["id", "title", "paragraph", "description", "imagePath", "teacherId", "teacherName"],
    group: ["id", "name", "clubId", "clubName", "teacherId", "teacherName", "schedule", "studentIds", "studentCount"]
};

function formatViewValue(value: unknown): string {
    if (value === null || value === undefined || value === "") return "-";
    if (Array.isArray(value)) return value.length ? value.join(", ") : "-";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
}

function EntityViewModal({ type, item, onClose }: { type: EntityType; item: Record<string, unknown>; onClose: () => void }) {
    const fields = entityFieldOrder[type];

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#0d1520] border border-gray-800 rounded-2xl w-full max-w-lg p-6">
                <div className="flex items-center justify-between gap-4 mb-5">
                    <button type="button" onClick={onClose} className="text-sm text-gray-500 hover:text-white">Orqaga</button>
                    <div className="text-center">
                        <h3 className="text-lg font-bold text-white">{entityTitles[type]} ma'lumoti</h3>
                        <p className="text-xs text-gray-500">ID: {formatViewValue(item.id)}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white text-2xl">&times;</button>
                </div>

                <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                    {fields.map((field) => (
                        <div key={field} className="rounded-xl border border-gray-800 bg-[#111827] p-3">
                            <div className="text-xs text-gray-500 mb-1">{entityLabels[type][field] ?? field}</div>
                            <div className="text-sm text-gray-200 break-words">{formatViewValue(item[field])}</div>
                        </div>
                    ))}
                </div>

                <button type="button" onClick={onClose} className="mt-5 w-full bg-gray-700 hover:bg-gray-600 py-2.5 rounded-xl text-white text-sm transition-colors">
                    Yopish
                </button>
            </div>
        </div>
    );
}

const StatCard = ({ label, value, color }: { label: string, value: any, color: string }) => {
    const colors: any = { blue: 'bg-blue-600/20 text-blue-400', purple: 'bg-purple-600/20 text-purple-400', green: 'bg-green-600/20 text-green-400', cyan: 'bg-cyan-600/20 text-cyan-400' };
    return (
        <div className="bg-[#0d1520] border border-gray-800 p-5 rounded-2xl flex items-center justify-between">
            <div>
                <div className="text-xs text-gray-500 font-medium uppercase">{label}</div>
                <div className="text-2xl font-bold text-white mt-1">{value}</div>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
                ✓
            </div>
        </div>
    );
};

const Table = ({ data, columns, renderRow }: { data: any[] | undefined, columns: string[], renderRow: (item: any) => React.ReactNode }) => {
    return (
        <div className="bg-[#0d1520] border border-gray-800 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-sm">
                <thead className="bg-gray-800/40 text-gray-400">
                    <tr>
                        {columns.map(col => <th key={col} className="px-4 py-3 font-medium">{col}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {data && data.length > 0 ? data.map((item, i) => <React.Fragment key={i}>{renderRow(item)}</React.Fragment>) :
                        <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-gray-600">Ma'lumotlar topilmadi</td></tr>
                    }
                </tbody>
            </table>
        </div>
    );
};

function ActionButton({
    children,
    onClick,
    variant
}: {
    children: React.ReactNode;
    onClick: () => void;
    variant: "edit" | "danger";
}) {
    const className = variant === "edit"
        ? "border-blue-500/50 bg-blue-600/10 text-blue-300 hover:bg-blue-600/20 hover:border-blue-400"
        : "border-red-500/50 bg-red-600/10 text-red-300 hover:bg-red-600/20 hover:border-red-400";

    return (
        <button
            type="button"
            onClick={(event) => {
                event.stopPropagation();
                onClick();
            }}
            className={`inline-flex min-w-24 items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${className}`}
        >
            {children}
        </button>
    );
}

type InputFieldProps = {
    label: string;
    value: string | number | undefined;
    onChange: (value: string) => void;
    type?: string;
    required?: boolean;
};

const InputField = ({ label, value, onChange, type = "text", required = false }: InputFieldProps) => (
    <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-500">{label}</label>
        <input
            type={type}
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            required={required}
            className="w-full bg-[#111827] border border-gray-800 text-white p-3 rounded-xl outline-none focus:border-blue-600 transition-all"
        />
    </div>
);

export default AdminPanel;

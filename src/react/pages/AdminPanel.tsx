import React, { useState, useEffect } from 'react';
import {
    getAdminDashboardData,
    createAdmin,
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
} from '../../core/store';
import type { Teacher, Student, Club, Group } from '../../core/types';

const AdminPanel = ({ setPage }: { setPage: (page: string) => void }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [data, setData] = useState<{
        admins: any[];
        teachers: Teacher[];
        students: Student[];
        clubs: any[];
        groups: any[];
    } | null>(null);
    const [loading, setLoading] = useState(true);

    // Modal States
    const [modal, setModal] = useState<{ type: string | null, id: number | null }>({ type: null, id: null });
    const [formData, setFormData] = useState<any>({});

    useEffect(() => {
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

    const handleOpenModal = (type: string, id: number | null = null) => {
        setModal({ type, id });
        if (id && data) {
            let item;
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
                await createAdmin(formData.username, formData.password, formData.displayName);
            } else if (modal.type === 'teacher') {
                await upsertTeacher({ ...formData, id: modal.id || undefined });
            } else if (modal.type === 'student') {
                if (!modal.id) throw new Error("O'quvchi faqat tahrirlanishi mumkin");
                await updateStudent(modal.id, formData);
            } else if (modal.type === 'club') {
                await upsertClub({ ...formData, id: modal.id || undefined });
            } else if (modal.type === 'group') {
                await upsertGroup({ ...formData, id: modal.id || undefined });
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
                    <button onClick={() => setPage('home')} className="w-full text-red-400 bg-red-500/10 py-2.5 rounded-xl text-sm hover:bg-red-500/20 transition-colors">Chiqish</button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden">
                <header className="bg-[#0d1520] border-b border-gray-800 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white capitalize">{activeTab.replace('_', ' ')}</h2>
                    <button onClick={() => setPage('home')} className="text-sm text-gray-500 hover:text-white">← Saytga qaytish</button>
                </header>

                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard label="Foydalanuvchilar" value={(data?.admins.length || 0) + (data?.teachers.length || 0) + (data?.students.length || 0)} color="blue" />
                            <StatCard label="To'garaklar" value={data?.clubs.length || 0} color="purple" />
                            <StatCard label="Guruhlar" value={data?.groups.length || 0} color="green" />
                            <StatCard label="O'quvchilar" value={data?.students.length || 0} color="cyan" />
                        </div>
                    )}

                    {activeTab === 'admins' && (
                        <div className="space-y-4">
                            <div className="flex justify-between">
                                <h3 className="text-lg font-bold text-white">Adminlar</h3>
                                <button onClick={() => handleOpenModal('admin')} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm">+ Yangi admin</button>
                            </div>
                            <Table data={data?.admins} columns={['ID', 'Ism', 'Login']}
                                renderRow={(item) => (
                                    <tr className="border-t border-gray-800">
                                        <td className="px-4 py-3 text-gray-500">{item.id}</td>
                                        <td className="px-4 py-3 text-white font-medium">{item.displayName}</td>
                                        <td className="px-4 py-3 text-gray-400">{item.username}</td>
                                        <td className="px-4 py-3 text-right">
                                            {item.id !== 1 && (
                                                <button onClick={() => handleDelete('admin', item.id)} className="text-red-400 hover:text-red-300 text-sm">O'chirish</button>
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
                                    <tr className="border-t border-gray-800">
                                        <td className="px-4 py-3 text-white font-medium">{item.firstName} {item.lastName}</td>
                                        <td className="px-4 py-3 text-gray-400">{item.subject}</td>
                                        <td className="px-4 py-3 text-gray-400">{item.phone}</td>
                                        <td className="px-4 py-3 text-gray-400">{item.username}</td>
                                        <td className="px-4 py-3 text-right space-x-2">
                                            <button onClick={() => handleOpenModal('teacher', item.id)} className="text-blue-400 hover:text-blue-300 text-sm">Tahrirlash</button>
                                            <button onClick={() => handleDelete('teacher', item.id)} className="text-red-400 hover:text-red-300 text-sm">O'chirish</button>
                                        </td>
                                    </tr>
                                )}
                            />
                        </div>
                    )}

                    {activeTab === 'students' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-white">O'quvchilar</h3>
                            <Table data={data?.students} columns={['Ism', 'Telefon', 'O\'qish joyi', 'Qiziqishi', 'Login', 'Amal']}
                                renderRow={(item) => (
                                    <tr className="border-t border-gray-800">
                                        <td className="px-4 py-3 text-white font-medium">{item.firstName} {item.lastName}</td>
                                        <td className="px-4 py-3 text-gray-400">{item.phone}</td>
                                        <td className="px-4 py-3 text-gray-400">{item.school || '-'}</td>
                                        <td className="px-4 py-3 text-gray-400">{item.clubInterest}</td>
                                        <td className="px-4 py-3 text-gray-400">{item.username}</td>
                                        <td className="px-4 py-3 text-right space-x-2">
                                            <button onClick={() => handleOpenModal('student', item.id)} className="text-blue-400 hover:text-blue-300 text-sm">Tahrirlash</button>
                                            <button onClick={() => handleDelete('student', item.id)} className="text-red-400 hover:text-red-300 text-sm">O'chirish</button>
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
                                    <tr className="border-t border-gray-800">
                                        <td className="px-4 py-3 text-white font-medium">{item.title}</td>
                                        <td className="px-4 py-3 text-gray-400">{item.teacherName || 'Biriktirilmagan'}</td>
                                        <td className="px-4 py-3 text-right space-x-2">
                                            <button onClick={() => handleOpenModal('club', item.id)} className="text-blue-400 hover:text-blue-300 text-sm">Tahrirlash</button>
                                            <button onClick={() => handleDelete('club', item.id)} className="text-red-400 hover:text-red-300 text-sm">O'chirish</button>
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
                                    <tr className="border-t border-gray-800">
                                        <td className="px-4 py-3 text-white font-medium">{item.name}</td>
                                        <td className="px-4 py-3 text-gray-400">{item.clubName}</td>
                                        <td className="px-4 py-3 text-gray-400">{item.teacherName}</td>
                                        <td className="px-4 py-3 text-gray-400">{item.schedule}</td>
                                        <td className="px-4 py-3 text-right space-x-2">
                                            <button onClick={() => handleOpenModal('group', item.id)} className="text-blue-400 hover:text-blue-300 text-sm">Tahrirlash</button>
                                            <button onClick={() => handleDelete('group', item.id)} className="text-red-400 hover:text-red-300 text-sm">O'chirish</button>
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
                                    <InputField label="Qiziqishi" value={formData.clubInterest} onChange={v => setFormData({...formData, clubInterest: v})} />
                                    <InputField label="Login" value={formData.username} onChange={v => setFormData({...formData, username: v})} />
                                    <InputField label="Parol" type="password" value={formData.password} onChange={v => setFormData({...formData, password: v})} />
                                </>
                            )}
                            {modal.type === 'club' && (
                                <>
                                    <InputField label="To'garak sarlavhasi" value={formData.title} onChange={v => setFormData({...formData, title: v})} required />
                                    <InputField label="Qisqa tavsif" value={formData.paragraph} onChange={v => setFormData({...formData, paragraph: v})} required />
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
                                            onChange={e => setFormData({...formData, teacherId: Number(e.target.value)})}
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
                                            onChange={e => setFormData({...formData, teacherId: Number(e.target.value)})}
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
        </div>
    );
};

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

const InputField = ({ label, value, onChange, type = "text", required = false }: any) => (
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

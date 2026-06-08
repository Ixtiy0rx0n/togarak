import React, { useState } from 'react';
import { registerStudent } from '../../core/store';

const Register = ({ setPage }: { setPage: (page: string) => void }) => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        age: '',
        phone: '',
        school: '',
        clubInterest: '',
        username: '',
        password: '',
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        try {
            const result = await registerStudent({
                ...formData,
                age: formData.age ? Number(formData.age) : undefined,
            });
            if (result.ok) {
                setMessage({ type: 'success', text: result.message });
                setTimeout(() => setPage('home'), 3000);
            } else {
                setMessage({ type: 'error', text: result.message });
            }
        } catch (e: any) {
            setMessage({ type: 'error', text: e.message || "Xatolik yuz berdi" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#0a0f1e]">
            <div className="bg-[#0d1520] border border-gray-800 rounded-2xl w-full max-w-md p-8 shadow-2xl">
                <div className="text-center mb-8">
                    <img src="/logo.png" className="w-16 h-16 object-contain bg-white rounded-full p-1.5 mx-auto mb-4" alt="Logo" />
                    <h1 className="text-2xl font-bold text-white">Ro'yxatdan o'tish</h1>
                    <p className="text-gray-500 text-sm mt-1">Tugarak.uz ga xush kelibsiz</p>
                </div>

                {message && (
                    <div className={`p-3 rounded-xl text-sm mb-6 border ${message.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-gray-500">Ism</label>
                            <input type="text" required className="bg-[#111827] border border-gray-800 text-white p-3 rounded-xl outline-none focus:border-blue-600 transition-all"
                                value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-gray-500">Familiya</label>
                            <input type="text" required className="bg-[#111827] border border-gray-800 text-white p-3 rounded-xl outline-none focus:border-blue-600 transition-all"
                                value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-gray-500">Yosh</label>
                            <input type="number" className="bg-[#111827] border border-gray-800 text-white p-3 rounded-xl outline-none focus:border-blue-600 transition-all"
                                value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-gray-500">Telefon</label>
                            <input type="text" required className="bg-[#111827] border border-gray-800 text-white p-3 rounded-xl outline-none focus:border-blue-600 transition-all"
                                value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-500">O'qish joyi</label>
                        <input type="text" className="bg-[#111827] border border-gray-800 text-white p-3 rounded-xl outline-none focus:border-blue-600 transition-all"
                            value={formData.school} onChange={e => setFormData({...formData, school: e.target.value})} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-500">Qiziqishi</label>
                        <input type="text" required className="bg-[#111827] border border-gray-800 text-white p-3 rounded-xl outline-none focus:border-blue-600 transition-all"
                            value={formData.clubInterest} onChange={e => setFormData({...formData, clubInterest: e.target.value})} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-500">Login</label>
                        <input type="text" required className="bg-[#111827] border border-gray-800 text-white p-3 rounded-xl outline-none focus:border-blue-600 transition-all"
                            value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-500">Parol</label>
                        <input type="password" required className="bg-[#111827] border border-gray-800 text-white p-3 rounded-xl outline-none focus:border-blue-600 transition-all"
                            value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                    </div>
                    <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-500 transition-colors disabled:opacity-50">
                        {loading ? 'Yuborilmoqda...' : 'Ro\'yxatdan o\'tish'}
                    </button>
                    <button type="button" onClick={() => setPage('home')} className="w-full text-gray-500 text-sm hover:text-white transition-colors">Orqaga qaytish</button>
                </form>
            </div>
        </div>
    );
};

export default Register;

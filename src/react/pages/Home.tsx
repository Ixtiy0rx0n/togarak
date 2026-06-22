import React, { useState, useEffect } from 'react';
import { clubImageSrc, getPublicSnapshot } from '../../core/store.js';
import type { Club } from '../../core/types';

const Home = ({ setPage }: { setPage: (page: string) => void }) => {
    const [clubs, setClubs] = useState<Club[]>([]);
    const [stats, setStats] = useState({ clubs: 0, students: 0 });
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        async function loadData() {
            const snapshot = await getPublicSnapshot();
            setClubs(snapshot.clubs);
            setStats(snapshot.stats);
        }
        loadData();
    }, []);

    const filteredClubs = clubs.filter(c =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.paragraph.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex min-h-screen relative overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 bg-[#0d1520] border-r border-gray-800 hidden md:flex flex-col shrink-0 z-10">
                <div className="p-6 border-b border-gray-800">
                    <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setPage('home')}>
                        <img src="/logo.jpg" alt="GDPI" className="w-12 h-12 object-contain bg-white rounded-full p-1 shadow-lg shadow-blue-900/30 group-hover:scale-105 transition-transform" />
                        <span className="text-xl font-bold text-white tracking-tight">GDPI To'garak</span>
                    </div>
                </div>
                <nav className="flex-1 py-6 px-4 space-y-2">
                    <button onClick={() => setPage('home')} className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium bg-blue-600/10 text-blue-400 border border-blue-500/20">Bosh sahifa</button>
                    <button onClick={() => setPage('clubs')} className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors">To'garaklar</button>
                    <button onClick={() => setPage('about')} className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors">Biz haqimizda</button>
                    <button onClick={() => setPage('contact')} className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors">Aloqa</button>
                    <button onClick={() => setPage('adminLogin')} className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors">Admin Panel</button>
                </nav>
                <div className="p-6 border-t border-gray-800 space-y-3">
                    <button onClick={() => setPage('login')} className="block w-full text-center text-sm font-medium text-gray-300 hover:text-white px-4 py-3 rounded-xl hover:bg-gray-800 transition-all">Kirish</button>
                    <button onClick={() => setPage('register')} className="block w-full text-center text-sm font-medium bg-blue-600 text-white px-4 py-3 rounded-xl hover:bg-blue-500 transition-all shadow-md shadow-blue-900/50">Ro'yxatdan o'tish</button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col relative z-10">
                <header className="md:hidden bg-[#0d1520] border-b border-gray-800 sticky top-0 z-20">
                    <div className="px-6 py-4 flex justify-between items-center">
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setPage('home')}>
                            <img src="/logo.jpg" alt="GDPI" className="w-9 h-9 object-contain bg-white rounded-full p-0.5 shadow-sm" />
                            <span className="text-lg font-bold text-white">GDPI To'garak</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setPage('about')} className="text-sm text-gray-400">Biz haqimizda</button>
                            <button onClick={() => setPage('contact')} className="text-sm text-gray-400">Aloqa</button>
                            <button onClick={() => setPage('adminLogin')} className="text-sm text-blue-400">Admin</button>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto">
                    {/* Hero Section */}
                    <section className="relative bg-[#0d1520] text-white py-16 md:py-24 overflow-hidden border-b border-gray-800">
                        <div className="container mx-auto px-6 lg:px-12 relative z-10">
                            <span className="inline-block py-1.5 px-4 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-6">
                                Guliston davlat pedagogika instituti to'garaklari
                            </span>
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight tracking-tight text-white max-w-4xl">
                                GDPI talabalari uchun <br className="hidden md:block" />
                                <span className="text-blue-500">ijod, fan va kasb mahorati maydoni</span>
                            </h1>
                            <p className="text-lg text-gray-400 mb-10 max-w-2xl font-light leading-relaxed">
                                To'garaklar orqali darsdan tashqari bilimni amaliyotga aylantiring: olimpiada tayyorgarligi, IT loyihalar, til amaliyoti, pedagogik mahorat va ijodiy tashabbuslar bir joyda.
                            </p>

                            <div className="flex flex-col md:flex-row max-w-3xl bg-[#1a2234] border border-gray-700 rounded-xl p-1.5 shadow-2xl gap-2 md:gap-0">
                                <div className="flex-1 flex items-center px-4">
                                    <input
                                        type="text"
                                        placeholder="Matematika, IT, ingliz tili yoki pedagogik klubni qidiring..."
                                        className="w-full bg-transparent px-3 py-3 text-gray-200 placeholder-gray-500 focus:outline-none md:text-base"
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <button onClick={() => setPage('clubs')} className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-500 transition-colors w-full md:w-auto text-center">Barchasini ko'rish</button>
                            </div>

                            <div className="mt-12 flex items-center gap-8 text-sm text-gray-400 font-medium">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                    <span className="font-bold text-white">{stats.clubs}</span> To'garaklar
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                    <span className="font-bold text-white">{stats.students}</span> O'quvchi
                                </div>
                            </div>

                            <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl">
                                <InfoTile title="Amaliy portfel" text="Har bir to'garak talabaning kelajakdagi kasbiy portfeliga qo'shiladigan real ish, loyiha yoki natija bilan bog'lanadi." />
                                <InfoTile title="Ustoz bilan yaqin ishlash" text="Guruhlar orqali ustozlar dars, topshiriq va javoblarni kuzatadi; talaba esa o'z rivojlanish sur'atini ko'radi." />
                                <InfoTile title="Institut hayotiga qo'shilish" text="Platforma faol talabalarni ilmiy, ijodiy va ijtimoiy tashabbuslarga tezroq olib kiradi." />
                            </div>
                        </div>
                    </section>

                    {/* Featured Clubs */}
                    <section className="container mx-auto px-6 lg:px-12 py-16">
                        <div className="flex justify-between items-end mb-8 border-b border-gray-800 pb-4">
                            <div>
                                <h2 className="text-2xl md:text-3xl font-bold text-white">GDPI talabalari tanlayotgan yo'nalishlar</h2>
                                <p className="text-sm text-gray-500 mt-2">Fan, texnologiya, til va pedagogik mahorat bo'yicha faol to'garaklar.</p>
                            </div>
                            <button onClick={() => setPage('clubs')} className="hidden md:inline-flex items-center gap-2 text-sm text-blue-500 font-medium hover:text-blue-400">Katalogga o'tish</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                            {filteredClubs.slice(0, 8).map(club => (
                                <div key={club.id} className="bg-[#0d1520] border border-gray-800 rounded-2xl overflow-hidden hover:border-blue-500/50 transition-all group">
                                    <div className="h-48 overflow-hidden">
                                        <img src={clubImageSrc(club.imagePath)} alt={club.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                    </div>
                                    <div className="p-5">
                                        <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">{club.title}</h3>
                                        <p className="text-sm text-gray-400 line-clamp-2 mb-4">{club.paragraph}</p>
                                        <button onClick={() => setPage('clubs')} className="w-full py-2 rounded-lg bg-blue-600/10 text-blue-400 text-sm font-medium hover:bg-blue-600 hover:text-white transition-all">Yo'nalishni ko'rish</button>
                                    </div>
                                </div>
                            ))}
                            {filteredClubs.length === 0 && (
                                <div className="col-span-full py-10 text-center text-gray-600">Hech narsa topilmadi</div>
                            )}
                        </div>
                    </section>

                    {/* CTA Section */}
                    <section className="py-12 border-t border-gray-800">
                        <div className="container mx-auto px-6 lg:px-12">
                            <div className="bg-gradient-to-r from-blue-900 to-[#0d1b2a] rounded-2xl p-8 md:p-10 flex flex-col md:flex-row items-center justify-between text-white border border-blue-800/50 shadow-2xl">
                                <div>
                                    <h2 className="text-2xl font-bold mb-2">GDPI to'garak faoliyatini raqamli boshqaring</h2>
                                    <p className="text-blue-200 text-sm">Ustozlar dars va topshiriqlarni joylaydi, adminlar yo'nalishlar va guruhlar dinamikasini kuzatadi.</p>
                                </div>
                                <div className="flex flex-wrap gap-3 mt-6 md:mt-0">
                                    <button onClick={() => setPage('about')} className="bg-white/10 px-5 py-3 rounded-lg hover:bg-white/20 transition-colors">Biz haqimizda</button>
                                    <button onClick={() => setPage('contact')} className="bg-white/10 px-5 py-3 rounded-lg hover:bg-white/20 transition-colors">Aloqa</button>
                                    <button onClick={() => setPage('adminLogin')} className="bg-white/10 px-5 py-3 rounded-lg hover:bg-white/20 transition-colors">Admin Panel</button>
                                    <button onClick={() => setPage('teacherLogin')} className="bg-blue-600 px-5 py-3 rounded-lg hover:bg-blue-500 transition-colors">Teacher Panel</button>
                                </div>
                            </div>
                        </div>
                    </section>
                </main>
            </div>
        </div>
    );
};

function InfoTile({ title, text }: { title: string; text: string }) {
    return (
        <div className="rounded-2xl border border-gray-800 bg-[#111827]/80 p-5">
            <h3 className="text-white font-bold">{title}</h3>
            <p className="text-sm text-gray-400 mt-2 leading-relaxed">{text}</p>
        </div>
    );
}

export default Home;

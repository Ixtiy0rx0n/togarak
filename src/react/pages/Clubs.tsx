import { useEffect, useMemo, useState } from "react";
import { clubImageSrc, getPublicSnapshot } from "../../core/store.js";

type ClubView = Awaited<ReturnType<typeof getPublicSnapshot>>["clubs"][number];

export default function Clubs({ setPage, goBack }: { setPage: (page: string) => void; goBack: () => void }) {
    const [clubs, setClubs] = useState<ClubView[]>([]);
    const [query, setQuery] = useState("");

    useEffect(() => {
        void getPublicSnapshot().then((snapshot) => setClubs(snapshot.clubs));
    }, []);

    const visibleClubs = useMemo(() => {
        const term = query.trim().toLowerCase();
        if (!term) return clubs;
        return clubs.filter((club) => `${club.title} ${club.paragraph} ${club.description} ${club.teacherName}`.toLowerCase().includes(term));
    }, [clubs, query]);

    return (
        <div className="min-h-screen bg-[#0a0f1e]">
            <header className="border-b border-gray-800 bg-[#0d1520] px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={goBack} className="rounded-xl border border-gray-800 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800">Orqaga</button>
                    <button onClick={() => setPage("home")} className="flex items-center gap-3">
                        <img src="/logo.png" className="w-10 h-10 rounded-full bg-white p-1" alt="Logo" />
                        <span className="text-white font-bold">GDPI To'garak</span>
                    </button>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => setPage("about")} className="text-sm text-gray-400 hover:text-white">Biz haqimizda</button>
                    <button onClick={() => setPage("contact")} className="text-sm text-gray-400 hover:text-white">Aloqa</button>
                    <button onClick={() => setPage("register")} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm">Ro'yxatdan o'tish</button>
                </div>
            </header>
            <main className="container mx-auto px-6 py-10">
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white">GDPI to'garaklari</h1>
                        <p className="text-gray-500 mt-2">Talabaning iqtidorini amaliy loyiha, fan yutug'i va kasbiy mahoratga aylantiradigan yo'nalishlar.</p>
                    </div>
                    <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Qidirish..." className="w-full md:w-80 bg-[#111827] border border-gray-800 text-white p-3 rounded-xl outline-none focus:border-blue-600" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {visibleClubs.map((club) => (
                        <article key={club.id} className="bg-[#0d1520] border border-gray-800 rounded-2xl overflow-hidden">
                            <img src={clubImageSrc(club.imagePath)} alt={club.title} className="h-52 w-full object-cover bg-gray-900" />
                            <div className="p-5">
                                <h2 className="text-xl font-bold text-white">{club.title}</h2>
                                <p className="text-sm text-gray-400 mt-2">{club.paragraph}</p>
                                <p className="text-sm text-gray-500 mt-3">{club.description}</p>
                                <p className="text-xs text-blue-400 mt-4">Mas'ul ustoz: {club.teacherName}</p>
                            </div>
                        </article>
                    ))}
                    {!visibleClubs.length && <div className="col-span-full py-12 text-center text-gray-600">Ma'lumot topilmadi</div>}
                </div>
            </main>
        </div>
    );
}

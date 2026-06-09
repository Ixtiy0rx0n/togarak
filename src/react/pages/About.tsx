export default function About({ setPage, goBack }: { setPage: (page: string) => void; goBack: () => void }) {
    return (
        <div className="min-h-screen bg-[#0a0f1e] text-gray-300">
            <PageHeader title="Biz haqimizda" setPage={setPage} goBack={goBack} />
            <main className="container mx-auto px-6 lg:px-12 py-10 space-y-10">
                <section className="max-w-4xl">
                    <span className="inline-block py-1.5 px-4 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-5">
                        GDPI to'garaklar platformasi
                    </span>
                    <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
                        Talabaning qiziqishi, ustoz tajribasi va amaliy natija bir joyda.
                    </h1>
                    <p className="mt-5 text-lg text-gray-400 leading-relaxed">
                        Ushbu platforma Guliston davlat pedagogika instituti talabalarining darsdan tashqari faoliyatini raqamli tarzda tashkil etish uchun yaratilgan. Maqsadimiz - har bir talabaga o'z qiziqishiga mos to'garak topish, ustozlar bilan tizimli ishlash va o'z natijalarini ko'rib borish imkonini berish.
                    </p>
                </section>

                <section className="grid md:grid-cols-3 gap-5">
                    <InfoCard title="Maqsadimiz" text="GDPI talabalarini fan, texnologiya, ijod, til va pedagogik mahorat yo'nalishlarida faolroq ishtirok etishga undash." />
                    <InfoCard title="Yondashuvimiz" text="Har bir to'garakni guruh, dars, topshiriq va javoblar bilan bog'lab, oddiy ro'yxatdan o'tishni real o'quv jarayoniga aylantirish." />
                    <InfoCard title="Natija" text="Talaba o'z amaliy portfelini boyitadi, ustoz esa guruh faolligi va topshiriqlar bajarilishini kuzatib boradi." />
                </section>

                <section className="grid lg:grid-cols-2 gap-6">
                    <div className="rounded-2xl border border-gray-800 bg-[#0d1520] p-6">
                        <h2 className="text-2xl font-bold text-white mb-4">Platforma kimlar uchun?</h2>
                        <div className="space-y-4">
                            <ListItem title="Talabalar" text="O'ziga mos to'garakni tanlaydi, guruhga biriktiriladi, dars va topshiriqlarni kuzatadi." />
                            <ListItem title="Ustozlar" text="Guruhlar bilan ishlaydi, dars materiallari va amaliy topshiriqlar joylaydi." />
                            <ListItem title="Adminlar" text="To'garaklar, guruhlar, foydalanuvchilar va umumiy statistikani boshqaradi." />
                        </div>
                    </div>
                    <div className="rounded-2xl border border-gray-800 bg-[#0d1520] p-6">
                        <h2 className="text-2xl font-bold text-white mb-4">Nega bu muhim?</h2>
                        <p className="text-gray-400 leading-relaxed">
                            Pedagogika instituti talabasi uchun nazariy bilim bilan birga amaliy tajriba ham zarur. To'garaklar aynan shu ko'prik vazifasini bajaradi: talaba o'z iqtidorini sinaydi, jamoada ishlaydi, ustozdan fikr oladi va kelajak kasbi uchun kerakli ko'nikmalarni shakllantiradi.
                        </p>
                        <button onClick={() => setPage("clubs")} className="mt-6 rounded-xl bg-blue-600 px-5 py-3 text-white font-medium hover:bg-blue-500">
                            To'garaklarni ko'rish
                        </button>
                    </div>
                </section>
            </main>
        </div>
    );
}

function PageHeader({ title, setPage, goBack }: { title: string; setPage: (page: string) => void; goBack: () => void }) {
    return (
        <header className="border-b border-gray-800 bg-[#0d1520] px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <button onClick={goBack} className="rounded-xl border border-gray-800 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800">Orqaga</button>
                <button onClick={() => setPage("home")} className="flex items-center gap-3">
                    <img src="/logo.png" className="w-10 h-10 rounded-full bg-white p-1" alt="GDPI" />
                    <span className="text-white font-bold">{title}</span>
                </button>
            </div>
            <button onClick={() => setPage("contact")} className="text-sm text-blue-400 hover:text-blue-300">Aloqa</button>
        </header>
    );
}

function InfoCard({ title, text }: { title: string; text: string }) {
    return (
        <div className="rounded-2xl border border-gray-800 bg-[#0d1520] p-5">
            <h3 className="text-white font-bold">{title}</h3>
            <p className="mt-2 text-sm text-gray-400 leading-relaxed">{text}</p>
        </div>
    );
}

function ListItem({ title, text }: { title: string; text: string }) {
    return (
        <div className="rounded-xl border border-gray-800 bg-[#111827] p-4">
            <h3 className="text-white font-semibold">{title}</h3>
            <p className="text-sm text-gray-400 mt-1">{text}</p>
        </div>
    );
}

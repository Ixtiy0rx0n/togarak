export default function Contact({ setPage, goBack }: { setPage: (page: string) => void; goBack: () => void }) {
    return (
        <div className="min-h-screen bg-[#0a0f1e] text-gray-300">
            <header className="border-b border-gray-800 bg-[#0d1520] px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={goBack} className="rounded-xl border border-gray-800 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800">Orqaga</button>
                    <button onClick={() => setPage("home")} className="flex items-center gap-3">
                        <img src="/logo.jpg" className="w-10 h-10 rounded-full bg-white p-1" alt="GDPI" />
                        <span className="text-white font-bold">Aloqa</span>
                    </button>
                </div>
                <button onClick={() => setPage("about")} className="text-sm text-blue-400 hover:text-blue-300">Biz haqimizda</button>
            </header>

            <main className="container mx-auto px-6 lg:px-12 py-10">
                <section className="max-w-4xl mb-10">
                    <span className="inline-block py-1.5 px-4 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-5">
                        Savol, taklif va hamkorlik
                    </span>
                    <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
                        GDPI to'garaklari bo'yicha bog'lanish
                    </h1>
                    <p className="mt-5 text-lg text-gray-400 leading-relaxed">
                        To'garakka yozilish, guruhga biriktirish, dars materiallari yoki platformadan foydalanish bo'yicha savollaringiz bo'lsa, mas'ul bo'lim bilan bog'laning.
                    </p>
                </section>

                <section className="grid lg:grid-cols-[1fr_1.2fr] gap-6">
                    <div className="space-y-4">
                        <ContactCard title="Manzil" value="Guliston shahri, Guliston davlat pedagogika instituti" />
                        <ContactCard title="Mas'ul bo'lim" value="Talabalar bilan ishlash va to'garaklar koordinatsiyasi" />
                        <ContactCard title="Ish vaqti" value="Dushanba - Shanba, 09:00 - 17:00" />
                        <ContactCard title="Elektron murojaat" value="togarak@gdpi.uz" />
                    </div>

                    <div className="rounded-2xl border border-gray-800 bg-[#0d1520] p-6">
                        <h2 className="text-2xl font-bold text-white mb-2">Murojaat yo'nalishlari</h2>
                        <p className="text-sm text-gray-500 mb-5">Quyidagi masalalar bo'yicha admin yoki mas'ul ustozga murojaat qilishingiz mumkin.</p>
                        <div className="grid md:grid-cols-2 gap-4">
                            <Topic title="Ro'yxatdan o'tish" text="To'garak tanlash, login/parol va guruhga avtomatik biriktirish bo'yicha yordam." />
                            <Topic title="Dars va topshiriqlar" text="Ustoz joylagan materiallar, deadline va topshiriq holati bo'yicha savollar." />
                            <Topic title="Yangi to'garak taklifi" text="Institut hayotiga mos yangi fan, ijodiy yoki sport yo'nalishini taklif qilish." />
                            <Topic title="Texnik yordam" text="Panelga kira olmaslik, ma'lumot ko'rinmasligi yoki profil bilan bog'liq muammolar." />
                        </div>
                        <button onClick={() => setPage("register")} className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-3 text-white font-medium hover:bg-blue-500">
                            To'garakka yozilish
                        </button>
                    </div>
                </section>
            </main>
        </div>
    );
}

function ContactCard({ title, value }: { title: string; value: string }) {
    return (
        <div className="rounded-2xl border border-gray-800 bg-[#0d1520] p-5">
            <div className="text-xs uppercase tracking-wide text-gray-500">{title}</div>
            <div className="mt-2 text-white font-semibold">{value}</div>
        </div>
    );
}

function Topic({ title, text }: { title: string; text: string }) {
    return (
        <div className="rounded-xl border border-gray-800 bg-[#111827] p-4">
            <h3 className="text-white font-semibold">{title}</h3>
            <p className="text-sm text-gray-400 mt-1 leading-relaxed">{text}</p>
        </div>
    );
}

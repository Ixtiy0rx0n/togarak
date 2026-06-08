import { clubImageSrc, getPublicSnapshot } from "../core/store.js";
import { byId, escapeHtml } from "../core/utils.js";
function clubCard(club) {
    return `
        <article class="event-card bg-[#1a2234] rounded-xl border border-gray-800 overflow-hidden hover:border-blue-500/50 transition-all duration-300 group flex flex-col">
            <div class="relative h-48 overflow-hidden bg-gray-900">
                <img src="${escapeHtml(clubImageSrc(club.imagePath))}" alt="${escapeHtml(club.title)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-80 group-hover:opacity-100">
                <div class="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider border border-white/10">
                    ${escapeHtml(club.title)}
                </div>
            </div>
            <div class="p-5 flex-1 flex flex-col">
                <h3 class="text-lg font-bold text-white mb-3 group-hover:text-blue-400 transition-colors">${escapeHtml(club.title)}</h3>
                <p class="text-sm text-gray-400 mb-2">${escapeHtml(club.paragraph)}</p>
                <p class="text-sm text-gray-500 mb-4 flex-1">${escapeHtml(club.description)}</p>
                <p class="text-xs text-blue-400 mb-4">O'qituvchi: ${escapeHtml(club.teacherName)}</p>
                <a href="Pages/Register.html" class="block text-center w-full bg-blue-600/10 text-blue-400 text-sm font-medium py-2.5 rounded-lg hover:bg-blue-600 hover:text-white transition-colors border border-blue-500/20 hover:border-blue-600">
                    Ro'yxatdan o'tish
                </a>
            </div>
        </article>
    `;
}
async function initPage() {
    const { clubs, stats } = await getPublicSnapshot();
    byId("featuredClubsGrid").innerHTML = clubs.slice(0, 4).map(clubCard).join("");
    byId("stat-clubs").textContent = String(stats.clubs);
    byId("stat-students").textContent = String(stats.students);
    const searchInput = byId("heroSearchInput");
    searchInput.addEventListener("input", () => {
        const term = searchInput.value.trim().toLowerCase();
        const filtered = clubs.filter((club) => `${club.title} ${club.paragraph} ${club.description}`.toLowerCase().includes(term));
        byId("featuredClubsGrid").innerHTML = filtered.slice(0, 4).map(clubCard).join("");
    });
    byId("openLoginModal").addEventListener("click", () => byId("loginSelectModal").classList.remove("hidden"));
    byId("closeLoginModal").addEventListener("click", () => byId("loginSelectModal").classList.add("hidden"));
    // await initWeatherBg();
}
void initPage();

import { clubImageSrc, getPublicSnapshot } from "../core/store.js";
import { byId, escapeHtml } from "../core/utils.js";
import { initWeatherBg } from "../shared/weather-bg.js";

function renderClubs(term = ""): Promise<void> {
    return getPublicSnapshot().then(({ clubs }) => {
        const normalized = term.trim().toLowerCase();
        const visible = normalized
            ? clubs.filter((club) => `${club.title} ${club.paragraph} ${club.description} ${club.teacherName}`.toLowerCase().includes(normalized))
            : clubs;

        byId("allClubsGrid").innerHTML = visible.map((club) => `
            <article class="bg-[#1a2234] rounded-xl border border-gray-800 overflow-hidden hover:border-blue-500/50 transition-all duration-300 group flex flex-col">
                <div class="relative h-44 overflow-hidden">
                    <img src="${escapeHtml(clubImageSrc(club.imagePath, "../"))}" alt="${escapeHtml(club.title)}" class="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500">
                </div>
                <div class="p-5 flex-1 flex flex-col">
                    <h3 class="text-lg font-bold text-white mb-3">${escapeHtml(club.title)}</h3>
                    <p class="text-sm text-gray-400 mb-2">${escapeHtml(club.paragraph)}</p>
                    <p class="text-sm text-gray-500 mb-4 flex-1">${escapeHtml(club.description)}</p>
                    <div class="text-xs text-blue-400 mb-4">O'qituvchi: ${escapeHtml(club.teacherName)}</div>
                    <a href="Register.html" class="inline-flex items-center justify-center bg-blue-600/10 text-blue-400 py-2.5 rounded-lg border border-blue-500/20 hover:bg-blue-600 hover:text-white transition-colors">Yozilish</a>
                </div>
            </article>
        `).join("");
    });
}

async function initPage(): Promise<void> {
    const input = byId<HTMLInputElement>("clubsSearchInput");
    input.addEventListener("input", () => {
        void renderClubs(input.value);
    });

    await renderClubs();
    // await initWeatherBg();
}

void initPage();

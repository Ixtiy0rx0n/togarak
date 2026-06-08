import { registerStudent } from "../core/store.js";
import { byId, showMessage } from "../core/utils.js";
import { initWeatherBg } from "../shared/weather-bg.js";

async function initPage(): Promise<void> {
    const form = byId<HTMLFormElement>("registerForm");
    const success = byId("successMsg");
    const error = byId("errorMsg");

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        success.classList.add("hidden");
        error.classList.add("hidden");

        const result = await registerStudent({
            firstName: byId<HTMLInputElement>("ism").value.trim(),
            lastName: byId<HTMLInputElement>("familiya").value.trim(),
            age: Number(byId<HTMLInputElement>("yosh").value) || undefined,
            phone: byId<HTMLInputElement>("telefon").value.trim(),
            school: byId<HTMLInputElement>("oqish_joyi").value.trim(),
            clubInterest: byId<HTMLSelectElement>("tanlangan_fan").value,
            username: byId<HTMLInputElement>("username").value.trim(),
            password: byId<HTMLInputElement>("password").value.trim()
        });

        if (result.ok) {
            showMessage(success, result.message, "success");
            form.reset();
            return;
        }

        showMessage(error, result.message, "error");
    });

    // await initWeatherBg();
}

void initPage();

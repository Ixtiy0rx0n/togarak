import { registerStudent } from "../core/store.js";
import { byId, showMessage } from "../core/utils.js";
async function initPage() {
    const form = byId("registerForm");
    const success = byId("successMsg");
    const error = byId("errorMsg");
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        success.classList.add("hidden");
        error.classList.add("hidden");
        const result = await registerStudent({
            firstName: byId("ism").value.trim(),
            lastName: byId("familiya").value.trim(),
            age: Number(byId("yosh").value) || undefined,
            phone: byId("telefon").value.trim(),
            school: byId("oqish_joyi").value.trim(),
            clubInterest: byId("tanlangan_fan").value,
            username: byId("username").value.trim(),
            password: byId("password").value.trim()
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

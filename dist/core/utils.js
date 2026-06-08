export function byId(id) {
    const element = document.getElementById(id);
    if (!element) {
        throw new Error(`Element topilmadi: ${id}`);
    }
    return element;
}
export function qs(selector, parent = document) {
    return parent.querySelector(selector);
}
export function formatDate(value) {
    return new Date(value).toLocaleString("uz-UZ");
}
export function escapeHtml(value) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}
export function setVisible(element, visible) {
    element.classList.toggle("hidden", !visible);
}
export function showMessage(element, message, kind = "success") {
    element.textContent = message;
    element.classList.remove("hidden", "text-red-400", "bg-red-500/10", "border-red-500/30", "text-green-400", "bg-green-500/10", "border-green-500/30");
    if (kind === "success") {
        element.classList.add("text-green-400", "bg-green-500/10", "border-green-500/30");
    }
    else {
        element.classList.add("text-red-400", "bg-red-500/10", "border-red-500/30");
    }
}
export function youtubeEmbed(url) {
    if (url.includes("watch?v=")) {
        return url.replace("watch?v=", "embed/");
    }
    if (url.includes("youtu.be/")) {
        return url.replace("youtu.be/", "youtube.com/embed/");
    }
    return url;
}

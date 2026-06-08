export function byId<T extends HTMLElement>(id: string): T {
    const element = document.getElementById(id);
    if (!element) {
        throw new Error(`Element topilmadi: ${id}`);
    }
    return element as T;
}

export function qs<T extends Element>(selector: string, parent: ParentNode = document): T | null {
    return parent.querySelector(selector) as T | null;
}

export function formatDate(value: string): string {
    return new Date(value).toLocaleString("uz-UZ");
}

export function escapeHtml(value: string): string {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

export function setVisible(element: HTMLElement, visible: boolean): void {
    element.classList.toggle("hidden", !visible);
}

export function showMessage(element: HTMLElement, message: string, kind: "success" | "error" = "success"): void {
    element.textContent = message;
    element.classList.remove("hidden", "text-red-400", "bg-red-500/10", "border-red-500/30", "text-green-400", "bg-green-500/10", "border-green-500/30");
    if (kind === "success") {
        element.classList.add("text-green-400", "bg-green-500/10", "border-green-500/30");
    } else {
        element.classList.add("text-red-400", "bg-red-500/10", "border-red-500/30");
    }
}

export function youtubeEmbed(url: string): string {
    if (url.includes("watch?v=")) {
        return url.replace("watch?v=", "embed/");
    }
    if (url.includes("youtu.be/")) {
        return url.replace("youtu.be/", "youtube.com/embed/");
    }
    return url;
}

import type { SessionData, UserRole } from "./types.js";

const SESSION_KEY = "tugarakuz-session";

export function getSession(): SessionData | null {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) {
        return null;
    }

    try {
        return JSON.parse(raw) as SessionData;
    } catch {
        localStorage.removeItem(SESSION_KEY);
        return null;
    }
}

export function setSession(session: SessionData): void {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
    localStorage.removeItem(SESSION_KEY);
}

export function hasRole(role: UserRole): boolean {
    return getSession()?.role === role;
}

const SESSION_KEY = "tugarakuz-session";
export function getSession() {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) {
        return null;
    }
    try {
        return JSON.parse(raw);
    }
    catch {
        localStorage.removeItem(SESSION_KEY);
        return null;
    }
}
export function setSession(session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}
export function clearSession() {
    localStorage.removeItem(SESSION_KEY);
}
export function hasRole(role) {
    return getSession()?.role === role;
}

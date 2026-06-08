export function getRootPrefix() {
    return document.body.dataset.root ?? ".";
}
export function resolvePath(path) {
    return new URL(`${getRootPrefix()}/${path.replace(/^\/+/, "")}`, window.location.href).toString();
}

export function getRootPrefix(): string {
    return document.body.dataset.root ?? ".";
}

export function resolvePath(path: string): string {
    return new URL(`${getRootPrefix()}/${path.replace(/^\/+/, "")}`, window.location.href).toString();
}

declare global {
    interface Window {
        tsParticles?: {
            load: (id: string, options: unknown) => Promise<void>;
        };
    }
}

function getWeatherIcon(code: number): string {
    if (code === 2 || code === 3) {
        return "☁";
    }
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
        return "🌧";
    }
    if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) {
        return "❄";
    }
    if (code >= 95 && code <= 99) {
        return "⚡";
    }
    return "☀";
}

function particleOptions(condition: string): unknown {
    const shared = {
        fpsLimit: 60,
        interactivity: { detectsOn: "window" },
        detectRetina: false
    };

    switch (condition) {
        case "rain":
            return {
                ...shared,
                particles: {
                    number: { value: 160 },
                    color: { value: "#7dd3fc" },
                    shape: { type: "line" },
                    opacity: { value: 0.35 },
                    size: { value: 12 },
                    move: {
                        enable: true,
                        direction: "bottom",
                        speed: 20,
                        straight: true,
                        outModes: { default: "out" }
                    }
                }
            };
        case "snow":
            return {
                ...shared,
                particles: {
                    number: { value: 24 },
                    color: { value: "#ffffff" },
                    shape: { type: "char", options: { char: { value: "❄", font: "Arial" } } },
                    opacity: { value: { min: 0.3, max: 0.8 } },
                    size: { value: { min: 8, max: 16 } },
                    move: {
                        enable: true,
                        direction: "bottom",
                        speed: 2,
                        random: true,
                        outModes: { default: "out" }
                    }
                }
            };
        case "cloudy":
            return {
                ...shared,
                particles: {
                    number: { value: 10 },
                    color: { value: "#e2e8f0" },
                    shape: { type: "char", options: { char: { value: "☁", font: "Arial" } } },
                    opacity: { value: { min: 0.2, max: 0.5 } },
                    size: { value: { min: 24, max: 48 } },
                    move: {
                        enable: true,
                        direction: "right",
                        speed: 0.8,
                        outModes: { default: "out" }
                    }
                }
            };
        default:
            return {
                ...shared,
                particles: {
                    number: { value: 14 },
                    color: { value: "#ffffff" },
                    shape: { type: "char", options: { char: { value: "✦", font: "Arial" } } },
                    opacity: { value: { min: 0.15, max: 0.45 } },
                    size: { value: { min: 6, max: 12 } },
                    move: {
                        enable: true,
                        direction: "top",
                        speed: 0.8,
                        random: true,
                        outModes: { default: "out" }
                    }
                }
            };
    }
}

function ensureParticleLayer(): void {
    if (document.getElementById("tsparticles")) {
        return;
    }

    const layer = document.createElement("div");
    layer.id = "tsparticles";
    layer.style.position = "fixed";
    layer.style.inset = "0";
    layer.style.pointerEvents = "none";
    layer.style.zIndex = "0";
    document.body.appendChild(layer);
}

function updateClock(): void {
    const timeElement = document.getElementById("live-time");
    const dateElement = document.getElementById("live-date");
    if (!timeElement || !dateElement) {
        return;
    }

    const now = new Date();
    timeElement.textContent = now.toLocaleTimeString("uz-UZ");
    dateElement.textContent = now.toLocaleDateString("uz-UZ");
}

function renderWidget(temperature: number, icon: string): void {
    const widget = document.getElementById("weather-widget");
    if (!widget) {
        return;
    }

    widget.innerHTML = `
        
    `;

    updateClock();
    window.setInterval(updateClock, 1000);
}

export async function initWeatherBg(): Promise<void> {
    ensureParticleLayer();

    const latitude = 40.48;
    const longitude = 68.78;

    try {
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
        const payload = await response.json() as { current_weather?: { weathercode: number; temperature: number } };
        const code = payload.current_weather?.weathercode ?? 0;
        const temp = payload.current_weather?.temperature ?? 24;
        const condition = code === 2 || code === 3
            ? "cloudy"
            : ((code >= 51 && code <= 67) || (code >= 80 && code <= 82))
                ? "rain"
                : ((code >= 71 && code <= 77) || (code >= 85 && code <= 86))
                    ? "snow"
                    : "clear";

        renderWidget(temp, getWeatherIcon(code));
        await window.tsParticles?.load("tsparticles", particleOptions(condition));
    } catch {
        renderWidget(24, "☀");
        await window.tsParticles?.load("tsparticles", particleOptions("clear"));
    }
}

export {};

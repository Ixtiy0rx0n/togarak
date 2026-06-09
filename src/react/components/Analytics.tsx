type ChartItem = {
    label: string;
    value: number;
    color?: string;
};

const palette = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ec4899", "#06b6d4", "#84cc16"];

export function MetricCard({ label, value, sub, color = "blue" }: { label: string; value: number | string; sub?: string; color?: "blue" | "purple" | "green" | "orange" | "pink" | "cyan" }) {
    const colors = {
        blue: "border-blue-500/30 bg-blue-500/10 text-blue-300",
        purple: "border-purple-500/30 bg-purple-500/10 text-purple-300",
        green: "border-green-500/30 bg-green-500/10 text-green-300",
        orange: "border-orange-500/30 bg-orange-500/10 text-orange-300",
        pink: "border-pink-500/30 bg-pink-500/10 text-pink-300",
        cyan: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
    };

    return (
        <div className={`rounded-2xl border p-5 ${colors[color]}`}>
            <div className="text-xs uppercase tracking-wide opacity-80">{label}</div>
            <div className="mt-2 text-3xl font-bold text-white">{value}</div>
            {sub && <div className="mt-1 text-xs text-gray-400">{sub}</div>}
        </div>
    );
}

export function BarChart({ title, items }: { title: string; items: ChartItem[] }) {
    const max = Math.max(...items.map((item) => item.value), 1);

    return (
        <div className="rounded-2xl border border-gray-800 bg-[#0d1520] p-5">
            <h3 className="text-white font-bold mb-4">{title}</h3>
            <div className="h-56 flex items-end gap-3 border-b border-gray-800 pb-3">
                {items.length ? items.map((item, index) => (
                    <div key={item.label} className="flex-1 min-w-0 flex flex-col items-center gap-2">
                        <div className="text-xs text-gray-400">{item.value}</div>
                        <div className="w-full rounded-t-lg min-h-2" style={{ height: `${Math.max((item.value / max) * 180, 8)}px`, background: item.color ?? palette[index % palette.length] }} />
                    </div>
                )) : <div className="w-full text-center text-gray-600 self-center">Ma'lumot yo'q</div>}
            </div>
            <div className="mt-3 grid gap-2">
                {items.map((item, index) => (
                    <div key={item.label} className="flex items-center justify-between gap-3 text-xs">
                        <div className="min-w-0 flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: item.color ?? palette[index % palette.length] }} />
                            <span className="truncate text-gray-400">{item.label}</span>
                        </div>
                        <span className="text-gray-300">{item.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function DonutChart({ title, items, centerLabel }: { title: string; items: ChartItem[]; centerLabel?: string }) {
    const total = items.reduce((sum, item) => sum + item.value, 0);
    let offset = 25;
    const radius = 42;
    const circumference = 2 * Math.PI * radius;

    return (
        <div className="rounded-2xl border border-gray-800 bg-[#0d1520] p-5">
            <h3 className="text-white font-bold mb-4">{title}</h3>
            <div className="grid md:grid-cols-[180px_1fr] gap-4 items-center">
                <div className="relative h-44 w-44 mx-auto">
                    <svg viewBox="0 0 100 100" className="-rotate-90 h-full w-full">
                        <circle cx="50" cy="50" r={radius} fill="none" stroke="#1f2937" strokeWidth="12" />
                        {items.map((item, index) => {
                            const dash = total ? (item.value / total) * circumference : 0;
                            const circle = (
                                <circle
                                    key={item.label}
                                    cx="50"
                                    cy="50"
                                    r={radius}
                                    fill="none"
                                    stroke={item.color ?? palette[index % palette.length]}
                                    strokeWidth="12"
                                    strokeDasharray={`${dash} ${circumference - dash}`}
                                    strokeDashoffset={-offset}
                                    strokeLinecap="round"
                                />
                            );
                            offset += dash;
                            return circle;
                        })}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <div className="text-2xl font-bold text-white">{total}</div>
                        <div className="text-xs text-gray-500">{centerLabel ?? "jami"}</div>
                    </div>
                </div>
                <div className="space-y-2">
                    {items.map((item, index) => (
                        <div key={item.label} className="flex items-center justify-between gap-3 rounded-xl bg-[#111827] border border-gray-800 px-3 py-2 text-sm">
                            <div className="min-w-0 flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: item.color ?? palette[index % palette.length] }} />
                                <span className="truncate text-gray-300">{item.label}</span>
                            </div>
                            <span className="text-white font-semibold">{item.value}</span>
                        </div>
                    ))}
                    {!items.length && <div className="text-sm text-gray-600">Ma'lumot yo'q</div>}
                </div>
            </div>
        </div>
    );
}

export function ProgressList({ title, items }: { title: string; items: ChartItem[] }) {
    const max = Math.max(...items.map((item) => item.value), 1);

    return (
        <div className="rounded-2xl border border-gray-800 bg-[#0d1520] p-5">
            <h3 className="text-white font-bold mb-4">{title}</h3>
            <div className="space-y-4">
                {items.map((item, index) => {
                    const pct = Math.round((item.value / max) * 100);
                    return (
                        <div key={item.label}>
                            <div className="flex justify-between gap-4 text-sm mb-1">
                                <span className="text-gray-300 truncate">{item.label}</span>
                                <span className="text-gray-500 shrink-0">{item.value}</span>
                            </div>
                            <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: item.color ?? palette[index % palette.length] }} />
                            </div>
                        </div>
                    );
                })}
                {!items.length && <div className="text-sm text-gray-600">Ma'lumot yo'q</div>}
            </div>
        </div>
    );
}

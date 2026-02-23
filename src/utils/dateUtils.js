export function getBiweeklyPeriod(date = new Date()) {
    const anchor = new Date(2026, 1, 21);
    const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffMs = today.getTime() - anchor.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const cycleIndex = Math.floor(diffDays / 14);
    const start = new Date(anchor);
    start.setDate(start.getDate() + cycleIndex * 14);
    const end = new Date(start);
    end.setDate(end.getDate() + 13);
    return { start, end };
}

export function getMonthlyPeriod(date = new Date()) {
    const year = date.getFullYear();
    const month = date.getMonth();
    return {
        start: new Date(year, month, 1),
        end: new Date(year, month + 1, 0),
    };
}

export function formatDate(date) {
    return date.toLocaleDateString('es', { month: 'short', day: 'numeric' });
}

export function formatDateISO(date) {
    return date.toISOString().split('T')[0];
}

export function getDaysInRange(start, end) {
    const days = [];
    const current = new Date(start);
    while (current <= end) {
        days.push(formatDateISO(current));
        current.setDate(current.getDate() + 1);
    }
    return days;
}

export function getTodayISO() {
    return formatDateISO(new Date());
}

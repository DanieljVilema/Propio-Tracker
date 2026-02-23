import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../firebase';
import {
    collection,
    query,
    where,
    getDocs,
    orderBy,
} from 'firebase/firestore';
import { CalendarDays, DollarSign, Clock, TrendingUp } from 'lucide-react';

import {
    getBiweeklyPeriod,
    getMonthlyPeriod,
    formatDate,
    formatDateISO,
    getDaysInRange
} from '../utils/dateUtils';

// --- Bar Chart Component ---

function DailyBarChart({ data, days }) {
    if (!days.length) return null;

    const width = 400;
    const height = 160;
    const padding = { top: 15, right: 10, bottom: 30, left: 45 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    // Build daily values
    const dailyValues = days.map(day => {
        const entry = data.find(d => d.date === day);
        return {
            day,
            earnings: entry ? entry.totalEarnings : 0,
            minutes: entry ? (entry.autoMinutes || 0) : 0,
        };
    });

    const maxVal = Math.max(...dailyValues.map(d => d.earnings), 1);
    const barGap = 2;
    const barWidth = Math.max(2, (chartW - barGap * (days.length - 1)) / days.length);

    // Y-axis ticks
    const yTicks = 4;
    const yLines = Array.from({ length: yTicks + 1 }, (_, i) => {
        const val = (maxVal / yTicks) * i;
        const y = padding.top + chartH - (val / maxVal) * chartH;
        return { y, label: `$${val.toFixed(0)}` };
    });

    return (
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto' }}>
            {/* Y-axis grid */}
            {yLines.map((tick, i) => (
                <g key={i}>
                    <line
                        x1={padding.left} y1={tick.y}
                        x2={padding.left + chartW} y2={tick.y}
                        stroke="rgba(255,255,255,0.06)" strokeWidth="1"
                    />
                    <text
                        x={padding.left - 6} y={tick.y + 3.5}
                        textAnchor="end" fill="rgba(255,255,255,0.3)"
                        fontSize="9" fontFamily="inherit"
                    >
                        {tick.label}
                    </text>
                </g>
            ))}

            {/* Bars */}
            {dailyValues.map((d, i) => {
                const barH = maxVal > 0 ? (d.earnings / maxVal) * chartH : 0;
                const x = padding.left + i * (barWidth + barGap);
                const y = padding.top + chartH - barH;

                return (
                    <g key={d.day}>
                        <defs>
                            <linearGradient id={`bar-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#10b981" stopOpacity="0.9" />
                                <stop offset="100%" stopColor="#10b981" stopOpacity="0.3" />
                            </linearGradient>
                        </defs>
                        <rect
                            x={x} y={y}
                            width={barWidth} height={barH}
                            rx={Math.min(barWidth / 2, 3)}
                            fill={`url(#bar-grad-${i})`}
                        />
                        {/* Day label on x-axis — show every few days to avoid clutter */}
                        {(i === 0 || i === days.length - 1 || i % Math.ceil(days.length / 7) === 0) && (
                            <text
                                x={x + barWidth / 2}
                                y={height - 6}
                                textAnchor="middle"
                                fill="rgba(255,255,255,0.3)"
                                fontSize="8"
                                fontFamily="inherit"
                            >
                                {d.day.slice(5)} {/* MM-DD */}
                            </text>
                        )}
                    </g>
                );
            })}
        </svg>
    );
}

// --- Main MyStats Component ---

export function MyStats({ nickname, lastSyncTime }) {
    const [periodType, setPeriodType] = useState('biweekly');
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    const period = useMemo(() => {
        return periodType === 'biweekly' ? getBiweeklyPeriod() : getMonthlyPeriod();
    }, [periodType]);

    const days = useMemo(() => getDaysInRange(period.start, period.end), [period]);

    // Fetch only current user's data
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const startStr = formatDateISO(period.start);
            const endStr = formatDateISO(period.end);

            const q = query(
                collection(db, 'dailyLogs'),
                where('date', '>=', startStr),
                where('date', '<=', endStr),
                orderBy('date', 'asc')
            );

            const snapshot = await getDocs(q);
            const allLogs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

            // Filter locally to avoid case sensitivity and composite index issues
            const userLogs = allLogs.filter(
                d => d.nickname && d.nickname.toLowerCase() === nickname.toLowerCase()
            );

            setLogs(userLogs);
        } catch (err) {
            console.error('Error fetching stats:', err);
        } finally {
            setLoading(false);
        }
    }, [nickname, period.start, period.end, lastSyncTime]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Computed stats
    const stats = useMemo(() => {
        const totalEarnings = logs.reduce((sum, l) => sum + (l.totalEarnings || 0), 0);
        const totalMinutes = logs.reduce((sum, l) => sum + (l.autoMinutes || 0), 0);
        const daysWithData = logs.length;
        const avgEarnings = daysWithData > 0 ? totalEarnings / daysWithData : 0;
        const avgMinutes = daysWithData > 0 ? totalMinutes / daysWithData : 0;

        return { totalEarnings, totalMinutes, daysWithData, avgEarnings, avgMinutes };
    }, [logs]);

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <h2 className="text-gradient" style={{ margin: 0, fontSize: '1.8rem' }}>
                    📊 My Stats
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                    {formatDate(period.start)} — {formatDate(period.end)}
                </p>
            </div>

            {/* Period Toggle */}
            <div className="period-toggle" style={{ marginBottom: '1.5rem' }}>
                <button
                    className={`period-btn ${periodType === 'biweekly' ? 'active' : ''}`}
                    onClick={() => setPeriodType('biweekly')}
                >
                    <CalendarDays size={14} /> Bisemanal
                </button>
                <button
                    className={`period-btn ${periodType === 'monthly' ? 'active' : ''}`}
                    onClick={() => setPeriodType('monthly')}
                >
                    <CalendarDays size={14} /> Mensual
                </button>
            </div>

            {loading ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <div className="loading-spinner" />
                    <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>Loading...</p>
                </div>
            ) : (
                <>
                    {/* Summary Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                        <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
                            <DollarSign size={20} style={{ color: 'var(--color-primary)', marginBottom: '0.25rem' }} />
                            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--color-primary)' }}>
                                ${stats.totalEarnings.toFixed(2)}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                Total earned
                            </div>
                        </div>
                        <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
                            <Clock size={20} style={{ color: '#3b82f6', marginBottom: '0.25rem' }} />
                            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#3b82f6' }}>
                                {Math.floor(stats.totalMinutes)}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                Minutes tracked
                            </div>
                        </div>
                    </div>

                    {/* Averages */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                        <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
                            <TrendingUp size={20} style={{ color: '#f59e0b', marginBottom: '0.25rem' }} />
                            <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#f59e0b' }}>
                                ${stats.avgEarnings.toFixed(2)}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                Avg / day
                            </div>
                        </div>
                        <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
                            <Clock size={20} style={{ color: '#8b5cf6', marginBottom: '0.25rem' }} />
                            <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#8b5cf6' }}>
                                {Math.floor(stats.avgMinutes)}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                Avg min / day
                            </div>
                        </div>
                    </div>

                    {/* Daily Bar Chart */}
                    <div className="card" style={{ marginBottom: '1rem' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                            📈 Daily Earnings
                        </div>
                        {stats.totalEarnings > 0 ? (
                            <DailyBarChart data={logs} days={days} />
                        ) : (
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                No data yet — sync from the Leaderboard tab!
                            </div>
                        )}
                    </div>

                    {/* Active Days */}
                    <div className="card" style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                Active days
                            </span>
                            <span style={{ fontWeight: '700', fontSize: '1rem' }}>
                                {stats.daysWithData} / {days.length}
                            </span>
                        </div>
                        <div style={{ marginTop: '0.5rem' }}>
                            <div className="leaderboard-progress-track">
                                <div
                                    className="leaderboard-progress-fill"
                                    style={{
                                        width: `${days.length > 0 ? (stats.daysWithData / days.length) * 100 : 0}%`,
                                        backgroundColor: '#10b981',
                                        boxShadow: '0 0 10px rgba(16, 185, 129, 0.3)',
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

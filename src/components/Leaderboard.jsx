import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../firebase';
import {
    collection,
    query,
    where,
    getDocs,
    orderBy,
} from 'firebase/firestore';
import { Trophy, TrendingUp, TrendingDown, CalendarDays, Edit3 } from 'lucide-react';

// --- Utility Functions ---

function getBiweeklyPeriod(date = new Date()) {
    // Anchor: Feb 21, 2026 — pay periods are every 14 days from this date
    const anchor = new Date(2026, 1, 21); // Month is 0-indexed: 1 = February
    const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffMs = today.getTime() - anchor.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    // How many full 14-day cycles have passed
    const cycleIndex = Math.floor(diffDays / 14);
    const start = new Date(anchor);
    start.setDate(start.getDate() + cycleIndex * 14);
    const end = new Date(start);
    end.setDate(end.getDate() + 13); // 14 days inclusive
    return { start, end };
}

function getMonthlyPeriod(date = new Date()) {
    const year = date.getFullYear();
    const month = date.getMonth();
    return {
        start: new Date(year, month, 1),
        end: new Date(year, month + 1, 0),
    };
}

function formatDate(date) {
    return date.toLocaleDateString('es', { month: 'short', day: 'numeric' });
}

function formatDateISO(date) {
    return date.toISOString().split('T')[0];
}

function getDaysInRange(start, end) {
    const days = [];
    const current = new Date(start);
    while (current <= end) {
        days.push(formatDateISO(current));
        current.setDate(current.getDate() + 1);
    }
    return days;
}

// Avatar colors for users
const AVATAR_COLORS = [
    '#10b981', '#3b82f6', '#f59e0b', '#ef4444',
    '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
];

function getAvatarColor(nickname) {
    let hash = 0;
    for (let i = 0; i < nickname.length; i++) {
        hash = nickname.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// --- Adjustment Modal ---

function AdjustmentModal({ nickname, onSubmit, onClose }) {
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const val = parseFloat(amount);
        if (isNaN(val)) return;
        setSaving(true);
        await onSubmit(val, note);
        setSaving(false);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content card" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-gradient" style={{ margin: '0 0 0.5rem 0' }}>
                    Adjustment for {nickname}
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                    Correct today's earnings to match the Propio portal. Visible to all users.
                </p>
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '0.75rem' }}>
                        <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'block', marginBottom: '0.25rem' }}>
                            Corrected total earnings ($) for today
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="e.g. 23.30"
                            className="input"
                            autoFocus
                        />
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'block', marginBottom: '0.25rem' }}>
                            Note (optional)
                        </label>
                        <input
                            type="text"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="e.g. Portal says $23.30"
                            className="input"
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button type="button" onClick={onClose} className="btn" style={{
                            flex: 1, background: 'var(--bg-input)', color: 'var(--text-secondary)'
                        }}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving || !amount}>
                            {saving ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// --- Combined Chart Component (Stock comparison style) ---

function CombinedChart({ userStats, days, maxValue }) {
    if (!days.length || maxValue === 0 || userStats.length === 0) return null;

    const width = 400;
    const height = 180;
    const padding = { top: 15, right: 80, bottom: 25, left: 45 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    // Y-axis grid lines
    const yTicks = 4;
    const yLines = Array.from({ length: yTicks + 1 }, (_, i) => {
        const val = (maxValue / yTicks) * i;
        const y = padding.top + chartH - (val / maxValue) * chartH;
        return { y, label: `$${val.toFixed(0)}` };
    });

    // Build lines for each user
    const userLines = userStats.map(user => {
        const color = getAvatarColor(user.nickname);
        const points = days.reduce((acc, day, i) => {
            const entry = user.logs.find(d => d.date === day);
            const prevValue = acc.length > 0 ? acc[acc.length - 1].value : 0;
            const cumulative = prevValue + (entry ? entry.totalEarnings : 0);
            acc.push({
                x: padding.left + (days.length > 1 ? (i / (days.length - 1)) * chartW : chartW / 2),
                y: padding.top + chartH - (cumulative / maxValue) * chartH,
                value: cumulative,
            });
            return acc;
        }, []);

        const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
        const areaD = `${pathD} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;
        const lastPoint = points[points.length - 1];

        return { nickname: user.nickname, color, points, pathD, areaD, lastPoint };
    });

    return (
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto' }}>
            <defs>
                {userLines.map(u => (
                    <linearGradient key={u.nickname} id={`grad-${u.color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={u.color} stopOpacity="0.2" />
                        <stop offset="100%" stopColor={u.color} stopOpacity="0.02" />
                    </linearGradient>
                ))}
            </defs>

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

            {/* X-axis: just start and end dates */}
            <text
                x={padding.left} y={height - 4}
                textAnchor="start" fill="rgba(255,255,255,0.3)"
                fontSize="9" fontFamily="inherit"
            >
                Start
            </text>
            <text
                x={padding.left + chartW} y={height - 4}
                textAnchor="end" fill="rgba(255,255,255,0.3)"
                fontSize="9" fontFamily="inherit"
            >
                Today
            </text>

            {/* Area fills (behind lines) */}
            {userLines.map(u => (
                <path key={`area-${u.nickname}`} d={u.areaD} fill={`url(#grad-${u.color.replace('#', '')})`} />
            ))}

            {/* Lines */}
            {userLines.map(u => (
                <path
                    key={`line-${u.nickname}`}
                    d={u.pathD}
                    fill="none" stroke={u.color}
                    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                />
            ))}

            {/* End dots + labels */}
            {userLines.map(u => (
                <g key={`label-${u.nickname}`}>
                    <circle
                        cx={u.lastPoint.x} cy={u.lastPoint.y}
                        r="4" fill={u.color}
                        filter={`drop-shadow(0 0 4px ${u.color})`}
                    />
                    {/* Avatar circle at end */}
                    <circle
                        cx={u.lastPoint.x + 16} cy={u.lastPoint.y}
                        r="8" fill={u.color}
                    />
                    <text
                        x={u.lastPoint.x + 16} y={u.lastPoint.y + 3.5}
                        textAnchor="middle" fill="white"
                        fontSize="8" fontWeight="bold" fontFamily="inherit"
                    >
                        {u.nickname[0].toUpperCase()}
                    </text>
                    {/* Total label */}
                    <text
                        x={u.lastPoint.x + 30} y={u.lastPoint.y + 3.5}
                        textAnchor="start" fill={u.color}
                        fontSize="10" fontWeight="600" fontFamily="inherit"
                    >
                        ${u.lastPoint.value.toFixed(2)}
                    </text>
                </g>
            ))}
        </svg>
    );
}

// --- Main Leaderboard Component ---

export function Leaderboard({ nickname, onRequestAdjustment }) {
    const [periodType, setPeriodType] = useState('biweekly');
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);

    const period = useMemo(() => {
        return periodType === 'biweekly' ? getBiweeklyPeriod() : getMonthlyPeriod();
    }, [periodType]);

    const days = useMemo(() => getDaysInRange(period.start, period.end), [period]);

    // Fetch leaderboard data
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
            const fetchedData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setLogs(fetchedData);
        } catch (err) {
            console.error('Error fetching leaderboard:', err);
        } finally {
            setLoading(false);
        }
    }, [period.start, period.end]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Group by user
    const userStats = useMemo(() => {
        const grouped = {};
        logs.forEach(log => {
            if (!grouped[log.nickname]) {
                grouped[log.nickname] = { nickname: log.nickname, logs: [], total: 0, totalMinutes: 0 };
            }
            grouped[log.nickname].logs.push(log);
            grouped[log.nickname].total += log.totalEarnings || 0;
            grouped[log.nickname].totalMinutes += log.autoMinutes || 0;
        });

        return Object.values(grouped).sort((a, b) => b.total - a.total);
    }, [logs]);

    const maxTotal = useMemo(() => {
        if (userStats.length === 0) return 1;
        // Compute max cumulative across all users for chart scaling
        let max = 0;
        userStats.forEach(u => {
            let cum = 0;
            days.forEach(day => {
                const entry = u.logs.find(l => l.date === day);
                cum += entry ? entry.totalEarnings : 0;
            });
            if (cum > max) max = cum;
        });
        return max || 1;
    }, [userStats, days]);

    const handleAdjustment = async (correctedTotal, note) => {
        if (onRequestAdjustment) {
            await onRequestAdjustment(correctedTotal, note);
        }
        setShowAdjustmentModal(false);
        // Refresh data
        setTimeout(fetchData, 500);
    };

    // Get recent adjustments for log display
    const recentAdjustments = useMemo(() => {
        return logs
            .filter(l => l.adjustmentAmount && l.adjustmentAmount !== 0)
            .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
            .slice(0, 5);
    }, [logs]);

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <h2 className="text-gradient" style={{ margin: 0, fontSize: '1.8rem' }}>
                    🏆 Leaderboard
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
            ) : userStats.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        No data yet for this period. Start tracking calls!
                    </p>
                </div>
            ) : (
                <>
                    {/* Winner Card */}
                    {userStats.length > 0 && (
                        <div className="card winner-card" style={{ marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div className="avatar-circle" style={{
                                    backgroundColor: getAvatarColor(userStats[0].nickname),
                                    width: 56, height: 56, fontSize: '1.5rem'
                                }}>
                                    {userStats[0].nickname[0].toUpperCase()}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Trophy size={20} style={{ color: '#f59e0b' }} />
                                        <span style={{ fontWeight: '700', fontSize: '1.1rem' }}>
                                            {userStats[0].nickname}
                                        </span>
                                    </div>
                                    <div style={{ color: 'var(--color-primary)', fontWeight: '700', fontSize: '1.4rem' }}>
                                        ${userStats[0].total.toFixed(2)}
                                    </div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                        {Math.floor(userStats[0].totalMinutes)} min tracked
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Combined Chart */}
                    <div className="card" style={{ marginBottom: '1rem' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                            📈 Earnings Race
                        </div>
                        <CombinedChart
                            userStats={userStats}
                            days={days}
                            maxValue={maxTotal}
                        />
                    </div>

                    {/* Rankings */}
                    <div className="card" style={{ marginBottom: '1rem' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                            Rankings
                        </div>
                        {userStats.map((user, index) => {
                            const prevUser = index > 0 ? userStats[index - 1] : null;
                            const diff = prevUser ? user.total - prevUser.total : 0;

                            return (
                                <div key={user.nickname} className="ranking-row">
                                    <div className="rank-badge" style={{
                                        backgroundColor: index === 0 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(148, 163, 184, 0.1)',
                                        color: index === 0 ? '#f59e0b' : 'var(--text-secondary)',
                                    }}>
                                        #{index + 1}
                                    </div>

                                    <div className="avatar-circle" style={{
                                        backgroundColor: getAvatarColor(user.nickname),
                                        width: 36, height: 36, fontSize: '0.9rem'
                                    }}>
                                        {user.nickname[0].toUpperCase()}
                                    </div>

                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>
                                            {user.nickname}
                                            {user.nickname === nickname && (
                                                <span style={{ color: 'var(--color-primary)', fontSize: '0.75rem', marginLeft: '0.5rem' }}>
                                                    (you)
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                            {Math.floor(user.totalMinutes)} min
                                        </div>
                                    </div>

                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: '700', color: 'var(--color-primary)' }}>
                                            ${user.total.toFixed(2)}
                                        </div>
                                        {index > 0 && (
                                            <div style={{
                                                fontSize: '0.75rem',
                                                color: diff >= 0 ? 'var(--color-primary)' : 'var(--color-danger)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.15rem'
                                            }}>
                                                {diff >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                                ${Math.abs(diff).toFixed(2)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Progress Bars */}
                    <div className="card" style={{ marginBottom: '1rem' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                            Comparison
                        </div>
                        {userStats.map(user => {
                            const pct = maxTotal > 0 ? (user.total / maxTotal) * 100 : 0;
                            return (
                                <div key={user.nickname} style={{ marginBottom: '0.75rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                        <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>{user.nickname}</span>
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                            ${user.total.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="leaderboard-progress-track">
                                        <div
                                            className="leaderboard-progress-fill"
                                            style={{
                                                width: `${pct}%`,
                                                backgroundColor: getAvatarColor(user.nickname),
                                                boxShadow: `0 0 10px ${getAvatarColor(user.nickname)}55`,
                                            }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Adjustment button (for current user) */}
                    {nickname && (
                        <button
                            className="btn"
                            onClick={() => setShowAdjustmentModal(true)}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                background: 'var(--bg-card)',
                                color: 'var(--text-secondary)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                marginBottom: '1rem',
                            }}
                        >
                            <Edit3 size={16} /> Correct Today's Earnings
                        </button>
                    )}

                    {/* Adjustment log */}
                    {recentAdjustments.length > 0 && (
                        <div className="card" style={{ marginBottom: '1rem' }}>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                                📝 Recent Adjustments
                            </div>
                            {recentAdjustments.map((adj, i) => (
                                <div key={i} style={{
                                    padding: '0.5rem 0',
                                    borderBottom: i < recentAdjustments.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                }}>
                                    <div className="avatar-circle" style={{
                                        backgroundColor: getAvatarColor(adj.nickname),
                                        width: 24, height: 24, fontSize: '0.6rem'
                                    }}>
                                        {adj.nickname[0].toUpperCase()}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <span style={{ fontWeight: '600', fontSize: '0.85rem' }}>{adj.nickname}</span>
                                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginLeft: '0.5rem' }}>
                                            {adj.date}
                                        </span>
                                        {adj.adjustmentNote && (
                                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontStyle: 'italic' }}>
                                                "{adj.adjustmentNote}"
                                            </div>
                                        )}
                                    </div>
                                    <div style={{
                                        fontWeight: '600', fontSize: '0.85rem',
                                        color: adj.adjustmentAmount >= 0 ? 'var(--color-primary)' : 'var(--color-danger)'
                                    }}>
                                        {adj.adjustmentAmount >= 0 ? '+' : ''}${adj.adjustmentAmount.toFixed(2)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Refresh */}
                    <button
                        onClick={fetchData}
                        className="btn"
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            background: 'var(--bg-card)',
                            color: 'var(--text-secondary)',
                            border: '1px solid rgba(255,255,255,0.1)',
                        }}
                    >
                        🔄 Refresh
                    </button>
                </>
            )}

            {showAdjustmentModal && (
                <AdjustmentModal
                    nickname={nickname}
                    onSubmit={handleAdjustment}
                    onClose={() => setShowAdjustmentModal(false)}
                />
            )}
        </div>
    );
}

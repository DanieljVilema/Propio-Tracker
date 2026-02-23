import React, { useState, useEffect } from 'react';
import { Upload } from 'lucide-react';

export function Dashboard({
    totalEarnedToday,
    totalSecondsToday,
    ratePerMinute,
    setRatePerMinute,
    initialBalance,
    setInitialBalance,
    onResetEarnings,
    onSync,
    syncStatus,
    lastSyncTime
}) {
    // Estado local para el input de Initial Balance
    const [initialBalanceInput, setInitialBalanceInput] = useState(initialBalance.toString());

    // Sincronizar cuando el valor externo cambie
    useEffect(() => {
        setInitialBalanceInput(initialBalance.toString());
    }, [initialBalance]);

    // Helper: relative time since last sync
    const getTimeSinceSync = () => {
        if (!lastSyncTime) return 'Never synced';
        const diff = Date.now() - new Date(lastSyncTime).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins} min ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    };

    const handleInitialBalanceChange = (e) => {
        setInitialBalanceInput(e.target.value);
    };

    const handleInitialBalanceBlur = () => {
        const value = parseFloat(initialBalanceInput);
        if (!isNaN(value) && value >= 0) {
            setInitialBalance(value);
        } else {
            // Si está vacío o inválido, resetear a 0
            setInitialBalance(0);
            setInitialBalanceInput('0');
        }
    };

    const handleInitialBalanceKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.target.blur();
        }
    };

    const formatTime = (totalSeconds) => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = Math.floor(totalSeconds % 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className="card" style={{ marginBottom: '2rem' }}>
            <div className="flex-between" style={{ alignItems: 'flex-start' }}>
                <div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                        Total Earned Today
                    </div>
                    <div style={{ fontSize: '3rem', fontWeight: '800', color: 'var(--color-primary)' }}>
                        ${totalEarnedToday.toFixed(2)}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
                        Time: {formatTime(totalSecondsToday || 0)}
                    </div>
                    <button
                        onClick={onResetEarnings}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            textDecoration: 'underline',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            padding: 0,
                            marginTop: '0.5rem'
                        }}
                    >
                        Reset Earnings
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'flex-end' }}>

                    {/* Initial Balance Config */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Start Amount ($):</label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={initialBalanceInput}
                            onChange={handleInitialBalanceChange}
                            onBlur={handleInitialBalanceBlur}
                            onKeyDown={handleInitialBalanceKeyDown}
                            className="input"
                            style={{ width: '80px', padding: '0.4rem' }}
                        />
                    </div>

                    {/* Rate Config */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Rate/Min ($):</label>
                        <input
                            type="number"
                            step="0.01"
                            value={ratePerMinute}
                            onChange={(e) => setRatePerMinute(parseFloat(e.target.value))}
                            className="input"
                            style={{ width: '80px', padding: '0.4rem' }}
                        />
                    </div>

                    {/* Sync Button */}
                    {onSync && (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-end',
                            gap: '0.25rem',
                            marginTop: '0.5rem'
                        }}>
                            <button
                                onClick={onSync}
                                disabled={syncStatus === 'syncing'}
                                className="btn"
                                style={{
                                    padding: '0.5rem 1rem',
                                    fontSize: '0.85rem',
                                    background: syncStatus === 'synced'
                                        ? 'rgba(16, 185, 129, 0.15)'
                                        : syncStatus === 'error'
                                            ? 'rgba(239, 68, 68, 0.15)'
                                            : 'var(--bg-card)',
                                    color: syncStatus === 'synced'
                                        ? '#10b981'
                                        : syncStatus === 'error'
                                            ? '#ef4444'
                                            : 'var(--text-primary)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    fontWeight: '600'
                                }}
                            >
                                <Upload size={14} />
                                {syncStatus === 'syncing' ? 'Syncing...'
                                    : syncStatus === 'synced' ? '✓ Synced'
                                        : syncStatus === 'error' ? 'Failed'
                                            : 'Sync to Cloud'}
                            </button>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                {lastSyncTime ? `Last synced: ${getTimeSinceSync()}` : 'Never synced'}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

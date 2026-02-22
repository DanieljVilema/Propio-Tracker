import React, { useState, useEffect } from 'react';

export function Dashboard({
    totalEarnedToday,
    totalSecondsToday,
    ratePerMinute,
    setRatePerMinute,
    initialBalance,
    setInitialBalance,
    onResetEarnings
}) {
    // Estado local para el input de Initial Balance
    const [initialBalanceInput, setInitialBalanceInput] = useState(initialBalance.toString());

    // Sincronizar cuando el valor externo cambie
    useEffect(() => {
        setInitialBalanceInput(initialBalance.toString());
    }, [initialBalance]);

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

                </div>
            </div>
        </div>
    );
}

import React, { useState } from 'react';

export function NicknameModal({ onSubmit, currentNickname }) {
    const [nickname, setNickname] = useState(currentNickname || '');
    const [error, setError] = useState('');
    const [checking, setChecking] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const trimmed = nickname.trim().toLowerCase();
        if (!trimmed) {
            setError('Enter a nickname');
            return;
        }
        if (trimmed.length < 2 || trimmed.length > 20) {
            setError('Nickname must be 2-20 characters');
            return;
        }
        if (!/^[a-z0-9_]+$/.test(trimmed)) {
            setError('Only lowercase letters, numbers, and underscores');
            return;
        }

        setChecking(true);
        setError('');

        try {
            const result = await onSubmit(trimmed);
            if (result?.error) {
                setError(result.error);
            }
        } catch {
            setError('Error saving nickname. Try again.');
        } finally {
            setChecking(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content card">
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>👤</div>
                    <h2 className="text-gradient" style={{ margin: 0 }}>
                        {currentNickname ? 'Change Nickname' : 'Choose Your Nickname'}
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                        This is how you'll appear on the leaderboard
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        value={nickname}
                        onChange={(e) => { setNickname(e.target.value); setError(''); }}
                        placeholder="Enter nickname..."
                        className="input"
                        style={{ marginBottom: '0.75rem', textAlign: 'center', fontSize: '1.2rem' }}
                        autoFocus
                        maxLength={20}
                    />

                    {error && (
                        <div style={{
                            color: 'var(--color-danger)',
                            fontSize: '0.85rem',
                            textAlign: 'center',
                            marginBottom: '0.75rem'
                        }}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '1rem' }}
                        disabled={checking}
                    >
                        {checking ? 'Checking...' : currentNickname ? 'Update Nickname' : 'Join Leaderboard'}
                    </button>
                </form>
            </div>
        </div>
    );
}

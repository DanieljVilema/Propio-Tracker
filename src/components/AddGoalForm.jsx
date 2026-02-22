import React, { useState } from 'react';
import { Plus } from 'lucide-react';

export function AddGoalForm({ onAddGoal }) {
    const [name, setName] = useState('');
    const [cost, setCost] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name || !cost) return;

        onAddGoal({
            name,
            cost: parseFloat(cost)
        });

        setName('');
        setCost('');
    };

    return (
        <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
            <div style={{ flex: 2 }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Goal Name
                </label>
                <input
                    type="text"
                    className="input"
                    placeholder="e.g. New T-Shirt"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
            </div>
            <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Cost ($)
                </label>
                <input
                    type="number"
                    step="0.01"
                    className="input"
                    placeholder="20.00"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                />
            </div>
            <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem' }}>
                <Plus size={24} />
            </button>
        </form>
    );
}

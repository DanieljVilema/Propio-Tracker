import React, { useEffect, useRef, useState } from 'react';
import { Trash2, CheckCircle } from 'lucide-react';

function GoalItem({ goal, progressAmount, onDeleteGoal }) {
    const [jumpKey, setJumpKey] = useState(0);
    const [animationClass, setAnimationClass] = useState('');
    const prevAmountRef = useRef(progressAmount);
    const percent = Math.min(100, (progressAmount / goal.cost) * 100);
    const isCompleted = percent >= 100;

    useEffect(() => {
        const prev = prevAmountRef.current;
        const current = progressAmount;

        // Compare based on what the user SEES (2 decimal places)
        const prevDisplay = prev.toFixed(2);
        const currentDisplay = current.toFixed(2);

        if (currentDisplay !== prevDisplay && current > prev) {
            const prevDollar = prevDisplay.split('.')[0];
            const currentDollar = currentDisplay.split('.')[0];

            if (currentDollar !== prevDollar) {
                setAnimationClass('animate-jump-big-a');
            } else {
                setAnimationClass('animate-jump-small-a');
            }

            // Increment key to force re-render of the animated element
            setJumpKey(k => k + 1);
        }

        prevAmountRef.current = current;
    }, [progressAmount]);

    return (
        <div style={{ position: 'relative' }}>
            <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: '600', fontSize: '1.1rem' }}>{goal.name}</span>
                    {isCompleted && <CheckCircle size={16} color="var(--color-primary)" />}
                </div>
                <div style={{ color: 'var(--text-secondary)' }}>
                    <span style={{ color: isCompleted ? 'var(--color-primary)' : 'white' }}>
                        ${progressAmount.toFixed(2)}
                    </span>
                    {' / '}
                    ${goal.cost.toFixed(2)}
                </div>
            </div>

            {/* Progress Bar Background */}
            <div
                key={jumpKey}
                className={animationClass}
                style={{
                    height: '12px',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    position: 'relative',
                    transformOrigin: 'center left'
                }}>
                {/* Fill */}
                <div
                    className={!isCompleted && percent > 0 ? "progress-bar-active" : ""}
                    style={{
                        height: '100%',
                        width: `${percent}%`,
                        backgroundColor: isCompleted ? 'var(--color-primary)' : 'var(--color-accent)',
                        transition: 'width 0.5s ease-out',
                        boxShadow: isCompleted ? '0 0 10px var(--color-primary)' : 'none'
                    }} />
            </div>

            <button
                onClick={() => onDeleteGoal(goal.id)}
                style={{
                    position: 'absolute',
                    right: '-40px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    opacity: 0.5
                }}
                onMouseEnter={(e) => e.target.style.opacity = 1}
                onMouseLeave={(e) => e.target.style.opacity = 0.5}
                title="Remove Goal"
            >
                <Trash2 size={18} />
            </button>
        </div>
    );
}

export function GoalList({ goals, totalEarnings, onDeleteGoal }) {
    // Pre-calculate progress amounts for each goal using reduce
    const goalsWithProgress = React.useMemo(() => {
        const result = goals.reduce((acc, goal) => {
            const progressAmount = Math.max(0, Math.min(acc.remainingFuel, goal.cost));
            return {
                remainingFuel: acc.remainingFuel - progressAmount,
                items: [...acc.items, { ...goal, progressAmount }]
            };
        }, { remainingFuel: totalEarnings, items: [] });
        return result.items;
    }, [goals, totalEarnings]);

    return (
        <div className="card">
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>My Goals</h2>

            {goals.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                    No goals set yet. Add one below!
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {goalsWithProgress.map((goal) => (
                    <GoalItem
                        key={goal.id}
                        goal={goal}
                        progressAmount={goal.progressAmount}
                        onDeleteGoal={onDeleteGoal}
                    />
                ))}
            </div>
        </div>
    );
}

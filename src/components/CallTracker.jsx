import React, { useEffect, useState } from 'react';
import { Phone, PhoneOff } from 'lucide-react';

export function CallTracker({
    isCallActive,
    onToggle,
    currentEarnings,
    durationSeconds,
    ratePerMinute
}) {
    const formatTime = (totalSeconds) => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = Math.floor(totalSeconds % 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const seconds = durationSeconds % 60;

    return (
        <div className="card" style={{ textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            {isCallActive && (
                <div className="animate-pulse-glow" style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    borderRadius: 'var(--radius)', pointerEvents: 'none', border: '2px solid var(--color-primary)'
                }} />
            )}

            <div style={{ textAlign: 'right', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Rate: <span style={{ color: 'white' }}>${ratePerMinute}/min</span>
                </div>
            </div>

            <div style={{ position: 'relative', padding: '2rem 0', marginBottom: '2rem' }}>
                {/* Clock Animation */}
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                    zIndex: 0,
                    opacity: 0.5
                }}>
                    <MinuteProgress seconds={seconds} />
                </div>

                <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ fontSize: '4rem', fontWeight: '700', fontFamily: 'monospace', lineHeight: 1 }}>
                        {formatTime(durationSeconds)}
                    </div>
                    <div style={{ fontSize: '2.5rem', fontWeight: '600', color: 'var(--color-primary)', marginTop: '0.5rem' }}>
                        ${currentEarnings.toFixed(2)}
                    </div>
                    <div style={{ color: 'var(--text-secondary)' }}>Current Call Earnings</div>
                </div>
            </div>

            <button
                onClick={onToggle}
                className={isCallActive ? 'btn btn-danger' : 'btn btn-primary'}
                style={{
                    width: '100%',
                    padding: '1.5rem',
                    fontSize: '1.2rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '1rem'
                }}
            >
                {isCallActive ? (
                    <>
                        <PhoneOff size={24} /> Stop Call
                    </>
                ) : (
                    <>
                        <Phone size={24} /> Start Call
                    </>
                )}
            </button>
        </div>
    );
}

const MinuteProgress = ({ seconds }) => {
    const radius = 130;
    const stroke = 4;
    const normalizedRadius = radius - stroke * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (seconds / 60) * circumference;

    return (
        <svg
            height={radius * 2}
            width={radius * 2}
            style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}
        >
            <circle
                stroke="rgba(255,255,255,0.05)"
                strokeWidth={stroke}
                fill="transparent"
                r={normalizedRadius}
                cx={radius}
                cy={radius}
            />
            <circle
                stroke="var(--color-primary)"
                strokeWidth={stroke}
                strokeDasharray={circumference + ' ' + circumference}
                style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.1s linear' }}
                strokeLinecap="round"
                fill="transparent"
                r={normalizedRadius}
                cx={radius}
                cy={radius}
                filter="drop-shadow(0 0 6px var(--color-primary))"
            />
        </svg>
    );
};

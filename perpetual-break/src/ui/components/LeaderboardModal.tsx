import React from 'react';
import { type ScoreEntry } from '../../storage/GameStorage';

interface LeaderboardModalProps {
    isOpen: boolean;
    onClose: () => void;
    scores: ScoreEntry[];
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ isOpen, onClose, scores }) => {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(255, 79, 15, 0.3)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 2500,
            pointerEvents: 'auto'
        }}>
            <div style={{
                background: '#FFE3BB',
                borderRadius: '16px',
                padding: '40px',
                maxWidth: '500px',
                width: '90%',
                boxShadow: '16px 16px 0px #FF4F0F',
                border: '4px solid #FF4F0F',
                animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}>
                <h2 style={{ fontSize: '2.5rem', color: '#03A6A1', margin: '0 0 30px 0', fontWeight: '900', textShadow: '3px 3px 0px #FF4F0F', textAlign: 'center' }}>TOP 5 SCORES</h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {scores.length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#888', fontWeight: 'bold' }}>No scores yet. Play a game!</p>
                    ) : (
                        scores.map((entry, i) => (
                            <div key={i} style={{
                                background: i === 0 ? '#FF4F0F' : '#fff',
                                color: i === 0 ? '#FFE3BB' : '#03A6A1',
                                padding: '15px 20px',
                                borderRadius: '8px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                border: '3px solid #03A6A1',
                                boxShadow: '4px 4px 0px rgba(0,0,0,0.1)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <span style={{ fontSize: '1.5rem', fontWeight: '900' }}>#{i + 1}</span>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '1.2rem', fontWeight: '900' }}>{entry.name || 'PLAYER'}</span>
                                        <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{entry.date}</span>
                                    </div>
                                </div>
                                <span style={{ fontSize: '1.8rem', fontWeight: '900' }}>{entry.score}</span>
                            </div>
                        ))
                    )}
                </div>

                <button
                    className="retro-btn"
                    onClick={onClose}
                    style={{
                        marginTop: '40px',
                        width: '100%',
                        padding: '15px',
                        borderRadius: '12px',
                        border: '4px solid #FF4F0F',
                        background: '#FF4F0F',
                        color: '#FFE3BB',
                        fontSize: '1.4rem',
                        fontWeight: '900',
                        cursor: 'pointer',
                        boxShadow: '6px 6px 0px #BF3B0B',
                        '--shadow-color': '#BF3B0B'
                    } as any}
                >
                    BACK
                </button>
            </div>
        </div>
    );
};

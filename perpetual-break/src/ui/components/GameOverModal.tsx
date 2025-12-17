import React, { useState } from 'react';
import { Icon } from './Icon';

interface GameOverModalProps {
    isOpen: boolean;
    score: number;
    highScore: number;
    coinsEarned: number;
    isNewHighScore: boolean;
    onRestart: (playerName: string) => void;
    onMenu: (playerName: string) => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
    isOpen,
    score,
    highScore,
    coinsEarned,
    isNewHighScore,
    onRestart,
    onMenu
}) => {
    const [playerName, setPlayerName] = useState('');

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(255, 79, 15, 0.4)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 3000,
            pointerEvents: 'auto'
        }}>
            <div style={{
                background: '#FFE3BB',
                borderRadius: '24px',
                padding: '48px',
                maxWidth: '500px',
                width: '90%',
                textAlign: 'center',
                boxShadow: '20px 20px 0px #FF4F0F',
                border: '6px solid #FF4F0F',
                animation: 'popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}>
                <style>{`
          @keyframes popIn {
            from { transform: scale(0.8); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
          .game-over-title {
            font-size: 4rem;
            color: #FF4F0F;
            margin: 0;
            font-weight: 900;
            text-shadow: 4px 4px 0px #03A6A1;
            line-height: 1;
          }
          .score-label {
            font-size: 1.2rem;
            color: #03A6A1;
            font-weight: 900;
            margin-top: 20px;
          }
          .score-value {
            font-size: 3.5rem;
            color: #03A6A1;
            font-weight: 900;
            margin: 0;
          }
          .new-badge {
            background: #FF4F0F;
            color: #FFE3BB;
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 1rem;
            font-weight: 900;
            display: inline-block;
            margin-bottom: 10px;
            animation: pulse 1s infinite;
          }
          .name-input {
            width: 100%;
            padding: 15px;
            border-radius: 8px;
            border: 3px solid #03A6A1;
            background: #fff;
            font-size: 1.2rem;
            font-weight: 900;
            color: #03A6A1;
            text-align: center;
            margin-bottom: 20px;
            outline: none;
          }
          .name-input:focus {
            border-color: #FF4F0F;
          }
        `}</style>

                <h2 className="game-over-title">GAME OVER</h2>

                <div style={{ margin: '30px 0' }}>
                    {isNewHighScore && <div className="new-badge">NEW RECORD!</div>}
                    <p className="score-label">FINAL SCORE</p>
                    <p className="score-value">{score}</p>
                    <p style={{ color: '#888', fontWeight: 'bold', marginBottom: '20px' }}>BEST: {highScore}</p>

                    <input
                        type="text"
                        className="name-input"
                        placeholder="ENTER YOUR NAME"
                        maxLength={12}
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value.toUpperCase())}
                    />
                </div>

                <div style={{
                    background: '#03A6A1',
                    padding: '15px',
                    borderRadius: '12px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '30px',
                    boxShadow: '4px 4px 0px #027373'
                }}>
                    <Icon name="coin" size="md" color="#FFE3BB" />
                    <span style={{ fontSize: '1.5rem', fontWeight: '900', color: '#FFE3BB' }}>+{coinsEarned} MOEDAS</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <button className="retro-btn" onClick={() => onRestart(playerName)} style={{
                        padding: '20px',
                        borderRadius: '12px',
                        border: '4px solid #03A6A1',
                        background: '#03A6A1',
                        color: '#FFE3BB',
                        fontSize: '1.5rem',
                        fontWeight: '900',
                        cursor: 'pointer',
                        boxShadow: '8px 8px 0px #027373',
                        '--shadow-color': '#027373'
                    } as any}>RETRY</button>

                    <button className="retro-btn" onClick={() => onMenu(playerName)} style={{
                        padding: '15px',
                        borderRadius: '12px',
                        border: '4px solid #FFA673',
                        background: '#FFA673',
                        color: '#FFE3BB',
                        fontSize: '1.2rem',
                        fontWeight: '900',
                        cursor: 'pointer',
                        boxShadow: '8px 8px 0px #D97D54',
                        '--shadow-color': '#D97D54'
                    } as any}>MENU</button>
                </div>
            </div>
        </div>
    );
};

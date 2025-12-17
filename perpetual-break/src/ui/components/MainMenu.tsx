import React, { useEffect, useState } from 'react';
import { Icon } from './Icon';

interface MainMenuProps {
    isOpen: boolean;
    onPlay: () => void;
    onShop: () => void;
    onSettings: () => void;
    onLeaderboard: () => void;
    onInstructions: () => void;
    onCredits: () => void;
    onReset?: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
    isOpen, onPlay, onShop, onSettings, onLeaderboard, onInstructions, onCredits, onReset
}) => {
    const [isAnimating, setIsAnimating] = useState(true);

    useEffect(() => {
        if (isOpen) {
            setIsAnimating(true);
            const timer = setTimeout(() => setIsAnimating(false), 1200);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const highScore = JSON.parse(localStorage.getItem('perpetual-break-save') || '{}').highScore || 0;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: '#FFE3BB',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 999,
            pointerEvents: 'auto',
            overflow: 'hidden'
        }}>
            {/* High Score Badge */}
            <div style={{
                position: 'absolute',
                top: '40px',
                background: '#03A6A1',
                padding: '10px 30px',
                borderRadius: '30px',
                border: '4px solid #FFE3BB',
                boxShadow: '6px 6px 0px #027373',
                color: '#FFE3BB',
                fontWeight: '900',
                fontSize: '1.2rem',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                animation: isAnimating ? 'flyInTop 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) both' : 'none'
            }}>
                <span style={{ opacity: 0.8, fontSize: '0.9rem' }}>BEST SCORE:</span>
                <span>{highScore}</span>
            </div>

            {/* Credits Button - Bottom Right */}
            <button
                className="retro-btn"
                onClick={onCredits}
                style={{
                    position: 'absolute',
                    bottom: '30px',
                    right: '30px',
                    padding: '12px 24px',
                    borderRadius: '12px',
                    border: '3px solid #03A6A1',
                    background: '#03A6A1',
                    color: '#FFE3BB',
                    fontSize: '1rem',
                    fontWeight: '900',
                    cursor: 'pointer',
                    boxShadow: '6px 6px 0px #027373',
                    zIndex: 1000,
                    '--shadow-color': '#027373',
                    animation: isAnimating ? 'flyInRight 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.4s both' : 'none'
                } as any}
            >
                CREDITS
            </button>

            <div style={{
                animation: isAnimating
                    ? 'flyInLeft 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) both'
                    : 'float 3s ease-in-out infinite'
            }}>
                <h1 style={{
                    fontSize: '5.5rem',
                    fontWeight: '900',
                    color: '#FF4F0F',
                    marginBottom: '60px',
                    textShadow: '8px 8px 0px #03A6A1',
                    letterSpacing: '4px',
                    textAlign: 'center',
                    lineHeight: '0.9'
                }}>
                    PERPETUAL<br />BREAK
                </h1>
            </div>

            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-20px); }
                }
                @keyframes flyInTop {
                    from { transform: translateY(-200px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes flyInBottom {
                    from { transform: translateY(400px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes flyInLeft {
                    from { transform: translateX(-600px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes flyInRight {
                    from { transform: translateX(600px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                .retro-btn {
                    transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                .retro-btn:hover {
                    transform: translate(-4px, -4px);
                    box-shadow: 12px 12px 0px var(--shadow-color) !important;
                    filter: brightness(1.1);
                }
                .retro-btn:active {
                    transform: translate(4px, 4px);
                    box-shadow: 4px 4px 0px var(--shadow-color) !important;
                }
            `}</style>

            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                width: '400px'
            }}>
                <button
                    className="retro-btn"
                    onClick={onPlay}
                    style={{
                        padding: '20px 40px',
                        borderRadius: '12px',
                        border: '4px solid #03A6A1',
                        background: '#03A6A1',
                        color: '#FFE3BB',
                        fontSize: '1.8rem',
                        fontWeight: '900',
                        cursor: 'pointer',
                        boxShadow: '8px 8px 0px #027373',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '15px',
                        '--shadow-color': '#027373',
                        animation: isAnimating ? 'flyInBottom 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.2s both' : 'none'
                    } as any}
                >
                    <Icon name="play" size="lg" color="#FFE3BB" />
                    PLAY
                </button>

                <div style={{ display: 'flex', gap: '16px' }}>
                    <button
                        className="retro-btn"
                        onClick={onShop}
                        style={{
                            flex: 1,
                            padding: '15px',
                            borderRadius: '12px',
                            border: '4px solid #FFA673',
                            background: '#FFA673',
                            color: '#FFE3BB',
                            fontSize: '1.2rem',
                            fontWeight: '900',
                            cursor: 'pointer',
                            boxShadow: '8px 8px 0px #D97D54',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            '--shadow-color': '#D97D54',
                            animation: isAnimating ? 'flyInLeft 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.3s both' : 'none'
                        } as any}
                    >
                        <Icon name="shop" size="md" color="#FFE3BB" />
                        SHOP
                    </button>

                    <button
                        className="retro-btn"
                        onClick={onLeaderboard}
                        style={{
                            flex: 1,
                            padding: '15px',
                            borderRadius: '12px',
                            border: '4px solid #FF4F0F',
                            background: '#FF4F0F',
                            color: '#FFE3BB',
                            fontSize: '1.2rem',
                            fontWeight: '900',
                            cursor: 'pointer',
                            boxShadow: '8px 8px 0px #BF3B0B',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            '--shadow-color': '#BF3B0B',
                            animation: isAnimating ? 'flyInRight 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.3s both' : 'none'
                        } as any}
                    >
                        <Icon name="star" size="md" color="#FFE3BB" />
                        TOP 5
                    </button>
                </div>

                <div style={{ display: 'flex', gap: '16px' }}>
                    <button
                        className="retro-btn"
                        onClick={onInstructions}
                        style={{
                            flex: 1,
                            padding: '15px',
                            borderRadius: '12px',
                            border: '4px solid #03A6A1',
                            background: '#fff',
                            color: '#03A6A1',
                            fontSize: '1.2rem',
                            fontWeight: '900',
                            cursor: 'pointer',
                            boxShadow: '8px 8px 0px #03A6A1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            '--shadow-color': '#03A6A1',
                            animation: isAnimating ? 'flyInLeft 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.4s both' : 'none'
                        } as any}
                    >
                        <Icon name="warning" size="md" color="#03A6A1" />
                        HOW TO
                    </button>

                    <button
                        className="retro-btn"
                        onClick={onSettings}
                        style={{
                            flex: 1,
                            padding: '15px',
                            borderRadius: '12px',
                            border: '4px solid #888',
                            background: '#fff',
                            color: '#888',
                            fontSize: '1.2rem',
                            fontWeight: '900',
                            cursor: 'pointer',
                            boxShadow: '8px 8px 0px #ccc',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            '--shadow-color': '#ccc',
                            animation: isAnimating ? 'flyInRight 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.4s both' : 'none'
                        } as any}
                    >
                        <Icon name="settings" size="md" color="#888" />
                        SETUP
                    </button>
                </div>

                {onReset && (
                    <button
                        onClick={onReset}
                        style={{
                            marginTop: '10px',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            border: 'none',
                            background: 'transparent',
                            color: '#FF4F0F',
                            fontSize: '0.8rem',
                            fontWeight: '900',
                            cursor: 'pointer',
                            opacity: 0.6,
                            animation: isAnimating ? 'flyInBottom 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.5s both' : 'none'
                        }}
                    >
                        RESET PROGRESS
                    </button>
                )}
            </div>

            <p style={{
                position: 'absolute',
                bottom: '20px',
                left: '20px',
                fontSize: '1rem',
                color: '#03A6A1',
                fontWeight: '900',
                opacity: 0.8,
                animation: isAnimating ? 'flyInLeft 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.6s both' : 'none'
            }}>
                RETRO EDITION v0.8
            </p>
        </div>
    );
};

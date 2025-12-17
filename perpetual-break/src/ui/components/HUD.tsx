import React, { useEffect, useState } from 'react';
import { eventBus } from '../../core/events/EventBus';
import { GameEventType } from '../../core/events/GameEvents';
import { Icon } from './Icon';

export const HUD: React.FC = () => {
    const [lives, setLives] = useState(3);
    const [coins, setCoins] = useState(0);
    const [score, setScore] = useState(0);
    const [activeBalls, setActiveBalls] = useState(0);

    useEffect(() => {
        const handleLifeLost = (payload: { remainingLives: number }) => {
            setLives(payload.remainingLives);
        };
        const handleCoinsEarned = (payload: { amount: number }) => {
            setCoins(prev => prev + payload.amount);
        };
        const handleScoreUpdate = (payload: { score: number }) => {
            setScore(payload.score);
        };
        const handleBallSpawn = () => {
            setActiveBalls(prev => prev + 1);
        };
        const handleBallLost = () => {
            setActiveBalls(prev => Math.max(0, prev - 1));
        };
        const handleAllBallsLost = () => {
            setActiveBalls(0);
        };

        eventBus.on(GameEventType.LIFE_LOST, handleLifeLost);
        eventBus.on(GameEventType.COINS_EARNED, handleCoinsEarned);
        eventBus.on(GameEventType.SCORE_UPDATE, handleScoreUpdate);
        eventBus.on(GameEventType.BALL_SPAWN, handleBallSpawn);
        eventBus.on(GameEventType.BALL_LOST, handleBallLost);
        eventBus.on(GameEventType.ALL_BALLS_LOST, handleAllBallsLost);

        return () => {
            eventBus.off(GameEventType.LIFE_LOST, handleLifeLost);
            eventBus.off(GameEventType.COINS_EARNED, handleCoinsEarned);
            eventBus.off(GameEventType.SCORE_UPDATE, handleScoreUpdate);
            eventBus.off(GameEventType.BALL_SPAWN, handleBallSpawn);
            eventBus.off(GameEventType.BALL_LOST, handleBallLost);
            eventBus.off(GameEventType.ALL_BALLS_LOST, handleAllBallsLost);
        };
    }, []);

    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            padding: '24px',
            pointerEvents: 'none',
            zIndex: 50,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start'
        }}>
            {/* Left: Stats Group */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '16px' }}>
                    {/* Coins */}
                    <div style={{
                        background: '#03A6A1',
                        padding: '12px 24px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        boxShadow: '6px 6px 0px #027373',
                        border: '3px solid #FFE3BB',
                        transition: 'transform 0.1s'
                    }}>
                        <Icon name="coin" size="md" color="#FFE3BB" />
                        <span style={{ fontSize: '1.6rem', fontWeight: '900', color: '#FFE3BB' }}>{coins}</span>
                    </div>

                    {/* Active Balls */}
                    <div style={{
                        background: '#FFA673',
                        padding: '12px 24px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        boxShadow: '6px 6px 0px #D97D54',
                        border: '3px solid #FFE3BB'
                    }}>
                        <span style={{ fontSize: '1.4rem', fontWeight: '900', color: '#FFE3BB' }}>{activeBalls}</span>
                        <div style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            background: '#FFE3BB',
                            boxShadow: '0 0 10px #FFE3BB'
                        }} />
                    </div>
                </div>

                {/* Score Display */}
                <div style={{
                    background: 'rgba(3, 166, 161, 0.9)',
                    padding: '8px 24px',
                    borderRadius: '8px',
                    border: '3px solid #FFE3BB',
                    boxShadow: '6px 6px 0px #027373',
                    display: 'inline-block',
                    width: 'fit-content'
                }}>
                    <span style={{ fontSize: '0.8rem', color: '#FFE3BB', fontWeight: 'bold', display: 'block', opacity: 0.8 }}>SCORE</span>
                    <span style={{ fontSize: '1.8rem', fontWeight: '900', color: '#FFE3BB', fontFamily: 'monospace' }}>
                        {score.toString().padStart(6, '0')}
                    </span>
                </div>
            </div>

            {/* Center: Lives */}
            <div style={{
                background: '#FF4F0F',
                padding: '12px 24px',
                borderRadius: '8px',
                display: 'flex',
                gap: '12px',
                boxShadow: '6px 6px 0px #BF3B0B',
                border: '3px solid #FFE3BB',
                position: 'absolute',
                left: '50%',
                transform: 'translateX(-50%)'
            }}>
                {[...Array(8)].map((_, i) => (
                    <div key={i} style={{ display: i < (lives > 3 ? lives : 3) ? 'block' : 'none' }}>
                        <Icon
                            name="heart"
                            size="md"
                            color={i < lives ? '#FFE3BB' : 'rgba(255, 227, 187, 0.3)'}
                        />
                    </div>
                ))}
            </div>

            {/* Right: Empty space for Home button */}
            <div style={{ width: '120px' }} />
        </div>
    );
};

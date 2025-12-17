import React, { useEffect, useState } from 'react';
import { GameCanvas } from '../render/GameCanvas';
import { Icon } from './components/Icon';
import { HUD } from './components/HUD';
import { MainMenu } from './components/MainMenu';
import { ShopModal } from './components/ShopModal';
import { GameOverModal } from './components/GameOverModal';
import { SettingsModal } from './components/SettingsModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { InstructionsModal } from './components/InstructionsModal';
import { lifeSystem } from '../core/systems/LifeSystem';
import { gameStorage } from '../storage/GameStorage';
import { game } from '../core/engine/Game';
import { eventBus } from '../core/events/EventBus';
import { GameEventType } from '../core/events/GameEvents';
import { soundSystem } from '../core/systems/SoundSystem';

const App: React.FC = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(true);
    const [isShopOpen, setIsShopOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
    const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);
    const [isGameOverOpen, setIsGameOverOpen] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isGameStarted, setIsGameStarted] = useState(false);

    const [gameData, setGameData] = useState(gameStorage.load());
    const [score, setScore] = useState(0);

    const [gameOverData, setGameOverData] = useState({
        score: 0,
        highScore: 0,
        coinsEarned: 0,
        isNewHighScore: false
    });

    useEffect(() => {
        const data = gameStorage.load();
        setGameData(data);
        applySettings(data.settings);
    }, []);

    const applySettings = (settings: any) => {
        soundSystem.setMuted(!settings.soundEnabled);
        soundSystem.setMusicMuted(!settings.musicEnabled);
        soundSystem.setVolume(settings.volume);
        soundSystem.setMusicVolume(settings.musicVolume);
    };

    useEffect(() => {
        if (isGameStarted) {
            if (isMenuOpen || isShopOpen || isPaused || isGameOverOpen || isSettingsOpen || isLeaderboardOpen || isInstructionsOpen) {
                game.pause();
                soundSystem.stopMusic();
            } else {
                game.resume();
                if (gameData.settings.musicEnabled) soundSystem.startMusic();
            }
        }
    }, [isMenuOpen, isShopOpen, isPaused, isGameStarted, isGameOverOpen, isSettingsOpen, isLeaderboardOpen, isInstructionsOpen, gameData.settings.musicEnabled]);

    useEffect(() => {
        const handleGameOver = (payload: any) => {
            const currentHighScore = gameStorage.load().highScore;
            setGameOverData({
                score: payload.finalScore,
                highScore: currentHighScore,
                coinsEarned: payload.coinsEarned,
                isNewHighScore: payload.finalScore > currentHighScore
            });
            setIsGameOverOpen(true);
            setIsGameStarted(false);
            setIsPaused(false);
            soundSystem.stopMusic();
        };

        const handleCoinsEarned = () => {
            const updatedData = gameStorage.load();
            setGameData(updatedData);
        };

        const handleScoreUpdate = (payload: { score: number }) => {
            setScore(payload.score);
        };

        eventBus.on(GameEventType.GAME_OVER, handleGameOver);
        eventBus.on(GameEventType.COINS_EARNED, handleCoinsEarned);
        eventBus.on(GameEventType.SCORE_UPDATE, handleScoreUpdate);

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                if (isGameStarted && !isMenuOpen && !isShopOpen && !isGameOverOpen && !isSettingsOpen && !isLeaderboardOpen && !isInstructionsOpen) {
                    togglePause();
                }
            }
            if (e.code === 'Escape') {
                if (isPaused) togglePause();
                else if (isShopOpen) setIsShopOpen(false);
                else if (isSettingsOpen) setIsSettingsOpen(false);
                else if (isLeaderboardOpen) setIsLeaderboardOpen(false);
                else if (isInstructionsOpen) setIsInstructionsOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            eventBus.off(GameEventType.GAME_OVER, handleGameOver);
            eventBus.off(GameEventType.COINS_EARNED, handleCoinsEarned);
            eventBus.off(GameEventType.SCORE_UPDATE, handleScoreUpdate);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isGameStarted, isMenuOpen, isShopOpen, isGameOverOpen, isSettingsOpen, isLeaderboardOpen, isInstructionsOpen, isPaused]);

    const handlePlay = () => {
        soundSystem.playButton();
        setIsMenuOpen(false);
        setIsPaused(false);
        setIsGameOverOpen(false);
        if (!isGameStarted) {
            setIsGameStarted(true);
            setScore(0);
            const initialLives = gameStorage.hasUpgrade('extra_life') ? 4 : 3;
            lifeSystem.startGame(initialLives);
            if (gameData.settings.musicEnabled) soundSystem.startMusic();
        }
    };

    const handleGameOverRestart = (playerName: string) => {
        game.finalizeGameOver(playerName);
        setGameData(gameStorage.load());
        handlePlay();
    };

    const handleGameOverMenu = (playerName: string) => {
        game.finalizeGameOver(playerName);
        setGameData(gameStorage.load());
        handleBackToMenu();
    };

    const handlePurchase = (itemId: string, cost: number) => {
        const success = gameStorage.purchaseUpgrade(itemId, cost);
        if (success) {
            soundSystem.playCoin();
            setGameData(gameStorage.load());
        }
    };

    const handleReset = () => {
        soundSystem.playButton();
        if (confirm('Are you sure you want to reset all progress? This cannot be undone!')) {
            gameStorage.reset();
            const freshData = gameStorage.load();
            setGameData(freshData);
            setScore(0);
            applySettings(freshData.settings);
        }
    };

    const togglePause = () => {
        soundSystem.playButton();
        setIsPaused(!isPaused);
    };

    const handleUpdateSettings = (newSettings: any) => {
        gameStorage.updateSettings(newSettings);
        const updatedData = gameStorage.load();
        setGameData(updatedData);
        applySettings(updatedData.settings);
    };

    const handleBackToMenu = () => {
        soundSystem.playButton();
        game.reset();
        setIsGameStarted(false);
        setIsMenuOpen(true);
        setIsPaused(false);
        setIsGameOverOpen(false);
        soundSystem.stopMusic();
    };

    return (
        <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#000' }}>
            <GameCanvas />

            <MainMenu
                isOpen={isMenuOpen}
                onPlay={handlePlay}
                onShop={() => { soundSystem.playButton(); setIsShopOpen(true); }}
                onSettings={() => { soundSystem.playButton(); setIsSettingsOpen(true); }}
                onLeaderboard={() => { soundSystem.playButton(); setIsLeaderboardOpen(true); }}
                onInstructions={() => { soundSystem.playButton(); setIsInstructionsOpen(true); }}
                onReset={handleReset}
            />

            <ShopModal
                isOpen={isShopOpen}
                onClose={() => { soundSystem.playButton(); setIsShopOpen(false); }}
                coins={gameData.coins}
                onPurchase={handlePurchase}
            />

            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => { soundSystem.playButton(); setIsSettingsOpen(false); }}
                settings={gameData.settings}
                onUpdate={handleUpdateSettings}
            />

            <LeaderboardModal
                isOpen={isLeaderboardOpen}
                onClose={() => { soundSystem.playButton(); setIsLeaderboardOpen(false); }}
                scores={gameData.leaderboard}
            />

            <InstructionsModal
                isOpen={isInstructionsOpen}
                onClose={() => { soundSystem.playButton(); setIsInstructionsOpen(false); }}
            />

            <GameOverModal
                isOpen={isGameOverOpen}
                score={gameOverData.score}
                highScore={gameOverData.highScore}
                coinsEarned={gameOverData.coinsEarned}
                isNewHighScore={gameOverData.isNewHighScore}
                onRestart={handleGameOverRestart}
                onMenu={handleGameOverMenu}
            />

            {isPaused && !isMenuOpen && !isShopOpen && !isGameOverOpen && !isSettingsOpen && !isLeaderboardOpen && !isInstructionsOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'rgba(0,0,0,0.7)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1500
                }}>
                    <h2 style={{ fontSize: '4rem', color: '#FFE3BB', fontWeight: '900', textShadow: '4px 4px 0px #FF4F0F', marginBottom: '20px' }}>PAUSED</h2>

                    <div style={{
                        background: '#03A6A1',
                        padding: '20px 40px',
                        borderRadius: '16px',
                        border: '4px solid #FFE3BB',
                        boxShadow: '8px 8px 0px #027373',
                        marginBottom: '40px',
                        textAlign: 'center'
                    }}>
                        <p style={{ color: '#FFE3BB', fontSize: '1.2rem', fontWeight: 'bold', margin: '0 0 10px 0' }}>CURRENT STATS</p>
                        <div style={{ display: 'flex', gap: '30px', justifyContent: 'center' }}>
                            <div>
                                <p style={{ color: 'rgba(255,227,187,0.7)', fontSize: '0.9rem', margin: 0 }}>SCORE</p>
                                <p style={{ color: '#FFE3BB', fontSize: '2rem', fontWeight: '900', margin: 0 }}>{score}</p>
                            </div>
                            <div>
                                <p style={{ color: 'rgba(255,227,187,0.7)', fontSize: '0.9rem', margin: 0 }}>COINS</p>
                                <p style={{ color: '#FFE3BB', fontSize: '2rem', fontWeight: '900', margin: 0 }}>{gameData.coins}</p>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '20px' }}>
                        <button className="retro-btn" onClick={togglePause} style={{
                            padding: '20px 40px',
                            borderRadius: '12px',
                            border: '4px solid #03A6A1',
                            background: '#03A6A1',
                            color: '#FFE3BB',
                            fontSize: '1.5rem',
                            fontWeight: '900',
                            cursor: 'pointer',
                            boxShadow: '8px 8px 0px #027373',
                            '--shadow-color': '#027373'
                        } as any}>RESUME</button>
                        <button className="retro-btn" onClick={handleBackToMenu} style={{
                            padding: '20px 40px',
                            borderRadius: '12px',
                            border: '4px solid #FF4F0F',
                            background: '#FF4F0F',
                            color: '#FFE3BB',
                            fontSize: '1.5rem',
                            fontWeight: '900',
                            cursor: 'pointer',
                            boxShadow: '8px 8px 0px #BF3B0B',
                            '--shadow-color': '#BF3B0B'
                        } as any}>MENU</button>
                    </div>
                    <p style={{ color: '#FFE3BB', marginTop: '20px', opacity: 0.7 }}>Press SPACE to resume</p>
                </div>
            )}

            {!isMenuOpen && !isShopOpen && !isGameOverOpen && !isSettingsOpen && !isLeaderboardOpen && !isInstructionsOpen && (
                <>
                    <HUD />
                    <div style={{
                        position: 'absolute',
                        top: '24px',
                        right: '24px',
                        zIndex: 100,
                        pointerEvents: 'auto',
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'center'
                    }}>
                        <button className="retro-btn" onClick={togglePause} style={{
                            padding: '12px',
                            borderRadius: '8px',
                            border: '3px solid #FFE3BB',
                            background: '#03A6A1',
                            color: '#FFE3BB',
                            cursor: 'pointer',
                            boxShadow: '6px 6px 0px #027373',
                            width: '56px',
                            height: '56px',
                            '--shadow-color': '#027373'
                        } as any}>
                            <Icon name={isPaused ? 'play' : 'pause'} size="md" color="#FFE3BB" />
                        </button>
                        <button className="retro-btn" onClick={() => setIsSettingsOpen(true)} style={{
                            padding: '12px',
                            borderRadius: '8px',
                            border: '3px solid #FFE3BB',
                            background: '#888',
                            color: '#FFE3BB',
                            cursor: 'pointer',
                            boxShadow: '6px 6px 0px #666',
                            width: '56px',
                            height: '56px',
                            '--shadow-color': '#666'
                        } as any}>
                            <Icon name="settings" size="md" color="#FFE3BB" />
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default App;

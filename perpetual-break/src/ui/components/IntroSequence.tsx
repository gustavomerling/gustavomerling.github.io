import React, { useEffect, useState } from 'react';
import { Icon } from './Icon';

interface IntroSequenceProps {
    onComplete: () => void;
}

export const IntroSequence: React.FC<IntroSequenceProps> = ({ onComplete }) => {
    const [stage, setStage] = useState<'splash' | 'warning'>('splash');
    const [fade, setFade] = useState(false);

    useEffect(() => {
        // Splash stage: 5 seconds
        const splashTimer = setTimeout(() => {
            setFade(true);
            setTimeout(() => {
                setStage('warning');
                setFade(false);
            }, 500); // Fade out duration
        }, 4500);

        // Warning stage: 5 seconds
        const warningTimer = setTimeout(() => {
            setFade(true);
            setTimeout(() => {
                onComplete();
            }, 500);
        }, 9500);

        return () => {
            clearTimeout(splashTimer);
            clearTimeout(warningTimer);
        };
    }, [onComplete]);

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: '#000',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
            transition: 'opacity 0.5s ease',
            opacity: fade ? 0 : 1,
            color: '#fff',
            textAlign: 'center',
            padding: '20px'
        }}>
            {stage === 'splash' && (
                <div style={{ animation: 'zoomIn 2s ease-out' }}>
                    <div style={{
                        fontSize: '5rem',
                        color: '#03A6A1',
                        marginBottom: '20px',
                        filter: 'drop-shadow(0 0 20px rgba(3, 166, 161, 0.5))'
                    }}>
                        <Icon name="settings" size="lg" style={{ fontSize: '100px', animation: 'spin 4s linear infinite' }} />
                    </div>
                    <h1 style={{
                        fontSize: '3rem',
                        fontWeight: '900',
                        letterSpacing: '4px',
                        margin: 0,
                        background: 'linear-gradient(45deg, #03A6A1, #FFE3BB)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>
                        MERLING'S GAMES
                    </h1>
                    <p style={{ color: '#666', marginTop: '10px', letterSpacing: '2px' }}>EST. 2024</p>
                </div>
            )}

            {stage === 'warning' && (
                <div style={{ maxWidth: '600px', animation: 'fadeIn 1s ease-out' }}>
                    <div style={{ color: '#FF4F0F', fontSize: '4rem', marginBottom: '20px' }}>
                        <Icon name="life" size="lg" style={{ fontSize: '80px' }} />
                    </div>
                    <h2 style={{ fontSize: '2rem', color: '#FF4F0F', marginBottom: '20px', fontWeight: '900' }}>PHOTOSENSITIVITY WARNING</h2>
                    <p style={{ fontSize: '1.2rem', lineHeight: '1.6', color: '#FFE3BB' }}>
                        This game contains flashing lights and high-contrast patterns that may trigger seizures for people with visual sensitivities.
                    </p>
                    <p style={{ fontSize: '1.1rem', marginTop: '20px', color: '#aaa' }}>
                        If you experience dizziness, altered vision, or any discomfort, stop playing immediately and consult a doctor.
                    </p>
                </div>
            )}

            <style>{`
                @keyframes zoomIn {
                    from { transform: scale(0.8); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

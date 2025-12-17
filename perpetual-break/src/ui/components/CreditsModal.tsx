import React from 'react';
import { Icon } from './Icon';

interface CreditsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CreditsModal: React.FC<CreditsModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 3000,
            pointerEvents: 'auto'
        }}>
            <div style={{
                background: '#111',
                borderRadius: '24px',
                padding: '50px',
                maxWidth: '600px',
                width: '90%',
                border: '4px solid #03A6A1',
                boxShadow: '0 0 50px rgba(3, 166, 161, 0.3)',
                textAlign: 'center',
                color: '#FFE3BB',
                position: 'relative',
                animation: 'creditsIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}>
                <div style={{ marginBottom: '30px' }}>
                    <div style={{ fontSize: '3rem', color: '#03A6A1', marginBottom: '10px' }}>
                        <Icon name="settings" size="lg" />
                    </div>
                    <h2 style={{ fontSize: '2rem', margin: 0, color: '#03A6A1', fontWeight: '900' }}>MERLING'S GAMES</h2>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontSize: '1.1rem' }}>
                    <div>
                        <p style={{ color: '#666', margin: '0 0 5px 0', fontSize: '0.9rem', textTransform: 'uppercase' }}>Criador</p>
                        <p style={{ fontWeight: 'bold', margin: 0 }}>Gustavo Merling</p>
                    </div>
                    <div>
                        <p style={{ color: '#666', margin: '0 0 5px 0', fontSize: '0.9rem', textTransform: 'uppercase' }}>Distribuição</p>
                        <p style={{ fontWeight: 'bold', margin: 0 }}>Merling's Games</p>
                    </div>
                    <div>
                        <p style={{ color: '#666', margin: '0 0 5px 0', fontSize: '0.9rem', textTransform: 'uppercase' }}>Planejamento</p>
                        <p style={{ fontWeight: 'bold', margin: 0 }}>Gustavo Merling & ChatGPT</p>
                    </div>
                    <div>
                        <p style={{ color: '#666', margin: '0 0 5px 0', fontSize: '0.9rem', textTransform: 'uppercase' }}>Desenvolvimento</p>
                        <p style={{ fontWeight: 'bold', margin: 0 }}>Gustavo Merling & Gemini</p>
                    </div>
                </div>

                <div style={{ marginTop: '40px', borderTop: '1px solid #333', paddingTop: '30px' }}>
                    <p style={{ fontStyle: 'italic', color: '#888', marginBottom: '20px', fontSize: '0.95rem' }}>
                        "Agradecemos a todos os jogos que vieram antes e desejamos boa sorte aos que virão depois."
                    </p>
                    <p style={{ color: '#FF4F0F', fontWeight: 'bold', fontSize: '1.1rem' }}>
                        "Onde o tijolo cai, o silêncio reconstrói o que a gravidade esqueceu."
                    </p>
                </div>

                <button
                    className="retro-btn"
                    onClick={onClose}
                    style={{
                        marginTop: '40px',
                        padding: '15px 40px',
                        borderRadius: '12px',
                        border: '4px solid #03A6A1',
                        background: '#03A6A1',
                        color: '#FFE3BB',
                        fontSize: '1.2rem',
                        fontWeight: '900',
                        cursor: 'pointer',
                        boxShadow: '6px 6px 0px #027373',
                        '--shadow-color': '#027373'
                    } as any}
                >
                    FECHAR
                </button>
            </div>

            <style>{`
                @keyframes creditsIn {
                    from { transform: translateY(50px) scale(0.9); opacity: 0; }
                    to { transform: translateY(0) scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

import React from 'react';
import { Icon } from './Icon';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: {
        soundEnabled: boolean;
        musicEnabled: boolean;
        volume: number;
        musicVolume: number;
    };
    onUpdate: (settings: any) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onUpdate }) => {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(3, 166, 161, 0.4)',
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
                maxWidth: '450px',
                width: '90%',
                boxShadow: '16px 16px 0px #03A6A1',
                border: '4px solid #03A6A1',
                animation: 'slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}>
                <h2 style={{ fontSize: '2.5rem', color: '#FF4F0F', margin: '0 0 30px 0', fontWeight: '900', textShadow: '3px 3px 0px #03A6A1', textAlign: 'center' }}>SETTINGS</h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* SFX Volume */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontWeight: '900', color: '#03A6A1' }}>SOUND EFFECTS</span>
                            <Icon
                                name={settings.soundEnabled ? 'volumeOn' : 'volumeOff'}
                                size="sm"
                                color="#FF4F0F"
                                onClick={() => onUpdate({ soundEnabled: !settings.soundEnabled })}
                                style={{ cursor: 'pointer' }}
                            />
                        </div>
                        <input
                            type="range" min="0" max="1" step="0.1"
                            value={settings.volume}
                            onChange={(e) => onUpdate({ volume: parseFloat(e.target.value) })}
                            style={{ width: '100%', cursor: 'pointer', accentColor: '#FF4F0F' }}
                        />
                    </div>

                    {/* Music Volume */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontWeight: '900', color: '#03A6A1' }}>MUSIC</span>
                            <Icon
                                name={settings.musicEnabled ? 'volumeOn' : 'volumeOff'}
                                size="sm"
                                color="#FF4F0F"
                                onClick={() => onUpdate({ musicEnabled: !settings.musicEnabled })}
                                style={{ cursor: 'pointer' }}
                            />
                        </div>
                        <input
                            type="range" min="0" max="1" step="0.1"
                            value={settings.musicVolume}
                            onChange={(e) => onUpdate({ musicVolume: parseFloat(e.target.value) })}
                            style={{ width: '100%', cursor: 'pointer', accentColor: '#FF4F0F' }}
                        />
                    </div>
                </div>

                <button
                    className="retro-btn"
                    onClick={onClose}
                    style={{
                        marginTop: '40px',
                        width: '100%',
                        padding: '15px',
                        borderRadius: '12px',
                        border: '4px solid #03A6A1',
                        background: '#03A6A1',
                        color: '#FFE3BB',
                        fontSize: '1.4rem',
                        fontWeight: '900',
                        cursor: 'pointer',
                        boxShadow: '6px 6px 0px #027373',
                        '--shadow-color': '#027373'
                    } as any}
                >
                    CLOSE
                </button>
            </div>
        </div>
    );
};

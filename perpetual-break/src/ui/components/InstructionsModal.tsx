import React from 'react';

interface InstructionsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const InstructionsModal: React.FC<InstructionsModalProps> = ({ isOpen, onClose }) => {
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
                maxWidth: '700px',
                width: '95%',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '16px 16px 0px #03A6A1',
                border: '4px solid #03A6A1',
                animation: 'slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}>
                <h2 style={{ fontSize: '2.5rem', color: '#FF4F0F', margin: '0 0 30px 0', fontWeight: '900', textShadow: '3px 3px 0px #03A6A1', textAlign: 'center' }}>HOW TO PLAY</h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                    {/* Controls */}
                    <section>
                        <h3 style={{ color: '#03A6A1', borderBottom: '3px solid #03A6A1', paddingBottom: '5px', marginBottom: '15px' }}>CONTROLS</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div style={{ background: '#fff', padding: '15px', borderRadius: '8px', border: '2px solid #03A6A1' }}>
                                <p style={{ fontWeight: '900', margin: '0 0 5px 0' }}>MOUSE</p>
                                <p style={{ margin: 0, fontSize: '0.9rem' }}>Move the mouse to control the paddle.</p>
                            </div>
                            <div style={{ background: '#fff', padding: '15px', borderRadius: '8px', border: '2px solid #03A6A1' }}>
                                <p style={{ fontWeight: '900', margin: '0 0 5px 0' }}>KEYBOARD</p>
                                <p style={{ margin: 0, fontSize: '0.9rem' }}>ARROWS or A/D to move. SPACE to Pause.</p>
                            </div>
                        </div>
                    </section>

                    {/* Powerups */}
                    <section>
                        <h3 style={{ color: '#03A6A1', borderBottom: '3px solid #03A6A1', paddingBottom: '5px', marginBottom: '15px' }}>POWERUPS</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
                            {[
                                { name: 'Multiball', desc: 'Spawns an extra ball.', color: '#03A6A1' },
                                { name: 'Fireball', desc: 'Ball pierces through blocks.', color: '#FF4F0F' },
                                { name: 'Laser', desc: 'Paddle fires lasers upwards!', color: '#FF00FF' },
                                { name: 'Magnet', desc: 'Attracts falling items.', color: '#BF3B0B' },
                                { name: 'Slow Motion', desc: 'Slows down time.', color: '#03A6A1' },
                                { name: 'Wide Paddle', desc: 'Increases paddle size.', color: '#FFA673' }
                            ].map(p => (
                                <div key={p.name} style={{ display: 'flex', gap: '10px', alignItems: 'center', background: '#fff', padding: '10px', borderRadius: '8px' }}>
                                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: p.color }} />
                                    <div>
                                        <p style={{ fontWeight: '900', margin: 0, fontSize: '0.9rem' }}>{p.name}</p>
                                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#666' }}>{p.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Blocks */}
                    <section>
                        <h3 style={{ color: '#03A6A1', borderBottom: '3px solid #03A6A1', paddingBottom: '5px', marginBottom: '15px' }}>BLOCK TYPES</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
                            {[
                                { name: 'Basic', desc: 'Standard block.', color: '#03A6A1' },
                                { name: 'Armor', desc: 'Requires 3 hits to break.', color: '#888' },
                                { name: 'Blink', desc: 'Fades in and out.', color: '#FFA673' },
                                { name: 'Explosive', desc: 'Destroys nearby blocks.', color: '#FF4F0F' },
                                { name: 'Lucky', desc: 'High chance of powerup.', color: '#FFE3BB' }
                            ].map(b => (
                                <div key={b.name} style={{ display: 'flex', gap: '10px', alignItems: 'center', background: '#fff', padding: '10px', borderRadius: '8px' }}>
                                    <div style={{ width: '10px', height: '10px', background: b.color }} />
                                    <div>
                                        <p style={{ fontWeight: '900', margin: 0, fontSize: '0.9rem' }}>{b.name}</p>
                                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#666' }}>{b.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
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
                    GOT IT!
                </button>
            </div>
        </div>
    );
};

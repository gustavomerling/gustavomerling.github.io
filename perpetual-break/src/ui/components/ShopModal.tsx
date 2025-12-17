import React from 'react';
import { Icon } from './Icon';
import { gameStorage } from '../../storage/GameStorage';

interface ShopItem {
    id: string;
    name: string;
    description: string;
    cost: number;
    icon: 'upgrade' | 'heart' | 'coin' | 'star' | 'shield' | 'magnet';
}

const SHOP_ITEMS: ShopItem[] = [
    {
        id: 'extra_life',
        name: 'Extra Life',
        description: 'Start with +1 life',
        cost: 50,
        icon: 'heart'
    },
    {
        id: 'ball_speed',
        name: 'Ball Power',
        description: 'Increase ball damage & speed',
        cost: 30,
        icon: 'upgrade'
    },
    {
        id: 'coin_multiplier',
        name: 'Coin Multiplier',
        description: 'Earn 2x coins & score',
        cost: 100,
        icon: 'coin'
    },
    {
        id: 'magnet_range',
        name: 'Magnet Range',
        description: 'Increase magnet attraction range',
        cost: 75,
        icon: 'magnet'
    },
    {
        id: 'shield_start',
        name: 'Shield Start',
        description: 'Start with a protective shield',
        cost: 120,
        icon: 'shield'
    },
    {
        id: 'paddle_speed',
        name: 'Paddle Speed',
        description: 'Increase paddle movement speed',
        cost: 40,
        icon: 'star'
    }
];

interface ShopModalProps {
    isOpen: boolean;
    onClose: () => void;
    coins: number;
    onPurchase: (itemId: string, cost: number) => void;
}

export const ShopModal: React.FC<ShopModalProps> = ({ isOpen, onClose, coins, onPurchase }) => {
    if (!isOpen) return null;

    const purchasedUpgrades = gameStorage.load().upgrades;

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
            zIndex: 2000,
            pointerEvents: 'auto'
        }}>
            <div style={{
                background: '#FFE3BB',
                borderRadius: '16px',
                padding: '40px',
                maxWidth: '600px',
                width: '90%',
                maxHeight: '85vh',
                overflow: 'auto',
                boxShadow: '16px 16px 0px #03A6A1',
                border: '4px solid #03A6A1',
                position: 'relative',
                animation: 'slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}>
                <style>{`
          @keyframes slideUp {
            from { transform: translateY(50px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          .shop-item {
            transition: all 0.2s;
          }
          .shop-item:hover:not(.disabled):not(.purchased) {
            transform: scale(1.02);
            background: #fff !important;
            border-color: #FF4F0F !important;
          }
          .purchased {
            border-color: #03A6A1 !important;
            background: #f0f0f0 !important;
          }
        `}</style>

                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '40px'
                }}>
                    <h2 style={{ fontSize: '3rem', color: '#FF4F0F', margin: 0, fontWeight: '900', textShadow: '3px 3px 0px #03A6A1' }}>SHOP</h2>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        background: '#03A6A1',
                        padding: '12px 24px',
                        borderRadius: '8px',
                        boxShadow: '4px 4px 0px #027373'
                    }}>
                        <Icon name="coin" size="md" color="#FFE3BB" />
                        <span style={{ fontSize: '1.8rem', fontWeight: '900', color: '#FFE3BB' }}>{coins}</span>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {SHOP_ITEMS.map(item => {
                        const isPurchased = purchasedUpgrades.includes(item.id);
                        const canAfford = coins >= item.cost;

                        return (
                            <div key={item.id}
                                className={`shop-item ${!canAfford && !isPurchased ? 'disabled' : ''} ${isPurchased ? 'purchased' : ''}`}
                                style={{
                                    background: '#fff',
                                    borderRadius: '12px',
                                    padding: '24px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    boxShadow: '6px 6px 0px rgba(0,0,0,0.1)',
                                    cursor: (canAfford && !isPurchased) ? 'pointer' : 'default',
                                    opacity: (canAfford || isPurchased) ? 1 : 0.6,
                                    border: '3px solid #03A6A1'
                                }}
                                onClick={() => {
                                    if (canAfford && !isPurchased) {
                                        onPurchase(item.id, item.cost);
                                    }
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                    <div style={{
                                        width: '56px',
                                        height: '56px',
                                        borderRadius: '8px',
                                        background: isPurchased ? '#03A6A1' : '#FFA673',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: isPurchased ? '3px 3px 0px #027373' : '3px 3px 0px #D97D54'
                                    }}>
                                        <Icon name={item.icon as any} size="lg" color="#FFE3BB" />
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1.4rem', color: '#03A6A1', fontWeight: '900' }}>{item.name}</h3>
                                        <p style={{ margin: '4px 0 0 0', fontSize: '1rem', color: '#888', fontWeight: '700' }}>{item.description}</p>
                                    </div>
                                </div>

                                {isPurchased ? (
                                    <div style={{
                                        background: '#03A6A1',
                                        color: '#FFE3BB',
                                        padding: '8px 16px',
                                        borderRadius: '8px',
                                        fontWeight: '900',
                                        fontSize: '1rem'
                                    }}>
                                        PURCHASED
                                    </div>
                                ) : (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        background: canAfford ? '#FF4F0F' : '#ccc',
                                        padding: '12px 20px',
                                        borderRadius: '8px',
                                        color: '#FFE3BB',
                                        fontWeight: '900',
                                        fontSize: '1.2rem',
                                        boxShadow: canAfford ? '4px 4px 0px #BF3B0B' : 'none'
                                    }}>
                                        <Icon name="coin" size="sm" color="#FFE3BB" />
                                        {item.cost}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <button
                    className="retro-btn"
                    onClick={onClose}
                    style={{
                        marginTop: '40px',
                        width: '100%',
                        padding: '20px',
                        borderRadius: '12px',
                        border: '4px solid #03A6A1',
                        background: '#03A6A1',
                        color: '#FFE3BB',
                        fontSize: '1.6rem',
                        fontWeight: '900',
                        cursor: 'pointer',
                        boxShadow: '8px 8px 0px #027373',
                        '--shadow-color': '#027373'
                    } as any}
                >
                    BACK TO MENU
                </button>
            </div>
        </div>
    );
};

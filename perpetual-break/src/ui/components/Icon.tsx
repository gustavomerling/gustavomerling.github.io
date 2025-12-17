import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faPlay,
    faPause,
    faCog,
    faShoppingCart,
    faHeart,
    faCoins,
    faArrowUp,
    faExclamationTriangle,
    faHome,
    faVolumeUp,
    faVolumeMute,
    faStar,
    faShieldAlt,
    faMagnet
} from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';

const iconMap: Record<string, IconDefinition> = {
    play: faPlay,
    pause: faPause,
    settings: faCog,
    shop: faShoppingCart,
    heart: faHeart,
    coin: faCoins,
    upgrade: faArrowUp,
    warning: faExclamationTriangle,
    home: faHome,
    volumeOn: faVolumeUp,
    volumeOff: faVolumeMute,
    star: faStar,
    shield: faShieldAlt,
    magnet: faMagnet,
    life: faHeart
};

export type IconName = keyof typeof iconMap;

interface IconProps {
    name: IconName;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    color?: string;
    className?: string;
    onClick?: () => void;
    style?: React.CSSProperties;
}

const SIZE_MAP = {
    sm: '1rem',
    md: '1.5rem',
    lg: '2rem',
    xl: '3rem',
};

export const Icon: React.FC<IconProps> = ({
    name,
    size = 'md',
    color,
    className = '',
    onClick,
    style: customStyle
}) => {
    const icon = iconMap[name];

    if (!icon) {
        console.warn(`Icon "${name}" not found.`);
        return null;
    }

    const style: React.CSSProperties = {
        fontSize: SIZE_MAP[size],
        color: color || 'inherit',
        cursor: onClick ? 'pointer' : 'inherit',
        ...customStyle
    };

    return (
        <span
            className={`icon-wrapper ${className}`}
            style={style}
            onClick={onClick}
        >
            <FontAwesomeIcon icon={icon} />
        </span>
    );
};

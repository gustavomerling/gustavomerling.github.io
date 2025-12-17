import React, { useEffect, useRef } from 'react';
import { game } from '../core/engine/Game';

const ASPECT_RATIO = 1024 / 768;

export const GameCanvas: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (canvasRef.current) {
            game.start(canvasRef.current);
        }

        return () => {
            game.stop();
        };
    }, []);

    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current && canvasRef.current) {
                const { clientWidth, clientHeight } = containerRef.current;
                const containerRatio = clientWidth / clientHeight;

                let width, height;

                if (containerRatio > ASPECT_RATIO) {
                    // Container is wider than aspect ratio, constrain by height
                    height = clientHeight;
                    width = height * ASPECT_RATIO;
                } else {
                    // Container is taller than aspect ratio, constrain by width
                    width = clientWidth;
                    height = width / ASPECT_RATIO;
                }

                // We set the CSS size, the internal resolution is fixed at 1024x768 in Game.ts
                canvasRef.current.style.width = `${width}px`;
                canvasRef.current.style.height = `${height}px`;
            }
        };

        window.addEventListener('resize', handleResize);
        // Call handleResize immediately to set initial size
        handleResize();

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return (
        <div
            ref={containerRef}
            style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'absolute',
                top: 0,
                left: 0,
                zIndex: 0,
                overflow: 'hidden'
            }}
        >
            <canvas ref={canvasRef} />
        </div>
    );
};

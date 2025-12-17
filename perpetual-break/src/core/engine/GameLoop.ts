export interface GameObject {
    update(dt: number): void;
    destroy?(): void;
}

export const GameLoopState = {
    STOPPED: 'STOPPED',
    RUNNING: 'RUNNING',
    PAUSED: 'PAUSED'
} as const;

export type GameLoopState = typeof GameLoopState[keyof typeof GameLoopState];

/**
 * Central game loop using requestAnimationFrame
 * Decoupled from React and DOM rendering
 */
export class GameLoop {
    private state: GameLoopState = GameLoopState.STOPPED;
    private lastTime: number = 0;
    private animationFrameId: number | null = null;
    private gameObjects: Set<GameObject> = new Set();

    // For testing and debugging
    private _updateCallback?: (dt: number) => void;
    private _renderCallback?: () => void;

    constructor() {
        console.log('GameLoop initialized');
    }

    /**
     * Start the game loop
     */
    public start(): void {
        if (this.state === GameLoopState.RUNNING) {
            console.warn('GameLoop already running');
            return;
        }

        this.state = GameLoopState.RUNNING;
        this.lastTime = performance.now();
        this.loop(this.lastTime);
        console.log('GameLoop started');
    }

    /**
     * Stop the game loop completely
     */
    public stop(): void {
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        this.state = GameLoopState.STOPPED;
        console.log('GameLoop stopped');
    }

    /**
     * Pause the game loop (can be resumed)
     */
    public pause(): void {
        if (this.state === GameLoopState.RUNNING) {
            this.state = GameLoopState.PAUSED;
            console.log('GameLoop paused');
        }
    }

    /**
     * Resume the game loop from pause
     */
    public resume(): void {
        if (this.state === GameLoopState.PAUSED) {
            this.state = GameLoopState.RUNNING;
            this.lastTime = performance.now(); // Reset time to avoid huge delta
            console.log('GameLoop resumed');
        }
    }

    /**
     * Main loop function
     */
    private loop = (timestamp: number): void => {
        if (this.state === GameLoopState.STOPPED) {
            return;
        }

        // Schedule next frame
        this.animationFrameId = requestAnimationFrame(this.loop);

        // Skip update if paused, but keep the loop running
        if (this.state === GameLoopState.PAUSED) {
            this.lastTime = timestamp; // Update time to prevent delta spike on resume
            return;
        }

        // Calculate delta time in seconds
        const deltaTime = Math.min((timestamp - this.lastTime) / 1000, 0.1); // Cap at 100ms to prevent spiral of death
        this.lastTime = timestamp;

        // Update phase
        this.update(deltaTime);

        // Render phase
        this.render();
    };

    /**
     * Update all game objects
     */
    private update(dt: number): void {
        // Update all registered game objects
        for (const obj of this.gameObjects) {
            obj.update(dt);
        }

        // Call custom update callback if set (for testing or extension)
        if (this._updateCallback) {
            this._updateCallback(dt);
        }
    }

    /**
     * Render phase (delegates to renderer)
     */
    private render(): void {
        // Call custom render callback if set
        if (this._renderCallback) {
            this._renderCallback();
        }
    }

    /**
     * Register a game object to be updated each frame
     */
    public addGameObject(obj: GameObject): void {
        this.gameObjects.add(obj);
    }

    /**
     * Unregister a game object
     */
    public removeGameObject(obj: GameObject): void {
        this.gameObjects.delete(obj);
        if (obj.destroy) {
            obj.destroy();
        }
    }

    /**
     * Clear all game objects
     */
    public clearGameObjects(): void {
        for (const obj of this.gameObjects) {
            if (obj.destroy) {
                obj.destroy();
            }
        }
        this.gameObjects.clear();
    }

    /**
     * Get current state
     */
    public getState(): GameLoopState {
        return this.state;
    }

    /**
     * Set custom update callback (for testing or extension)
     */
    public setUpdateCallback(callback: (dt: number) => void): void {
        this._updateCallback = callback;
    }

    /**
     * Set custom render callback (for testing or extension)
     */
    public setRenderCallback(callback: () => void): void {
        this._renderCallback = callback;
    }
}

// Singleton instance
export const gameLoop = new GameLoop();

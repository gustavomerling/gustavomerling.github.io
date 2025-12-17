export const GameEventType = {
    BALL_SPAWN: "onBallSpawn",
    BALL_LOST: "onBallLost",
    ALL_BALLS_LOST: "onAllBallsLost",
    LIFE_LOST: "onLifeLost",
    BLOCK_HIT: "onBlockHit",
    BLOCK_DESTROYED: "onBlockDestroyed",
    UPGRADE_DROPPED: "onUpgradeDropped",
    UPGRADE_COLLECTED: "onUpgradeCollected",
    DOWNGRADE_COLLECTED: "onDowngradeCollected",
    COINS_EARNED: "onCoinsEarned",
    GAME_OVER: "onGameOver",
    BALL_HIT_PADDLE: "onBallHitPaddle",
    BALL_HIT_WALL: "onBallHitWall",
    SCORE_UPDATE: "onScoreUpdate"
} as const;

export type GameEventType = typeof GameEventType[keyof typeof GameEventType];

export interface GameEventPayloads {
    [GameEventType.BALL_SPAWN]: { position: { x: number, y: number }, velocity: { x: number, y: number } };
    [GameEventType.BALL_LOST]: { ballId: string };
    [GameEventType.ALL_BALLS_LOST]: void;
    [GameEventType.LIFE_LOST]: { remainingLives: number };
    [GameEventType.BLOCK_HIT]: { blockId: string, damage: number };
    [GameEventType.BLOCK_DESTROYED]: {
        blockId: string;
        type: string;
        position: { x: number, y: number };
        isExplosion?: boolean;
    };
    [GameEventType.UPGRADE_DROPPED]: { type: string, position: { x: number, y: number } };
    [GameEventType.UPGRADE_COLLECTED]: { type: string };
    [GameEventType.DOWNGRADE_COLLECTED]: { type: string };
    [GameEventType.COINS_EARNED]: { amount: number };
    [GameEventType.GAME_OVER]: {
        finalScore: number;
        coinsEarned: number;
        isNewHighScore: boolean;
        highScore: number;
    };
    [GameEventType.BALL_HIT_PADDLE]: { ballId: string, position: { x: number, y: number } };
    [GameEventType.BALL_HIT_WALL]: { ballId: string, side: 'left' | 'right' | 'top' };
    [GameEventType.SCORE_UPDATE]: { score: number };
}

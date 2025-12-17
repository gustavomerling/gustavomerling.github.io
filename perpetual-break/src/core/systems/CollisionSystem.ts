/**
 * Simple 2D vector utilities
 */
export interface Vector2 {
    x: number;
    y: number;
}

/**
 * Axis-Aligned Bounding Box
 */
export interface AABB {
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * Circle shape
 */
export interface Circle {
    x: number;
    y: number;
    radius: number;
}

/**
 * Collision detection utilities
 */
export class CollisionDetector {
    /**
     * Check if a circle collides with an AABB (rectangle)
     * Returns true if collision detected
     */
    public static circleVsAABB(circle: Circle, rect: AABB): boolean {
        // Find the closest point on the rectangle to the circle
        const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
        const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));

        // Calculate distance between circle center and closest point
        const distanceX = circle.x - closestX;
        const distanceY = circle.y - closestY;
        const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);

        return distanceSquared < (circle.radius * circle.radius);
    }

    /**
     * Check if two AABBs collide
     */
    public static aabbVsAABB(a: AABB, b: AABB): boolean {
        return (
            a.x < b.x + b.width &&
            a.x + a.width > b.x &&
            a.y < b.y + b.height &&
            a.y + a.height > b.y
        );
    }

    /**
     * Get the normal vector for ball-rectangle collision
     * Used to determine bounce direction
     */
    public static getCollisionNormal(circle: Circle, rect: AABB): Vector2 {
        const centerX = rect.x + rect.width / 2;
        const centerY = rect.y + rect.height / 2;

        const dx = circle.x - centerX;
        const dy = circle.y - centerY;

        // Determine which side was hit based on penetration depth
        const overlapX = (rect.width / 2 + circle.radius) - Math.abs(dx);
        const overlapY = (rect.height / 2 + circle.radius) - Math.abs(dy);

        if (overlapX < overlapY) {
            // Hit from left or right
            return { x: dx > 0 ? 1 : -1, y: 0 };
        } else {
            // Hit from top or bottom
            return { x: 0, y: dy > 0 ? 1 : -1 };
        }
    }

    /**
     * Calculate reflection vector
     * @param velocity Current velocity vector
     * @param normal Surface normal vector
     */
    public static reflect(velocity: Vector2, normal: Vector2): Vector2 {
        // Reflection formula: v - 2(v·n)n
        const dot = velocity.x * normal.x + velocity.y * normal.y;
        return {
            x: velocity.x - 2 * dot * normal.x,
            y: velocity.y - 2 * dot * normal.y
        };
    }

    /**
     * Calculate paddle bounce with angle variation
     * The ball's angle changes based on where it hits the paddle
     * @param ballX Ball X position
     * @param paddleX Paddle X position
     * @param paddleWidth Paddle width
     * @param currentVelocity Current ball velocity
     */
    public static calculatePaddleBounce(
        ballX: number,
        paddleX: number,
        paddleWidth: number,
        currentVelocity: Vector2
    ): Vector2 {
        // Calculate relative hit position (-1 to 1, where 0 is center)
        const relativeIntersectX = (ballX - (paddleX + paddleWidth / 2)) / (paddleWidth / 2);

        // Clamp to prevent extreme angles
        const clampedIntersect = Math.max(-0.8, Math.min(0.8, relativeIntersectX));

        // Calculate bounce angle (max 60 degrees from vertical)
        const bounceAngle = clampedIntersect * (Math.PI / 3); // 60 degrees max

        // Calculate speed (preserve or slightly increase)
        const speed = Math.sqrt(currentVelocity.x ** 2 + currentVelocity.y ** 2);
        const newSpeed = Math.min(speed * 1.05, 800); // Cap max speed

        return {
            x: Math.sin(bounceAngle) * newSpeed,
            y: -Math.abs(Math.cos(bounceAngle)) * newSpeed // Always bounce upward
        };
    }

    /**
     * Check if a point is outside canvas bounds
     */
    public static isOutOfBounds(
        x: number,
        y: number,
        canvasWidth: number,
        canvasHeight: number
    ): { out: boolean; side: 'left' | 'right' | 'top' | 'bottom' | null } {
        if (x < 0) return { out: true, side: 'left' };
        if (x > canvasWidth) return { out: true, side: 'right' };
        if (y < 0) return { out: true, side: 'top' };
        if (y > canvasHeight) return { out: true, side: 'bottom' };
        return { out: false, side: null };
    }
}

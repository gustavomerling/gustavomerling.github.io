export interface UpgradeConfig {
    id: string;
    type: string;
    duration?: number;
    value?: number;
}

export abstract class BaseUpgrade {
    public abstract readonly type: string;
    public abstract readonly isNegative: boolean;
    protected config: UpgradeConfig;

    constructor(config: UpgradeConfig) {
        this.config = config;
    }

    public abstract onCollect(): void;
    public abstract onExpire(): void;
}

export type UpgradeConstructor = new (config: UpgradeConfig) => BaseUpgrade;

class UpgradeRegistry {
    private upgrades: Map<string, UpgradeConstructor> = new Map();

    public register(type: string, upgradeClass: UpgradeConstructor) {
        if (this.upgrades.has(type)) {
            console.warn(`Upgrade type "${type}" is already registered. Overwriting.`);
        }
        this.upgrades.set(type, upgradeClass);
        console.log(`Upgrade registered: ${type}`);
    }

    public get(type: string): UpgradeConstructor | undefined {
        return this.upgrades.get(type);
    }

    public getAllTypes(): string[] {
        return Array.from(this.upgrades.keys());
    }
}

export const upgradeRegistry = new UpgradeRegistry();

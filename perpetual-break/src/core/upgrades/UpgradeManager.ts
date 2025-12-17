import { eventBus } from '../events/EventBus';
import { GameEventType } from '../events/GameEvents';
import { upgradeRegistry } from './UpgradeRegistry';
// Import upgrade definitions to trigger auto-registration
import './definitions';

/**
 * UpgradeManager
 * Listens to upgrade collection events and activates upgrades
 */
class UpgradeManager {
    constructor() {
        this.setupListeners();
    }

    private setupListeners(): void {
        eventBus.on(GameEventType.UPGRADE_COLLECTED, (payload) => {
            this.handleUpgradeCollected(payload.type);
        });

        eventBus.on(GameEventType.DOWNGRADE_COLLECTED, (payload) => {
            this.handleDowngradeCollected(payload.type);
        });
    }

    private handleUpgradeCollected(upgradeType: string): void {
        const UpgradeClass = upgradeRegistry.get(upgradeType);

        if (!UpgradeClass) {
            console.warn(`Upgrade type "${upgradeType}" not found in registry`);
            return;
        }

        // Create instance and activate
        const upgrade = new UpgradeClass({
            id: `upgrade_${Date.now()}`,
            type: upgradeType
        });

        upgrade.onCollect();
    }

    private handleDowngradeCollected(downgradeType: string): void {
        // Handle downgrades (negative effects)
        console.log(`Downgrade collected: ${downgradeType}`);
        // TODO: Implement downgrade logic
    }
}

// Singleton instance
export const upgradeManager = new UpgradeManager();

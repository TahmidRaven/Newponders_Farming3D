import { _decorator, Component, Vec3, Prefab } from 'cc';
import { GameManager } from './GameManager';
import { ResourceManager } from './ResourceManager';
import { ToolManager } from './ToolManager';

const { ccclass, property } = _decorator;

@ccclass('UpgradeZone')
export class UpgradeZone extends Component {
    @property(ResourceManager)
    public resourceManager: ResourceManager = null!;

    @property(Prefab)
    public scythexPrefab: Prefab = null!;

    @property
    public upgradeCost: number = 55;

    @property
    public interactionDistance: number = 2.0;

    private _isUpgraded: boolean = false;

    update(deltaTime: number) {
        // Only run if we haven't upgraded and have a valid manager
        if (this._isUpgraded || !this.resourceManager || !GameManager.Instance) return;

        const playerPos = GameManager.Instance.getPlayerPosition();
        if (!playerPos) return;

        const distance = Vec3.distance(this.node.worldPosition, playerPos);

        if (distance < this.interactionDistance && this.resourceManager.coinCount >= this.upgradeCost) {
            this.performUpgrade();
        }
    }

    private performUpgrade() {
        this._isUpgraded = true; // Lock the zone so it only triggers once

        // Deduct coins via ResourceManager
        this.resourceManager.coinCount -= this.upgradeCost;
        this.resourceManager.updateUI();

        // Access ToolManager via the direct reference we set up in GameManager
        const toolManager = GameManager.Instance.toolManager;
        
        if (toolManager) {
            // Juice: Despawn old and spawn new
            toolManager.despawnTool();
            
            this.scheduleOnce(() => {
                toolManager.spawnTool(this.scythexPrefab);
            }, 0.2);
        }

        // Instead of destroying the node immediately, just disable the visual or collider
        // This prevents the "missing node" errors during the tween
        this.scheduleOnce(() => {
            this.node.active = false;
        }, 0.5);
    }
}
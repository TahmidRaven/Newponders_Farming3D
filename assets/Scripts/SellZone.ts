import { _decorator, Component, Vec3 } from 'cc';
import { GameManager } from './GameManager';
import { ResourceManager } from './ResourceManager';

const { ccclass, property } = _decorator;

/**
 * SellZone handles the conversion of crops to coins when the player
 * is within range of the node's world position.
 */
@ccclass('SellZone')
export class SellZone extends Component {
    @property(ResourceManager)
    public resourceManager: ResourceManager = null!;

    @property
    public sellDistance: number = 2.5;

    @property
    public sellInterval: number = 0.1; 

    @property
    public sellBatchSize: number = 5; 

    private timer: number = 0;
    private isInside: boolean = false; 

    update(deltaTime: number) {
        // Guard against missing references to prevent "reading properties of null" errors
        if (!this.resourceManager || !GameManager.Instance) return;

        const playerPos = GameManager.Instance.getPlayerPosition();
        if (!playerPos) return;

        // Uses the node's world position to allow the zone to be placed anywhere in the scene
        const zonePosition = this.node.worldPosition;
        const distance = Vec3.distance(zonePosition, playerPos);

        if (distance < this.sellDistance) {
            // Triggered upon first entry into the radius
            if (!this.isInside) {
                this.isInside = true;
                this.sell(); 
            }

            this.timer += deltaTime;
            
            if (this.timer >= this.sellInterval) {
                this.timer = 0;
                this.sell();
            }
        } else {
            // Reset state when player leaves the radius
            this.isInside = false;
            this.timer = 0;
        }
    }

    private sell() {
        if (this.resourceManager && this.resourceManager.cropCount > 0) {
            this.resourceManager.sellOneBatch(this.sellBatchSize);
        }
    }
}
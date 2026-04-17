import { _decorator, Component, Vec3 } from 'cc';
import { GameManager } from './GameManager';
import { ResourceManager } from './ResourceManager';

const { ccclass, property } = _decorator;

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
    private isInside: boolean = false; // Tracks if the player was already in range

    update(deltaTime: number) {
        if (!this.resourceManager) return;

        const playerPos = GameManager.Instance.getPlayerPosition();
        if (!playerPos) return;

        const distance = Vec3.distance(this.node.worldPosition, playerPos);

        if (distance < this.sellDistance) {
            // Check if this is the very first frame the player entered the zone
            if (!this.isInside) {
                this.isInside = true;
                this.sell(); // Immediate first sale
            }

            this.timer += deltaTime;
            
            if (this.timer >= this.sellInterval) {
                this.timer = 0;
                this.sell();
            }
        } else {
            // Reset everything when the player leaves
            this.isInside = false;
            this.timer = 0;
        }
    }

    private sell() {
        if (this.resourceManager.cropCount > 0) {
            this.resourceManager.sellOneBatch(this.sellBatchSize);
        }
    }
}
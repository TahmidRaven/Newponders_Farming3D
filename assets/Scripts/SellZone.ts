import { _decorator, Component, Vec3 } from 'cc';
import { GameManager } from './GameManager';
import { ResourceManager } from './ResourceManager';
import { BackpackBehavior } from './BackpackBehavior';

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
    private isInside: boolean = false; 

    update(deltaTime: number) {
        if (!this.resourceManager || !GameManager.Instance) return;

        const playerPos = GameManager.Instance.getPlayerPosition();
        if (!playerPos) return;

        const zonePosition = this.node.worldPosition;
        const distance = Vec3.distance(zonePosition, playerPos);

        if (distance < this.sellDistance) {
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
            this.isInside = false;
            this.timer = 0;
        }
    }

    private sell() {
        if (!this.resourceManager || this.resourceManager.cropCount <= 0) return;

        // Calculate how many we are actually selling this batch.
        const soldAmount = Math.min(this.resourceManager.cropCount, this.sellBatchSize);
        
        // Execute the logic update in the Resource Manager.
        this.resourceManager.sellOneBatch(this.sellBatchSize);

        // Get the visual backpack from the player.
        const backpack = GameManager.Instance.playerNode.getComponentInChildren(BackpackBehavior);
        
        if (backpack) {
            for (let i = 0; i < soldAmount; i++) {
                // 1. Visual: Feed Packet arcs from backpack to the center of the sell zone.
                backpack.PopItemForSale(this.node.worldPosition);

                // 2. Visual: Coin arcs from sell zone back to the player.
                // We add a slight delay for each coin to create a "streaming" effect.
                this.scheduleOnce(() => {
                    backpack.ReceiveCoin(this.node.worldPosition);
                }, 0.15 + (i * 0.05));
            }
        }
    }
}
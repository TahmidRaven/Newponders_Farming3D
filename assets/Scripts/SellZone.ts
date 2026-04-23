import { _decorator, Component, Vec3, Node } from 'cc';
import { GameManager } from './GameManager';
import { ResourceManager } from './ResourceManager';
import { BackpackBehavior } from './BackpackBehavior';
import { AudioContent } from './AudioContent';

const { ccclass, property } = _decorator;

@ccclass('SellZone')
export class SellZone extends Component {
    @property(ResourceManager) public resourceManager: ResourceManager = null!;
    @property public sellDistance: number = 2.5;
    @property public sellInterval: number = 0.1;
    @property public sellBatchSize: number = 5;

    // --- THIS IS THE PROPERTY THAT SHOULD APPEAR ---
    @property({ type: Node, tooltip: "Optional: Specific node where coins should fly to (e.g., UI Wallet or Player Hand)" })
    public coinTargetNode: Node = null!;

    private timer: number = 0;
    private isInside: boolean = false; 

    update(deltaTime: number) {
        if (!this.resourceManager || !GameManager.Instance) return;

        const playerPos = GameManager.Instance.getPlayerPosition();
        if (!playerPos) return;

        const distance = Vec3.distance(this.node.worldPosition, playerPos);

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

        const soldAmount = Math.min(this.resourceManager.cropCount, this.sellBatchSize);
        this.resourceManager.sellOneBatch(this.sellBatchSize);

        const backpack = GameManager.Instance.playerNode.getComponentInChildren(BackpackBehavior);
        
        if (backpack) {
            for (let i = 0; i < soldAmount; i++) {
                backpack.PopItemForSale(this.node.worldPosition);

                this.scheduleOnce(() => {
                    this.playCoinSound();
                    // Pass the target node reference to the ReceiveCoin method
                    backpack.ReceiveCoin(this.node.worldPosition, this.coinTargetNode);
                }, 0.15 + (i * 0.05));
            }
        }
    }

    private playCoinSound() {
        if (GameManager.Instance && GameManager.Instance.audioManagerNode) {
            const audios = GameManager.Instance.audioManagerNode.getComponentsInChildren(AudioContent);
            const coinSfx = audios.find(a => a.AudioName.includes("Coin"));
            if (coinSfx) coinSfx.play();
        }
    }
}
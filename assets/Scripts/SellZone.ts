import { _decorator, Component, Vec3 } from 'cc';
import { GameManager } from './GameManager';
import { ResourceManager } from './ResourceManager';
import { BackpackBehavior } from './BackpackBehavior';
import { AudioContent } from './AudioContent'; // Added for audio access

const { ccclass, property } = _decorator;

@ccclass('SellZone')
export class SellZone extends Component {
    @property(ResourceManager) public resourceManager: ResourceManager = null!;
    @property public sellDistance: number = 2.5;
    @property public sellInterval: number = 0.1; 
    @property public sellBatchSize: number = 5; 

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

                // --- TRIGGER COIN SFX WITH DELAY ---
                this.scheduleOnce(() => {
                    this.playCoinSound();
                    backpack.ReceiveCoin(this.node.worldPosition);
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
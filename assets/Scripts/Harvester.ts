import { _decorator, Component, Node, Vec3, Prefab, instantiate, director, animation, math } from 'cc';
import { FieldGenerator } from './FieldGenerator'; 
import { ResourceManager } from './ResourceManager'; 
import { BackpackBehavior } from './BackpackBehavior'; 
import { shakeNode } from './Helper';
import { GameManager } from './GameManager';
import { AudioContent } from './AudioContent'; 

const { ccclass, property } = _decorator;

@ccclass('Harvester')
export class Harvester extends Component {
    @property(FieldGenerator) public fieldGenerator: FieldGenerator = null!; 
    @property(ResourceManager) public resourceManager: ResourceManager = null!; 
    @property(BackpackBehavior) public backpack: BackpackBehavior = null!;
    @property({ type: Prefab }) public feedPacketPrefab: Prefab = null!; 

    @property({ group: { name: 'Harvest Settings' } }) public baseHarvestRadius: number = 2.0; 
    @property({ group: { name: 'Harvest Settings' } }) public harvestCheckInterval: number = 0.1; 

    public bladeCenterNode: Node = null!; 

    @property({ group: { name: 'Audio Settings' } }) public harvestSoundInterval: number = 0.15; 

    private isHarvesting: boolean = false;
    private _lastHarvestSoundTime: number = 0;

    update(deltaTime: number) {
        if (!this.fieldGenerator || !this.resourceManager || this.isHarvesting) return;
        this.checkForHarvest();
    }

    private checkForHarvest() {
        if (this.resourceManager.isFull()) return;

        // Origin is the Blade node if assigned, otherwise the player
        const harvestOrigin = this.bladeCenterNode ? this.bladeCenterNode.worldPosition : this.node.worldPosition;
        const checkForward = this.bladeCenterNode ? this.bladeCenterNode.forward : this.node.forward;

        const potentialNodes = this.fieldGenerator.getNodesInVicinity(harvestOrigin);
        let nodesToHarvest: Node[] = [];

        const _tempV3 = new Vec3();
        const _forward2D = new Vec3(checkForward.x, 0, checkForward.z).normalize();
        
        // 145 degree threshold (0.30 angle cosine approx)
        const dotThreshold = Math.cos(math.toRadian(145 / 2));

        for (const node of potentialNodes) {
            if (!node || !node.isValid) continue;

            Vec3.subtract(_tempV3, node.worldPosition, harvestOrigin);
            const dist = _tempV3.length();

            if (dist <= this.baseHarvestRadius) {
                const toStalk = new Vec3(_tempV3.x, 0, _tempV3.z).normalize();
                const dot = Vec3.dot(_forward2D, toStalk);
                
                // Only harvest if it's in the 145 degree front arc
                if (dot >= dotThreshold) {
                    nodesToHarvest.push(node);
                }
            }
        }

        if (nodesToHarvest.length > 0) {
            this.isHarvesting = true;
            this.playHarvestSound();

            const anim = this.getComponent(animation.AnimationController) || 
                         this.getComponentInChildren(animation.AnimationController);
            
            if (anim) {
                anim.setValue("onharvest", true);
                this.scheduleOnce(() => anim.setValue("onharvest", false), 0.5);
            }

            nodesToHarvest.forEach(node => this.harvestNode(node));
            this.scheduleOnce(() => { this.isHarvesting = false; }, 0.6);
        }
    }

    private playHarvestSound() {
        const currentTime = Date.now() / 1000;
        if (currentTime - this._lastHarvestSoundTime < this.harvestSoundInterval) return;

        if (GameManager.Instance && GameManager.Instance.audioManagerNode) {
            const audios = GameManager.Instance.audioManagerNode.getComponentsInChildren(AudioContent);
            const harvestSfx = audios.find(a => a.AudioName.includes("Harvest"));
            if (harvestSfx) {
                harvestSfx.play();
                this._lastHarvestSoundTime = currentTime;
            }
        }
    }

    private harvestNode(node: Node) {
        this.fieldGenerator.removeNodeFromGrid(node);
        shakeNode(node, 0.2, 0.05, 4, () => {
            this.resourceManager.addWheat(1);
            if (this.backpack && this.feedPacketPrefab) {
                const item = instantiate(this.feedPacketPrefab);
                director.getScene()?.addChild(item);
                item.setWorldPosition(node.worldPosition);
                this.backpack.Collect(item);
            }
            if (node.isValid) node.destroy();
        });
    }
}
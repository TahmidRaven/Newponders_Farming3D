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
    
    // REDUCE THIS: Set to 0.02 or 0.05 in Inspector for "instant" feel
    @property({ group: { name: 'Harvest Settings' } }) public harvestCheckInterval: number = 0.01; 

    public bladeCenterNode: Node = null!; 

    @property({ group: { name: 'Audio Settings' } }) public harvestSoundInterval: number = 0.15; 

    private _checkTimer: number = 0;
    private _lastHarvestSoundTime: number = 0;
    private _processingNodes: Set<string> = new Set(); // Track nodes currently being "shaken"

    update(deltaTime: number) {
        if (!this.fieldGenerator || !this.resourceManager) return;

        this._checkTimer += deltaTime;
        if (this._checkTimer >= this.harvestCheckInterval) {
            this._checkTimer = 0;
            this.checkForHarvest();
        }
    }

    private checkForHarvest() {
        if (this.resourceManager.isFull()) return;

        const harvestOrigin = this.bladeCenterNode ? this.bladeCenterNode.worldPosition : this.node.worldPosition;
        const checkForward = this.bladeCenterNode ? this.bladeCenterNode.forward : this.node.forward;

        const potentialNodes = this.fieldGenerator.getNodesInVicinity(harvestOrigin);
        let nodesToHarvest: Node[] = [];

        const _tempV3 = new Vec3();
        const _forward2D = new Vec3(checkForward.x, 0, checkForward.z).normalize();
        const dotThreshold = Math.cos(math.toRadian(145 / 2));

        for (const node of potentialNodes) {
            // Check if node is valid and NOT already being harvested
            if (!node || !node.isValid || this._processingNodes.has(node.uuid)) continue;

            Vec3.subtract(_tempV3, node.worldPosition, harvestOrigin);
            if (_tempV3.length() <= this.baseHarvestRadius) {
                const toStalk = new Vec3(_tempV3.x, 0, _tempV3.z).normalize();
                const dot = Vec3.dot(_forward2D, toStalk);
                
                if (dot >= dotThreshold) {
                    nodesToHarvest.push(node);
                }
            }
        }

        if (nodesToHarvest.length > 0) {
            this.playHarvestSound();

            const anim = this.getComponent(animation.AnimationController) || 
                         this.getComponentInChildren(animation.AnimationController);
            
            if (anim) {
                anim.setValue("onharvest", true);
                // Trigger reset based on check interval to allow rapid strikes
                this.scheduleOnce(() => anim.setValue("onharvest", false), 0.1); 
            }

            nodesToHarvest.forEach(node => this.harvestNode(node));
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
        const uuid = node.uuid;
        this._processingNodes.add(uuid);
        this.fieldGenerator.removeNodeFromGrid(node);

        shakeNode(node, 0.15, 0.05, 3, () => {
            this.resourceManager.addWheat(1);
            if (this.backpack && this.feedPacketPrefab) {
                const item = instantiate(this.feedPacketPrefab);
                director.getScene()?.addChild(item);
                item.setWorldPosition(node.worldPosition);
                this.backpack.Collect(item);
            }
            this._processingNodes.delete(uuid);
            if (node.isValid) node.destroy();
        });
    }
}
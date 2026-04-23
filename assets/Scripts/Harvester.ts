import { _decorator, Component, Node, Vec3, Prefab, instantiate, director, animation } from 'cc';
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
    
    @property({ group: { name: 'Harvest Settings' } }) 
    public baseHarvestRadius: number = 2.0; 

    @property({ group: { name: 'Harvest Settings' } }) 
    public harvestCheckInterval: number = 0.1; 

    // --- NEW: SOUND COOLDOWN SETTINGS ---
    @property({ group: { name: 'Audio Settings' }, tooltip: "Minimum time (seconds) between harvest sounds" })
    public harvestSoundInterval: number = 0.15; 

    private isHarvesting: boolean = false;
    private _lastHarvestSoundTime: number = 0; // Tracks the last time the SFX played

    update(deltaTime: number) {
        if (!this.fieldGenerator || !this.resourceManager || this.isHarvesting) return;
        this.checkForHarvest();
    }

    private checkForHarvest() {
        if (this.resourceManager.isFull()) return;

        const harvestOrigin = this.node.worldPosition;
        const potentialNodes = this.fieldGenerator.getNodesInVicinity(harvestOrigin);
        let nodesToHarvest: Node[] = [];

        for (const node of potentialNodes) {
            if (node?.isValid && Vec3.distance(harvestOrigin, node.worldPosition) <= this.baseHarvestRadius) {
                nodesToHarvest.push(node);
            }
        }

        if (nodesToHarvest.length > 0) {
            this.isHarvesting = true;
            
            // Try to play sound (will only succeed if cooldown has passed)
            this.playHarvestSound();

            const anim = this.getComponent(animation.AnimationController) || 
                         this.getComponentInChildren(animation.AnimationController);
            
            if (anim) {
                anim.setValue("onharvest", true);
                this.scheduleOnce(() => anim.setValue("onharvest", false), 0.5);
            }

            nodesToHarvest.forEach(node => this.harvestNode(node));

            this.scheduleOnce(() => { 
                this.isHarvesting = false; 
            }, 0.6);
        }
    }

    private playHarvestSound() {
        const currentTime = Date.now() / 1000; // Convert to seconds

        // Only play if enough time has passed since the last play
        if (currentTime - this._lastHarvestSoundTime < this.harvestSoundInterval) {
            return;
        }

        if (GameManager.Instance && GameManager.Instance.audioManagerNode) {
            const audios = GameManager.Instance.audioManagerNode.getComponentsInChildren(AudioContent);
            const harvestSfx = audios.find(a => a.AudioName.includes("Harvest"));
            
            if (harvestSfx) {
                harvestSfx.play();
                this._lastHarvestSoundTime = currentTime; // Update the timestamp
            }
        }
    }

    private harvestNode(node: Node) {
        this.fieldGenerator.removeNodeFromGrid(node);
        shakeNode(node, 0.2, 0.05, 4, () => {
            this.resourceManager.addWheat(1);
            if (this.backpack && this.feedPacketPrefab) {
                const item = instantiate(this.feedPacketPrefab);
                const spawnPos = node.worldPosition.clone();
                director.getScene()?.addChild(item);
                item.setWorldPosition(spawnPos);
                item.active = true;
                this.backpack.Collect(item);
            }
            if (node.isValid) node.destroy();
        });
    }
}
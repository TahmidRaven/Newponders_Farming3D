import { _decorator, Component, Node, Vec3, Prefab, instantiate, director, animation } from 'cc'; // Added animation to imports
import { FieldGenerator } from './FieldGenerator'; 
import { ResourceManager } from './ResourceManager'; 
import { BackpackBehavior } from './BackpackBehavior'; 
import { shakeNode } from './Helper';

const { ccclass, property } = _decorator;

@ccclass('Harvester')
export class Harvester extends Component {
    @property(FieldGenerator) 
    public fieldGenerator: FieldGenerator = null!; 

    @property(ResourceManager) 
    public resourceManager: ResourceManager = null!; 

    @property(BackpackBehavior) 
    public backpack: BackpackBehavior = null!;
    
    @property({ type: Prefab }) 
    public feedPacketPrefab: Prefab = null!; 

    @property 
    public baseHarvestRadius: number = 2.0; 

    @property 
    public harvestCheckInterval: number = 0.1; 

    private isHarvesting: boolean = false;

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
            
            // --- ANIMATION TRIGGER FIX ---
            // Find the AnimationController on this node or its children
            const anim = this.getComponent(animation.AnimationController) || 
                         this.getComponentInChildren(animation.AnimationController);
            
            if (anim) {
                anim.setValue("onharvest", true);
                // Reset the trigger shortly after so it doesn't loop infinitely
                this.scheduleOnce(() => anim.setValue("onharvest", false), 0.5);
            }

            nodesToHarvest.forEach(node => this.harvestNode(node));

            this.scheduleOnce(() => { 
                this.isHarvesting = false; 
            }, 0.6);
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
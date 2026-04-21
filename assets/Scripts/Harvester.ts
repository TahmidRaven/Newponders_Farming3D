import { _decorator, Component, Node, Vec3, Prefab, instantiate, director } from 'cc';
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
        // Guard against harvesting if full or already in a harvest cooldown
        if (!this.fieldGenerator || !this.resourceManager || this.isHarvesting) return;
        
        this.checkForHarvest();
    }

    private checkForHarvest() {
        // Stop if the player's resource storage is full
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
            
            // Perform the harvest for each node found in range
            nodesToHarvest.forEach(node => this.harvestNode(node));

            // Small cooldown to prevent frame-perfect double harvesting
            this.scheduleOnce(() => { 
                this.isHarvesting = false; 
            }, 0.6);
        }
    }

    private harvestNode(node: Node) {
        // Remove from the spatial grid immediately so other checks don't find it
        this.fieldGenerator.removeNodeFromGrid(node);

        // Visual feedback on the wheat stalk before it disappears
        shakeNode(node, 0.2, 0.05, 4, () => {
            // Update the resource logic
            this.resourceManager.addWheat(1);
            
            // Handle visual collection into the backpack
            if (this.backpack && this.feedPacketPrefab) {
                const item = instantiate(this.feedPacketPrefab);
                
                // Add to scene at the current world position of the harvested node
                const spawnPos = node.worldPosition.clone();
                director.getScene()?.addChild(item);
                item.setWorldPosition(spawnPos);
                item.active = true;
                
                // Trigger the arc movement and stacking logic in the backpack
                this.backpack.Collect(item);
            }

            // Clean up the world node
            node.destroy();
        });
    }
}
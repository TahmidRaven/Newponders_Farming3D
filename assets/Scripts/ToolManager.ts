import { _decorator, Component, Node, Prefab, instantiate, Vec3, Quat, tween, animation, ParticleSystem } from 'cc';
import { GameManager } from './GameManager';
import { Harvester } from './Harvester';
import { BackpackBehavior } from './BackpackBehavior';
import { ToolData } from './ToolData'; 

const { ccclass, property } = _decorator;

@ccclass('ToolManager')
export class ToolManager extends Component {
    @property(Node) public playerRigRoot: Node = null!; 
    @property(Node) public handSlot: Node = null!; 

    @property({ type: Node, group: "Visuals" }) public HandToolUpgradeFX: Node = null!; 
    @property({ type: Node, group: "Visuals" }) public VehicleUpgradeFX: Node = null!; 

    @property({ group: "Offsets" }) public vehicleSeatOffset: Vec3 = new Vec3(0, 0.5, -0.2); 
    @property({ group: "Offsets" }) public vehicleGroundOffset: Vec3 = new Vec3(0, -1.0, 0); 
    @property({ group: "Settings" }) public upgradeLockDuration: number = 1.15;

    private currentTool: Node | null = null;
    private _isSpawning: boolean = false;

    public spawnTool(toolPrefab: Prefab, isVehicle: boolean = false) {
        if (!toolPrefab || this._isSpawning) return;
        this._isSpawning = true;
        
        if (GameManager.Instance) {
            GameManager.Instance.setPlayerEnabled(false);
        }

        this.despawnTool(true);
        this.currentTool = instantiate(toolPrefab);
        const targetScale = this.currentTool.getScale().clone();

        const harvester = this.node.getComponent(Harvester);
        const backpack = this.node.getComponentInChildren(BackpackBehavior);
        const data = this.currentTool.getComponent(ToolData);

        // 1. Sync Harvest Radius and Backpack Offset
        if (harvester && data) harvester.baseHarvestRadius = data.harvestRadius;
        if (backpack) backpack.setVehicleMode(isVehicle);

        if (isVehicle) {
            this.currentTool.setParent(this.node);
            this.currentTool.setPosition(this.vehicleGroundOffset);
            this.currentTool.setRotation(Quat.IDENTITY);

            if (this.playerRigRoot) this.playerRigRoot.setPosition(this.vehicleSeatOffset);
            
            // Link the specific blade node for the 145 degree arc
            if (harvester) {
                const foundBlade = this.findNodeByNamePart(this.currentTool, "Circle.001");
                if (foundBlade) harvester.bladeCenterNode = foundBlade;
            }

            this.TriggerUpgradeFX(this.VehicleUpgradeFX);
        } else {
            this.currentTool.setParent(this.handSlot);
            this.currentTool.setPosition(Vec3.ZERO);
            if (this.playerRigRoot) this.playerRigRoot.setPosition(Vec3.ZERO);
            
            if (harvester) harvester.bladeCenterNode = null!; // Reset to player center

            this.TriggerUpgradeFX(this.HandToolUpgradeFX);
        }

        const anim = this.node.getComponentInChildren(animation.AnimationController);
        if (anim) anim.setValue("driving", isVehicle);

        this.PlayPopJuice(this.currentTool, targetScale);

        this.scheduleOnce(() => {
            this._isSpawning = false;
            if (GameManager.Instance) GameManager.Instance.setPlayerEnabled(true);
        }, this.upgradeLockDuration);
    }

    private findNodeByNamePart(root: Node, part: string): Node | null {
        if (root.name.includes(part)) return root;
        for (const child of root.children) {
            const found = this.findNodeByNamePart(child, part);
            if (found) return found;
        }
        return null;
    }

    private TriggerUpgradeFX(fxNode: Node) {
        if (!fxNode) return;
        fxNode.active = true;
        const ps = fxNode.getComponent(ParticleSystem) || fxNode.getComponentInChildren(ParticleSystem);
        if (ps) { ps.stop(); ps.play(); }
        this.scheduleOnce(() => { if (fxNode && fxNode.isValid) fxNode.active = false; }, 3.0);
    }

    private PlayPopJuice(target: Node, finalScale: Vec3) {
        target.setScale(Vec3.ZERO);
        tween(target).to(0.5, { scale: finalScale }, { easing: 'elasticOut' }).start();
    }

    public despawnTool(immediate: boolean = false) {
        if (!this.currentTool) return;
        if (immediate) {
            this.currentTool.destroy();
            this.currentTool = null;
        } else {
            const ref = this.currentTool;
            this.currentTool = null;
            tween(ref).to(0.2, { scale: Vec3.ZERO }, { easing: 'backIn' }).call(() => { if (ref.isValid) ref.destroy(); }).start();
        }
    }
}
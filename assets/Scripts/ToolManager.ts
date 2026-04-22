import { _decorator, Component, Node, Prefab, instantiate, Vec3, Quat, v3, tween, animation } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ToolManager')
export class ToolManager extends Component {
    @property(Node)
    public playerRigRoot: Node = null!; // MUST be assigned in Inspector

    @property(Node)
    public handSlot: Node = null!; 

    @property({ group: "Offsets" })
    public vehicleSeatOffset: Vec3 = new Vec3(0, 0.5, -0.2); 

    @property({ group: "Offsets" })
    public vehicleGroundOffset: Vec3 = new Vec3(0, -1.0, 0); 

    private currentTool: Node | null = null;
    private _isSpawning: boolean = false;

    public spawnTool(toolPrefab: Prefab, isVehicle: boolean = false) {
        if (!toolPrefab || this._isSpawning) {
            console.warn("Spawn failed: Prefab missing or already spawning");
            return;
        }

        this._isSpawning = true;
        this.despawnTool(true); 

        this.currentTool = instantiate(toolPrefab);
        
        // Capture prefab size to use it accordingly
        const targetScale = this.currentTool.getScale().clone();

        if (isVehicle) {
            this.currentTool.setParent(this.node); 
            this.currentTool.setPosition(this.vehicleGroundOffset);
            this.currentTool.setRotation(Quat.IDENTITY);

            if (this.playerRigRoot) {
                this.playerRigRoot.setPosition(this.vehicleSeatOffset);
            }
        } else {
            this.currentTool.setParent(this.handSlot);
            this.currentTool.setPosition(Vec3.ZERO);
            
            if (this.playerRigRoot) {
                this.playerRigRoot.setPosition(Vec3.ZERO);
            }
        }

        const anim = this.node.getComponentInChildren(animation.AnimationController);
        if (anim) {
            anim.setValue("driving", isVehicle);
        }

        // Apply prefab's scale with the pop juice
        this.PlayPopJuice(this.currentTool, targetScale);
    }

    private PlayPopJuice(target: Node, finalScale: Vec3) {
        target.setScale(Vec3.ZERO);
        tween(target)
            .to(0.5, { scale: finalScale }, { easing: 'elasticOut' })
            .call(() => { this._isSpawning = false; })
            .start();
    }

    public despawnTool(immediate: boolean = false) {
        if (!this.currentTool) return;
        if (immediate) {
            this.currentTool.destroy();
            this.currentTool = null;
        } else {
            const ref = this.currentTool;
            this.currentTool = null;
            tween(ref).to(0.2, { scale: Vec3.ZERO }, { easing: 'backIn' }).call(() => ref.destroy()).start();
        }
    }
}
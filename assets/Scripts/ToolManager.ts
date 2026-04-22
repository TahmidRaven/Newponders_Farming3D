import { _decorator, Component, Node, Prefab, instantiate, Vec3, Quat, v3, tween, animation } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ToolManager')
export class ToolManager extends Component {
    @property(Node)
    public playerRigRoot: Node = null!; 

    @property(Node)
    public handSlot: Node = null!; 

    @property({ group: "Offsets" })
    public vehicleSeatOffset: Vec3 = new Vec3(0, 0.5, -0.2); 

    @property({ group: "Offsets" })
    public vehicleGroundOffset: Vec3 = new Vec3(0, -1.0, 0); 

    private currentTool: Node | null = null;
    private _isSpawning: boolean = false;

    public spawnTool(toolPrefab: Prefab, isVehicle: boolean = false) {
        if (!toolPrefab || this._isSpawning) return;

        this._isSpawning = true;
        this.despawnTool(true); 

        // 1. Instantiate the prefab
        this.currentTool = instantiate(toolPrefab);
        
        // 2. Capture the prefab's native scale before parenting logic
        const targetScale = this.currentTool.getScale().clone();

        if (isVehicle) {
            // VEHICLE LOGIC
            this.currentTool.setParent(this.node); 
            this.currentTool.setPosition(this.vehicleGroundOffset);
            this.currentTool.setRotation(Quat.IDENTITY);

            if (this.playerRigRoot) {
                this.playerRigRoot.setPosition(this.vehicleSeatOffset);
            }
        } else {
            // HAND TOOL LOGIC
            this.currentTool.setParent(this.handSlot);
            this.currentTool.setPosition(Vec3.ZERO);
            this.currentTool.setRotation(Quat.IDENTITY);
            
            if (this.playerRigRoot) {
                this.playerRigRoot.setPosition(Vec3.ZERO);
            }
        }

        // 3. Trigger Driving Animation
        const anim = this.node.getComponentInChildren(animation.AnimationController);
        if (anim) {
            anim.setValue("driving", isVehicle);
        }

        // 4. Play Pop Juice using the PREFAB'S scale
        this.PlayPopJuice(this.currentTool, targetScale);
    }

    private PlayPopJuice(target: Node, finalScale: Vec3) {
        target.setScale(Vec3.ZERO);
        
        tween(target)
            .to(0.5, { scale: finalScale }, { 
                easing: 'elasticOut',
                onUpdate: (targetNode: Node, ratio: number) => {
                    // Optional: You can add extra logic here if specific parts 
                    // of the prefab need to scale differently
                }
            })
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
import { _decorator, Component, Node, Prefab, instantiate, Vec3, v3, tween } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ToolManager')
export class ToolManager extends Component {
    @property(Node)
    public toolSlot: Node = null!; // For Sickle, Scythe (Hand Bone)

    @property(Node)
    public vehicleSlot: Node = null!; // For Truck, Tractor (Root/Pelvis Node)

    private currentTool: Node | null = null;

    /**
     * Spawns a tool or vehicle. 
     * @param isVehicle If true, attaches to vehicleSlot. If false, attaches to toolSlot.
     */
    public spawnTool(toolPrefab: Prefab, isVehicle: boolean = false) {
        if (!toolPrefab) return;

        // Pick the correct slot based on the type
        const targetSlot = isVehicle ? this.vehicleSlot : this.toolSlot;

        if (!targetSlot) {
            console.error(`ToolManager: Target slot (${isVehicle ? 'vehicleSlot' : 'toolSlot'}) is not assigned!`);
            return;
        }

        // Clean up current tool
        if (this.currentTool) {
            this.currentTool.destroy();
            this.currentTool = null;
        }

        this.currentTool = instantiate(toolPrefab);
        this.currentTool.parent = targetSlot; // Attach as child

        // --- ALIGNMENT LOGIC ---
        // Align the Truck's "EngineSlot" to the player's slot position
        const engineSlot = this.currentTool.getChildByPath("EngineSlot");
        if (engineSlot) {
            const offset = engineSlot.position.clone().negative();
            this.currentTool.setPosition(offset);
        } else {
            this.currentTool.setPosition(Vec3.ZERO);
        }
        
        this.currentTool.setRotationFromEuler(0, 0, 0);

        // Cancel out bone scale
        const pScale = targetSlot.worldScale;
        const originalScale = v3(1 / (pScale.x || 1), 1 / (pScale.y || 1), 1 / (pScale.z || 1));

        // Elastic Pop-In Juice
        this.currentTool.setScale(v3(0, 0, 0));
        tween(this.currentTool)
            .to(0.2, { scale: v3(originalScale.x * 1.2, originalScale.y * 1.2, originalScale.z * 1.2) }, { easing: 'backOut' })
            .to(0.1, { scale: originalScale })
            .start();
    }

    public hasTool(): boolean {
        return this.currentTool !== null;
    }

    public despawnTool(immediate: boolean = false) {
        if (!this.currentTool) return;
        const toolRef = this.currentTool;
        this.currentTool = null;

        if (immediate) {
            toolRef.destroy();
        } else {
            tween(toolRef)
                .to(0.15, { scale: v3(0, 0, 0) }, { easing: 'backIn' })
                .call(() => { if (toolRef.isValid) toolRef.destroy(); })
                .start();
        }
    }
}
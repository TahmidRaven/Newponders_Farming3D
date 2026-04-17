import { _decorator, Component, Node, Prefab, instantiate, Vec3, v3, tween } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ToolManager')
export class ToolManager extends Component {
    @property(Node)
    public toolSlot: Node = null!; 

    private currentTool: Node | null = null;

    public hasTool(): boolean {
        return this.currentTool !== null;
    }

    public spawnTool(toolPrefab: Prefab) {
        // If we already have a tool, don't spawn a new one
        if (!toolPrefab || !this.toolSlot || this.currentTool) return;

        this.currentTool = instantiate(toolPrefab);
        this.currentTool.setParent(this.toolSlot, false);

        // Calculate inverse scale to cancel out Farmer's scale
        const parentWorldScale = this.toolSlot.worldScale;
        const originalScale = v3(
            1 / parentWorldScale.x,
            1 / parentWorldScale.y,
            1 / parentWorldScale.z
        );

        this.currentTool.setPosition(Vec3.ZERO);
        this.currentTool.setRotationFromEuler(0, 0, 0);

        // Elastic Pop-In
        this.currentTool.setScale(v3(0, 0, 0));
        tween(this.currentTool)
            .to(0.2, { 
                scale: v3(originalScale.x * 1.2, originalScale.y * 1.2, originalScale.z * 1.2) 
            }, { easing: 'backOut' })
            .to(0.1, { scale: originalScale })
            .start();
    }

    // This stays for manual removal (e.g., if you enter a vehicle or zone)
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
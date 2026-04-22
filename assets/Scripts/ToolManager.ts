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
        if (!toolPrefab || !this.toolSlot) return;

        // If a tool exists, we must remove it properly first
        if (this.currentTool) {
            this.currentTool.destroy();
            this.currentTool = null;
        }

        this.currentTool = instantiate(toolPrefab);
        
        // Use setParent(slot) but ensure it's not trying to modify a locked prefab hierarchy
        this.currentTool.parent = this.toolSlot;

        // Reset local transforms to zero relative to the slot
        this.currentTool.setPosition(Vec3.ZERO);
        this.currentTool.setRotationFromEuler(0, 0, 0);

        // Cancel out parent scale so the tool isn't squashed/stretched by character bones
        const pScale = this.toolSlot.worldScale;
        const originalScale = v3(1 / pScale.x, 1 / pScale.y, 1 / pScale.z);

        // Elastic Pop-In Juice
        this.currentTool.setScale(v3(0, 0, 0));
        tween(this.currentTool)
            .to(0.2, { 
                scale: v3(originalScale.x * 1.2, originalScale.y * 1.2, originalScale.z * 1.2) 
            }, { easing: 'backOut' })
            .to(0.1, { scale: originalScale })
            .start();
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
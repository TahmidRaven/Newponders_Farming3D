import { _decorator, Component, Node, Prefab, instantiate, Vec3, Quat, tween, animation, ParticleSystem } from 'cc';
import { GameManager } from './GameManager';
const { ccclass, property } = _decorator;

@ccclass('ToolManager')
export class ToolManager extends Component {
    @property(Node)
    public playerRigRoot: Node = null!; 

    @property(Node)
    public handSlot: Node = null!; 

    // --- VISUAL EFFECTS ---
    @property({ type: Node, group: "Visuals" }) 
    public HandToolUpgradeFX: Node = null!; 

    @property({ type: Node, group: "Visuals" }) 
    public VehicleUpgradeFX: Node = null!; 

    @property({ group: "Offsets" })
    public vehicleSeatOffset: Vec3 = new Vec3(0, 0.5, -0.2); 

    @property({ group: "Offsets" })
    public vehicleGroundOffset: Vec3 = new Vec3(0, -1.0, 0); 

    @property({ group: "Settings" })
    public upgradeLockDuration: number = 1.15;

    private currentTool: Node | null = null;
    private _isSpawning: boolean = false;

    onLoad() {
        // Force Hide ALL FX initially so they don't fire on load
        if (this.HandToolUpgradeFX) this.HandToolUpgradeFX.active = false;
        if (this.VehicleUpgradeFX) this.VehicleUpgradeFX.active = false;
    }

    /**
     * Spawns the tool and locks player input for the duration of the upgrade.
     */
    public spawnTool(toolPrefab: Prefab, isVehicle: boolean = false) {
        if (!toolPrefab || this._isSpawning) {
            console.warn("Spawn failed: Prefab missing or already spawning");
            return;
        }

        this._isSpawning = true;
        
        // 1. LOCK PLAYER INPUT & ANIMATION
        if (GameManager.Instance) {
            GameManager.Instance.setPlayerEnabled(false);
            
            // Force speed to 0 in animator to stop walk cycles immediately
            const anim = this.node.getComponentInChildren(animation.AnimationController);
            if (anim) anim.setValue("speed", 0);
        }

        this.despawnTool(true);

        this.currentTool = instantiate(toolPrefab);
        const targetScale = this.currentTool.getScale().clone();

        if (isVehicle) {
            this.currentTool.setParent(this.node);
            this.currentTool.setPosition(this.vehicleGroundOffset);
            this.currentTool.setRotation(Quat.IDENTITY);

            if (this.playerRigRoot) {
                this.playerRigRoot.setPosition(this.vehicleSeatOffset);
            }
            
            this.TriggerUpgradeFX(this.VehicleUpgradeFX);
        } else {
            this.currentTool.setParent(this.handSlot);
            this.currentTool.setPosition(Vec3.ZERO);
            
            if (this.playerRigRoot) {
                this.playerRigRoot.setPosition(Vec3.ZERO);
            }

            this.TriggerUpgradeFX(this.HandToolUpgradeFX);
        }

        const anim = this.node.getComponentInChildren(animation.AnimationController);
        if (anim) {
            anim.setValue("driving", isVehicle);
        }

        // 2. PLAY VISUAL JUICE & START UNLOCK TIMER
        this.PlayPopJuice(this.currentTool, targetScale);

        this.scheduleOnce(() => {
            this._isSpawning = false;
            // RE-ENABLE PLAYER INPUT
            if (GameManager.Instance) {
                GameManager.Instance.setPlayerEnabled(true);
            }
        }, this.upgradeLockDuration);
    }

    private TriggerUpgradeFX(fxNode: Node) {
        if (!fxNode) return;

        fxNode.active = true;

        const ps = fxNode.getComponent(ParticleSystem) || fxNode.getComponentInChildren(ParticleSystem);
        if (ps) {
            ps.stop(); 
            ps.play();
        }

        this.scheduleOnce(() => {
            if (fxNode && fxNode.isValid) {
                fxNode.active = false;
            }
        }, 3.0);
    }

    private PlayPopJuice(target: Node, finalScale: Vec3) {
        target.setScale(Vec3.ZERO);
        tween(target)
            .to(0.5, { scale: finalScale }, { easing: 'elasticOut' })
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
            tween(ref)
                .to(0.2, { scale: Vec3.ZERO }, { easing: 'backIn' })
                .call(() => { if (ref.isValid) ref.destroy(); })
                .start();
        }
    }
}
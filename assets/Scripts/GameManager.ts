import { _decorator, Component, Node, Prefab, input, Input, EventTouch, animation } from 'cc';
import { CharacterControllerBehavior } from './CharacterController';
import { Harvester } from './Harvester';
import { Joystick2D } from './Joystick2D';
import { MovementSystem } from './MovementSystem';
import { ToolManager } from './ToolManager';

const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {

    public static Instance: GameManager = null!;

    @property(CharacterControllerBehavior)
    public playerController: CharacterControllerBehavior = null!;

    @property(Node)
    public playerNode: Node = null!;

    @property(ToolManager)
    public toolManager: ToolManager = null!; 

    @property(Joystick2D)
    public joystick: Joystick2D = null!;

    @property({ type: Node, tooltip: "The tutorial finger/hint node" })
    public fingerNode: Node = null!;

    @property(Prefab)
    public sicklexPrefab: Prefab = null!; 

    private _hasInteracted: boolean = false;

    onLoad() {
        if (GameManager.Instance) {
            this.node.destroy();
            return;
        }
        GameManager.Instance = this;

        // 1. Lock player and hide joystick
        this.setPlayerEnabled(false);
        if (this.joystick) {
            this.joystick.node.active = false;
        }

        // 2. Ensure Finger node is visible at the start
        if (this.fingerNode) {
            this.fingerNode.active = true;
        }

        // 3. Listen for first interaction
        input.on(Input.EventType.TOUCH_START, this.onFirstInteraction, this);
        input.on(Input.EventType.MOUSE_DOWN, this.onFirstInteraction, this);
    }

    private onFirstInteraction() {
        if (this._hasInteracted) return;
        
        this._hasInteracted = true;

        // 4. DISABLE THE FINGER NODE IMMEDIATELY
        if (this.fingerNode) {
            this.fingerNode.active = false;
        }

        // 5. Reveal joystick and enable player
        if (this.joystick) {
            this.joystick.node.active = true;
        }
        this.setPlayerEnabled(true);

        // Cleanup
        input.off(Input.EventType.TOUCH_START, this.onFirstInteraction, this);
        input.off(Input.EventType.MOUSE_DOWN, this.onFirstInteraction, this);
    }

    start() {
        this.scheduleOnce(() => {
            if (this.toolManager && this.sicklexPrefab) {
                this.toolManager.spawnTool(this.sicklexPrefab);
            }
        }, 0);
    }

    update(deltaTime: number) {
        MovementSystem.update(deltaTime);
    }

    public setPlayerEnabled(enabled: boolean) {
        if (this.playerController) {
            this.playerController.enabled = enabled;
            if (!enabled) {
                const anim = this.playerNode?.getComponentInChildren(animation.AnimationController);
                if (anim) anim.setValue("speed", 0);
            }
        }

        const harvester = this.playerNode?.getComponent(Harvester);
        if (harvester) {
            harvester.enabled = enabled;
        }

        if (this.joystick) {
            if (this._hasInteracted || !enabled) {
                this.joystick.node.active = enabled;
            }

            if (enabled) {
                this.joystick.EnableInput();
            } else {
                this.joystick.DisableInput();
            }
        }
    }

    public getPlayerPosition() {
        return this.playerNode ? this.playerNode.worldPosition : null;
    }
}
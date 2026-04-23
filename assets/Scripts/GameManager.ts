import { _decorator, Component, Node, Prefab, input, Input, animation, Label } from 'cc';
import { CharacterControllerBehavior } from './CharacterController';
import { Harvester } from './Harvester';
import { Joystick2D } from './Joystick2D';
import { MovementSystem } from './MovementSystem';
import { ToolManager } from './ToolManager';
import { AudioContent } from './AudioContent'; 
import { GuideState } from './GuideController'; // Ensure this is exported from GuideController

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

    @property(Node)
    public audioManagerNode: Node = null!;

    @property(Node)
    public fingerNode: Node = null!;

    @property(Prefab)
    public sicklexPrefab: Prefab = null!; 

    // --- NEW UI PROPERTY ---
    @property(Label) 
    public instructionLabel: Label = null!; 

    private _hasInteracted: boolean = false;

    onLoad() {
        if (GameManager.Instance) {
            this.node.destroy();
            return;
        }
        GameManager.Instance = this;

        // Initial setup for the playable ad feel
        this.setPlayerEnabled(false);
        if (this.joystick) this.joystick.node.active = false;
        if (this.fingerNode) this.fingerNode.active = true;

        input.on(Input.EventType.TOUCH_START, this.onFirstInteraction, this);
        input.on(Input.EventType.MOUSE_DOWN, this.onFirstInteraction, this);
    }

    private onFirstInteraction() {
        if (this._hasInteracted) return;
        this._hasInteracted = true;

        if (this.audioManagerNode) {
            const audios = this.audioManagerNode.getComponentsInChildren(AudioContent);
            const bgm = audios.find(a => a.AudioName.includes("BGM"));
            if (bgm) bgm.play();
        }

        if (this.fingerNode) this.fingerNode.active = false;
        if (this.joystick) this.joystick.node.active = true;
        this.setPlayerEnabled(true);

        // Initial UI state
        this.updateInstruction(GuideState.HARVEST);

        input.off(Input.EventType.TOUCH_START, this.onFirstInteraction, this);
        input.off(Input.EventType.MOUSE_DOWN, this.onFirstInteraction, this);
    }

    start() {
        // Spawn initial tool (Sicklex)
        this.scheduleOnce(() => {
            if (this.toolManager && this.sicklexPrefab) {
                this.toolManager.spawnTool(this.sicklexPrefab);
            }
        }, 0);
    }

    update(deltaTime: number) {
        // Update the global movement system for objects in flight (crops, coins)
        MovementSystem.update(deltaTime);
    }

    /**
     * Updates the Instruction Board text based on the GuideController's state.
     * Synchronized with the CompassArrow's current target.
     */
    public updateInstruction(state: GuideState) {
        if (!this.instructionLabel) return;

        switch (state) {
            case GuideState.HARVEST:
                this.instructionLabel.string = "Cut all the Crops";
                break;
            case GuideState.SELL:
                this.instructionLabel.string = "Sell the crops at the barn";
                break;
            case GuideState.UPGRADE:
                this.instructionLabel.string = "Upgrade Available! Go to the shed";
                break;
        }
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
        if (harvester) harvester.enabled = enabled;

        if (this.joystick) {
            if (this._hasInteracted || !enabled) {
                this.joystick.node.active = enabled;
            }
            enabled ? this.joystick.EnableInput() : this.joystick.DisableInput();
        }
    }

    public getPlayerPosition() {
        return this.playerNode ? this.playerNode.worldPosition : null;
    }
}
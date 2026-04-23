import { _decorator, Component, Node, Prefab, input, Input, animation, Label } from 'cc';
import { CharacterControllerBehavior } from './CharacterController';
import { Harvester } from './Harvester';
import { Joystick2D } from './Joystick2D';
import { MovementSystem } from './MovementSystem';
import { ToolManager } from './ToolManager';
import { AudioContent } from './AudioContent'; 
import { GuideState } from './GuideController';
import { VictoryScreen } from './VictoryScreen';

const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {
    public static Instance: GameManager = null!;

    @property(CharacterControllerBehavior) public playerController: CharacterControllerBehavior = null!;
    @property(Node) public playerNode: Node = null!;
    @property(ToolManager) public toolManager: ToolManager = null!; 
    @property(Joystick2D) public joystick: Joystick2D = null!;
    @property(Node) public audioManagerNode: Node = null!;
    @property(Node) public fingerNode: Node = null!;
    @property(Prefab) public sicklexPrefab: Prefab = null!; 
    @property(Label) public instructionLabel: Label = null!; 
    @property(VictoryScreen) public victoryScreen: VictoryScreen = null!; 

    private _hasInteracted: boolean = false;
    private _isGameOver: boolean = false;

    onLoad() {
        if (GameManager.Instance) {
            this.node.destroy();
            return;
        }
        GameManager.Instance = this;

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
        this.updateInstruction(GuideState.HARVEST);

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

    public updateInstruction(state: GuideState) {
        if (!this.instructionLabel || this._isGameOver) return;

        switch (state) {
            case GuideState.HARVEST: this.instructionLabel.string = "Cut all the Crops"; break;
            case GuideState.SELL: this.instructionLabel.string = "Sell the crops at the barn"; break;
            case GuideState.UPGRADE: this.instructionLabel.string = "Upgrade Available! Go to the shed"; break;
        }
    }

    public triggerVictory() {
        if (this._isGameOver) return;
        this._isGameOver = true;

        // 1. Play "Win" Audio from AudioManager
        if (this.audioManagerNode) {
            const audios = this.audioManagerNode.getComponentsInChildren(AudioContent);
            const winSfx = audios.find(a => a.AudioName.includes("Win"));
            if (winSfx) winSfx.play();
        }

        // 2. Disable UI and Controls
        this.setPlayerEnabled(false);
        if (this.joystick) this.joystick.DisableInput();
        if (this.instructionLabel) this.instructionLabel.node.active = false;

        // 3. Show Victory Screen
        if (this.victoryScreen) {
            this.victoryScreen.show(true);
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
            if (this._hasInteracted || !enabled) this.joystick.node.active = enabled;
            enabled ? this.joystick.EnableInput() : this.joystick.DisableInput();
        }
    }

    public getPlayerPosition() {
        return this.playerNode ? this.playerNode.worldPosition : null;
    }
}
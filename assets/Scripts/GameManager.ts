import { _decorator, Component, Node, Prefab } from 'cc';
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

    @property(Prefab)
    public sicklexPrefab: Prefab = null!; 

    onLoad() {
        if (GameManager.Instance) {
            this.node.destroy();
            return;
        }
        GameManager.Instance = this;
    }

    start() {
        // Delayed start to ensure the rig and slots are ready
        this.scheduleOnce(() => {
            if (this.toolManager && this.sicklexPrefab) {
                this.toolManager.spawnTool(this.sicklexPrefab);
            }
        }, 0);
    }

    update(deltaTime: number) {
        // This MUST be here for coins and arc movement to work
        MovementSystem.update(deltaTime);
    }

    /**
     * Helper to enable/disable player actions during cutscenes or upgrades.
     */
    public setPlayerEnabled(enabled: boolean) {
        if (this.playerController) {
            this.playerController.enabled = enabled;
        }

        const harvester = this.playerNode?.getComponent(Harvester);
        if (harvester) {
            harvester.enabled = enabled;
        }

        if (this.joystick) {
            if (enabled) {
                this.joystick.EnableInput();
            } else {
                this.joystick.DisableInput();
            }
        }
    }

    public getPlayerPosition() {
        // Returns world position so it works even if parented to the Truck
        return this.playerNode ? this.playerNode.worldPosition : null;
    }
}
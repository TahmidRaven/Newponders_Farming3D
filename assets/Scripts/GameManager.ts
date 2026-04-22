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

    // Directly link the ToolManager component here
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
        // Delay by one frame to ensure the Tool Slot's world transform is ready
        this.scheduleOnce(() => {
            this.equipInitialTool();
        }, 0); 
    }

    private equipInitialTool() {
        if (this.toolManager && this.sicklexPrefab) {
            this.toolManager.spawnTool(this.sicklexPrefab);
        } else {
            console.error("GameManager: ToolManager or SicklexPrefab is missing in the Inspector!");
        }
    }

    update(deltaTime: number) {
        // Required for the flying coins logic in Mover.ts
        MovementSystem.update(deltaTime); 
    }

    public getPlayerPosition() {
        return this.playerNode ? this.playerNode.worldPosition : null;
    }
}
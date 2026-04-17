import { _decorator, Component, Node } from 'cc';
import { CharacterControllerBehavior } from './CharacterController';
import { Harvester } from './Harvester';
import { Joystick2D } from './Joystick2D';

const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {

    public static Instance: GameManager = null!;

    @property(CharacterControllerBehavior)
    public playerController: CharacterControllerBehavior = null!;

    @property(Node)
    public playerNode: Node = null!;

    @property(Joystick2D)
    public joystick: Joystick2D = null!;

    onLoad() {
        
        if (GameManager.Instance) {
            this.node.destroy();
            return;
        }
        GameManager.Instance = this;
    }


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
        return this.playerNode ? this.playerNode.worldPosition : null;
    }
}
import { _decorator, animation, Component, Node } from 'cc';
import { Joystick2D } from './Joystick2D';
const { ccclass, property } = _decorator;

@ccclass('PlayerControllerMartin')
export class PlayerControllerMartin extends Component {
    @property(Node)
    PlayerNode: Node = null!;

    @property(Node)
    public JoyStickNode: Node = null!;

    @property
    public moveSpeed: number = 5;

    private JoyStickScript: Joystick2D = null!;

    @property(Boolean)
    private rotate: boolean = true;


    start() {
        this.JoyStickScript = this.JoyStickNode.getComponent(Joystick2D)!;
    }

    update(deltaTime: number) {
        const dir = this.JoyStickScript.getSmoothedDirection();

        if (dir.lengthSqr() === 0) {
            if (this.PlayerNode.getComponent(animation.AnimationController)){
                this.PlayerNode.getComponent(animation.AnimationController).setValue("IsRun", false);
            }
            return;
        }
        
        if (this.PlayerNode.getComponent(animation.AnimationController)){
            this.PlayerNode.getComponent(animation.AnimationController).setValue("IsRun", true);
        }

        const moveX = dir.x;
        const moveZ = -dir.y;
        const pos = this.node.getPosition();

        pos.x += moveX * this.moveSpeed * deltaTime;
        pos.z += moveZ * this.moveSpeed * deltaTime;

        this.node.setPosition(pos);

        if (this.rotate) {
            const yawRad = Math.atan2(moveX, moveZ);
            const yawDeg = yawRad * 180 / Math.PI;
            this.node.setRotationFromEuler(0, yawDeg, 0);
        }
    }
}



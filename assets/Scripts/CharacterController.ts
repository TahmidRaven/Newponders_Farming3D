import { _decorator, Component, Node, Vec3, Quat, Camera, animation } from 'cc';
import { Joystick2D } from './Joystick2D';
import { SimpleCharacterController } from './SimpleCharacterController';

const { ccclass, property } = _decorator;

@ccclass('CharacterControllerBehavior')
export class CharacterControllerBehavior extends Component {
    @property(Joystick2D) public Joystick: Joystick2D = null!;
    @property(SimpleCharacterController) public CapsuleController: SimpleCharacterController = null!;
    @property(Camera) public Camera: Camera = null!;

    @property public MoveSpeed: number = 3.0;
    @property public RotationSpeed: number = 8.0;
    
    @property({ group: { name: 'Vehicle Settings' } }) 
    public TruckMoveSpeed: number = 18.0; 

    public m_moveDir: Vec3 = new Vec3();
    private m_targetRotation: Quat = new Quat();
    private m_initialYPos: number = 0;

    start() {
        this.m_initialYPos = this.node.worldPosition.y;
    }

    update(deltaTime: number) {
        if (!this.Joystick || !this.Camera) return;

        const dir = this.Joystick.getSmoothedDirection();
        this.m_moveDir.set(0, 0, 0);

        if (dir.length() > 0.001) {
            const camNode = this.Camera.node;
            const forward = camNode.forward.clone();
            const right = camNode.right.clone();
            forward.y = 0; right.y = 0;
            forward.normalize(); right.normalize();

            Vec3.scaleAndAdd(this.m_moveDir, this.m_moveDir, forward, dir.y); 
            Vec3.scaleAndAdd(this.m_moveDir, this.m_moveDir, right, dir.x); 
        }

        // DETECT DRIVING: Check for the 'driving' boolean in the animator controller
        const anim = this.getComponentInChildren(animation.AnimationController);
        const isDriving = anim ? anim.getValue("driving") === true : false;
        const currentSpeed = isDriving ? this.TruckMoveSpeed : this.MoveSpeed;

        const moveVector = this.m_moveDir.clone().multiplyScalar(currentSpeed * deltaTime);

        if (this.CapsuleController) {
            moveVector.y = this.m_initialYPos - this.node.worldPosition.y; 
            this.CapsuleController.move(moveVector);
        }

        if (this.m_moveDir.lengthSqr() > 0.0001) {
            const targetRot = new Quat();
            Quat.fromViewUp(targetRot, this.m_moveDir, Vec3.UP);
            Quat.slerp(this.m_targetRotation, this.node.rotation, targetRot, this.RotationSpeed * deltaTime);
            this.node.setRotation(this.m_targetRotation);
        }
    }
}
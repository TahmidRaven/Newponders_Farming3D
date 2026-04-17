import { _decorator, Component, Node, Vec3, Quat, Camera, CapsuleCharacterController } from 'cc';
import { Joystick2D } from './Joystick2D';
import { SimpleCharacterController } from './SimpleCharacterController';
const { ccclass, property } = _decorator;


@ccclass('CharacterControllerBehavior')
export class CharacterControllerBehavior extends Component {

    @property(Joystick2D)
    public Joystick: Joystick2D = null;

    @property(SimpleCharacterController)
    public CapsuleController: SimpleCharacterController = null;

    @property(Camera)
    public Camera: Camera = null;

    @property
    public MoveSpeed: number = 3.0;

    @property
    public RotationSpeed: number = 8.0;

    public m_moveDir: Vec3 = new Vec3();
    private m_cameraForward: Vec3 = new Vec3();
    private m_cameraRight: Vec3 = new Vec3();
    private m_targetRotation: Quat = new Quat();

    private m_initialYPos : number = 0;

    start()
    {
        this.m_initialYPos = this.node.worldPositionY;
    }

    update(deltaTime: number) 
    {
        if (!this.Joystick || !this.CapsuleController || !this.Camera) return;

        this.m_moveDir.set(0, 0, 0);

        const dir = this.Joystick.getSmoothedDirection();

        if (dir.length() > 0.001) {
            const camNode = this.Camera.node;
            this.m_cameraForward = camNode.forward.clone();
            this.m_cameraRight = camNode.right.clone();

            this.m_cameraForward.y = 0;
            this.m_cameraRight.y = 0;
            this.m_cameraForward.normalize();
            this.m_cameraRight.normalize();

            Vec3.scaleAndAdd(this.m_moveDir, this.m_moveDir, this.m_cameraForward, dir.y); 
            Vec3.scaleAndAdd(this.m_moveDir, this.m_moveDir, this.m_cameraRight, dir.x); 
        }

        const currYOffset = this.m_initialYPos - this.node.worldPositionY;
        const move = this.m_moveDir.clone().multiplyScalar(this.MoveSpeed * deltaTime);
        move.y = currYOffset; 
        
        this.CapsuleController.move(move);

        if (this.m_moveDir.lengthSqr() > 0.0001) {
            const targetRot = new Quat();
            Quat.fromViewUp(targetRot, this.m_moveDir, Vec3.UP);
            
            Quat.slerp(this.m_targetRotation, this.node.rotation, targetRot, this.RotationSpeed * deltaTime);
            this.node.setRotation(this.m_targetRotation);
        }
    }

    public GetCharacterVelocity()
    {
        const vel = this.CapsuleController.getVelocity();
        this.CapsuleController.move(Vec3.ZERO);
        return vel;
    }
}
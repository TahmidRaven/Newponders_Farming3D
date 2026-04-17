import { _decorator, Camera, CCFloat, Component, Enum, math, Node, Vec2, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

export enum CameraType 
{
    STATIC,
    FOLLOW_3D,
    FOLLOW_2D
}

@ccclass('CameraBehavior')
export class CameraBehavior extends Component 
{

    @property({ type: Enum(CameraType) })
    public CameraType: CameraType = CameraType.STATIC;

    @property({ type: Node, visible() { return this.CameraType !== CameraType.STATIC } })
    public NodeToFollow: Node = null;

    @property({ visible() { return this.CameraType === CameraType.FOLLOW_3D } })
    public yaw: number = 0; 

    @property({ visible() { return this.CameraType === CameraType.FOLLOW_3D } })
    public pitch: number = 20;

    @property({ visible() { return this.CameraType === CameraType.FOLLOW_3D } })
    public Radius: number = 5;

    @property({ visible() { return this.CameraType === CameraType.FOLLOW_3D }, type: CCFloat })
    public EasingTime3D: number = 0.2; // 0 - 1

    @property({ visible() { return this.CameraType === CameraType.FOLLOW_2D } })
    public Offset2D: Vec2 = new Vec2(0, 0);

    @property({ visible() { return this.CameraType === CameraType.FOLLOW_2D }, type: CCFloat })
    public EasingTime2D: number = 0.15;

    public UpdateYawPitch = true; // 3D only
    public UpdateRadius = true;   // 3D only

    private m_targetPos = new Vec3();
    private m_cameraOffset = new Vec3();

    private m_currentPos: Vec3 = new Vec3();
    private m_desiredPos: Vec3 = new Vec3();

    start() 
    {
        if (this.CameraType !== CameraType.STATIC && !this.NodeToFollow) 
        {
            throw new Error("No node was provided for the camera to follow!");
        }

        this.EasingTime3D = math.clamp(this.EasingTime3D, 0, 1);
        this.EasingTime2D = math.clamp(this.EasingTime2D, 0, 1);
    }

    update(deltaTime: number) 
    {
        if (this.CameraType === CameraType.STATIC || !this.NodeToFollow) return;

        if (this.CameraType === CameraType.FOLLOW_3D) 
        {
            this.follow3D();
        } 
        else if (this.CameraType === CameraType.FOLLOW_2D) 
        {
            this.follow2D();
        }
    }

    private follow3D() 
    {
        this.m_targetPos = this.NodeToFollow.getWorldPosition().clone();

        if (this.UpdateYawPitch) 
        {
            const yawRad = math.toRadian(this.yaw);
            const pitchRad = math.toRadian(this.pitch);

            const x = this.Radius * Math.cos(pitchRad) * Math.sin(yawRad);
            const y = this.Radius * Math.sin(pitchRad);
            const z = this.Radius * Math.cos(pitchRad) * Math.cos(yawRad);
            this.m_cameraOffset.set(x, y, z);
        } 
        else 
        {
            this.m_cameraOffset = this.node.forward;
            Vec3.normalize(this.m_cameraOffset, this.m_cameraOffset);
            Vec3.multiplyScalar(this.m_cameraOffset, this.m_cameraOffset, -this.Radius);
        }

        Vec3.add(this.m_desiredPos, this.m_targetPos, this.m_cameraOffset);

        this.m_currentPos = this.node.getWorldPosition().clone();
        Vec3.lerp(this.m_currentPos, this.m_currentPos, this.m_desiredPos, this.EasingTime3D);

        this.node.setWorldPosition(this.m_currentPos);
        this.node.lookAt(this.m_targetPos);
    }

    private follow2D() 
    {
        this.m_targetPos = this.NodeToFollow.getWorldPosition().clone();

        this.m_desiredPos.set(
            this.m_targetPos.x + this.Offset2D.x,
            this.m_targetPos.y + this.Offset2D.y,
            this.node.getWorldPosition().z 
        );

        this.m_currentPos = this.node.getWorldPosition().clone();
        Vec3.lerp(this.m_currentPos, this.m_currentPos, this.m_desiredPos, this.EasingTime2D);

        this.node.setWorldPosition(this.m_currentPos);

    }

    public setLockedCamera(lock: boolean) {
        this.UpdateYawPitch = !lock;
    }
}

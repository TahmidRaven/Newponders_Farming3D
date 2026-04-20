import { _decorator, CCFloat, Component, Enum, math, Node, Vec3 } from "cc";
const { ccclass, property } = _decorator;

export enum CameraType {
  STATIC,
  FOLLOW,
}

@ccclass("CameraBehavior3D")
export class CameraBehavior3D extends Component {
  @property({ type: Enum(CameraType) })
  public CameraType: CameraType = CameraType.STATIC;

  @property({ type: Node, visible() { return this.CameraType === CameraType.FOLLOW; } })
  public NodeToFollow: Node = null;

  @property({ visible() { return this.CameraType === CameraType.FOLLOW; } })
  public yaw: number = 0;

  @property({ visible() { return this.CameraType === CameraType.FOLLOW; } })
  public pitch: number = 20;

  @property({ visible() { return this.CameraType === CameraType.FOLLOW; } })
  public Radius = 5;

  @property({ visible() { return this.CameraType === CameraType.FOLLOW; }, type: CCFloat })
  public SmoothTime = 0.18;

  public UpdateYawPitch = true;
  public UpdateRadius = true;

  private m_targetPos = new Vec3();
  private m_cameraOffset = new Vec3();
  private m_desiredPos = new Vec3();
  private m_currentPos = new Vec3();

  private m_lookPos = new Vec3();


  start() {
    if (this.CameraType === CameraType.FOLLOW && !this.NodeToFollow) {
      throw new Error("No node was provided for the camera to follow!");
    }
    this.SmoothTime = Math.max(0.001, this.SmoothTime);

    if(this.NodeToFollow)
        this.NodeToFollow.getWorldPosition(this.m_lookPos);
  }

  lateUpdate(dt: number) {
    if (this.CameraType !== CameraType.FOLLOW || !this.NodeToFollow) return;

    const smoothTime = Math.max(0.001, this.SmoothTime);

    const alpha = 1.0 - Math.exp(-dt / smoothTime);

    this.NodeToFollow.getWorldPosition(this.m_targetPos);

    if (this.UpdateYawPitch) {
      const yawRad = math.toRadian(this.yaw);
      const pitchRad = math.toRadian(this.pitch);

      const x = this.Radius * Math.cos(pitchRad) * Math.sin(yawRad);
      const y = this.Radius * Math.sin(pitchRad);
      const z = this.Radius * Math.cos(pitchRad) * Math.cos(yawRad);

      this.m_cameraOffset.set(x, y, z);
    } else {
      this.node.getWorldPosition(this.m_currentPos);
      this.m_cameraOffset = this.node.forward.clone();
      Vec3.normalize(this.m_cameraOffset, this.m_cameraOffset);
      Vec3.multiplyScalar(this.m_cameraOffset, this.m_cameraOffset, -this.Radius);
    }

    Vec3.add(this.m_desiredPos, this.m_targetPos, this.m_cameraOffset);

    this.node.getWorldPosition(this.m_currentPos);
    Vec3.lerp(this.m_currentPos, this.m_currentPos, this.m_desiredPos, alpha);
    this.node.setWorldPosition(this.m_currentPos);

    Vec3.lerp(this.m_lookPos, this.m_lookPos, this.m_targetPos, alpha);
    this.node.lookAt(this.m_lookPos);
  }

  public setLockedCamera(lock: boolean) {
    this.UpdateYawPitch = !lock;
  }
}

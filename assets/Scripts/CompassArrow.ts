import { _decorator, Component, Node, Vec3, math, Quat } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('CompassArrow')
export class CompassArrow extends Component {
    @property(Node) public player: Node = null!;
    @property public orbitRadius: number = 2.0; 
    @property public heightOffset: number = 2.0; // Higher offset for better visibility
    @property public rotationSmoothSpeed: number = 12.0; 

    public target: Node | null = null;
    private _targetScale: number = 0;
    private _currentBaseScale: number = 0;

    lateUpdate(dt: number) {
        if (this._currentBaseScale < 0.01 || !this.player || !this.target || !this.target.isValid) return;

        const playerPos = this.player.worldPosition;
        const targetPos = this.target.worldPosition;

        const dir = new Vec3();
        Vec3.subtract(dir, targetPos, playerPos);
        dir.y = 0;
        dir.normalize();

        const finalPos = new Vec3();
        Vec3.scaleAndAdd(finalPos, playerPos, dir, this.orbitRadius);
        finalPos.y = playerPos.y + this.heightOffset;
        this.node.setWorldPosition(finalPos);

        const angleRad = Math.atan2(dir.x, dir.z);
        const targetQuat = Quat.fromEuler(new Quat(), 0, math.toDegree(angleRad) + 180, 0);
        Quat.slerp(this.node.worldRotation, this.node.worldRotation, targetQuat, dt * this.rotationSmoothSpeed);
    }

    public Show() { this._targetScale = 1.0; }
    public Hide() { this._targetScale = 0.0; }
    
    update(dt: number) {
        this._currentBaseScale = math.lerp(this._currentBaseScale, this._targetScale, dt * 5.0);
        this.node.setScale(Vec3.ONE.clone().multiplyScalar(this._currentBaseScale));
    }
}
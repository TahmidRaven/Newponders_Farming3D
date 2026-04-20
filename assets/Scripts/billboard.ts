import { _decorator, Component, Node, Camera, Vec3, Quat } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('billboard')
export class billboard extends Component {

    @property(Camera)
    camera: Camera = null!; // Assign your main camera in the editor

    private _forward = new Vec3();
    private _quat = new Quat();

    update(deltaTime: number) {
        if (!this.camera) return;

        // Get camera and node positions
        const camPos = this.camera.node.worldPosition;
        const nodePos = this.node.worldPosition;

        // Compute forward direction from node → camera
        Vec3.subtract(this._forward, camPos, nodePos);
        this._forward.normalize();

        // Build rotation quaternion that looks at camera
        // Up is world Y axis
        Quat.fromViewUp(this._quat, this._forward, Vec3.UP);

        // Apply rotation
        this.node.worldRotation = this._quat;
    }
}

import { _decorator, Component, Node, Vec3 } from 'cc';
import { AudioContent } from './AudioContent'; 
import { GameManager } from './GameManager';

const { ccclass, property } = _decorator;

@ccclass('TructorAnimator')
export class TructorAnimator extends Component {
    @property({ type: [Node] }) public Blades: Node[] = [];
    @property({ type: [Node] }) public Wheels: Node[] = [];
    @property public WheelSpeedMultiplier: number = 200.0;
    @property public BladeSpinSpeed: number = 800.0;
    @property public RotateWheelsOnX: boolean = true; 
    @property public BladeRotationAxis: Vec3 = new Vec3(0, 0, 1); 

    private _lastWorldPos: Vec3 = new Vec3();
    private _isSoundPlaying: boolean = false; 
    private _moveAudio: AudioContent | null = null;

    start() {
        this._lastWorldPos.set(this.node.worldPosition);
        this.findMoveAudio();
    }

    private findMoveAudio() {
        if (GameManager.Instance && GameManager.Instance.audioManagerNode) {
            // FIX: Search children for the Move/Engine audio
            const audios = GameManager.Instance.audioManagerNode.getComponentsInChildren(AudioContent);
            this._moveAudio = audios.find(a => a.AudioName.includes("Truck") || a.AudioName.includes("Move")) || null;
        }
    }

    onDisable() { this.StopMoveSound(); }

    update(deltaTime: number) {
        if (deltaTime <= 0) return;
        const currentPos = this.node.worldPosition;
        const dist = Vec3.distance(currentPos, this._lastWorldPos);
        this._lastWorldPos.set(currentPos);

        const isMoving = dist > (0.01 * deltaTime); 
        if (isMoving) {
            this.AnimateWheels(dist, deltaTime);
            this.AnimateBlades(deltaTime);
            this.PlayMoveSound(); 
        } else {
            this.StopMoveSound(); 
        }
    }

    private AnimateWheels(distanceMoved: number, dt: number) {
        if (this.Wheels.length === 0) return;
        const rotationAmount = distanceMoved * this.WheelSpeedMultiplier; 
        for (const wheel of this.Wheels) {
            const wRot = wheel.eulerAngles;
            wheel.setRotationFromEuler(this.RotateWheelsOnX ? wRot.x + rotationAmount : wRot.x, wRot.y, this.RotateWheelsOnX ? wRot.z : wRot.z + rotationAmount);
        }
    }

    private AnimateBlades(dt: number) {
        if (this.Blades.length === 0) return;
        const amount = this.BladeSpinSpeed * dt;
        for (const blade of this.Blades) {
            const currentRot = blade.eulerAngles;
            blade.setRotationFromEuler(currentRot.x + (this.BladeRotationAxis.x * amount), currentRot.y + (this.BladeRotationAxis.y * amount), currentRot.z + (this.BladeRotationAxis.z * amount));
        }
    }

    private PlayMoveSound() {
        if (this._isSoundPlaying || !this._moveAudio) return;
        this._moveAudio.play();
        this._isSoundPlaying = true;
    }

    private StopMoveSound() {
        if (!this._isSoundPlaying || !this._moveAudio) return;
        if (this._moveAudio.AudioSource) this._moveAudio.AudioSource.stop();
        this._isSoundPlaying = false;
    }
}
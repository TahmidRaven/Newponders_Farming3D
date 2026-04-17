import {
    _decorator,
    Component,
    EventMouse,
    EventTouch,
    Node,
    UITransform,
    Vec2,
    Vec3,
    Widget,
    AudioSource
} from 'cc';

const { ccclass, property } = _decorator;

@ccclass('Joystick2D')
export class Joystick2D extends Component {

    @property(Node)
    public Base: Node = null!;

    @property(Node)
    public Thumb: Node = null!;

    @property(Node)
    public Canvas: Node = null!;

    @property(Node)
    public Finger: Node = null!;

    @property(Node)
    public Instruction: Node = null!;

    @property(Node)
    public FirstInstruction: Node = null!;

    @property(Node)
    public BGM: Node = null!;

    private hasPlayedBGM = false;

    private m_baseUiTransform: UITransform = null!;
    private m_thumbUiTransform: UITransform = null!;

    private m_touching = false;
    private m_direction: Vec2 = new Vec2();
    private smoothedDir: Vec2 = new Vec2();

    private m_maxRadius = 0;

    private DEAD_ZONE = 0.2;
    private SMOOTHING = 1.0;

    // 🔒 MASTER INPUT SWITCH
    private inputEnabled = true;

    start() {
        if (!this.Base || !this.Thumb || !this.Canvas) {
            throw new Error('Joystick2D: Missing required nodes');
        }

        this.m_baseUiTransform = this.Base.getComponent(UITransform)!;
        this.m_thumbUiTransform = this.Thumb.getComponent(UITransform)!;

        this.m_maxRadius = this.m_baseUiTransform.width / 2;

        this.node.on(Node.EventType.TOUCH_START, this.onPointerDown, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onPointerMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onPointerUp, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onPointerUp, this);

        this.node.on(Node.EventType.MOUSE_DOWN, this.onPointerDown, this);
        this.node.on(Node.EventType.MOUSE_MOVE, this.onPointerMove, this);
        this.node.on(Node.EventType.MOUSE_UP, this.onPointerUp, this);

        this.Base.active = false;
    }

    update(deltaTime: number) {
        this.smoothedDir.lerp(this.m_direction, this.SMOOTHING);
    }

    // =========================
    // PUBLIC API (READ INPUT)
    // =========================

    public getDirection(): Vec2 {
        if (!this.inputEnabled) return Vec2.ZERO;

        if (this.m_direction.lengthSqr() < this.DEAD_ZONE * this.DEAD_ZONE) {
            return Vec2.ZERO;
        }
        return this.m_direction.clone();
    }

    public getSmoothedDirection(): Vec2 {
        if (!this.inputEnabled) return Vec2.ZERO;

        if (this.smoothedDir.lengthSqr() < this.DEAD_ZONE * this.DEAD_ZONE) {
            return Vec2.ZERO;
        }
        return this.smoothedDir.clone();
    }

    public getRoundedDirection(): Vec2 {
        if (!this.inputEnabled) return Vec2.ZERO;

        if (this.smoothedDir.lengthSqr() < this.DEAD_ZONE * this.DEAD_ZONE) {
            return Vec2.ZERO;
        }

        return new Vec2(
            Math.round(this.smoothedDir.x * 10) / 10,
            Math.round(this.smoothedDir.y * 10) / 10
        );
    }

    // =========================
    // POINTER HANDLERS
    // =========================

    private onPointerDown(event: EventTouch | EventMouse) {
        // if (!this.inputEnabled) return;

        // // Play BGM on first tap
        // if (!this.hasPlayedBGM && this.BGM) {
        //     const audioSource = this.BGM.getComponent(AudioSource);
        //     if (audioSource) {
        //         audioSource.play();
        //         this.hasPlayedBGM = true;
        //         console.log("Playing BGM")
        //     }
        // }

        this.m_touching = true;
        this.Base.active = true;

        if (this.FirstInstruction){
            this.FirstInstruction.active = false;
        }
        if (this.Finger) this.Finger.active = false;

        if(this.Instruction) this.Instruction.active = true;

        const uiPos = event.getUILocation();
        const canvasTransform = this.Canvas.getComponent(UITransform)!;
        const localPos = canvasTransform.convertToNodeSpaceAR(new Vec3(uiPos.x, uiPos.y, 0));

        const widget = this.Base.getComponent(Widget);
        if (widget) widget.enabled = false;

        this.Base.setPosition(localPos);
        this.Thumb.setPosition(Vec3.ZERO);
    }

    private onPointerMove(event: EventTouch | EventMouse) {
        if (!this.m_touching || !this.inputEnabled) return;

        const uiPos = event.getUILocation();
        const canvasTransform = this.Canvas.getComponent(UITransform)!;
        const localPos = canvasTransform.convertToNodeSpaceAR(new Vec3(uiPos.x, uiPos.y, 0));

        const basePos = this.Base.getPosition();
        const offset = new Vec2(localPos.x - basePos.x, localPos.y - basePos.y);

        let clamped = offset.clone();
        if (offset.length() > this.m_maxRadius) {
            clamped.normalize().multiplyScalar(this.m_maxRadius);
        }

        this.Thumb.setPosition(new Vec3(clamped.x, clamped.y, 0));

        this.m_direction.set(
            clamped.x / this.m_maxRadius,
            clamped.y / this.m_maxRadius
        );
    }

    private onPointerUp() {
        this.Stop();
    }

    // =========================
    // CONTROL METHODS
    // =========================

    /** Immediately stops all movement */
    public Stop() {
        this.m_touching = false;
        this.Base.active = false;
        this.Thumb.setPosition(Vec3.ZERO);
        this.m_direction.set(0, 0);
        this.smoothedDir.set(0, 0);
    }

    public StartJoystick(){
        this.m_touching = true;
        this.Base.active = true;
    }

    /** Disable ALL joystick input (Game Over, Cutscene, Pause) */
    public DisableInput() {
        this.inputEnabled = false;
        this.Stop();
    }

    /** Re-enable joystick input */
    public EnableInput() {
        this.inputEnabled = true;
        this.StartJoystick();
    }

    /** Completely remove listeners (optional) */
    public StopInputEvents() {
        this.node.off(Node.EventType.TOUCH_START, this.onPointerDown, this);
        this.node.off(Node.EventType.TOUCH_MOVE, this.onPointerMove, this);
        this.node.off(Node.EventType.TOUCH_END, this.onPointerUp, this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this.onPointerUp, this);

        this.node.off(Node.EventType.MOUSE_DOWN, this.onPointerDown, this);
        this.node.off(Node.EventType.MOUSE_MOVE, this.onPointerMove, this);
        this.node.off(Node.EventType.MOUSE_UP, this.onPointerUp, this);
    }
}
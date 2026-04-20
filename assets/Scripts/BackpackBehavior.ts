import { _decorator, Component, Node, Vec3, tween, math } from 'cc'; 
import { BackPackObjectBehavior, ObjectType } from './BackPackObjectBehavior';
import { Mover, MoveType } from './Mover'
import { ResourceManager } from './ResourceManager';

const { ccclass, property } = _decorator;

export enum BackpackEvent
{
    ITEM_COLLECTED = "ItemCollected",
}

@ccclass('BackpackBehavior')
export class BackpackBehavior extends Component {

    @property(Node) public Backpack: Node = null!;
    @property(ResourceManager) public ResourceManager: ResourceManager = null!; 

    @property public SwingUpOffset: number = 1.0;
    @property public CollectDuration: number = 0.5;

    // --- Wobble Configuration ---
    @property({ group: { name: 'Wobble Settings' } })
    public WobbleSpeed: number = 10.0; 

    @property({ group: { name: 'Wobble Settings' }, tooltip: "How far the top of the stack moves sideways (Meters)." })
    public MaxSwayDistance: number = 0.5; // Controls the curve intensity

    @property({ group: { name: 'Wobble Settings' }, tooltip: "How much the top item rotates (Degrees)." })
    public MaxBendAngle: number = 15.0; // Controls the bend angle

    private m_stackedObjects: Node[] = [];
    private m_settledObjects: Set<Node> = new Set(); 
    private m_objectCount = new Map<ObjectType, number>();
    private m_currentCoinCount = 0;
    private m_time: number = 0;

    // Movement Tracking
    private _lastPos: Vec3 = new Vec3();
    private _wobbleStrength: number = 0; 
    
    // Store original Y positions so the stack doesn't shrink/grow
    private _initialYPositions: Map<string, number> = new Map();

    start() {
        this.m_currentCoinCount = this.ResourceManager?.coinCount ?? 0; 
        this.UpdateCoinCount(0); 
        this._lastPos.set(this.node.worldPosition);
    }

    update(dt: number) {
        // 1. Check for movement
        const currentPos = this.node.worldPosition;
        const dist = Vec3.distance(currentPos, this._lastPos);
        const isMoving = dist > 0.001; 

        // 2. Smoothly transition wobble strength (0 = stiff, 1 = bending)
        const targetStrength = isMoving ? 1.0 : 0.0;
        this._wobbleStrength = math.lerp(this._wobbleStrength, targetStrength, dt * 5.0);

        this.m_time += dt;

        // 3. Apply Spine Bend
        if (this._wobbleStrength > 0.001 || isMoving) {
            
            // Calculate ONE global sway value for the whole stack for this frame
            const mainPulse = Math.sin(this.m_time * this.WobbleSpeed);
            
            for (let i = 0; i < this.m_stackedObjects.length; i++) {
                const node = this.m_stackedObjects[i];
                if (!this.m_settledObjects.has(node) || !node.isValid) continue;

                const behavior = node.getComponent(BackPackObjectBehavior);
                if (!behavior) continue;

                // --- SPINE MATH ---
                
                // Normalized Height: 0.0 (Bottom) to 1.0 (Top)
                const t = i / Math.max(1, this.m_stackedObjects.length);

                // Curve Factor: t * t (Quadratic)
                const curve = t * t;

                // 1. POSITION (X-Axis Sway)
                const swayX = mainPulse * this.MaxSwayDistance * curve * this._wobbleStrength;

                // 2. ROTATION (Z-Axis Bend)
                const bendAngle = mainPulse * this.MaxBendAngle * t * this._wobbleStrength;

                // Apply
                const currentY = this._initialYPositions.get(node.uuid) ?? node.position.y;
                
                // Set Position (Sway X, Keep Y, Keep Z)
                node.setPosition(swayX, currentY, 0);

                // Set Rotation (Tilt Z)
                const baseRot = behavior.BackPackRot; 
                node.setRotationFromEuler(baseRot.x, baseRot.y, baseRot.z - bendAngle);
            }
        } 
        // Optional: Reset logic when completely stopped to ensure perfect alignment
        else if (this._wobbleStrength < 0.001) {
             for (let i = 0; i < this.m_stackedObjects.length; i++) {
                const node = this.m_stackedObjects[i];
                if (this.m_settledObjects.has(node)) {
                    const currentY = this._initialYPositions.get(node.uuid) ?? node.position.y;
                     // Force X to 0 if it's drifting
                    if (Math.abs(node.position.x) > 0.001) {
                         node.setPosition(0, currentY, 0);
                         const b = node.getComponent(BackPackObjectBehavior);
                         if(b) node.eulerAngles = b.BackPackRot;
                    }
                }
             }
        }

        this._lastPos.set(currentPos);
    }

    public Collect(objectNode: Node) {
        const behavior = objectNode.getComponent(BackPackObjectBehavior);
        if (!behavior || !this.Backpack) return;

        this.m_stackedObjects.push(objectNode);

        const worldPos = objectNode.getWorldPosition();
        const worldRot = objectNode.getWorldRotation();

        this.Backpack.addChild(objectNode);
        objectNode.setWorldPosition(worldPos);
        objectNode.setWorldRotation(worldRot);

        let reservedYOffset = 0;
        for (const obj of this.m_stackedObjects) {
            const b = obj.getComponent(BackPackObjectBehavior);
            reservedYOffset += b ? b.SpacingUnit.y : 0;
        }

        const typ = behavior.ObjectType;
        const prev = this.m_objectCount.get(typ) ?? 0;
        this.m_objectCount.set(typ, prev + 1);

        const startPos = worldPos.clone();

        const endPointGetter = () => {
            const wp = this.Backpack.worldPosition.clone();
            return new Vec3(wp.x, wp.y + reservedYOffset, wp.z);
        };

        Mover.move(
            MoveType.ARC,
            {
                node: objectNode,
                start: startPos,
                duration: this.CollectDuration,
                arcHeight: this.SwingUpOffset,
                endPointGetter,
                onComplete: () => this.OnCollected(objectNode)
            }
        );
    }

    private OnCollected(item: Node) {
        if (!item.isValid) return;

        const node = item;
        const behavior = node.getComponent(BackPackObjectBehavior);
        if (!behavior) return;

        const endWorld = item.worldPosition.clone();
        const finalLocal = new Vec3();
        this.Backpack.inverseTransformPoint(finalLocal, endWorld);
        
        // Reset X to 0 immediately so it enters the stack cleanly
        node.setPosition(0, finalLocal.y, 0); 
        node.eulerAngles = behavior.BackPackRot;

        // MEMORIZE Y HEIGHT
        this._initialYPositions.set(node.uuid, finalLocal.y);

        this.m_settledObjects.add(node); 

        const origScale = node.getScale().clone();
        const small = origScale.clone().multiplyScalar(0.85);

        tween(node)
            .to(0.08, { scale: small }, { easing: 'quadIn' })
            .to(0.14, { scale: origScale }, { easing: 'bounceOut' })
            .start();

        this.node.emit(BackpackEvent.ITEM_COLLECTED);
    }

    public DropTop(): Node | null {
        if (this.m_stackedObjects.length === 0) return null;

        const top = this.m_stackedObjects.pop()!;
        
        this.m_settledObjects.delete(top);
        this._initialYPositions.delete(top.uuid); 

        const b = top.getComponent(BackPackObjectBehavior);

        if (b) {
            const typ = b.ObjectType;
            const prev = this.m_objectCount.get(typ) ?? 0;
            const next = Math.max(0, prev - 1);
            if (next > 0) this.m_objectCount.set(typ, next);
            else this.m_objectCount.delete(typ);
        }

        return top;
    }

    public GetTop() {
        return this.m_stackedObjects[this.m_stackedObjects.length - 1];
    }

    public GetTopType() {
        if (this.m_stackedObjects.length === 0) return null;
        const b = this.m_stackedObjects[this.m_stackedObjects.length - 1]
            .getComponent(BackPackObjectBehavior);
        return b ? b.ObjectType : null;
    }

    public UpdateCoinCount(v: number) {
        this.m_currentCoinCount += v;
        if (this.ResourceManager) { 
            this.ResourceManager.addCoins(v);
        }
    }

    public GetCoinCount() { return this.m_currentCoinCount; }

    public CanStack() {
        return true; 
    }

    public isEmpty() {
        return this.m_stackedObjects.length === 0;
    }

   
    public GetStackCount(): number {
        return this.m_stackedObjects.length;
    }
}
import { _decorator, Component, Node, Vec3, tween, math } from 'cc'; 
import { BackPackObjectBehavior, ObjectType } from './BackPackObjectBehavior';
import { Mover, MoveType } from './Mover'

const { ccclass, property } = _decorator;

@ccclass('BackpackBehavior')
export class BackpackBehavior extends Component {

    @property(Node) public Backpack: Node = null!; 
    @property public SwingUpOffset: number = 2.0; 
    @property public CollectDuration: number = 0.5;

    @property({ group: { name: 'Wobble Settings' } }) public WobbleSpeed: number = 10.0; 
    @property({ group: { name: 'Wobble Settings' } }) public MaxSwayDistance: number = 0.3; 
    @property({ group: { name: 'Wobble Settings' } }) public MaxBendAngle: number = 10.0; 

    private m_stackedObjects: Node[] = [];
    private m_settledObjects: Set<Node> = new Set(); 
    private _lastPos: Vec3 = new Vec3();
    private _wobbleStrength: number = 0; 
    private _initialYPositions: Map<string, number> = new Map();
    private m_time: number = 0;

    update(dt: number) {
        const currentPos = this.node.worldPosition;
        const isMoving = Vec3.distance(currentPos, this._lastPos) > 0.001; 
        this._wobbleStrength = math.lerp(this._wobbleStrength, isMoving ? 1.0 : 0.0, dt * 5.0);
        this.m_time += dt;

        if (this._wobbleStrength > 0.01) {
            const mainPulse = Math.sin(this.m_time * this.WobbleSpeed);
            for (let i = 0; i < this.m_stackedObjects.length; i++) {
                const node = this.m_stackedObjects[i];
                if (!this.m_settledObjects.has(node)) continue;

                const t = (i + 1) / this.m_stackedObjects.length;
                const swayX = mainPulse * this.MaxSwayDistance * (t * t) * this._wobbleStrength;
                const bendAngle = mainPulse * this.MaxBendAngle * t * this._wobbleStrength;
                
                const localY = this._initialYPositions.get(node.uuid) || 0;
                node.setPosition(swayX, localY, 0);

                const b = node.getComponent(BackPackObjectBehavior);
                if(b) node.setRotationFromEuler(b.BackPackRot.x, b.BackPackRot.y, b.BackPackRot.z - bendAngle);
            }
        } else {
            this.m_settledObjects.forEach(node => {
                const localY = this._initialYPositions.get(node.uuid) || 0;
                node.setPosition(0, localY, 0);
            });
        }
        this._lastPos.set(currentPos);
    }

    public Collect(objectNode: Node) {
        const behavior = objectNode.getComponent(BackPackObjectBehavior);
        if (!behavior || !this.Backpack) return;

        // 1. Determine local Y height based on index
        let localYOffset = 0;
        for (const obj of this.m_stackedObjects) {
            const b = obj.getComponent(BackPackObjectBehavior);
            localYOffset += b ? b.SpacingUnit.y : 0.3; 
        }

        // 2. Add to array immediately
        this.m_stackedObjects.push(objectNode);

        // 3. Move logic - Use TWEEN instead of Mover to guarantee Local Y
        const startWorldPos = objectNode.worldPosition.clone();
        objectNode.parent = this.Backpack; // Force change of coordinate system
        objectNode.setWorldPosition(startWorldPos); // Stay visually where you were

        // We are moving to LOCAL (0, localYOffset, 0)
        // Since we are child of Backpack, Local 0 is Y=3.209
        tween(objectNode)
            .to(this.CollectDuration, { position: new Vec3(0, localYOffset, 0) }, {
                easing: 'expoOut',
                onUpdate: (target: Node, ratio: number) => {
                    // Manual ARC: Adjust Y based on a sine curve during the move
                    const peak = Math.sin(ratio * Math.PI) * this.SwingUpOffset;
                    const currentPos = target.position;
                    target.setPosition(currentPos.x, currentYOffset_Base(ratio, localYOffset) + peak, currentPos.z);
                }
            })
            .call(() => this.OnCollected(objectNode, localYOffset))
            .start();

        // Helper function for the lerp logic
        function currentYOffset_Base(r: number, targetY: number) {
            return r * targetY;
        }
    }

    private OnCollected(item: Node, localY: number) {
        if (!item.isValid) return;
        const b = item.getComponent(BackPackObjectBehavior);

        // SNAP to Local position relative to the Backpack node
        item.setPosition(0, localY, 0); 
        if(b) item.setRotationFromEuler(b.BackPackRot.x, b.BackPackRot.y, b.BackPackRot.z);

        this._initialYPositions.set(item.uuid, localY);
        this.m_settledObjects.add(item); 
    }
}
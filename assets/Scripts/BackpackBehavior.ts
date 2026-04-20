import { _decorator, Component, Node, Vec3, math, tween } from 'cc'; 
import { BackPackObjectBehavior } from './BackPackObjectBehavior';
import { Mover, MoveType } from './Mover';

const { ccclass, property } = _decorator;

@ccclass('BackpackBehavior')
export class BackpackBehavior extends Component {

    @property(Node) public BackpackNode: Node = null!;

    @property public SwingUpOffset: number = 0.8;
    @property public CollectDuration: number = 0.4;

    @property({ group: { name: 'Wobble Settings' } }) public WobbleSpeed: number = 10.0; 
    @property({ group: { name: 'Wobble Settings' } }) public MaxSwayDistance: number = 0.4; 
    @property({ group: { name: 'Wobble Settings' } }) public MaxBendAngle: number = 12.0; 

    private m_stackedObjects: Node[] = [];
    private m_settledObjects: Set<Node> = new Set(); 
    private m_time: number = 0;
    private _lastPos: Vec3 = new Vec3();
    private _wobbleStrength: number = 0; 
    private _initialYPositions: Map<string, number> = new Map();

    start() {
        this._lastPos.set(this.node.worldPosition);
    }

    update(dt: number) {
        const currentPos = this.node.worldPosition;
        const isMoving = Vec3.distance(currentPos, this._lastPos) > 0.001; 
        this._wobbleStrength = math.lerp(this._wobbleStrength, isMoving ? 1.0 : 0.0, dt * 5.0);
        this.m_time += dt;

        // Procedural Spine Wobble Math
        if (this._wobbleStrength > 0.001) {
            const mainPulse = Math.sin(this.m_time * this.WobbleSpeed);
            for (let i = 0; i < this.m_stackedObjects.length; i++) {
                const node = this.m_stackedObjects[i];
                if (!this.m_settledObjects.has(node) || !node.isValid) continue;

                const behavior = node.getComponent(BackPackObjectBehavior);
                const t = i / Math.max(1, this.m_stackedObjects.length); // Normalized Height
                const curve = t * t; // Quadratic Curve

                const swayX = mainPulse * this.MaxSwayDistance * curve * this._wobbleStrength;
                const bendAngle = mainPulse * this.MaxBendAngle * t * this._wobbleStrength;

                const currentY = this._initialYPositions.get(node.uuid) || 0;
                node.setPosition(swayX, currentY, 0);

                if (behavior) {
                    node.setRotationFromEuler(behavior.BackPackRot.x, behavior.BackPackRot.y, behavior.BackPackRot.z - bendAngle);
                }
            }
        }
        this._lastPos.set(currentPos);
    }

    public Collect(objectNode: Node) {
        const behavior = objectNode.getComponent(BackPackObjectBehavior);
        if (!behavior || !this.BackpackNode) return;

        // 1. Calculate cumulative height BEFORE adding to list
        let reservedYOffset = 0;
        for (const obj of this.m_stackedObjects) {
            const b = obj.getComponent(BackPackObjectBehavior);
            reservedYOffset += b ? b.SpacingUnit.y : 0.4;
        }

        const startWorldPos = objectNode.worldPosition.clone();
        
        // Parent immediately to follow the player's movement during the arc
        objectNode.setParent(this.BackpackNode);
        objectNode.setWorldPosition(startWorldPos);

        this.m_stackedObjects.push(objectNode);

        // 2. Start the Arc Movement using Mover
        Mover.move(MoveType.ARC, {
            node: objectNode,
            start: startWorldPos,
            duration: this.CollectDuration,
            arcHeight: this.SwingUpOffset,
            endPointGetter: () => {
                const wp = this.BackpackNode.worldPosition.clone();
                return new Vec3(wp.x, wp.y + reservedYOffset, wp.z);
            },
            onComplete: () => {
                // Snap to final stack position and memorize Y
                objectNode.setPosition(0, reservedYOffset, 0);
                objectNode.setRotationFromEuler(behavior.BackPackRot);
                this._initialYPositions.set(objectNode.uuid, reservedYOffset);
                this.m_settledObjects.add(objectNode);
                
                // Land "Juice" effect
                const origScale = objectNode.getScale().clone();
                tween(objectNode)
                    .to(0.1, { scale: new Vec3(origScale.x * 1.1, origScale.y * 0.8, origScale.z * 1.1) })
                    .to(0.1, { scale: origScale }, { easing: 'backOut' })
                    .start();
            }
        });
    }
}
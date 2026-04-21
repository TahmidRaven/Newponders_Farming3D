import { _decorator, Component, Node, Vec3, tween, math, director } from 'cc'; 
import { BackPackObjectBehavior, ObjectType } from './BackPackObjectBehavior';

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

        let localYOffset = 0;
        for (const obj of this.m_stackedObjects) {
            const b = obj.getComponent(BackPackObjectBehavior);
            localYOffset += b ? b.SpacingUnit.y : 0.3; 
        }

        this.m_stackedObjects.push(objectNode);

        const startWorldPos = objectNode.worldPosition.clone();
        objectNode.parent = this.Backpack; 
        objectNode.setWorldPosition(startWorldPos); 

        tween(objectNode)
            .to(this.CollectDuration, { position: new Vec3(0, localYOffset, 0) }, {
                easing: 'expoOut',
                onUpdate: (target: Node, ratio: number) => {
                    const peak = Math.sin(ratio * Math.PI) * this.SwingUpOffset;
                    const currentPos = target.position;
                    target.setPosition(currentPos.x, (ratio * localYOffset) + peak, currentPos.z);
                }
            })
            .call(() => this.OnCollected(objectNode, localYOffset))
            .start();
    }

    private OnCollected(item: Node, localY: number) {
        if (!item.isValid) return;
        const b = item.getComponent(BackPackObjectBehavior);

        item.setPosition(0, localY, 0); 
        if(b) item.setRotationFromEuler(b.BackPackRot.x, b.BackPackRot.y, b.BackPackRot.z);

        this._initialYPositions.set(item.uuid, localY);
        this.m_settledObjects.add(item); 
    }

    /**
     * Sells the top item from the backpack using a Bezier curve to the target.
     */
    public async PopItemForSale(targetLocation: Vec3): Promise<void> {
        const item = this.m_stackedObjects.pop();
        if (!item) return;

        this.m_settledObjects.delete(item);
        this._initialYPositions.delete(item.uuid);

        // Move to world space for the fly-out animation
        const startPos = item.worldPosition.clone();
        item.parent = director.getScene(); 
        item.setWorldPosition(startPos);

        // Calculate a Bezier control point (mid-air)
        const midPoint = new Vec3();
        Vec3.add(midPoint, startPos, targetLocation);
        midPoint.multiplyScalar(0.5);
        midPoint.y += 4.0; // Height of the sell arc

        return new Promise((resolve) => {
            let v3 = new Vec3();
            tween(item)
                .to(0.6, {}, {
                    onUpdate: (target: Node, ratio: number) => {
                        const t = ratio;
                        const invT = 1 - t;
                        // Quadratic Bezier: (1-t)^2*P0 + 2(1-t)*t*P1 + t^2*P2
                        v3.x = invT * invT * startPos.x + 2 * invT * t * midPoint.x + t * t * targetLocation.x;
                        v3.y = invT * invT * startPos.y + 2 * invT * t * midPoint.y + t * t * targetLocation.y;
                        v3.z = invT * invT * startPos.z + 2 * invT * t * midPoint.z + t * t * targetLocation.z;
                        
                        target.setWorldPosition(v3);
                        target.setRotationFromEuler(target.eulerAngles.x + 5, target.eulerAngles.y + 5, target.eulerAngles.z);
                    }
                })
                .call(() => {
                    item.destroy();
                    resolve();
                })
                .start();
        });
    }

    public isEmpty(): boolean {
        return this.m_stackedObjects.length === 0;
    }
}
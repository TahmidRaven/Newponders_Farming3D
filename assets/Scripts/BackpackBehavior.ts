import { _decorator, Component, Node, Vec3, tween, math, director, Prefab, instantiate } from 'cc'; 
import { BackPackObjectBehavior, ObjectType } from './BackPackObjectBehavior';
import { Mover, MoveType } from './Mover';

const { ccclass, property } = _decorator;

@ccclass('BackpackBehavior')
export class BackpackBehavior extends Component {

    @property(Node) public Backpack: Node = null!; 
    @property(Prefab) public coinPrefab: Prefab = null!; 
    @property public SwingUpOffset: number = 2.0; 
    @property public CollectDuration: number = 0.5;

    @property({ group: { name: 'Wobble Settings' } }) public WobbleSpeed: number = 10.0; 
    @property({ group: { name: 'Wobble Settings' } }) public MaxSwayDistance: number = 0.3; 
    @property({ group: { name: 'Wobble Settings' } }) public MaxBendAngle: number = 10.0; 

    // --- POSITIONING SETTINGS ---
    @property({ group: { name: 'Positioning' } }) 
    public handToolLocalPos: Vec3 = new Vec3(0, 0, 0);

    @property({ group: { name: 'Positioning' } }) 
    public vehicleLocalPos: Vec3 = new Vec3(0, 0.5, -1.0);

    private m_stackedObjects: Node[] = [];
    private m_settledObjects: Set<Node> = new Set(); 
    private _lastPos: Vec3 = new Vec3();
    private _wobbleStrength: number = 0; 
    private _initialYPositions: Map<string, number> = new Map();
    private m_time: number = 0;

    /**
     * Shifts the backpack to the correct position based on the current tool.
     */
    public setVehicleMode(isVehicle: boolean) {
        const targetPos = isVehicle ? this.vehicleLocalPos : this.handToolLocalPos;
        
        tween(this.node)
            .to(0.3, { position: targetPos }, { easing: 'sineOut' })
            .start();
    }

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

    public PopItemForSale(targetLocation: Vec3) {
        const item = this.m_stackedObjects.pop();
        if (!item) return;

        this.m_settledObjects.delete(item);
        this._initialYPositions.delete(item.uuid);

        const startPos = item.worldPosition.clone();
        item.parent = director.getScene(); 
        item.setWorldPosition(startPos);

        const midPoint = new Vec3();
        Vec3.add(midPoint, startPos, targetLocation);
        midPoint.multiplyScalar(0.5);
        midPoint.y += 4.0; 

        let v3_temp = new Vec3();
        tween(item)
            .to(0.6, {}, {
                onUpdate: (target: Node, ratio: number) => {
                    const t = ratio;
                    const invT = 1 - t;
                    v3_temp.x = invT * invT * startPos.x + 2 * invT * t * midPoint.x + t * t * targetLocation.x;
                    v3_temp.y = invT * invT * startPos.y + 2 * invT * t * midPoint.y + t * t * targetLocation.y;
                    v3_temp.z = invT * invT * startPos.z + 2 * invT * t * midPoint.z + t * t * targetLocation.z;
                    
                    target.setWorldPosition(v3_temp);
                    target.setRotationFromEuler(target.eulerAngles.x + 10, target.eulerAngles.y + 10, target.eulerAngles.z);
                }
            })
            .call(() => {
                if (item.isValid) item.destroy();
            })
            .start();
    }

    public ReceiveCoin(fromWorldPos: Vec3) {
        if (!this.coinPrefab) return;

        const coin = instantiate(this.coinPrefab);
        director.getScene()?.addChild(coin);
        coin.setWorldPosition(fromWorldPos);

        Mover.move(MoveType.ARC, {
            node: coin,
            start: fromWorldPos,
            duration: 0.6,
            arcHeight: 4.5,
            endPointGetter: () => this.node.worldPosition, 
            onComplete: () => {
                if (coin.isValid) coin.destroy();
            }
        });
    }

    public isEmpty(): boolean {
        return this.m_stackedObjects.length === 0;
    }
}
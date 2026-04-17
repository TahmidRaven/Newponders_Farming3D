import {_decorator, Component, Vec3, PhysicsSystem, geometry, math, physics} from 'cc';

const { ccclass, property } = _decorator;

@ccclass('SimpleCharacterController')
export class SimpleCharacterController extends Component {

    @property
    public Radius = 0.5;

    @property
    public Height = 1.2;

    @property
    public SkinWidth = 0.05;

    @property
    public CollisionMask = 0xffffffff;

    @property
    public MaxIterations = 3;

    private m_lastPosition = new Vec3();
    private m_velocity = new Vec3();


    protected onLoad() {
        this.m_lastPosition.set(this.node.worldPosition);
    }

    public move(displacement: Vec3) 
    {

        if (displacement.lengthSqr() === 0) return;

        let remaining = displacement.clone();
        let currentPos = this.node.worldPosition.clone();

        for (let i = 0; i < this.MaxIterations; i++) {
            if (remaining.lengthSqr() < 0.00001) break;

            const hit = this.sweep(currentPos, remaining);

            if (!hit) {
                currentPos.add(remaining);
                break;
            }

            const travel = remaining.clone().multiplyScalar(hit.distance - this.SkinWidth);
            currentPos.add(travel);

            const normal = hit.hitNormal;
            const slide = this.projectOnPlane(remaining, normal);
            remaining.set(slide);
        }

        this.node.setWorldPosition(currentPos);
    }

    protected update(dt: number): void {
        const currentPos = this.node.getWorldPosition();
        Vec3.subtract(this.m_velocity, currentPos, this.m_lastPosition);
        this.m_velocity.multiplyScalar(1 / Math.max(dt, 0.0001));
        this.m_lastPosition = currentPos;
    }

    private sweep(origin: Vec3, movement: Vec3):  physics.PhysicsRayResult | null {
        const dir = movement.clone().normalize();
        const distance = movement.length();

        const halfHeight = Math.max(0, this.Height * 0.5 - this.Radius);

        const top = origin.clone().add3f(0, halfHeight, 0);
        const bottom = origin.clone().add3f(0, -halfHeight, 0);

        let closestHit: physics.PhysicsRayResult | null = null;

        if (this.sphereCast(top, dir, distance, hit => closestHit = hit, closestHit)) {}
        if (this.sphereCast(bottom, dir, distance, hit => closestHit = hit, closestHit)) {}

        return closestHit;
    }

    private sphereCast(center: Vec3, dir: Vec3, distance: number, setHit: (h:  physics.PhysicsRayResult) => void, current:  physics.PhysicsRayResult | null): boolean 
    {
        const ray = new geometry.Ray(
            center.x,
            center.y,
            center.z,
            dir.x,
            dir.y,
            dir.z
        );

        if (PhysicsSystem.instance.raycastClosest(ray, this.CollisionMask, distance + this.Radius)) {
            const hit = PhysicsSystem.instance.raycastClosestResult;
            if (!current || hit.distance < current.distance) {
                setHit(hit);
            }
            return true;
        }
        return false;
    }

    private projectOnPlane(vec: Vec3, normal: Vec3): Vec3 
    {
        const dot = Vec3.dot(vec, normal);
        return vec.subtract(normal.clone().multiplyScalar(dot));
    }

    public getVelocity(out?: Vec3): Vec3 
    {
       
        if (out) {
            out = (this.m_velocity);
            return out;
        }
        return this.m_velocity.clone();
    }

}

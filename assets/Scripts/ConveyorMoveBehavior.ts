import { Vec3 } from 'cc';
import { IMoveBehavior, MoveParams } from './IMoveBehavior';

export class ConveyorMoveBehavior implements IMoveBehavior {
    private m_node!: MoveParams["node"];
    private m_direction = new Vec3();
    private m_speed = 1;
    private m_end!: Vec3;
    private onComplete?: () => void;
    private endPointGetter? : () => Vec3;

    initialize(params: MoveParams): void {
        this.m_node = params.node;
        this.m_end = params.end?.clone();
        this.onComplete = params.onComplete;

        this.m_speed = 1 / params.duration;

        this.m_direction = new Vec3();
        Vec3.subtract(this.m_direction, params.end, params.start);
        this.m_direction.normalize();
    }

    update(dt: number): boolean {
        const currentEnd = this.endPointGetter ? this.endPointGetter() : this.m_end;

        const pos = this.m_node.worldPosition.clone();
        const dir = currentEnd.clone().subtract(pos).normalize();

        Vec3.scaleAndAdd(pos, pos, dir, dt * this.m_speed);
        this.m_node.setWorldPosition(pos);

        if (Vec3.distance(pos, currentEnd) < 0.05) {
            this.m_node.setWorldPosition(currentEnd);
            this.onComplete?.();
            return true;
        }
        return false;
    }

}

import { Vec3, math } from 'cc';
import { IMoveBehavior, MoveParams } from './IMoveBehavior';

export class StraightMoveBehavior implements IMoveBehavior {
    private m_node!: MoveParams["node"];
    private m_start!: Vec3;
    private m_end!: Vec3;
    private m_duration!: number;
    private m_elapsed = 0;
    private onComplete?: () => void;
    private endPointGetter? : () => Vec3;

    initialize(params: MoveParams): void {
        this.m_node = params.node;
        this.m_start = params.start.clone();
        this.m_end = params.end?.clone();
        this.m_duration = params.duration;
        this.onComplete = params.onComplete;
        this.endPointGetter = params.endPointGetter;
    }

    update(dt: number): boolean {
        this.m_elapsed += dt;
        const t = math.clamp01(this.m_elapsed / this.m_duration);

        const currentEnd = this.endPointGetter ? this.endPointGetter() : this.m_end;

        const pos = new Vec3(
            this.m_start.x + (currentEnd.x - this.m_start.x) * t,
            this.m_start.y + (currentEnd.y - this.m_start.y) * t,
            this.m_start.z + (currentEnd.z - this.m_start.z) * t,
        );

        this.m_node.setWorldPosition(pos);

        if (t >= 1) {
            this.m_node.setWorldPosition(currentEnd);
            this.onComplete?.();
            return true;
        }
        return false;
    }

}

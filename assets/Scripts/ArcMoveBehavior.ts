import { Vec3, math } from 'cc';
import { IMoveBehavior, MoveParams } from './IMoveBehavior'; 

export class ArcMoveBehavior implements IMoveBehavior {
    private m_node!: MoveParams["node"]; 
    private m_start!: Vec3;
    private m_end!: Vec3;
    private m_mid!: Vec3;
    private m_arcHeight : number;
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

        this.m_arcHeight = params.arcHeight ?? 1;
    }

    update(dt: number): boolean {
        this.m_elapsed += dt;
        const t = math.clamp01(this.m_elapsed / this.m_duration);

        const currentEnd = this.endPointGetter ? this.endPointGetter() : this.m_end;

        const mid = new Vec3(
            (this.m_start.x + currentEnd.x) * 0.5,
            Math.max(this.m_start.y, currentEnd.y) + this.m_arcHeight,
            (this.m_start.z + currentEnd.z) * 0.5
        );

        const omt = 1 - t;

        const pos = new Vec3(
            omt * omt * this.m_start.x + 2 * omt * t * mid.x + t * t * currentEnd.x,
            omt * omt * this.m_start.y + 2 * omt * t * mid.y + t * t * currentEnd.y,
            omt * omt * this.m_start.z + 2 * omt * t * mid.z + t * t * currentEnd.z
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

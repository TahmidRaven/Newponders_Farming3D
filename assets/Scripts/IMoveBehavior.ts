import { Node, Vec3 } from 'cc';

export interface MoveParams {
    node: Node;
    start: Vec3;
    end?: Vec3;                       
    duration: number;
    arcHeight?: number;
    onComplete?: () => void;

    endPointGetter?: () => Vec3;     
}

export interface IMoveBehavior {
    initialize(params: MoveParams): void;
    update(dt: number): boolean;
}

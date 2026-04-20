import { Node, tween, Vec3 } from 'cc';
import { MoveParams, IMoveBehavior } from "./IMoveBehavior";
import { ArcMoveBehavior } from "./ArcMoveBehavior";
import { StraightMoveBehavior } from "./StraightMoveBehavior";
import { ConveyorMoveBehavior } from "./ConveyorMoveBehavior";
import { MovementSystem } from "./MovementSystem";

export enum MoveType {
    ARC,
    STRAIGHT,
    CONVEYOR
}

export class Mover {
    static move(type: MoveType, params: MoveParams, scaleFrom?: Vec3, scaleTo?: Vec3) {
        let behavior: IMoveBehavior;

        switch (type) {
            case MoveType.STRAIGHT:    behavior = new StraightMoveBehavior(); break;
            case MoveType.CONVEYOR:    behavior = new ConveyorMoveBehavior(); break;
            default:                   behavior = new ArcMoveBehavior(); break;
        }

        behavior.initialize(params);
        MovementSystem.add(behavior);

        if (scaleFrom && scaleTo) {
            params.node.setScale(scaleFrom.clone());
            tween(params.node).to(params.duration, { scale: scaleTo }, { easing: 'backOut' }).start();
        }
    }
}

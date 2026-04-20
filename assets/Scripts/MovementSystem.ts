import { IMoveBehavior } from "./IMoveBehavior";

export class MovementSystem {
    private static s_active: IMoveBehavior[] = [];

    public static add(m: IMoveBehavior) {
        this.s_active.push(m);
    }

    public static update(dt: number) {
        for (let i = this.s_active.length - 1; i >= 0; i--) {
            const done = this.s_active[i].update(dt);
            if (done) this.s_active.splice(i, 1);
        }
    }
}

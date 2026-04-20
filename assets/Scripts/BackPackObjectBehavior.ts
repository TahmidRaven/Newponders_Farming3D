import { _decorator, Component, Vec3, Enum } from 'cc';
const { ccclass, property } = _decorator;

export enum ObjectType {
    None,
    Wheat,
    Corn,
    FeedPacket, 
}

@ccclass('BackPackObjectBehavior')
export class BackPackObjectBehavior extends Component {

    @property({ type: Enum(ObjectType) })
    public ObjectType: ObjectType = ObjectType.FeedPacket; 

    // Defines the unit size for spacing (adjust based on FeedPacket model's scale)
    @property
    public SpacingUnit: Vec3 = new Vec3(0.8, 0.4, 0.8); 

    // Rotation of the object when placed in the pile 
    @property
    public BackPackRot: Vec3 = new Vec3(0, 0, 0); 
}
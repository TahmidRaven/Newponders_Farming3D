import { _decorator, CCInteger, Enum, Component } from 'cc';
const { ccclass, property } = _decorator;

export enum ToolType {
    None, Sicklex, Scythex, Truck, TwoBladedTructor
}

@ccclass('ToolData')
export class ToolData extends Component {
    @property({type: Enum(ToolType)})
    public type: ToolType = ToolType.None;

    @property({type: CCInteger})
    public level: number = 0;

    @property
    public harvestRadius: number = 2.0; // Separate radius for each tool
}
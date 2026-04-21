import { _decorator, CCInteger, Enum } from 'cc';
const { ccclass, property } = _decorator;

export enum ToolType {
    None,
    Sicklex,
    Scythex,
    Tructor,
    TwoBladedTructor, // lvl 4 
}

@ccclass('ToolStats')
export class ToolStats {
    @property({type: Enum(ToolType)})
    public type: ToolType = ToolType.None;

    @property({type: CCInteger})
    public level: number = 0;

    @property
    public basePower: number = 1;
}
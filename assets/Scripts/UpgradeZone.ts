import { _decorator, Component, Vec3, Prefab, Node } from 'cc';
import { GameManager } from './GameManager';
import { ResourceManager } from './ResourceManager';

const { ccclass, property } = _decorator;

@ccclass('UpgradeZone')
export class UpgradeZone extends Component {
    @property(ResourceManager)
    public resourceManager: ResourceManager = null!;

    @property([Prefab])
    public toolPrefabs: Prefab[] = []; 

    @property([Number])
    public upgradeCosts: number[] = [55, 150];

    @property
    public interactionDistance: number = 2.5;

    private _currentUpgradeIndex: number = 0;
    private _isProcessing: boolean = false;

    update(deltaTime: number) {
        if (this._currentUpgradeIndex >= this.toolPrefabs.length || this._isProcessing) return;
        if (!this.resourceManager || !GameManager.Instance) return;

        const playerPos = GameManager.Instance.getPlayerPosition();
        const distance = Vec3.distance(this.node.worldPosition, playerPos!);
        const currentCost = this.upgradeCosts[this._currentUpgradeIndex];

        if (distance < this.interactionDistance && this.resourceManager.coinCount >= currentCost) {
            this.executeUpgrade(currentCost);
        }
    }

    private executeUpgrade(cost: number) {
        this._isProcessing = true;
        this.resourceManager.removeCoins(cost); // Fixed the method call

        const toolManager = GameManager.Instance.toolManager;
        const nextPrefab = this.toolPrefabs[this._currentUpgradeIndex];
        const isVehicle = this._currentUpgradeIndex >= 1; // Level 2 is the Truck

        if (toolManager) {
            toolManager.spawnTool(nextPrefab, isVehicle);
        }

        this._currentUpgradeIndex++;
        this._isProcessing = false;
    }
}
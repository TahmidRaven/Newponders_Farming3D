import { _decorator, Component, Vec3, Prefab, Node } from 'cc';
import { GameManager } from './GameManager';
import { ResourceManager } from './ResourceManager';

const { ccclass, property } = _decorator;

@ccclass('UpgradeZone')
export class UpgradeZone extends Component {
    @property(ResourceManager) public resourceManager: ResourceManager = null!;
    @property([Prefab]) public toolPrefabs: Prefab[] = []; 
    @property([Number]) public upgradeCosts: number[] = [55, 150];
    @property public interactionDistance: number = 2.5;

    private _currentUpgradeIndex: number = 0;
    private _isProcessing: boolean = false;
    private _playerInside: boolean = false; // Tracks if player is currently in the zone

    update(deltaTime: number) {
        if (this._currentUpgradeIndex >= this.toolPrefabs.length || this._isProcessing) return;
        if (!this.resourceManager || !GameManager.Instance) return;

        const playerPos = GameManager.Instance.getPlayerPosition();
        if (!playerPos) return;

        const distance = Vec3.distance(this.node.worldPosition, playerPos);

        // 1. Check for Exit: If player moves away, reset the gate
        if (distance > this.interactionDistance) {
            this._playerInside = false;
            return;
        }

        // 2. Check for Re-entry: Only proceed if player was previously outside
        if (this._playerInside) return;

        const currentCost = this.upgradeCosts[this._currentUpgradeIndex];

        // 3. Trigger Upgrade
        if (this.resourceManager.coinCount >= currentCost) {
            this._playerInside = true; // Lock the zone until they leave
            this.executeUpgrade(currentCost);
        }
    }

    private executeUpgrade(cost: number) {
        this._isProcessing = true;
        
        this.resourceManager.removeCoins(cost);

        const toolManager = GameManager.Instance.toolManager;
        const nextPrefab = this.toolPrefabs[this._currentUpgradeIndex];
        const isVehicle = this._currentUpgradeIndex >= 1; 

        if (toolManager && nextPrefab) {
            toolManager.spawnTool(nextPrefab, isVehicle);
        }

        this._currentUpgradeIndex++;
        this._isProcessing = false;
    }
}
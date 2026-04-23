import { _decorator, Component, Vec3, Prefab, Node } from 'cc';
import { GameManager } from './GameManager';
import { ResourceManager } from './ResourceManager';
import { AudioContent } from './AudioContent'; 

const { ccclass, property } = _decorator;

@ccclass('UpgradeZone')
export class UpgradeZone extends Component {
    @property(ResourceManager) public resourceManager: ResourceManager = null!;
    @property([Prefab]) public toolPrefabs: Prefab[] = []; 
    @property([Number]) public upgradeCosts: number[] = [55, 150];
    @property public interactionDistance: number = 2.5;

    private _currentUpgradeIndex: number = 0;
    private _isProcessing: boolean = false;
    private _playerInside: boolean = false; 

    update(deltaTime: number) {
        if (this._currentUpgradeIndex >= this.toolPrefabs.length || this._isProcessing) return;
        if (!this.resourceManager || !GameManager.Instance) return;

        const playerPos = GameManager.Instance.getPlayerPosition();
        if (!playerPos) return;

        const distance = Vec3.distance(this.node.worldPosition, playerPos);

        if (distance > this.interactionDistance) {
            this._playerInside = false;
            return;
        }

        if (this._playerInside) return;

        const currentCost = this.upgradeCosts[this._currentUpgradeIndex];

        if (this.resourceManager.coinCount >= currentCost) {
            this._playerInside = true; 
            this.executeUpgrade(currentCost);
        }
    }

    private executeUpgrade(cost: number) {
        this._isProcessing = true;
        
        // FIX: Trigger the sound using the corrected audio search logic
        this.playAudioByName("Upgrade");

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

    private playAudioByName(searchString: string) {
        // FIX: Access the audio manager via the direct property in GameManager
        if (!GameManager.Instance || !GameManager.Instance.audioManagerNode) return;

        const audios = GameManager.Instance.audioManagerNode.getComponentsInChildren(AudioContent);
        
        // Find and play the first audio that contains the search string
        const target = audios.find(a => a.AudioName.includes(searchString));
        if (target) {
            target.play();
        }
    }
}
import { _decorator, Component, Vec3, Prefab, animation, Node, instantiate, director } from 'cc';
import { GameManager } from './GameManager';
import { ResourceManager } from './ResourceManager';
import { ToolManager } from './ToolManager';

const { ccclass, property } = _decorator;

@ccclass('UpgradeZone')
export class UpgradeZone extends Component {
    @property(ResourceManager)
    public resourceManager: ResourceManager = null!;

    @property([Prefab])
    public toolPrefabs: Prefab[] = []; // index 0: Scythex, index 1: Truck

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
        if (!playerPos) return;

        const distance = Vec3.distance(this.node.worldPosition, playerPos);
        const currentCost = this.upgradeCosts[this._currentUpgradeIndex];

        if (distance < this.interactionDistance && this.resourceManager.coinCount >= currentCost) {
            this.executeUpgrade(currentCost);
        }
    }

    private executeUpgrade(cost: number) {
        this._isProcessing = true;
        this.resourceManager.coinCount -= cost;
        this.resourceManager.updateUI();

        const playerNode = GameManager.Instance.playerNode;
        const toolManager = GameManager.Instance.toolManager;
        const nextPrefab = this.toolPrefabs[this._currentUpgradeIndex];

        if (this._currentUpgradeIndex === 1) {
            // LEVEL 2: SPAWN TRUCK IN SCENE & MOUNT PLAYER
            this.spawnTruckAndMountPlayer(playerNode, nextPrefab, toolManager);
        } else {
            // LEVEL 1: STANDARD TOOL ATTACHMENT
            if (toolManager) {
                toolManager.despawnTool();
                this.scheduleOnce(() => {
                    toolManager.spawnTool(nextPrefab);
                    this.finishUpgrade();
                }, 0.3);
            }
        }
    }

    private spawnTruckAndMountPlayer(player: Node, truckPrefab: Prefab, toolManager: ToolManager) {
        // 1. Remove Hand Tools
        if (toolManager) toolManager.despawnTool(true);

        // 2. Spawn Truck into the scene at player position
        const truck = instantiate(truckPrefab);
        const spawnPos = player.worldPosition.clone();
        director.getScene()?.addChild(truck);
        truck.setWorldPosition(spawnPos);

        // 3. Find the Seat node on the Truck (Ensure Truck prefab has a node named "Seat")
        const seatNode = truck.getChildByPath("Seat") || truck;

        // 4. Parent Player to the Truck's Seat
        player.setParent(seatNode);
        player.setPosition(Vec3.ZERO);
        player.setRotationFromEuler(0, 0, 0);

        // 5. Trigger driving animation on the player
        const anim = player.getComponent(animation.AnimationController) || 
                     player.getComponentInChildren(animation.AnimationController);
        if (anim) {
            anim.setValue("driving", true);
            anim.setValue("walk", false);
            anim.setValue("idle", false);
        }

        this.finishUpgrade();
    }

    private finishUpgrade() {
        this._currentUpgradeIndex++;
        this._isProcessing = false;
    }
}
import { _decorator, Component, Node, Vec3 } from 'cc';
import { CompassArrow } from './CompassArrow';
import { ResourceManager } from './ResourceManager';
import { FieldGenerator } from './FieldGenerator';
import { UpgradeZone } from './UpgradeZone';
import { GameManager } from './GameManager';

const { ccclass, property } = _decorator;

export enum GuideState {
    HARVEST,
    SELL,
    UPGRADE
}

@ccclass('GuideController')
export class GuideController extends Component {
    @property(CompassArrow) public Arrow: CompassArrow = null!;
    @property(ResourceManager) public resourceManager: ResourceManager = null!;
    @property(FieldGenerator) public fieldGenerator: FieldGenerator = null!;
    @property(UpgradeZone) public upgradeZone: UpgradeZone = null!;
    @property(Node) public SellZone: Node = null!;
    @property public sellThreshold: number = 25; 

    private _currentState: GuideState = GuideState.HARVEST;

    update(dt: number) {
        this.DecideTarget();
    }

    private DecideTarget() {
        if (!this.Arrow || !this.resourceManager || !GameManager.Instance) return;

        const playerPos = GameManager.Instance.playerNode.worldPosition;
        const currentCrops = this.resourceManager.cropCount;
        const currentCoins = this.resourceManager.coinCount;

        // --- PRIORITY 1: UPGRADE ---
        if (this.upgradeZone) {
            const currentIndex = this.upgradeZone["_currentUpgradeIndex"];
            const costs = this.upgradeZone.upgradeCosts;
            if (currentIndex < costs.length && currentCoins >= costs[currentIndex]) {
                this.SetGuide(this.upgradeZone.node, GuideState.UPGRADE);
                return;
            }
        }

        // --- PRIORITY 2: SELL ---
        if (currentCrops >= this.sellThreshold || this.resourceManager.isFull()) {
            this.SetGuide(this.SellZone, GuideState.SELL);
            return;
        }

        // --- PRIORITY 3: HARVEST ---
        this.SetGuide(null, GuideState.HARVEST);
        const distToField = Vec3.distance(playerPos, this.fieldGenerator.node.worldPosition);
        
        if (distToField < this.fieldGenerator.fieldRadius) {
            this.Arrow.Hide();
        } else {
            this.PointToNearestWheat(playerPos);
        }
    }

    private SetGuide(target: Node | null, state: GuideState) {
        if (this._currentState !== state) {
            this._currentState = state;
            GameManager.Instance.updateInstruction(state);
        }
        if (target) {
            this.Arrow.target = target;
            this.Arrow.Show();
        }
    }

    private PointToNearestWheat(playerPos: Vec3) {
        const nearbyNodes = this.fieldGenerator.getNodesInVicinity(playerPos);
        let nearestNode: Node | null = null;
        let minDistSq = Infinity;

        for (const node of nearbyNodes) {
            if (node && node.isValid) {
                const distSq = Vec3.squaredDistance(playerPos, node.worldPosition);
                if (distSq < minDistSq) {
                    minDistSq = distSq;
                    nearestNode = node;
                }
            }
        }
        this.Arrow.target = nearestNode || this.fieldGenerator.node;
        this.Arrow.Show();
    }
}
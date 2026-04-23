import { _decorator, Component, Node, Prefab, instantiate, Vec3 } from 'cc';
import { GameManager } from './GameManager';
const { ccclass, property } = _decorator;

@ccclass('FieldGenerator')
export class FieldGenerator extends Component {
    @property({ type: Prefab }) public wheatPrefab: Prefab = null!;
    @property public spacing: number = 0.6;
    @property public fieldRadius: number = 10;
    
    private readonly GRID_CELL_SIZE: number = 5; 
    private wheatGrid: Map<number, Map<number, Node[]>> = new Map(); 

    // Counter for victory check
    public totalWheatCount: number = 0;

    start() {
        if (!this.wheatPrefab) return;
        this.generateField();
    }

    public generateField() {
        this.wheatGrid.clear();
        this.totalWheatCount = 0;
        const origin = this.node.worldPosition;

        for (let x = -this.fieldRadius; x <= this.fieldRadius; x += this.spacing) {
            for (let z = -this.fieldRadius; z <= this.fieldRadius; z += this.spacing) {
                const distanceFromCenter = Math.sqrt(x * x + z * z);
                if (distanceFromCenter <= this.fieldRadius) {
                    const wheatStalk = instantiate(this.wheatPrefab);
                    wheatStalk.setParent(this.node);
                    const worldPos = new Vec3(origin.x + x, origin.y, origin.z + z);
                    wheatStalk.setWorldPosition(worldPos);
                    this.addToGrid(wheatStalk);
                    this.totalWheatCount++;
                }
            }
        }
    }

    private addToGrid(node: Node) {
        const pos = node.worldPosition;
        const chunkX = Math.floor(pos.x / this.GRID_CELL_SIZE);
        const chunkZ = Math.floor(pos.z / this.GRID_CELL_SIZE);
        if (!this.wheatGrid.has(chunkX)) this.wheatGrid.set(chunkX, new Map());
        const zMap = this.wheatGrid.get(chunkX)!;
        if (!zMap.has(chunkZ)) zMap.set(chunkZ, []);
        zMap.get(chunkZ)!.push(node);
    }

    public getNodesInVicinity(worldPos: Vec3): Node[] {
        const nodes: Node[] = [];
        const playerChunkX = Math.floor(worldPos.x / this.GRID_CELL_SIZE);
        const playerChunkZ = Math.floor(worldPos.z / this.GRID_CELL_SIZE);
        for (let dx = -1; dx <= 1; dx++) {
            for (let dz = -1; dz <= 1; dz++) {
                const zMap = this.wheatGrid.get(playerChunkX + dx);
                if (zMap) {
                    const chunkNodes = zMap.get(playerChunkZ + dz);
                    if (chunkNodes) nodes.push(...chunkNodes);
                }
            }
        }
        return nodes;
    }

    public removeNodeFromGrid(node: Node) {
        const pos = node.worldPosition;
        const chunkX = Math.floor(pos.x / this.GRID_CELL_SIZE);
        const chunkZ = Math.floor(pos.z / this.GRID_CELL_SIZE);
        const zMap = this.wheatGrid.get(chunkX);
        if (zMap) {
            const nodeArray = zMap.get(chunkZ);
            if (nodeArray) {
                const index = nodeArray.indexOf(node);
                if (index !== -1) {
                    nodeArray.splice(index, 1);
                    this.totalWheatCount--;

                    // Trigger Victory when field is empty
                    if (this.totalWheatCount <= 0) {
                        GameManager.Instance.triggerVictory();
                    }
                }
            }
        }
    }
}
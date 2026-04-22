import { _decorator, Component, Label, CCInteger } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ResourceManager')
export class ResourceManager extends Component {
    @property(Label) public CropLabel: Label = null!; 
    @property(Label) public CoinLabel: Label = null!; 
    @property({ type: CCInteger }) public MaxCrops: number = 100; 

    public cropCount: number = 0; 
    public coinCount: number = 0;

    start() { this.updateUI(); }

    public addWheat(amount: number) {
        this.cropCount = Math.min(this.cropCount + amount, this.MaxCrops);
        this.updateUI();
    }

    // --- NEW METHOD TO FIX YOUR ERROR ---
    public removeCoins(amount: number) {
        this.coinCount = Math.max(0, this.coinCount - amount);
        this.updateUI();
    }

    public sellOneBatch(batchSize: number): boolean {
        if (this.cropCount <= 0) return false;
        const actualSold = Math.min(this.cropCount, batchSize);
        this.cropCount -= actualSold;
        this.coinCount += actualSold;
        this.updateUI();
        return this.cropCount > 0;
    }

    public isFull(): boolean { return this.cropCount >= this.MaxCrops; }

    public updateUI() {
        if (this.CropLabel) this.CropLabel.string = `Crop: ${this.cropCount}/${this.MaxCrops}`;
        if (this.CoinLabel) this.CoinLabel.string = `Coin: ${this.coinCount}`;
    }
}
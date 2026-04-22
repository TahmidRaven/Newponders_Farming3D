import { _decorator, animation, Component } from 'cc';
import { State, StateManager } from './StateManager';
import { CharacterControllerBehavior } from './CharacterController';

const { ccclass, property } = _decorator;

/**
 * Supported states for the NewPonders character system.
 */
export enum CharacterState {
    IDLE = "IdleState",
    WALK = "WalkState",
    HARVEST = "HarvestState",
    DRIVING = "DrivingState"
}

/**
 * Context passed to each state for shared access to components.
 */
class CharacterStateContext {
    public AnimationController: animation.AnimationController = null!;
}

// ==========================================
// STATE IMPLEMENTATIONS
// ==========================================

class IdleState implements State<CharacterStateContext> {
    name: string = CharacterState.IDLE;
    preEnterDelayMs = 0; postEnterDelayMs = 0; preExitDelayMs = 0; postExitDelayMs = 0;
    
    OnEnter(context: CharacterStateContext) { 
        context.AnimationController.setValue("idle", true); 
        context.AnimationController.setValue("walk", false);
    }
    OnExit(context: CharacterStateContext) { 
        context.AnimationController.setValue("idle", false); 
    }
}

class WalkState implements State<CharacterStateContext> {
    name: string = CharacterState.WALK;
    preEnterDelayMs = 0; postEnterDelayMs = 0; preExitDelayMs = 0; postExitDelayMs = 0;
    
    OnEnter(context: CharacterStateContext) { 
        context.AnimationController.setValue("walk", true); 
        context.AnimationController.setValue("idle", false);
    }
    OnExit(context: CharacterStateContext) { 
        context.AnimationController.setValue("walk", false); 
    }
}

class HarvestState implements State<CharacterStateContext> {
    name: string = CharacterState.HARVEST;
    preEnterDelayMs = 0; postEnterDelayMs = 0; preExitDelayMs = 0; postExitDelayMs = 0;
    
    OnEnter(context: CharacterStateContext) {
        context.AnimationController.setValue("idle", false);
        context.AnimationController.setValue("walk", false);
        // 'onharvest' logic is typically handled as a trigger/bool in Harvester.ts
    }
}

class DrivingState implements State<CharacterStateContext> {
    name: string = CharacterState.DRIVING;
    preEnterDelayMs = 0; postEnterDelayMs = 0; preExitDelayMs = 0; postExitDelayMs = 0;
    
    OnEnter(context: CharacterStateContext) {
        context.AnimationController.setValue("walk", false);
        context.AnimationController.setValue("idle", false);
        context.AnimationController.setValue("driving", true);
    }
    // No OnExit logic needed unless you add a "Get Out" feature
}

// ==========================================
// MAIN CONTROLLER
// ==========================================

@ccclass('CharacterStateController')
export class CharacterStateController extends Component {
    @property(animation.AnimationController)
    public AnimationController: animation.AnimationController = null!;

    @property(CharacterControllerBehavior)
    public CharacterControllerBehavior: CharacterControllerBehavior = null!;

    private m_characterStateContext: CharacterStateContext = new CharacterStateContext();
    private m_stateManager: StateManager<CharacterStateContext> = null!;
    private m_targetState: string = ""; 

    start() {
        // 1. HARD RESET Animator to prevent "startup flash"
        this.AnimationController.setValue("walk", false);
        this.AnimationController.setValue("onharvest", false);
        this.AnimationController.setValue("driving", false);
        this.AnimationController.setValue("idle", true);

        // 2. Initialize State Manager
        this.m_characterStateContext.AnimationController = this.AnimationController;
        this.m_stateManager = new StateManager<CharacterStateContext>(this.m_characterStateContext);

        // 3. Register All States
        this.m_stateManager.RegisterState(new IdleState());
        this.m_stateManager.RegisterState(new WalkState());
        this.m_stateManager.RegisterState(new HarvestState());
        this.m_stateManager.RegisterState(new DrivingState());

        // 4. Set Initial State
        this.m_targetState = CharacterState.IDLE;
        this.m_stateManager.ChangeState(CharacterState.IDLE);
    }

    update(deltaTime: number) {
        if (!this.m_stateManager || !this.CharacterControllerBehavior) return;

        // 🔒 LOCK STATE: If the animator is in driving mode, stop processing character-based states
        const isDriving = this.AnimationController.getValue("driving") === true;
        if (isDriving) {
            if (this.m_targetState !== CharacterState.DRIVING) {
                this.SetStateSafe(CharacterState.DRIVING);
            }
            this.m_stateManager.Update(deltaTime);
            return;
        }

        // Standard movement/harvest logic
        const moveDir = this.CharacterControllerBehavior.m_moveDir;
        const isMoving = moveDir.lengthSqr() > 0.001;
        const isHarvestingTriggered = this.AnimationController.getValue("onharvest") === true;

        if (isMoving) {
            if (this.m_targetState !== CharacterState.WALK) {
                this.SetStateSafe(CharacterState.WALK);
            }
        } else if (isHarvestingTriggered) {
            if (this.m_targetState !== CharacterState.HARVEST) {
                this.SetStateSafe(CharacterState.HARVEST);
            }
        } else {
            // Logic to stay in Harvest state until animation is done, else return to Idle
            if (this.m_targetState !== CharacterState.IDLE && this.m_targetState !== CharacterState.HARVEST) {
                this.SetStateSafe(CharacterState.IDLE);
            }
        }
        
        this.m_stateManager.Update(deltaTime);
    }

    private SetStateSafe(newState: CharacterState) {
        this.m_targetState = newState;
        this.m_stateManager.ChangeState(newState);
    }
}
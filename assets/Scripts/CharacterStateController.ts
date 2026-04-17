import { _decorator, animation, Component } from 'cc';
import { State, StateManager } from './StateManager';
import { CharacterControllerBehavior } from './CharacterController';

const { ccclass, property } = _decorator;

export enum CharacterState {
    IDLE = "IdleState",
    WALK = "WalkState",
    HARVEST = "HarvestState"
}

class CharacterStateContext {
    public AnimationController : animation.AnimationController = null;
}

class IdleState implements State<CharacterStateContext> {
    name: string = CharacterState.IDLE;
    preEnterDelayMs = 0; postEnterDelayMs = 0; preExitDelayMs = 0; postExitDelayMs = 0;
    OnEnter(context: CharacterStateContext) { 
        context.AnimationController.setValue("idle", true); 
        context.AnimationController.setValue("walk", false);
    }
    OnExit(context: CharacterStateContext)  { context.AnimationController.setValue("idle", false); }
}

class WalkState implements State<CharacterStateContext> {
    name: string = CharacterState.WALK;
    preEnterDelayMs = 0; postEnterDelayMs = 0; preExitDelayMs = 0; postExitDelayMs = 0;
    OnEnter(context: CharacterStateContext) { 
        context.AnimationController.setValue("walk", true); 
        context.AnimationController.setValue("idle", false);
    }
    OnExit(context: CharacterStateContext)  { context.AnimationController.setValue("walk", false); }
}

class HarvestState implements State<CharacterStateContext> {
    name: string = CharacterState.HARVEST;
    preEnterDelayMs = 0; postEnterDelayMs = 0; preExitDelayMs = 0; postExitDelayMs = 0;
    OnEnter(context: CharacterStateContext) {
        context.AnimationController.setValue("idle", false);
        context.AnimationController.setValue("walk", false);
    }
}

@ccclass('CharacterStateController')
export class CharacterStateController extends Component {
    @property(animation.AnimationController)
    public AnimationController : animation.AnimationController = null!;

    @property(CharacterControllerBehavior)
    public CharacterControllerBehavior : CharacterControllerBehavior = null!;

    private m_characterStateContext : CharacterStateContext = new CharacterStateContext();
    private m_stateManager : StateManager<CharacterStateContext> = null!;
    private m_targetState : string = ""; 
 
start() {
    // 1. HARD RESET Animator to prevent "startup flash"
    this.AnimationController.setValue("walk", false);
    this.AnimationController.setValue("onharvest", false); // matches lowercase
    this.AnimationController.setValue("idle", true);

    this.m_characterStateContext.AnimationController = this.AnimationController;
    this.m_stateManager = new StateManager<CharacterStateContext>(this.m_characterStateContext);

    this.m_stateManager.RegisterState(new IdleState());
    this.m_stateManager.RegisterState(new WalkState());
    this.m_stateManager.RegisterState(new HarvestState());

    this.m_targetState = CharacterState.IDLE;
    this.m_stateManager.ChangeState(CharacterState.IDLE);
}

    update(deltaTime: number) {
        if(!this.m_stateManager || !this.CharacterControllerBehavior) return;

        const moveDir = this.CharacterControllerBehavior.m_moveDir;
        const isMoving = moveDir.lengthSqr() > 0.001;
        
        // FIX: Match lowercase "onharvest"
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
            // Logic to stay in Harvest state until animation is done
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
export type StateName = string;

export interface TransitionEvent<TContext>
{
    from : StateName | null;
    to : StateName;
    context : TContext;
}

export interface TransitionMetadata
{
    timestamp : number;
    from : StateName | null;
    to : StateName;
    type : 'push' | 'pop' | 'change';
}

export interface State<TContext = void>
{
    name : StateName;

    preEnterDelayMs : number;
    postEnterDelayMs : number;

    preExitDelayMs : number;
    postExitDelayMs : number;

    OnEnter?(context : TContext) : void | Promise<void>;
    OnExit?(context : TContext) : void | Promise<void>;
    OnUpdate?(context : TContext, deltaTime : number) : void;
    CanEnter?(context : TContext) : boolean | Promise<boolean>;
    CanExit?(context : TContext) : boolean | Promise<boolean>;
    meta? : Record<string, any>;
}


export class StateManager<TContext = void>
{

    private m_states = new Map<StateName, State<TContext>>();

    private m_stack : State<TContext>[] = [];

    private m_context : TContext;

    private m_transitionHistory : TransitionMetadata[] = [];

    private m_transitionQueue : (() => Promise<void>)[] = [];

    private m_undoStack : StateName[] = [];

    private m_redoStack : StateName[] = [];

    private m_processing : boolean = false;

    constructor(context : TContext, private m_onTransition? : (event : TransitionEvent<TContext>) => void)
    {
        this.m_context = context;
    }

    public RegisterState(state : State<TContext>) : void
    {
        this.m_states.set(state.name, state);
    }

    public async ChangeState(stateName : StateName)
    {   
        if(stateName === this.GetCurrentStateName()) return;

        return this.EnqueueTransition(async ()=> 
        {
            const newState = this.GetState(stateName);
            const oldState = this.GetCurrentState();

            if(oldState && !(await this.CanExit(oldState))) return;
            if(!(await this.CanEnter(newState))) return;

            if(oldState?.preExitDelayMs > 0) await this.Delay(oldState?.preExitDelayMs);

            if(oldState?.OnExit) await oldState.OnExit(this.m_context);

            if(oldState?.postExitDelayMs > 0) await this.Delay(oldState?.postExitDelayMs);

            this.m_stack.pop();

            this.m_stack.push(newState);

            if(newState.preEnterDelayMs > 0) await this.Delay(newState.preEnterDelayMs);

            if(newState.OnEnter) await newState.OnEnter(this.m_context);

            if(newState.postEnterDelayMs > 0) await this.Delay(newState.postEnterDelayMs);

            this.TrackHistory('change', oldState?.name || null, newState.name);

            this.m_undoStack.push(oldState?.name || "");
            this.m_redoStack = [];

            this.FireTransition(oldState?.name || null, newState.name);
        });
    }

    public async PushState(stateName : StateName)
    {
        return this.EnqueueTransition(async () =>
        {
            const newState = this.GetState(stateName);

            const currentState = this.GetCurrentState();

            if(currentState && !(await this.CanExit(currentState))) return;

            if(!(await this.CanEnter(newState))) return;

            if(currentState?.preExitDelayMs > 0) await this.Delay(currentState?.preExitDelayMs);

            if(currentState?.OnExit) await currentState.OnExit(this.m_context);

            if(currentState?.postExitDelayMs > 0) await this.Delay(currentState?.postExitDelayMs);

            this.m_stack.push(newState);

            if(newState.preEnterDelayMs > 0) await this.Delay(newState.preEnterDelayMs);

            if(newState.OnEnter) await newState.OnEnter(this.m_context);

            if(newState.postEnterDelayMs > 0) await this.Delay(newState.postEnterDelayMs);

            this.TrackHistory('push', currentState?.name || null, newState.name);

            this.m_undoStack.push(currentState?.name || "");

            this.m_redoStack = [];

            this.FireTransition(currentState?.name || null, newState.name);

        });
    }

    public async PopState()
    {
        return this.EnqueueTransition(async () => 
            {
                if(this.m_stack.length < 0) return;

                const oldState = this.m_stack.pop();

                const newState = this.GetCurrentState();

                if(oldState && !(await this.CanExit(oldState)))
                {
                    this.m_stack.push(oldState);
                    return;
                }

                if(newState && !(await this.CanEnter(newState)))
                {
                    this.m_stack.push(oldState);
                    return;
                }

                if(oldState?.preExitDelayMs > 0) await this.Delay(oldState?.preExitDelayMs);

                if(oldState?.OnExit) await oldState.OnExit(this.m_context);

                if(oldState?.postExitDelayMs > 0) await this.Delay(oldState?.postExitDelayMs);

                if(newState?.preEnterDelayMs > 0) await this.Delay(newState?.preEnterDelayMs);

                if(newState?.OnEnter) await newState.OnEnter(this.m_context);

                if(newState?.postEnterDelayMs > 0) await this.Delay(newState?.postEnterDelayMs);

                this.TrackHistory('pop', oldState?.name || "", newState?.name || "");

                this.m_undoStack.push(oldState?.name || "");

                this.m_redoStack = [];

                this.FireTransition(oldState?.name || "", newState?.name || "");
            });
    }

    public async Undo()
    {
        if(this.m_undoStack.length === 0) return;

        const prev = this.m_undoStack.pop();

        if(prev)
        {
            this.m_redoStack.push(this.GetCurrentState()?.name || "");

            await this.ChangeState(prev);
        }
    }

    public async Redo()
    {
        if(this.m_redoStack.length === 0) return;

        const next = this.m_redoStack.pop();

        if(next)
        {
            this.m_undoStack.push(this.GetCurrentState()?.name || "");

            await this.ChangeState(next);
        }
    }
    
    public async ExitAll()
    {
        return this.EnqueueTransition(async () => 
        {
            while(this.m_stack.length > 0)
            {
                const oldState = this.m_stack.pop();

                if(!oldState) continue;

                if(!(await this.CanExit(oldState)))
                {
                    this.m_stack.push(oldState);
                    break;
                }

                if(oldState.preExitDelayMs > 0) 
                    await this.Delay(oldState.preExitDelayMs);

                if(oldState.OnExit) 
                    await oldState.OnExit(this.m_context);

                if(oldState.postExitDelayMs > 0) 
                    await this.Delay(oldState.postExitDelayMs);

                this.TrackHistory('pop', oldState.name, "");
                this.m_undoStack.push(oldState.name);
                this.m_redoStack = [];

                this.FireTransition(oldState.name, "");
            }
        });
    }


    public Update(deltaTime : number)
    {
        const currentState = this.GetCurrentState();

        currentState?.OnUpdate?.(this.m_context, deltaTime);
    }

    public GetState(stateName : StateName) : State<TContext>
    {
        const state = this.m_states.get(stateName);

        if(!state) throw new Error("State '${stateName}' not registered!");
        
        return state;
    }

    public GetCurrentState() : State<TContext> | undefined
    {
        return this.m_stack[this.m_stack.length - 1];
    }

    public GetCurrentStateName() : StateName | undefined
    {
        return this.GetCurrentState()?.name;
    }

    public GetStateHistory() : TransitionMetadata[]
    {
        return [...this.m_transitionHistory];
    }

    private FireTransition(from : StateName | null, to : StateName) : void
    {
        this.m_onTransition?.({from, to, context : this.m_context});
    }

    private async EnqueueTransition(transitionFn : () => Promise<void>)
    {
        this.m_transitionQueue.push(transitionFn);

        if(!this.m_processing)
        {
            this.m_processing = true;

            while(this.m_transitionQueue.length > 0)
            {
                const next = this.m_transitionQueue.shift();

                if(next) await next();
            }

            this.m_processing = false;
        }
    }

    private TrackHistory(type : 'push' | 'pop' | 'change', from : StateName | null, to : StateName)
    {
        this.m_transitionHistory.push({from, to, type, timestamp : Date.now()});
    }

    private async CanExit(state : State<TContext>) : Promise<boolean>
    {
        return (await state.CanExit?.(this.m_context)) ?? true;
    }

    private async CanEnter(state : State<TContext>) : Promise<boolean>
    {
        return (await state.CanEnter?.(this.m_context)) ?? true;
    }

    private Delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};
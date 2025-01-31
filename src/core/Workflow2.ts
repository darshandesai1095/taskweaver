import { Task } from '../types/TaskTypes';
import { EventEmitter } from 'events';
import { log, wait } from './utils';

export class Workflow {
    id: string;
    tasks: Record<string, Task>;
    results: Record<string, any>;
    status: 'Pending' | 'Running' | 'Completed' | 'Failed' | 'Cancelled';
    private eventEmitter: EventEmitter;
    private dependencyList: Record<string, string[]>;
    private completedTasks: Set<string>;
    private startedTasks: Set<string>;
    private onTaskStart?:  (task: Task) => void | Promise<void>;
    private onTaskComplete?: (task: Task) => void | Promise<void>;
    private onTaskError?: (error: Error, task: Task, results: Record<string, any>) => void | Promise<void>;
    private logs: Record<string, any>;
    private verbose: boolean;

    constructor(id: string, tasks: Task[], options?: { 
        onTaskStart?: (task: Task) => void | Promise<void>;
        onTaskComplete?: (task: Task) => void | Promise<void>;
        onTaskError?: (error: Error, task: Task, results: Record<string, any>) => void | Promise<void>;
        storeLogs?: boolean;
        verbose?: boolean;
     }) {
        this.id = id;
        this.tasks = tasks.reduce((acc, task) => {
            acc[task.name] = task;
            return acc;
        }, {} as Record<string, Task>);
        this.results = {};
        this.status = 'Pending';
        this.dependencyList = this.createDependencyList(tasks);
        this.startedTasks = new Set();
        this.completedTasks = new Set();
        this.eventEmitter = new EventEmitter();
        this.onTaskStart = options?.onTaskStart;
        this.onTaskComplete = options?.onTaskComplete;
        this.onTaskError = options?.onTaskError;
        this.verbose = options?.verbose ?? false;
        this.logs = {};
    }

    private createDependencyList(tasks: Task[]): Record<string, string[]> {
        const adjacencyList: Record<string, Set<string>> = {};
    
        tasks.forEach(task => {
            // Ensure each task is initialized in the adjacency list
            if (!adjacencyList[task.name]) {
                adjacencyList[task.name] = new Set();
            }
    
            // Handle next tasks
            if (task.next) {
                const nextTasks = Array.isArray(task.next) ? task.next : [task.next];
                nextTasks.forEach(nextTask => {
                    if (!adjacencyList[nextTask]) {
                        adjacencyList[nextTask] = new Set();
                    }
                    adjacencyList[nextTask].add(task.name); // Task is a dependency of nextTask
                });
            }

            if (task.default) {
                const defaultTasks = Array.isArray(task.default) ? task.default : [task.default];
                defaultTasks.forEach(defaultTask => {
                    if (!adjacencyList[defaultTask]) {
                        adjacencyList[defaultTask] = new Set();
                    }
                    adjacencyList[defaultTask].add(task.name); // Task is a dependency of nextTask
                });
            }
    
            // Handle branches
            if (task.branches) {
                task.branches.forEach(branch => {
                    branch.next.forEach(nextTask => {
                        if (!adjacencyList[nextTask]) {
                            adjacencyList[nextTask] = new Set();
                        }
                        adjacencyList[nextTask].add(task.name); // Task is a dependency of nextTask from branch
                    });
                });
            }

            if (task.default) {
                task.default.forEach(nextTask => {
                    if (!adjacencyList[nextTask]) {
                        adjacencyList[nextTask] = new Set();
                    }
                    adjacencyList[nextTask].add(task.name); // Task is a dependency of nextTask from branch
                });
            }
        });
    
        // Convert sets back to arrays to match the expected return type
        const result: Record<string, string[]> = {};
    
        for (const task in adjacencyList) {
            result[task] = Array.from(adjacencyList[task]);
        }
    
        return result;
    }

    public async start(): Promise<void> {
        try {
            log(this.verbose, `Resolving dependencies: ${this.id}`);
    
            this.createDependencyList(Object.values(this.tasks));
    
            this.logs.workflow = this.logs.workflow || [];
            this.logs.workflow.push({
                timestamp: new Date().toISOString(),
                event: 'StartedWorkflow',
                status: 'Started',
                details: 'The workflow has started.',
                worflowName: this.id,
            });
    
            const taskCompletionPromises: Promise<void>[] = [];


            Object.keys(this.dependencyList).forEach((taskName) => {
                // Ensure that the task is attempted to start
                taskCompletionPromises.push(
                    new Promise<void>((resolve) => {
                        this.initializeEmitterListner(taskName);
                        resolve();
                    })
                );
            });
    
            await Promise.all(taskCompletionPromises);

            Object.keys(this.dependencyList).forEach((taskName) => {
                if (this.dependencyList[taskName].length == 0) {
                    this.attemptToStartTask(taskName)
                }
            })
    
        } catch (error: any) {
            log(this.verbose, `Error starting workflow: ${error.message}`);
            throw error;
        }
    }

    private initializeEmitterListner(taskName: string): void {
        this.eventEmitter.on(`start-task:${taskName}`, () => this.attemptToStartTask(taskName));
    }

    private async attemptToStartTask(taskName: string): Promise<void> {
        console.log(taskName)
        if (this.startedTasks.has(taskName) || this.completedTasks.has(taskName)) return;

        const allDependenciesCompleted = this.dependencyList[taskName].every(task => this.completedTasks.has(task))

        allDependenciesCompleted && await this.executeTask(taskName);
    }

    private async executeTask(taskName: string): Promise<void> {

        const task = this.tasks[taskName];
    
        if (task.runIf && !task.runIf(this.results)) return;
    
        this.startedTasks.add(taskName);
        
        if (!this.logs.tasks) {
            this.logs.tasks = {};
        }
        if (!this.logs.tasks[taskName]) this.logs.tasks[taskName] = [];

    
        let attempts = 0;
        const maxAttempts = task.retry?.maxAttempts ?? 1;
        const delay = task.retry?.delay ?? 0;
        let success = false;
    
        while (attempts < maxAttempts && !success) {
            attempts++;
    
            try {
                log(this.verbose, `Starting task: ${taskName}, attempt: ${attempts}`);
    
                // Log task start
                this.logs.tasks[taskName].push({
                    timestamp: new Date().toISOString(),
                    event: 'TaskStarted',
                    attempt: attempts,
                    status: 'Started',
                    details: `Task ${taskName} execution started`,
                });
    
                this.onTaskStart && await this.onTaskStart(task);
                task.onStart && await task.onStart(task);
    
                const result = await this.withTimeout(task.action(), task.timeout ?? Infinity);
                this.completedTasks.add(taskName);
    
                log(this.verbose, `Task completed: ${taskName}`);
    
                this.results[taskName] = result;
    
                // Log task completion
                this.logs.tasks[taskName].push({
                    timestamp: new Date().toISOString(),
                    event: 'TaskCompleted',
                    attempt: attempts,
                    status: 'Completed',
                    details: `Task ${taskName} completed successfully`,
                });
    
                this.onTaskComplete && await this.onTaskComplete(task);
                task.onComplete && await task.onComplete(result);
    
                success = true;

                this.triggerNextTasks(taskName)


            } catch (error: any) {
                log(this.verbose, `Task "${taskName}", attempt ${attempts} failed: ${error.message}`);
    
                this.logs.tasks[taskName].push({
                    timestamp: new Date().toISOString(),
                    event: 'TaskFailed',
                    attempt: attempts,
                    status: 'Failed',
                    error: error.message,
                    details: `Task ${taskName} failed`
                });
    
                this.onTaskError && await this.onTaskError(error, task, this.results[taskName]);
                task.onError && await task.onError(error, task, this.results[taskName]);
    
                if (attempts < maxAttempts) {
                    await wait(delay);
                }
            }
        }
    }

    private triggerNextTasks(completedTaskName: string): void {

        // check completed task next
        this.tasks[completedTaskName].next?.forEach(taskName => this.eventEmitter.emit(`start-task:${taskName}`))

        // check compelted task branches
        let allBranchesFalse = true
        this.tasks[completedTaskName].branches?.forEach(branch => {
            if (branch.condition(this.results)) {
                allBranchesFalse = false
                branch.next.forEach(taskName => this.eventEmitter.emit(`start-task:${taskName}`))
            }
        })

        // if all braches fasle check completed task default
        if (allBranchesFalse) {
            this.tasks[completedTaskName].default?.forEach(taskName => this.eventEmitter.emit(`start-task:${taskName}`))
        }


    }

    private async withTimeout(promise: Promise<any>, timeout: number): Promise<any> {
        if (timeout === Infinity) {
            return promise; // No timeout applied
        }

        return Promise.race([
            promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Task timed out')), timeout)),
        ]);
    }

    public getLog(): Record<string, any> {
        return this.logs;
    }

    public getDependenciesList(): Record<string, any> {
        return this.dependencyList;
    }

}

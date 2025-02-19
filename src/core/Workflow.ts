import { Task } from '../types/TaskTypes';
import { EventEmitter } from 'events';
import { log, wait } from './utils';

export class Workflow {
    id: string;
    tasks: Record<string, Task>;
    results: Record<string, any>;
    status: 'Pending' | 'Running' | 'Completed' | 'Failed' | 'Cancelled';
    newTasksQueue: Task[];
    private eventEmitter: EventEmitter;
    private dependencyList: Record<string, string[]>;
    private completedTasks: Set<string>;
    private startedTasks: Set<string>;
    private onTaskStart?:  (task: Task) => void | Promise<void>;
    private onTaskComplete?: (task: Task) => void | Promise<void>;
    private onTaskError?: (error: Error, task: Task, results: Record<string, any>) => void | Promise<void>;
    logs: Record<string, any>;
    verbose: boolean;

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
        this.newTasksQueue = [];
        this.eventEmitter = new EventEmitter();
        this.onTaskStart = options?.onTaskStart;
        this.onTaskComplete = options?.onTaskComplete;
        this.onTaskError = options?.onTaskError;
        this.logs = {};
        this.verbose = options?.verbose ?? false;
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
    
            // Create dependency list
            this.createDependencyList(Object.values(this.tasks));
    
            // Initialize logs
            this.logs.workflow = this.logs.workflow || [];
            this.logs.workflow.push({
                timestamp: new Date().toISOString(),
                event: 'StartedWorkflow',
                status: 'Started',
                details: 'The workflow has started.',
                worflowName: this.id,
            });
    
            // Array to track all task completion promises
            const taskCompletionPromises: Promise<void>[] = [];
    
            // Loop through tasks and attempt to start them
            Object.keys(this.dependencyList).forEach((taskName) => {
                // Ensure that the task is attempted to start
                taskCompletionPromises.push(
                    new Promise<void>((resolve) => {
                        this.attemptToStartTask(taskName);
                        // We resolve once task is started, not necessarily completed yet
                        resolve();
                    })
                );
            });
    
            // Wait for all tasks to be processed (attempted to start)
            await Promise.all(taskCompletionPromises);
    
            // Optionally, wait for all tasks to actually complete if necessary
            // This depends on whether you have a mechanism to track actual completion
    
            // When all tasks are done, we can resolve the start promise
            log(this.verbose, 'All tasks have been attempted to start, now waiting for completion.');
        } catch (error: any) {
            log(this.verbose, `Error starting workflow: ${error.message}`);
            throw error; // This will reject the Promise if any errors occur
        }
    }
    
    
    private attemptToStartTask(taskName: string): void {
        if (this.completedTasks.has(taskName) || this.startedTasks.has(taskName)) return;

        const dependencies = this.dependencyList[taskName] || [];
        if (dependencies.some(dep => !this.completedTasks.has(dep))) {
            // Wait for dependencies
            dependencies.forEach(dep => {
                this.eventEmitter.on(`task-completed:${dep}`, () => this.attemptToStartTask(taskName));
            });
            return;
        }
            
        for (const dep of dependencies) {
            if (this.tasks[dep].branches) {
                for (const branch of this.tasks[dep].branches) {
                    if (branch.next.includes(taskName)) {
                        const condition = branch.condition(this.results);
                        if (!condition) {
                            return
                        }
                    }
                }
            }
        }

        // const taskDependencies = this.dependencyList[taskName] || [];
        // for (const task of taskDependencies) {
        //     if (this.tasks[task].branches) {
        //         for (const branch of this.tasks[task].branches) {
        //             const condition = branch.condition(this.results);
        //             if (condition) {
        //                 return
        //             }
        //         }
        //     }
        // }

        // All dependencies are complete; execute the task
        this.executeTask(taskName);
    }

    private async executeTask(taskName: string): Promise<void> {
        if (this.startedTasks.has(taskName)) return;
    
        const task = this.tasks[taskName];
        if (!task) throw new Error(`Task "${taskName}" not found`);
    
        if (task.runIf && !task.runIf(this.results)) return;
    
        this.startedTasks.add(taskName);
        
        // Initialize logging for this task if not already done
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
                this.eventEmitter.emit(`task-completed:${taskName}`);

                this.checkIfAllTasksCompleted();

            } catch (error: any) {
                log(this.verbose, `Task "${taskName}", attempt ${attempts} failed: ${error.message}`);
    
                // Log task failure
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
    
    private async withTimeout(promise: Promise<any>, timeout: number): Promise<any> {
        if (timeout === Infinity) {
            return promise; // No timeout applied
        }

        return Promise.race([
            promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Task timed out')), timeout)),
        ]);
    }

    public visualize(): void {
    const lines: string[] = [];
    const visited = new Set<string>();

    const drawTask = (taskName: string, prefix: string = '') => {
        if (visited.has(taskName)) return; // Avoid infinite loops
        visited.add(taskName);

        // Add the current task to the visualization
        lines.push(`${prefix}└── ${taskName}`);

        const task = this.tasks[taskName];

        // Process branches
        if (task.branches) {
            task.branches.forEach((branch, index) => {
                lines.push(`${prefix}    (Branch ${index + 1})`);
                branch.next.forEach((nextTask) =>
                    drawTask(nextTask, prefix + '        ')
                );
            });
        }

        // Process fallback (default tasks)
        if (task.default) {
            lines.push(`${prefix}    (Default)`);
            task.default.forEach((defaultTask) =>
                drawTask(defaultTask, prefix + '        ')
            );
        }

        // Process "next" tasks
        if (task.next) {
            const nextTasks = Array.isArray(task.next) ? task.next : [task.next];
            nextTasks.forEach((nextTask) =>
                drawTask(nextTask, prefix + '    ')
            );
        }
    };

    // Find root tasks (those with no dependencies)
    const rootTasks = Object.keys(this.tasks).filter(
        (taskName) =>
            !Object.values(this.dependencyList).some((deps) =>
                deps.includes(taskName)
            )
    );

    // Start visualizing from root tasks
    rootTasks.forEach((rootTask) => {
        lines.push(rootTask);
        drawTask(rootTask, '    ');
    });

    // Print the resulting ASCII diagram
    console.log(lines.join('\n'));
    }
   
    public addTask(task: Task): void {
        if (this.tasks[task.name]) {
            console.warn(`Task "${task.name}" already exists`);
            log(this.verbose, `❌ Failed to add task: "${task.name}" already exists`);
    
            this.logs.tasks[task.name] = this.logs.tasks[task.name] || [];
            this.logs.tasks[task.name].push({
                timestamp: new Date().toISOString(),
                event: 'TaskAlreadyExists',
                status: 'Skipped',
                details: `Task "${task.name}" was not added because it already exists.`,
            });
    
            return;
        }
    
        this.tasks[task.name] = task;
        log(this.verbose, `✅ Task added: "${task.name}"`);
    
        this.logs.tasks[task.name] = this.logs.tasks[task.name] || [];
        this.logs.tasks[task.name].push({
            timestamp: new Date().toISOString(),
            event: 'TaskAdded',
            status: 'Pending',
            details: `Task "${task.name}" was successfully added.`,
        });
    
        if (task.dependencies?.length) {
            task.dependencies.forEach(dep => {
                if (!this.tasks[dep]) {
                    throw new Error(`Dependency "${dep}" for task "${task.name}" does not exist.`);
                }
            });
    
            this.dependencyList[task.name] = task.dependencies;
            log(this.verbose, `🔗 Task "${task.name}" depends on: [${task.dependencies.join(', ')}]`);
    
            this.logs.tasks[task.name].push({
                timestamp: new Date().toISOString(),
                event: 'DependenciesRegistered',
                status: 'Waiting',
                details: `Task "${task.name}" depends on: [${task.dependencies.join(', ')}]`,
            });
    
            // Subscribe to dependencies' completion events
            task.dependencies.forEach(dep => {
                this.eventEmitter.once(`task-completed:${dep}`, () => {
                    log(this.verbose, `🎯 Dependency "${dep}" resolved for task "${task.name}"`);
    
                    this.attemptToStartTask(task.name);
                });
            });
    
            return; // Wait for dependencies to complete before starting
        }
    
        // If no dependencies, attempt to start the task immediately
        log(this.verbose, `🚀 Task "${task.name}" has no dependencies and will start immediately`);
        this.attemptToStartTask(task.name);
    }
    
    private checkIfAllTasksCompleted(): void {
        // Check if the number of completed tasks matches the total tasks
        const allTasksCompleted = Object.keys(this.tasks).length === this.completedTasks.size;
    
        if (allTasksCompleted) {
            const timestamp = new Date().toISOString();
            
            log(this.verbose, `🎉 All tasks completed at ${timestamp}`);

            this.logs.workflow = this.logs.workflow || [];
            this.logs.workflow.push({
                timestamp: timestamp,
                event: 'WorkflowCompleted',
                status: 'Completed',
                details: 'The workflow has completed all tasks.',
            });
        }
    }
    
    public getLog(): Record<string, any> {
        return this.logs;
    }

    public getDependenciesList(): Record<string, any> {
        return this.dependencyList;
    }
}

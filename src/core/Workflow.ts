import { Task } from '../types/TaskTypes';
import { EventEmitter } from 'events';
import { wait } from './utils';


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


    constructor(id: string, tasks: Task[], options?: { 
        onTaskStart?: (task: Task) => void | Promise<void>;
        onTaskComplete?: (task: Task) => void | Promise<void>;
        onTaskError?: (error: Error, task: Task, results: Record<string, any>) => void | Promise<void>;

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
        });
    
        // Convert sets back to arrays to match the expected return type
        const result: Record<string, string[]> = {};
    
        for (const task in adjacencyList) {
            result[task] = Array.from(adjacencyList[task]);
        }
    
        return result;
    }
    
    public start(): void {
        // Start all tasks at once; those with dependencies will "wait" on their events
        Object.keys(this.tasks).forEach(taskName => this.attemptToStartTask(taskName));
    }

    private attemptToStartTask(taskName: string): void {
        if (this.completedTasks.has(taskName) || this.startedTasks.has(taskName)) return;

        const dependencies = this.dependencyList[taskName] || [];
        if (dependencies.some(dep => !this.completedTasks.has(dep))) {
            // Wait for dependencies
            dependencies.forEach(dep => {
                this.eventEmitter.once(`task-completed:${dep}`, () => this.attemptToStartTask(taskName));
            });
            return;
        }

        // All dependencies are complete; execute the task
        this.executeTask(taskName);
    }

    private async executeTask(taskName: string): Promise<void> {
        if (this.startedTasks.has(taskName)) return;

        const task = this.tasks[taskName];
        if (!task) throw new Error(`Task "${taskName}" not found`);

        if (task.runIf && !task.runIf(this.results)) {
            this.eventEmitter.emit(`task-completed:${taskName}`);
            return;
        }

        this.onTaskStart && await this.onTaskStart(task);
        task.onStart && await task.onStart(task);


        console.log(`Executing task: ${taskName}`);
        this.startedTasks.add(taskName);

        let attempts = 0
        const maxAttempts = task.retry?.maxAttempts ? task.retry?.maxAttempts : 1;
        let success = false;
        const delay = task.retry?.delay ? task.retry?.delay : 0;
        while (attempts < maxAttempts && !success) {
            try {
                const result = await this.withTimeout(task.action(), task.timeout || Infinity);
                this.completedTasks.add(taskName);

                // Save result and emit completion event
                console.log(`Task "${taskName}" completed.`);
                this.results[taskName] = result;

                this.onTaskComplete && await this.onTaskComplete(task);
                task.onComplete && await task.onComplete(result);

                success = true;

                this.eventEmitter.emit(`task-completed:${taskName}`);
            } catch (error: any) {
                this.onTaskError && await this.onTaskError(error, task, this.results[taskName]);
                task.onError && await task.onError(error, task, this.results[taskName]);
                console.error(`Task "${taskName}, attempt ${attempts+1}" failed:`, error);
                attempts++;
                await wait(delay);
            }
        }
    }

    private withTimeout(promise: Promise<any>, timeout: number): Promise<any> {
        return Promise.race([
            promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Task timed out')), timeout)),
        ]);
    }

    public describe(): void {
    let output = '';

    // Loop through each task and print its next tasks and dependencies
    Object.keys(this.tasks).forEach(taskName => {
        const task = this.tasks[taskName];
        output += `Task: ${taskName}\n`;

        // Show next tasks (successors)
        if (task.next) {
            if (Array.isArray(task.next)) {
                task.next.forEach(nextTask => {
                    output += `  --> Next: ${nextTask}\n`;
                });
            } else {
                output += `  --> Next: ${task.next}\n`;
            }
        }

        // Show branches if present
        if (task.branches) {
            task.branches.forEach((branch, index) => {
                output += `  Branch ${index + 1}:\n`;
                branch.next.forEach(nextTask => {
                    output += `    --> Next: ${nextTask}\n`;
                });
            });
        }

        // Show dependencies (previous tasks)
        const dependencies = this.dependencyList[taskName] || [];
        if (dependencies.length > 0) {
            output += `  <-- Dependencies: ${dependencies.join(', ')}\n`;
        }

        output += '\n'; // Separate each task for readability
    });

    // Print the workflow flowchart as a text output
    console.log(output);
    }

    // New: ASCII-Based Graph Visualization
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
   
    // New: Dynamic Task Insertion
    public addTask(task: Task): void {
        if (this.tasks[task.name]) {
            console.warn(`Task "${task.name}" already exists.`);
            return;
        }

        this.tasks[task.name] = task;

        if (task.dependencies?.length) {
            task.dependencies.forEach(dep => {
                if (!this.tasks[dep]) {
                    throw new Error(`Dependency "${dep}" for task "${task.name}" does not exist.`);
                }
            });
        }

        // Update dependency list
        this.dependencyList = this.createDependencyList(Object.values(this.tasks));

        // If dependencies are satisfied, attempt to start the new task
        this.attemptToStartTask(task.name);
    }

}

# TaskWeaver

TaskWeaver is a simple workflow management system for orchestrating workflows using Directed Acyclic Graphs (DAGs). It allows you to define tasks with dependencies and execute them in the correct order, with support for retries, parallelism, and error handling.

## Features

- **DAG-based Workflow Orchestration**: Define workflows with tasks and their dependencies.
- **Retries**: Automatically retry failed tasks with configurable limits.
- **Task Dependencies**: Tasks can depend on other tasks, which must be completed before the dependent task starts.
- **Parallelism**: Execute independent tasks concurrently for maximum efficiency.
- **Timeouts**: Tasks have configurable timeouts for their execution.
- **Event Handling**: Custom callbacks for task start, completion, and error handling.
- **Dynamic Task Insertion**: Tasks can be added dynamically after the workflow has started, and their dependencies are managed.
- **Error Handling**: Built-in error handling and detailed logs.
- **Small and Lightweight**: Minimal footprint, ideal for Node.js applications.

## Installation

Install TaskWeaver via npm:

```bash
npm install taskweaver
```
## Getting Started

#### Basic Example:

This example simulates a basic sequential workflow where tasks execution is dependent on completion of the previous tasks. By default, the process will start from the task(s) which have no dependencies, in this case taskA.

```bash

import { Workflow, Task } from 'taskweaver';

const tasks: Task[] = [
    {
        name: 'taskA',
        action: async () => {
            console.log('Executing Task A');
            return { result: 'A' };
        },
        next: 'taskB', // Task A will trigger Task B
        retry: { maxAttempts: 3, delay: 1000 }, // Retry logic
        timeout: 5000, // Timeout in ms
    },
    {
        name: 'taskB',
        action: async () => {
            console.log('Executing Task B');
            return { result: 'B' };
        },
        next: 'taskC',
        retry: { maxAttempts: 2, delay: 500 },
        timeout: 3000,
    },
    {
        name: 'taskC',
        action: async () => {
            console.log('Executing Task C');
            return { result: 'C' };
        },
    },
];

const workflow = new Workflow(tasks);

workflow.start().then(() => {
  console.log('All tasks completed!');
}).catch(error => {
  console.error('Workflow failed:', error);
});
```

#### Advanced Example:

This example simulates a process where tasks execute based on conditions and dependencies. If the conditions are met, parallel tasks execute, and there are additional branches that handle user validation, data processing, and finalization.


```bash
import { Workflow, Task } from 'taskweaver';

const tasks: Task[] = [
    // Start task: Initializes the workflow and determines the initial condition
    {
        name: 'start',
        action: async () => {
            console.log('Start task executed');
            return { type: 'A' };  // Return some result to dictate the flow
        },
        branches: [
            {
                condition: (result) => result.type === 'A',
                next: ['taskA', 'taskB'], // Parallel execution of TaskA and TaskB
            },
            {
                condition: (result) => result.type === 'B',
                next: ['taskB'], // Only TaskB will be executed if type is 'B'
            },
        ],
        default: ['taskC'],  // Default next task if no conditions match
        timeout: 3000,  // Timeout in ms
        retry: { maxAttempts: 3, delay: 1000 },  // Retry strategy
        onComplete: async (result) => {
            console.log('Start task completed. Result:', result);
        },
    },

    // Task A: Executes after 'start' based on the condition type 'A'
    {
        name: 'taskA',
        action: async () => {
            console.log('Task A executed');
            return { value: 42 };  // Return some data after completion
        },
        next: 'taskC',  // TaskC will execute after TaskA
        timeout: 5000,
        retry: { maxAttempts: 2, delay: 500 },
        onComplete: async (result) => {
            console.log('Task A completed. Result:', result);
        },
    },

    // Task B: Executes either after 'start' or in parallel with TaskA
    {
        name: 'taskB',
        action: async () => {
            console.log('Task B executed');
            return { value: 100 };  // Return data
        },
        next: 'taskC',  // TaskC will execute after TaskB completes
        timeout: 3000,
        retry: { maxAttempts: 2, delay: 2000 },
        onComplete: async (result) => {
            console.log('Task B completed. Result:', result);
        },
    },

    // Task C: Depends on the completion of TaskA and TaskB
    {
        name: 'taskC',
        action: async () => {
            console.log('Task C executed (depends on Task A and Task B)');
            return { success: true };  // Indicate successful completion
        },
        dependencies: ['taskA', 'taskB'],  // Task C will not start until TaskA and TaskB are complete
        timeout: 4000,
        retry: { maxAttempts: 2, delay: 500 },
        onComplete: async (result) => {
            console.log('Task C completed. Result:', result);
        },
    },

    // User Validation Task: Checks if user is valid before proceeding
    {
        name: 'validateUser',
        action: async () => {
            console.log('Validating user...');
            // Simulate user validation
            const isValid = Math.random() > 0.5;  // Randomly simulate user validation
            return { isValid };
        },
        branches: [
            {
                condition: (result) => result.isValid === true,
                next: ['processData'],  // Continue with data processing if valid
            },
            {
                condition: (result) => result.isValid === false,
                next: ['abort'],  // Abort if the user is not valid
            },
        ],
        timeout: 2000,
        retry: { maxAttempts: 2, delay: 1000 },
        onComplete: async (result) => {
            console.log('User validation completed. Result:', result);
        },
    },

    // Data Processing Task: Processes the data if the user is valid
    {
        name: 'processData',
        action: async () => {
            console.log('Processing data...');
            return { processed: true };
        },
        next: 'finalize',  // After processing, move to the final step
        timeout: 4000,
        retry: { maxAttempts: 3, delay: 1000 },
        onComplete: async (result) => {
            console.log('Data processing completed. Result:', result);
        },
    },

    // Abort Task: If the user is not valid, abort the workflow
    {
        name: 'abort',
        action: async () => {
            console.log('Aborting workflow due to invalid user.');
            return { aborted: true };
        },
        next: 'finalize',  // Proceed to finalization after abortion
        timeout: 2000,
        onComplete: async (result) => {
            console.log('Workflow aborted. Result:', result);
        },
    },

    // Finalize Task: Finalize the workflow regardless of success or failure
    {
        name: 'finalize',
        action: async () => {
            console.log('Finalizing the workflow...');
            return { completed: true };
        },
        timeout: 1000,
        onComplete: async (result) => {
            console.log('Workflow finalized. Result:', result);
        },
    },
];

const workflow = new Workflow('complexWorkflow', tasks, {
    onTaskStart: (task) => console.log(`Task ${task.name} started`),
    onTaskComplete: (task) => console.log(`Task ${task.name} completed`),
    onTaskError: (error, task) => console.error(`Task ${task.name} failed:`, error),
});

// Describe the workflow (optional: visualize or print task relationships)
workflow.describe();  // Outputs the flowchart of tasks and dependencies

// Start the workflow
workflow.start();

```

### Configuration Options

#### Task Configuration
When creating a workflow, you can customize the behavior of individual tasks by specifying the following properties:



| Property       | Type                                                      | Description                                                                                   |
|----------------|-----------------------------------------------------------|-----------------------------------------------------------------------------------------------|
| `name`         | `string`                                                  | The name of the task.                                                                          |
| `action`       | `(input?: any) => Promise<any>`                           | The function that will be executed for this task. It returns a promise with the result.         |
| `dependencies` | `string[]`                                                | An optional list of task names that need to complete before this task can run.                 |
| `branches`     | `Array<{ condition: (result: any) => boolean; next: string[] }>` | Conditional branching based on the result. Specifies which tasks to run based on conditions.   |
| `default`      | `string[]`                                                | Optional default tasks to run if no branch conditions are met.                                 |
| `next`         | `string | string[]`                                        | Defines the next task(s) to run after this task completes.                                    |
| `input`        | `(results: Record<string, any>) => any`                   | A function that provides input to the task based on previous results.                          |
| `timeout`      | `number`                                                  | An optional timeout (in milliseconds) for how long the task should be allowed to run.          |
| `retry`        | `{ maxAttempts: number; delay: number }`                  | Retry logic specifying max attempts and delay (in milliseconds) between retries.               |
| `onStart`      | `(task: Task) => void | Promise<void>`                    | Optional callback that gets invoked when the task starts.                                      |
| `onComplete`   | `(result: Record<string, any>) => Task | Task[] | null | Promise<Task | Task[] | null | any>` | Callback function for task completion. Can return the next task(s) or `null` to finish.       |
| `onError`      | `(error: Error, task: Task, results: Record<string, any>) => void | Promise<Task | Task[] | null | any>` | Callback function for when an error occurs during task execution.                             |
| `metadata`     | `Record<string, any>`                                     | Optional metadata related to the task (e.g., for logging or tracking).                        |
| `progress`     | `number`                                                  | Optional property that can track the progress of the task as a percentage (0-100).             |
| `runIf`        | `(results: Record<string, any>) => boolean`               | A function that determines whether the task should run based on previous results.              |
| `logs`         | `string[]`                                                | Optional array to store logs related to the task.                                              |



#### Workflow Configuration



| Property           | Type                                                       | Description                                                                                                 |
|--------------------|------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------|
| `ref`              | `string`                                                   | The reference or identifier for the workflow.                                                                |
| `tasks`            | `Record<string, Task>`                                     | A record of tasks in the workflow, with task names as keys and `Task` objects as values.                     |
| `results`          | `Record<string, any>`                                      | A record of task results, where the task name is the key, and the result of the task is the value.           |
| `status`           | `'Pending' | 'Running' | 'Completed' | 'Failed' | 'Cancelled'` | The current status of the workflow (can be one of these values: `Pending`, `Running`, `Completed`, `Failed`, `Cancelled`). |
| `newTasksQueue`    | `Task[]`                                                   | A queue of tasks that are newly added to the workflow.                                                       |



### Dynamic Task Insertion
You can dynamically add new tasks to an ongoing workflow. When a task is added, it automatically updates the dependencies and determines if the new task can be executed immediately.

```bash
  const newTask: Task = {
      name: 'taskD',
      action: async () => { ... },
      dependencies: ['taskA', 'taskB'],
  };

  workflow.addTask(newTask);
```

This feature enables dynamic modification of a workflow during its execution. By calling the workflow.addTask(newTask: Task) method within a task’s action callback, you can introduce new tasks into the workflow and trigger subsequent tasks based on evolving conditions, offering flexibility to adapt the workflow in real-time as the process progresses.


### Summarizing the Workflow
The describe method generates an ASCII-based flowchart representing the task dependencies in your workflow.

```bash
workflow.visualize();
```

This will print a flowchart to the console that visually shows how tasks are related and executed.

Example Output:

```bash
startup
    ├── taskA
    │    └── taskC
    └── taskB
         └── taskC
```


## License

This library is licensed under the MIT License. See LICENSE for more information.


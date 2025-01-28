# TaskWeaver

TaskWeaver is a simple workflow management system for orchestrating workflows using Directed Acyclic Graphs (DAGs). It allows you to define tasks with dependencies and execute them in the correct order, with support for retries, parallelism, and error handling.

---

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

---

## Installation

Install TaskWeaver via npm:

```bash
npm install taskweaver
```

## Quickstart

```bash

import { Workflow } from 'taskweaver';

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

## Documentation

### Basic Example

Here's a basic example to get started with the Workflow class:

```bash
import { Workflow, Task } from 'taskweaver';

const tasks: Task[] = [
    {
        name: 'start',
        action: async () => {
            console.log('Start task executed');
            return { type: 'A' };  // Return some result
        },
        branches: [
            {
                condition: (result) => result.type === 'A',
                next: ['taskA', 'taskB'], // Parallel tasks
            },
            {
                condition: (result) => result.type === 'B',
                next: ['taskB'],
            }
        ],
        default: ['taskC'],
        timeout: 3000,
        retry: { maxAttempts: 3, delay: 1000 },
        onComplete: async (result) => {
            console.log('Start task completed. Result:', result);
        },
    },
    {
        name: 'taskA',
        action: async () => {
            console.log('Task A executed');
            return { value: 42 };
        },
        next: 'taskC',
        timeout: 5000,
        retry: { maxAttempts: 2, delay: 500 },
        onComplete: async (result) => {
            console.log('Task A completed. Result:', result);
        },
    },
    {
        name: 'taskB',
        action: async () => {
            console.log('Task B executed');
            return { value: 100 };
        },
        next: 'taskC',
        timeout: 3000,
        retry: { maxAttempts: 1, delay: 2000 },
        onComplete: async (result) => {
            console.log('Task B completed. Result:', result);
        },
    },
    {
        name: 'taskC',
        action: async () => {
            console.log('Task C executed (depends on Task A and Task B)');
            return { success: true };
        },
        dependencies: ['taskA', 'taskB'],
        timeout: 4000,
        retry: { maxAttempts: 2, delay: 500 },
        onComplete: async (result) => {
            console.log('Task C completed. Result:', result);
        },
    },
];

const workflow = new Workflow('exampleWorkflow', tasks, {
    onTaskStart: (task) => console.log(`Task ${task.name} started`),
    onTaskComplete: (task) => console.log(`Task ${task.name} completed`),
    onTaskError: (error, task) => console.error(`Task ${task.name} failed:`, error),
});

// Describe the workflow
complexWorkflow.describe();

// Start the workflow
workflow.start();

```
### Workflow Configuration Options
When creating a workflow, you can customize the behavior of individual tasks by specifying the following properties:

Task Properties:
name (required): A unique name for the task (e.g., 'taskA', 'taskB').
action (required): A function (async) that performs the task. It should return a result that will be saved in the workflow’s results.
next (optional): Specifies the next task(s) to execute after the current task completes. This can be a single task name or an array of task names.
branches (optional): An array of branches that defines conditional flows based on the result of the current task.
default (optional): Defines fallback tasks if no branches match.
timeout (optional): The timeout in milliseconds for the task to complete.
retry (optional): Configures retry behavior with maxAttempts and delay (in ms) between retries.
dependencies (optional): An array of task names that must complete before this task can start.
onStart, onComplete, onError (optional): Optional callbacks that execute when the task starts, completes, or fails.

Workflow Callbacks:
onTaskStart(task) (optional): Called when a task begins execution.
onTaskComplete(task) (optional): Called when a task completes successfully.
onTaskError(error, task) (optional): Called when a task fails.

Task Dependencies
Each task can specify its dependencies, which are other tasks that must be completed before it can start. For example, task "C" depends on tasks "A" and "B" completing:

```bash
{
    name: 'taskC',
    dependencies: ['taskA', 'taskB'],
    action: async () => { ... }
}
```

Tasks that depend on others will wait until all dependencies are completed. You can add additional control logic using the retry and timeout properties to manage retries and task timeouts.

### Branching Logic
You can configure tasks with branching logic, where the next tasks to execute are determined by the result of the current task. Here's how you define branching:

```bash
{
    name: 'start',
    action: async () => { ... },
    branches: [
        {
            condition: (result) => result.type === 'A',
            next: ['taskA', 'taskB'], // Execute taskA and taskB in parallel
        },
        {
            condition: (result) => result.type === 'B',
            next: ['taskB'], // Only execute taskB
        }
    ]
}
```

Branches allow your workflow to dynamically change the sequence of tasks based on the results of previous tasks.

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

This feature is useful for modifying workflows at runtime.

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

### Advanced Example

```bash
import { Workflow, Task } from 'taskweaver';

const advancedTasks: Task[] = [
    {
        name: 'init',
        action: async () => {
            console.log('Initializing the process...');
            return { success: true };
        },
        next: ['validateUser'],
        timeout: 2000,
        onComplete: async (result) => console.log('Initialization complete:', result),
    },
    {
        name: 'validateUser',
        action: async () => {
            console.log('Validating user...');
            return { isValid: true };
        },
        branches: [
            {
                condition: (result) => result.isValid === true,
                next: ['processData'],
            },
            {
                condition: (result) => result.isValid === false,
                next: ['abort'],
            },
        ],
    },
    {
        name: 'processData',
        action: async () => {
            console.log('Processing data...');
            return { processed: true };
        },
        next: ['finalize'],
    },
    {
        name: 'abort',
        action: async () => {
            console.log('Aborting workflow...');
            return { aborted: true };
        },
        next: ['finalize'],
    },
    {
        name: 'finalize',
        action: async () => {
            console.log('Finalizing the workflow...');
            return { completed: true };
        },
    },
];

const advancedWorkflow = new Workflow('advancedExample', advancedTasks, {
    onTaskStart: (task) => console.log(`Task ${task.name} started`),
    onTaskComplete: (task) => console.log(`Task ${task.name} completed`),
    onTaskError: (error, task) => console.error(`Task ${task.name} failed:`, error),
});

// Start the advanced workflow
advancedWorkflow.start();

```

In this example, we simulate a validation process where the workflow branches based on whether the user is valid or not. The flow can be dynamically altered depending on the result of previous tasks, with the entire flow being finalized at the end.

## License

This library is licensed under the MIT License. See LICENSE for more information.


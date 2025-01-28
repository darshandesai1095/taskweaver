# TaskWeaver

TaskWeaver is a simple workflow management system for orchestrating workflows using Directed Acyclic Graphs (DAGs). It allows you to define tasks with dependencies and execute them in the correct order, with support for retries, parallelism, and error handling.

## Features

- **DAG-based Workflow Orchestration**: Define workflows with tasks and their dependencies.
- **Task Dependencies**: Tasks can depend on other tasks, which must be completed before the dependent task starts.
- **Parallelism**: Execute independent tasks concurrently for maximum efficiency.
- **Event Handling**: Custom callbacks for task start, completion, and error handling.
- **Dynamic Task Insertion**: Tasks can be added dynamically after the workflow starts and their dependencies are managed.
- **Retries**: Automatically retry failed tasks with configurable limits.
- **Timeouts**: Tasks have configurable timeouts for their execution.
- **Error Handling**: Built-in error handling and detailed logs.


## Installation

Install TaskWeaver via npm:

```bash
npm install taskweaver
```
## Sequential Workflow

This example simulates a basic sequential workflow where task execution is dependent on the completion of the previous tasks. By default, the process will start from the task(s) which have no dependencies, in this case, taskA.

```javascript

import { Workflow, Task } from 'taskweaver';

const tasks: Task[] = [
    {
        name: 'taskA',
        action: async () => {
            console.log('Executing Task A');
            return { result: 'A' };
        },
        next: 'taskB',
        retry: { maxAttempts: 3, delay: 1000 },
        timeout: 5000,
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

workflow.start()
```

## Branched Workflow

This example simulates a process where tasks execute based on conditions and dependencies. If the conditions are met, parallel tasks execute, and there are additional branches that handle user validation, data processing, and finalization.


```javascript
import { Workflow, Task } from 'taskweaver';

const tasks: Task[] = [
    {
        name: 'start',
        action: async () => {
            console.log('Start task executed');
            return { type: 'A' };
        },
        branches: [
            {
                condition: (result) => result.type === 'A',
                next: ['taskA', 'taskB'],
            },
            {
                condition: (result) => result.type === 'B',
                next: ['taskC'],
            }
        ],
        timeout: 3000,
        retry: { maxAttempts: 3, delay: 1000 },
    },
    {
        name: 'taskA',
        action: async () => {
            console.log('Task A executed');
            return { value: 42 };
        },
        next: 'taskC',
        timeout: 5000,
    },
    {
        name: 'taskB',
        action: async () => {
            console.log('Task B executed');
            return { value: 100 };
        },
        next: 'taskC',
    },
    {
        name: 'taskC',
        action: async () => {
            console.log('Task C executed (depends on Task A and Task B)');
            return { success: true };
        },
        dependencies: ['taskA', 'taskB'],
    },
];

const workflow = new Workflow('complexWorkflow', tasks, {
    onTaskStart: (task) => console.log(`Task ${task.name} started`),
    onTaskComplete: (task) => console.log(`Task ${task.name} completed`),
    onTaskError: (error, task) => console.error(`Task ${task.name} failed:`, error),
});

// Start the workflow
workflow.start();

```

## Configuration Options

### Task
When creating a workflow, you can customize the behavior of individual tasks by specifying the following properties:



| Property       | Type                                                               | Description                                                                                             |
|----------------|--------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------|
| `name`         | `string`                                                           | The name of the task.                                                                                   |
| `action`       | `(input?: any) => Promise<any>`                                    | The function that will be executed for this task. It returns a promise with the result.                 |
| `dependencies` | `string[]`                                                         | An optional list of task names that must be completed before this task can run. By default, the workflow infers dependencies, but additional dependencies can be specified here if needed.  |
| `branches`     | `Array<{ condition: (result: any) => boolean; next: string[] }>`   | Conditional branching based on the result. Specifies which tasks to run based on conditions.  |
| `default`      | `string[]`                                                         | Optional default tasks to run if no branch conditions are met.                                          |
| `next`         | `string \| string[]`                                               | Defines the next task(s) to run after this task completes.                                              |
| `input`        | `(results: Record<string, any>) => any`                            | A function that provides input to the task based on previous results.                                   |
| `timeout`      | `number`                                                           | An optional timeout (in milliseconds) for how long the task should be allowed to run.                   |
| `retry`        | `{ maxAttempts: number; delay: number }`                           | Retry logic specifying max attempts and delay (in milliseconds) between retries.                        |
| `onStart`      | `(task: Task) => void \| Promise<void>`                            | Optional callback that gets invoked when the task starts.                                               |
| `onComplete`   | `(result: Record<string, any>) => any`                             | Callback function for task completion. Can return the next task(s) or `null` to finish.                 |
| `onError`      | `(error: Error, task: Task, results: Record<string, any>) => any`  | Callback function for when an error occurs during task execution.                                       |
| `metadata`     | `Record<string, any>`                                              | Optional metadata related to the task (e.g., for logging or tracking).                                  |
| `progress`     | `number`                                                           | Optional property that can track the progress of the task as a percentage (0-100).                      |
| `runIf`        | `(results: Record<string, any>) => boolean`                        | A function that determines whether the task should run based on previous results.                       |
| `logs`         | `string[]`                                                         | Optional array to store logs related to the task.                                                       |



### Workflow


| Property           | Type                                                             | Description                                                                                                         |
|--------------------|------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------|
| `id`               | `string`                                                         | The reference or identifier for the workflow.                                                                       |
| `tasks`            | `Record<string, Task>`                                           | A record of tasks in the workflow, with task names as keys and `Task` objects as values.                            |
| `options`          | `Object (optional)`                                  | An optional configuration object that allows setting lifecycle event callbacks such as onTaskStart, onTaskComplete, and onTaskError (see below).                                                        |
| `options.onTaskStart`      | `(task: Task) => void \| Promise<void>`                          | A callback function triggered when a task starts execution. Can be used for logging or monitoring task initiation.  |
| `options.onTaskComplete`   | `(task: Task) => void \| Promise<void>`                          | A callback function triggered when a task completes execution. Useful for logging, monitoring, or triggering events.  |
| `options.onTaskError`      | `(task: Task) => void \| Promise<void>`                          | A callback function triggered when a task encounters an error. Allows handling errors, retries, or cleanup actions. |
| `connectors`          | `Record<string, Connector>)`                                  | A connector for interacting with REST APIs.                                                        |
| `connectors.rest`      | `(RESTConnector`                          | A callback function triggered when a task starts execution. Can be used for logging or monitoring task initiation.  |
| `connectors.redis`   | `RedisConnector`                          | A connector for interacting with Redis for caching or data storage.  |
| `connectors.aws`      | `AWSConnector`                          | A connector for integrating with AWS services like DynamoDB, S3, etc. |
| `connectors.googleCloud`      | `GoogleCloudConnector`                          | A connector for integrating with Google Cloud services.  |
| `connectors.mongoDB`   | `MongoDBConnector`                          | A connector for interacting with MongoDB databases.  |
| `connectors.email`      | `EmailConnector`                          | A connector for sending emails via various email services like Gmail or custom SMTP.|



## Dynamic Task Insertion
You can dynamically add new tasks to an ongoing workflow. When a task is added, it automatically updates the dependencies and determines if the new task can be executed immediately. By calling the workflow.addTask(newTask: Task) method within a task’s action callback, you can introduce new tasks into the workflow and trigger subsequent tasks based on evolving conditions, offering flexibility to adapt the workflow in real-time as the process progresses.

```javascript
  const newTask: Task = {
      name: 'taskD',
      action: async () => { ... },
      dependencies: ['taskA', 'taskB'], // taskD will execute immediatly after taskA and taskB have completed
  };

  workflow.addTask(newTask);
```

or

```javascript
// Dynamically adding a new task and branching based on a runtime condition
workflow.tasks['start'].action = async () => {
    console.log('Start task executed');
    const result = { type: 'A' }; // Simulate some result
    
    // Dynamically add taskD if a certain condition is met
    if (result.type === 'A') {
        const newTask: Task = {
            name: 'taskD',
            action: async () => {
                console.log('Task D executed');
                return { value: 'New task D result' };
            },
            next: 'taskC', // Connect taskD to taskC
            timeout: 2000,
        };

        // Add new taskD to the workflow
        workflow.addTask(newTask);

        // Modify branching logic for 'start' to include taskD
        workflow.tasks['start'].branches[0].next.push('taskD');
    }
    
    return result;
};

```

## Describing the Workflow
The describe method provides a log of the task dependencies, execution order, and branching logic.

```javascript
workflow.describe();
```

## Visualizing the Workflow
The visualize method generates an ASCII-based flowchart representing the task dependencies in your workflow.

```javascript
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

## Connectors

In the context of this taskweaver, connectors are modules that allow your tasks to interact with external services, APIs, or databases. Connectors abstract the underlying complexity of different systems (e.g., databases, email servers, cloud services), allowing you to integrate these systems into your task workflows seamlessly.

### RESTConnector
The RESTConnector allows you to make HTTP requests to external REST APIs. It can be customized to add headers, handle timeouts, and perform retries.

```js
const restConnector = new RESTConnector({
  baseUrl: 'https://example.com/api',
  headers: {
    'Authorization': 'Bearer your-token',
  },
});

await restConnector.get('/endpoint');

```

### RedisConnector
The RedisConnector allows for interaction with a Redis instance for caching, message queuing, or data storage.

```js
const redisConnector = new RedisConnector({
  host: 'localhost',
  port: 6379,
});

await redisConnector.set('key', 'value');
const value = await redisConnector.get('key');

```

### AWSConnector
The AWSConnector provides integration with AWS services like DynamoDB and S3. It can be configured to work with various AWS services.

```js
const awsConnector = new AWSConnector({
  region: 'us-east-1',
  accessKeyId: 'your-access-key',
  secretAccessKey: 'your-secret-key',
});

const data = await awsConnector.getItemFromDynamoDB({ TableName: 'your-table', Key: { id: 'some-id' } });

```

### GoogleCloudConnector
The GoogleCloudConnector integrates with Google Cloud services such as Firestore, Storage, and others.

```js
const googleCloudConnector = new GoogleCloudConnector({
  projectId: 'your-project-id',
  keyFilename: 'path-to-service-account.json',
});

const data = await googleCloudConnector.getDocument('your-collection', 'your-document-id');

```

### MongoDBConnector
The MongoDBConnector connects to MongoDB databases, allowing you to perform CRUD operations and queries.

```js
const mongoDBConnector = new MongoDBConnector({
  uri: 'mongodb://localhost:27017',
  dbName: 'your-database',
});

const document = await mongoDBConnector.findOne('your-collection', { id: 'some-id' });

```


### EmailConnector
The EmailConnector allows you to send emails using various email services (e.g., Gmail, SMTP). It supports sending plain-text emails, HTML emails, and emails with attachments.

```js
const emailConnector = new EmailConnector({
  service: 'gmail',
  auth: {
    user: 'your-email@gmail.com',
    pass: 'your-app-password',
  },
});

await emailConnector.sendPlainTextEmail(
  'recipient@example.com',
  'Test Subject',
  'This is a plain text email body'
);


```

## Connector Properties & Setup

| Connector            | Property                  | Type                             | Description                                                                                                                                               | Setup Example                                                                                                      |
|----------------------|---------------------------|----------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------|
| **RESTConnector**     | `baseUrl`                 | `string`                         | The base URL for the REST API.                                                                                                                             | `baseUrl: 'https://example.com/api'`                                                                               |
|                      | `headers`                 | `Record<string, string>`         | Custom headers for the requests (e.g., authentication headers).                                                                                           | `headers: { 'Authorization': 'Bearer your-token' }`                                                                |
|                      | `timeout`                 | `number`                         | The timeout duration in milliseconds for the HTTP requests.                                                                                              | `timeout: 5000`                                                                                                    |
|                      | `retry`                   | `{ maxAttempts: number, delay: number }` | Retry logic for failed requests. Max attempts and delay between retries in milliseconds.                                                                  | `retry: { maxAttempts: 3, delay: 1000 }`                                                                          |
| **RedisConnector**    | `host`                    | `string`                         | The hostname or IP address of the Redis server.                                                                                                           | `host: 'localhost'`                                                                                                 |
|                      | `port`                    | `number`                         | The port where the Redis server is running.                                                                                                               | `port: 6379`                                                                                                       |
|                      | `password`                | `string?`                        | Optional password for Redis authentication.                                                                                                                | `password: 'your-redis-password'`                                                                                   |
|                      | `db`                      | `number?`                        | The Redis database index (default is 0).                                                                                                                   | `db: 0`                                                                                                            |
| **AWSConnector**      | `region`                  | `string`                         | The AWS region where your services (e.g., DynamoDB, S3) are located.                                                                                     | `region: 'us-east-1'`                                                                                               |
|                      | `accessKeyId`             | `string`                         | Your AWS access key.                                                                                                                                       | `accessKeyId: 'your-access-key'`                                                                                   |
|                      | `secretAccessKey`         | `string`                         | Your AWS secret key.                                                                                                                                       | `secretAccessKey: 'your-secret-key'`                                                                               |
|                      | `dynamoDBConfig`          | `{ TableName: string, Key: any }`| DynamoDB-specific configuration for querying or performing operations on a table.                                                                         | `dynamoDBConfig: { TableName: 'your-table', Key: { id: 'some-id' } }`                                              |
| **GoogleCloudConnector** | `projectId`             | `string`                         | The Google Cloud project ID.                                                                                                                               | `projectId: 'your-project-id'`                                                                                      |
|                      | `keyFilename`             | `string`                         | Path to the service account key file for authentication.                                                                                                 | `keyFilename: 'path-to-service-account.json'`                                                                     |
|                      | `firestoreCollection`     | `string?`                        | The name of the Firestore collection (if interacting with Firestore).                                                                                      | `firestoreCollection: 'your-collection'`                                                                           |
| **MongoDBConnector**  | `uri`                     | `string`                         | The URI connection string for MongoDB.                                                                                                                     | `uri: 'mongodb://localhost:27017'`                                                                                  |
|                      | `dbName`                  | `string`                         | The name of the MongoDB database to use.                                                                                                                   | `dbName: 'your-database'`                                                                                          |
| **EmailConnector**    | `service`                 | `string`                         | The email service to use (e.g., 'gmail', 'smtp').                                                                                                          | `service: 'gmail'`                                                                                                  |
|                      | `auth.user`               | `string`                         | The email address used for authentication.                                                                                                                | `auth: { user: 'your-email@gmail.com', pass: 'your-app-password' }`                                                |
|                      | `auth.pass`               | `string`                         | The email account's password or an app-specific password.                                                                                                 | `auth: { user: 'your-email@gmail.com', pass: 'your-app-password' }`                                                |
|                      | `from`                    | `string`                         | The "from" email address when sending emails (usually the same as the `auth.user`).                                                                        | `from: 'your-email@gmail.com'`                                                                                      |

---


## License

This library is licensed under the MIT License. See LICENSE for more information.


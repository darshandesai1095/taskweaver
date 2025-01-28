import { MongoClient, Db, Collection } from 'mongodb';

// Custom Error for MongoDB Connector
export class MongoDBConnectorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MongoDBConnectorError';
  }
}

// Interface for MongoDB connection options
interface MongoDBConnectorOptions {
  uri: string; // MongoDB connection string
  dbName: string; // Database name
}

// Define a structure for the MongoDB Connector
export class MongoDBConnector {
  private client?: MongoClient;
  private db?: Db;

  constructor(private options: MongoDBConnectorOptions) {}

  // Connect to MongoDB
  public async connect(): Promise<void> {
    try {
      this.client = await MongoClient.connect(this.options.uri);
      this.db = this.client.db(this.options.dbName);
      console.log('Connected to MongoDB');
    } catch (error) {
      throw new MongoDBConnectorError(`Failed to connect to MongoDB: ${error instanceof Error ? error.message : error}`);
    }
  }

  // Get a collection
  public getCollection(collectionName: string): Collection {
    if (!this.db) throw new MongoDBConnectorError('Database not initialized.');
    return this.db.collection(collectionName);
  }

  // Insert a document into a collection
  public async insertDocument(collectionName: string, document: object): Promise<void> {
    try {
      const collection = this.getCollection(collectionName);
      await collection.insertOne(document);
      console.log('Document inserted');
    } catch (error) {
      throw new MongoDBConnectorError(`Insert failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  // Find documents in a collection
  public async findDocuments(collectionName: string, query: object = {}): Promise<any[]> {
    try {
      const collection = this.getCollection(collectionName);
      return await collection.find(query).toArray();
    } catch (error) {
      throw new MongoDBConnectorError(`Find failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  // Update a document in a collection
  public async updateDocument(collectionName: string, query: object, update: object): Promise<void> {
    try {
      const collection = this.getCollection(collectionName);
      await collection.updateOne(query, { $set: update });
      console.log('Document updated');
    } catch (error) {
      throw new MongoDBConnectorError(`Update failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  // Delete a document from a collection
  public async deleteDocument(collectionName: string, query: object): Promise<void> {
    try {
      const collection = this.getCollection(collectionName);
      await collection.deleteOne(query);
      console.log('Document deleted');
    } catch (error) {
      throw new MongoDBConnectorError(`Delete failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  // Disconnect from MongoDB
  public async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.close();
        console.log('Disconnected from MongoDB');
      }
    } catch (error) {
      throw new MongoDBConnectorError(`Failed to disconnect from MongoDB: ${error instanceof Error ? error.message : error}`);
    }
  }
}

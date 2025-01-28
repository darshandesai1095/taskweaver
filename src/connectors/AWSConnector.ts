import { S3, DynamoDB } from 'aws-sdk';

// Define custom error type for AWS operations
export class AWSConnectorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AWSConnectorError';
  }
}

interface AWSConnectorOptions {
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

interface S3Options {
  Bucket: string;
  Key: string;
  Body: any;
}

interface DynamoDBOptions {
  TableName: string;
  Key: DynamoDB.DocumentClient.Key;
}

export class AWSConnector {
  private s3Client: S3;
  private dynamoDbClient: DynamoDB.DocumentClient;

  constructor(options: AWSConnectorOptions) {
    this.s3Client = new S3({
      region: options.region,
      accessKeyId: options.accessKeyId,
      secretAccessKey: options.secretAccessKey,
    });

    this.dynamoDbClient = new DynamoDB.DocumentClient({
      region: options.region,
      accessKeyId: options.accessKeyId,
      secretAccessKey: options.secretAccessKey,
    });
  }

  // S3 Operations
  public async uploadToS3(options: S3Options): Promise<S3.ManagedUpload.SendData> {
    try {
      const data = await this.s3Client.upload({
        Bucket: options.Bucket,
        Key: options.Key,
        Body: options.Body,
      }).promise();
      return data;
    } catch (error) {
      throw new AWSConnectorError(`Failed to upload file to S3: ${error instanceof Error ? error.message : error}`);
    }
  }

  public async downloadFromS3(Bucket: string, Key: string): Promise<Buffer | string> {
    try {
      const data = await this.s3Client.getObject({ Bucket, Key }).promise();
      return data.Body as Buffer;
    } catch (error) {
      throw new AWSConnectorError(`Failed to download file from S3: ${error instanceof Error ? error.message : error}`);
    }
  }

  // DynamoDB Operations
  public async getItemFromDynamoDB(options: DynamoDBOptions): Promise<DynamoDB.DocumentClient.AttributeMap | null> {
    try {
      const data = await this.dynamoDbClient.get(options).promise();
      // Handle result with the correct type
      return data.Item || null;
    } catch (error) {
      throw new AWSConnectorError(`Failed to get item from DynamoDB: ${error instanceof Error ? error.message : error}`);
    }
  }

  public async putItemInDynamoDB(options: DynamoDBOptions & { Item: any }): Promise<DynamoDB.DocumentClient.PutItemOutput> {
    try {
      const data = await this.dynamoDbClient.put(options).promise();
      return data;
    } catch (error) {
      throw new AWSConnectorError(`Failed to put item in DynamoDB: ${error instanceof Error ? error.message : error}`);
    }
  }

  // Disconnect from AWS SDK (optional, as SDK handles connections internally)
  public disconnect(): void {
    // No explicit disconnect needed for AWS SDK, but we can handle cleanup if needed.
    console.log('AWS SDK cleanup (if any) can be handled here');
  }
}

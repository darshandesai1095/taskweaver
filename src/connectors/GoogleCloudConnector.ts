import { Storage, Bucket, File } from '@google-cloud/storage';
import { Firestore, DocumentReference, DocumentSnapshot } from '@google-cloud/firestore';

// Define custom error for Google Cloud operations
export class GoogleCloudConnectorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GoogleCloudConnectorError';
  }
}

interface GoogleCloudConnectorOptions {
  projectId: string;
  keyFilename?: string; // Optional: Path to service account JSON key file
}

interface StorageOptions {
  bucketName: string;
  fileName: string;
  fileBuffer: Buffer;
}

interface FirestoreOptions {
  collection: string;
  documentId: string;
}

export class GoogleCloudConnector {
  private storageClient: Storage;
  private firestoreClient: Firestore;

  constructor(options: GoogleCloudConnectorOptions) {
    this.storageClient = new Storage({
      projectId: options.projectId,
      keyFilename: options.keyFilename,
    });

    this.firestoreClient = new Firestore({
      projectId: options.projectId,
      keyFilename: options.keyFilename,
    });
  }

  // Google Cloud Storage Operations
  public async uploadToStorage(options: StorageOptions): Promise<File> {
    const bucket: Bucket = this.storageClient.bucket(options.bucketName);
    const file: File = bucket.file(options.fileName);

    try {
      const stream = file.createWriteStream();
      stream.write(options.fileBuffer);
      stream.end();

      // Await stream to finish and return file details
      await new Promise<void>((resolve, reject) => {
        stream.on('finish', resolve);
        stream.on('error', reject);
      });

      console.log(`Successfully uploaded ${options.fileName} to ${options.bucketName}`);
      return file;
    } catch (error) {
      throw new GoogleCloudConnectorError(`Failed to upload file to Google Cloud Storage: ${error instanceof Error ? error.message : error}`);
    }
  }

  public async downloadFromStorage(bucketName: string, fileName: string): Promise<Buffer> {
    const bucket: Bucket = this.storageClient.bucket(bucketName);
    const file: File = bucket.file(fileName);

    try {
      const contents = await file.download();
      console.log(`Successfully downloaded ${fileName} from ${bucketName}`);
      return contents[0];
    } catch (error) {
      throw new GoogleCloudConnectorError(`Failed to download file from Google Cloud Storage: ${error instanceof Error ? error.message : error}`);
    }
  }

  // Firestore Operations
  public async getDocumentFromFirestore(options: FirestoreOptions): Promise<DocumentSnapshot | null> {
    try {
      const docRef: DocumentReference = this.firestoreClient.collection(options.collection).doc(options.documentId);
      const docSnapshot = await docRef.get();

      if (!docSnapshot.exists) {
        console.log(`No document found with ID ${options.documentId}`);
        return null;
      }

      console.log(`Successfully retrieved document from Firestore with ID ${options.documentId}`);
      return docSnapshot;
    } catch (error) {
      throw new GoogleCloudConnectorError(`Failed to get document from Firestore: ${error instanceof Error ? error.message : error}`);
    }
  }

  public async setDocumentInFirestore(options: FirestoreOptions & { data: any }): Promise<void> {
    try {
      const docRef: DocumentReference = this.firestoreClient.collection(options.collection).doc(options.documentId);
      await docRef.set(options.data);

      console.log(`Successfully set document in Firestore with ID ${options.documentId}`);
    } catch (error) {
      throw new GoogleCloudConnectorError(`Failed to set document in Firestore: ${error instanceof Error ? error.message : error}`);
    }
  }

  // Disconnect from Google Cloud SDK (optional, as SDK handles connections internally)
  public disconnect(): void {
    // No explicit disconnect needed for Google Cloud SDK, but we can handle cleanup if needed.
    console.log('Google Cloud SDK cleanup (if any) can be handled here');
  }
}

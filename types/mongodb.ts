//E:\trifuzja-mix\types\mongodb.ts
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI!;
let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (!uri) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

if (process.env.NODE_ENV === 'development') {
  if (!globalThis._mongoClientPromise) {
    client = new MongoClient(uri);
    globalThis._mongoClientPromise = client.connect();
  }
  clientPromise = globalThis._mongoClientPromise;
} else {
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

export default clientPromise;

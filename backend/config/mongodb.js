import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

// === Config ===
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongodb:27017';
const MONGODB_DB = process.env.MONGODB_DB || 'edu_analytics';

let client;
let db;

// === Connection ===
export const connectMongoDB = async () => {
  try {
    client = new MongoClient(MONGODB_URI, {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 8000,
    });

    await client.connect();
    db = client.db(MONGODB_DB);

    console.log(`✅ Connected to MongoDB → ${MONGODB_DB}`);

    // Initialize collections
    await createCollections();

    return db;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    // Don't throw - let server start without MongoDB
    return null;
  }
};

// === Collection Setup ===
const createCollections = async () => {
  try {
    const collections = {
      teachers: {
        indexes: [{ key: { email: 1 }, unique: true }],
      },
      teacher_metadata: {
        indexes: [{ key: { teacher_id: 1 } }],
      },
      attainment_by_course: {
        indexes: [{ key: { course_id: 1, timestamp: -1, co_id: 1 } }],
      },
      attainment_by_student: {
        indexes: [{ key: { student_id: 1, course_id: 1, timestamp: -1 } }],
      },
      module_performance: {
        indexes: [{ key: { course_id: 1, module_number: 1, timestamp: -1 } }],
      },
      po_attainment: {
        indexes: [{ key: { course_id: 1, po_id: 1, timestamp: -1 } }],
      },
      student_progress: {
        indexes: [{ key: { student_id: 1, course_id: 1, assessment_date: -1 } }],
      },
    };

    const existingCollections = await db.listCollections().toArray();
    const existingNames = existingCollections.map((c) => c.name);

    for (const [name, cfg] of Object.entries(collections)) {
      if (!existingNames.includes(name)) {
        await db.createCollection(name);
      }
      // Apply indexes
      for (const idx of cfg.indexes) {
        await db.collection(name).createIndex(idx.key, idx.options || {});
      }
    }

    console.log('✅ MongoDB collections + indexes ensured');
  } catch (error) {
    console.error('❌ Error ensuring MongoDB collections:', error.message);
  }
};

// === Utility Wrappers ===
export const getDB = () => {
  if (!db) {
    console.warn('⚠️ MongoDB not connected - some features may not work');
    return null;
  }
  return db;
};

export const insertOne = async (collection, doc) => {
  const result = await db.collection(collection).insertOne({ ...doc, created_at: new Date() });
  return result;
};


export const findOne = async (collection, query = {}) => {
  const result = await db.collection(collection).findOne(query);
  return result;
};

export const find = async (collection, query = {}, options = {}) => {
  const result = await db.collection(collection).find(query, options).toArray();
  return result;
};

export const updateOne = async (collection, filter, update, upsert = false) => {
  const result = await db.collection(collection).updateOne(
    filter,
    { $set: { ...update, updated_at: new Date() } },
    { upsert }
  );
  return result;
};

export const aggregate = async (collection, pipeline = []) => {
  const result = await db.collection(collection).aggregate(pipeline).toArray();
  return result;
};

export const shutdown = async () => {
  if (client) {
    await client.close();
    console.log('🧹 MongoDB connection closed gracefully');
  }
};
export const findMany = async (collection, query = {}, options = {}) => {
  const result = await db.collection(collection).find(query, options).toArray();
  return result;
};

export default { connectMongoDB, getDB, insertOne, find, updateOne, aggregate, shutdown,findMany };

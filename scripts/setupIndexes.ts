// E:\trifuzja-mix\scripts\setupIndexes.mjs
import 'dotenv/config';
import { MongoClient } from 'mongodb';

// استخدام التعجب لضمان أن uri من النوع string وليس undefined
const uri = process.env.MONGODB_URI!;
if (!uri) {
  console.error('❌ Please define MONGODB_URI in .env');
  process.exit(1);
}

async function main() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();

    console.log('⚙️  Creating indexes for "articles"...');
    await db
      .collection('articles')
      .createIndex({ slug: 1 }, { unique: true, name: 'idx_articles_slug_unique' });

    await db
      .collection('articles')
      .createIndex(
        { page: 1, status: 1, createdAt: -1 },
        { name: 'idx_articles_page_status_createdAt' }
      );

    console.log('⚙️  Creating indexes for "categories"...');
    await db
      .collection('categories')
      .createIndex({ slug: 1 }, { unique: true, name: 'idx_categories_slug_unique' });

    await db
      .collection('categories')
      .createIndex({ 'name.en': 1 }, { name: 'idx_categories_name_en' });

    console.log('✅ All indexes were created successfully.');
  } catch (err) {
    console.error('❌ Error while creating indexes:', err);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

main();

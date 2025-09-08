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
  await client.connect();
  const db = client.db();

  console.log('⚙️  إنشاء الفهارس لمجموعة articles...');
  await db
    .collection('articles')
    .createIndex({ slug: 1 }, { unique: true, name: 'idx_slug_unique' });
  await db
    .collection('articles')
    .createIndex({ page: 1, status: 1, createdAt: -1 }, {
      name: 'idx_page_status_createdAt'
    });

  console.log('⚙️  إنشاء الفهارس لمجموعة categories...');
  await db
    .collection('categories')
    .createIndex({ slug: 1 }, { unique: true, name: 'idx_cat_slug_unique' });
  await db
    .collection('categories')
    .createIndex({ 'name.en': 1 }, { name: 'idx_cat_name_en' });

  console.log('✅ جميع الفهارس تم إنشاؤها بنجاح.');
  await client.close();
}

main().catch(err => {
  console.error('❌ خطأ أثناء إنشاء الفهارس:', err);
  process.exit(1);
});

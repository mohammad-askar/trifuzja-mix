import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

async function createUser() {
  console.log('MONGODB_URI:', process.env.MONGODB_URI);
  const uri = process.env.MONGODB_URI!;
  const client = new MongoClient(uri);
  await client.connect();

  const db = client.db("trifuzja");  // اضبط هنا اسم القاعدة
  const usersCollection = db.collection("admin");  // واضبط اسم المجموعة

  const email = "habish@admin.com";
  const password = "123456";
  const name = "Admin";

  const hashedPassword = await bcrypt.hash(password, 10);

  const existingUser = await usersCollection.findOne({ email });
  if (existingUser) {
    console.log("User already exists");
    await client.close();
    return;
  }

  const result = await usersCollection.insertOne({
    email,
    password: hashedPassword,
    name,
  });

  console.log("User created with id:", result.insertedId);
  await client.close();
}

createUser().catch(console.error);

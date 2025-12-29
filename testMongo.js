const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://emmanuel:Heaven2200@cluster0.cmcthsc.mongodb.net/NewingsSchool";

async function testConnection() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("✅ Successfully connected to MongoDB Atlas!");
    
    // Optional: list all databases
    const databases = await client.db().admin().listDatabases();
    console.log("Databases:");
    databases.databases.forEach(db => console.log(` - ${db.name}`));

  } catch (err) {
    console.error("❌ Connection failed:", err.message);
  } finally {
    await client.close();
  }
}

testConnection();
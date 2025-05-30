const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://admin:bwh8ELBljpUSY6ce@cluster.kr4sbrb.mongodb.net/Campeones?retryWrites=true&w=majority';

const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000, // 5 segundos de timeout
});

async function testConnection() {
    try {
        await client.connect();
        console.log('✅ Conectado a MongoDB Atlas');
    } catch (e) {
        console.error('❌ Error conectando:', e);
    } finally {
        await client.close();
    }
}

testConnection();
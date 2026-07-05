// Inventor Studio — separate MongoDB connection (Cluster0)
// Uses mongoose.createConnection() so it doesn't collide with businesses' default mongoose.
import mongoose from 'mongoose';

const uri = process.env.MONGODB_IS_URI
  || 'mongodb+srv://CryptoCat:Lestat97.s@cluster0.pl3mchj.mongodb.net/inventor-studio-v3?retryWrites=true&w=majority&appName=Cluster0';

const conn = mongoose.createConnection(uri, {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  family: 4,
});

conn.on('connected', () => console.log(`[inventor-studio] MongoDB connected → ${conn.name}`));
conn.on('error', (err) => console.error(`[inventor-studio] MongoDB error: ${err.message}`));

export default conn;

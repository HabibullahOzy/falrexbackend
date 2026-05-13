const admin = require("firebase-admin");

const serviceAccount = require("../serviceAccountKey.json");

if (!admin.apps.length) {
  admin.initializeApp({

    credential: admin.credential.cert(serviceAccount),
    // credential: admin.credential.cert({
    //   // projectId:   process.env.FIREBASE_ADMIN_PROJECT_ID,
    //   // clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    //   // privateKey:  process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),

    
    // }),
  });
}

module.exports = admin;
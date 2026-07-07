const admin = require("firebase-admin");

const {
  getFirebaseServiceAccount,
} = require("./env.validation");

const serviceAccount = getFirebaseServiceAccount();

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
}

module.exports = admin;
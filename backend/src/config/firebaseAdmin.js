const {
  getApps,
  initializeApp,
  cert,
} = require("firebase-admin/app");

const {
  getAuth,
} = require("firebase-admin/auth");

const {
  getFirebaseServiceAccount,
} = require("./env.validation");

const serviceAccount = getFirebaseServiceAccount();

const firebaseApp =
  getApps()[0] ||
  initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });

const firebaseAuth = getAuth(firebaseApp);

// Compatibility wrapper:
// Existing admin.auth().verifyIdToken() and admin.auth().getUser()
// code ko change karne ki zarurat nahi padegi.
module.exports = {
  app: () => firebaseApp,
  auth: () => firebaseAuth,
};
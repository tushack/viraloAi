const adminModule = require("firebase-admin");
const admin = adminModule.default || adminModule;

const {
  getApps,
  initializeApp,
  cert,
} = require("firebase-admin/app");

const {
  getFirebaseServiceAccount,
} = require("./env.validation");

const serviceAccount = getFirebaseServiceAccount();

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
}

module.exports = admin;
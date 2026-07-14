const {
  getApps,
  initializeApp,
  cert,
} = require("firebase-admin/app");

const {
  getAuth,
} = require("firebase-admin/auth");

const {
  getFirestore,
  FieldValue,
} = require("firebase-admin/firestore");

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
const firebaseFirestore = getFirestore(firebaseApp);

function firestore() {
  return firebaseFirestore;
}

firestore.FieldValue = FieldValue;

module.exports = {
  app: () => firebaseApp,
  auth: () => firebaseAuth,
  firestore,
};
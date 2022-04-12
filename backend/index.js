const express = require('express');
const cors = require('cors');
const busboy = require('busboy');
const UUID = require('uuid-v4');
const bodyParser = require('body-parser');
const webpush = require('web-push');

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const serviceAccount = require('./serviceAccountKey.json');

const path = require('path');
const os = require('os');
const fs = require('fs');

const jsonParser = bodyParser.json();

initializeApp({
  credential: cert(serviceAccount),
  storageBucket: 'quasagram-5d1dc.appspot.com',
});

const app = express();
const db = getFirestore();
const bucket = getStorage().bucket();

const vapidKeys = {
  publicKey:
    'BDuMZjCz2NQ-69_pKLWoGOyh2PELB7pxKTpcM-pMSQB8KSeJJ7BJbOU58X8MImt9g5p-hnuHuMPSSqpgncX9Rrw',
  privateKey: 'jb-Zc1jyJ_7n6T0it-tT96WcV1T1QfBLWBMDkXZzyo4',
};

webpush.setVapidDetails(
  'mailto:test@test.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

app.use(cors());

app.get('/posts', async (request, response) => {
  const posts = [];

  try {
    const snapshot = await db.collection('posts').orderBy('date', 'desc').get();

    snapshot.forEach((doc) => {
      posts.push(doc.data());
    });
  } catch (error) {
    console.log(error);
  }

  response.send(posts);
});

app.post('/createPost', async (request, response) => {
  const bb = busboy({ headers: request.headers });

  const uuid = UUID();

  const fields = {};
  let fileData = {};

  const createDocument = function (file) {
    db.collection('posts')
      .doc(fields.id)
      .set({
        id: fields.id,
        caption: fields.caption,
        location: fields.location,
        date: parseInt(fields.date),
        imageUrl: `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${file.name}?alt=media&token=${uuid}`,
      });
  };

  const sendPushNotifications = async function () {
    const subscriptions = [];

    try {
      const snapshot = await db.collection('subscriptions').get();

      snapshot.forEach((doc) => {
        subscriptions.push(doc.data());
      });
    } catch (error) {
      console.log(error);
    }

    const sendSubscription = function (subscription) {
      const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          auth: subscription.keys.auth,
          p256dh: subscription.keys.p256dh,
        },
      };

      const pushContent = {
        title: 'New Quasagram post!',
        body: 'Check it out',
        openUrl: '/#/',
      };

      const pushContentStringify = JSON.stringify(pushContent);

      webpush.sendNotification(pushSubscription, pushContentStringify);
    };

    subscriptions.forEach(sendSubscription);
  };

  bb.on('file', (name, file, info) => {
    const { filename, encoding, mimeType } = info;

    const filePath = path.join(os.tmpdir() + filename);

    file.pipe(fs.createWriteStream(filePath));

    fileData = { filePath, mimeType };
  });

  bb.on('field', (name, value) => {
    fields[name] = value;
  });

  bb.on('close', () => {
    bucket.upload(
      fileData.filePath,
      {
        uploadType: 'media',
        metadata: {
          metadata: {
            contentType: fileData.mimeType,
            firebaseStorageDownloadTokens: uuid,
          },
        },
      },
      async (err, uploadedFile) => {
        if (!err) {
          await createDocument(uploadedFile);

          await sendPushNotifications();

          response.send('Post added: ' + fields.id);
        }
      }
    );
  });

  request.pipe(bb);
});

app.post('/createSubscription', jsonParser, async (request, response) => {
  const postData = request.body;

  try {
    await db.collection('subscriptions').add(postData);
  } catch (error) {
    console.log(error);
  }

  response.send({
    postData,
    message: 'Subscription added!',
  });
});

app.listen(process.env.PORT || 3000);

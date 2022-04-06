const express = require('express');
const busboy = require('busboy');
const UUID = require('uuid-v4');

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const serviceAccount = require('./serviceAccountKey.json');

const path = require('path');
const os = require('os');
const fs = require('fs');
const { createDocumentRegistry } = require('typescript');

initializeApp({
  credential: cert(serviceAccount),
  storageBucket: 'quasagram-5d1dc.appspot.com',
});

const app = express();
const db = getFirestore();
const bucket = getStorage().bucket();

app.get('/posts', async (request, response) => {
  response.set('Access-Control-Allow-Origin', '*');

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
  response.set('Access-Control-Allow-Origin', '*');

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

          response.send('Post added: ' + fields.id);
        }
      }
    );
  });

  request.pipe(bb);
});

app.listen(process.env.PORT || 3000);

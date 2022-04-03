const express = require('express');

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount),
});

const app = express();
const db = getFirestore();

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

app.listen(process.env.PORT || 3000);

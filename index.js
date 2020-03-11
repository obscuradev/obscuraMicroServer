const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { format, compareAsc, differenceInMinutes } = require("date-fns");
var bodyParser = require("body-parser");
const cors = require("cors")({
  origin: true
});
var serviceAccount = require("./key.json");
const express = require("express");

const app = express();
app.use(
  bodyParser.urlencoded({
    extended: true
  })
);
app.use(bodyParser.json());
app.use(cors);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://obscuramini-967ea.firebaseio.com"
});

const db = admin.database();

app.get("/", (req, res) => {
  res.json({
    message: format(new Date(), 'MM/dd/yyyy')
  });
});

app.get("/getlevel/:id", (req, res) => {
  const id = req.params.id;
  let user;
  let levels;
  const today = format(new Date(), "MM/dd/yyyy");
  const levelRef = db.ref("/levels/");
  const userRef = db.ref(`/users/${id}`);
  userRef
    .once("value")
    .then(snap => {
      user = snap.val();
      levelRef
        .once("value")
        .then(snap => {
          levels = [...snap.val()];
          levels.shift();
          if (user.levelsSolved) {
            let levelObject = [...user.levelsSolved];
            const currentLevel = user.levelsSolved.find(
              e => e.day.toString() === today.toString()
            );
            if (currentLevel) {
              if (currentLevel.solved === 0) {
                const level = levels.find(e => e.name === "level 1");
                return res.json({
                  message: "FOUND",
                  data: level
                });
              } else if (currentLevel.solved === 1) {
                const level = levels.find(e => e.name === "level 2");
                return res.json({
                  message: "FOUND",
                  data: level
                });
              } else {
                return res.json({
                  message: "GAME_OVER"
                });
              }
            } else {
              const newLevel = {
                day: today,
                solved: 0
              };
              levelObject.push(newLevel);
              userRef.update({
                ...user,
                levelsSolved: [...levelObject]
              });
              const level = levels.find(e => e.name === "level 1");
              return res.json({
                message: "FOUND",
                data: level
              });
            }
          } else {
            userRef.update({
              ...user,
              levelsSolved: [
                {
                  day: today,
                  solved: 0
                }
              ]
            });
            const level = levels.find(e => e.name === "level 1");
            return res.json({
              message: "FOUND",
              data: level
            });
          }
        })
        .catch(error => {
          console.log("ERROR", error);
        });
    })
    .catch(error => {
      console.log("ERROR", error);
    });
});



exports.app = functions.https.onRequest(app);

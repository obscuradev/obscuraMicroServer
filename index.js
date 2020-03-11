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
const PORT = process.env.PORT || 5000
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


app.post("/check", (req, res) => {
  const now = format(new Date(), "MM/dd/yyyy");
  let user;
  const { answer, id } = req.body;
  const userRef = db.ref(`/users/${id}`);
  userRef
    .once("value")
    .then(snap => {
      user = snap.val();
      const userObject = user.levelsSolved.find(
        e => e.day.toString() === now.toString()
      );
      if (userObject.solved === 2) {
        return res.json({
          message: "GAME_OVER"
        });
      } else {
        const levelRef = db.ref(`/levels/${userObject.solved + 1}`);
        levelRef
          .once("value")
          .then(snap => {
            const level = { ...snap.val() };
            const isLate = compareAsc(new Date(now), new Date(level.endTime));
            if (isLate === 1) {
              return res.json({
                message: "LATE"
              });
            } else {
              if (level.answer === answer) {
                //if answer is correct

                //Modifying user solved levels array
                let levels = [...user.levelsSolved];
                const updatedLevel = {
                  day: now,
                  solved: userObject.solved + 1
                };
                levels.pop();
                levels.push(updatedLevel);
                userRef.update({
                  ...user,
                  levelsSolved: [...levels]
                });

                //updating leaderboard
                console.log("SOLVED", updatedLevel.solved);
                if (updatedLevel.solved === 1) {
                  const day = format(new Date(), "iiii");
                  console.log("DAY", day);
                  console.log(
                    "diff",
                    differenceInMinutes(new Date(), new Date(level.endTime))
                  );
                  console.log("LEVEL", new Date(level.endTime));
                  db.ref(`/leaderboard/${day}/${id}`)
                    .set({
                      name: user.gameName,
                      image: user.image,
                      solved: updatedLevel.solved,
                      time: Math.abs(
                        differenceInMinutes(new Date(), new Date(level.endTime))
                      )
                    })
                    .then(() => {
                      db.ref("/levels/2")
                        .once("value")
                        .then(data => {
                          return res.json({
                            message: "CORRECT",
                            data: data.val()
                          });
                        })
                        .catch(error => {
                          console.log("ERROR", error);
                        });
                    })
                    .catch(error => {
                      console.log("ERROR", error);
                    });
                }

                if (updatedLevel.solved === 2) {
                  const day = format(new Date(), "iiii");
                  let userLeaderboard;

                  db.ref(`/leaderboard/${day}/${id}`)
                    .once("value")
                    .then(data => {
                      userLeaderboard = data.val();
                    })
                    .then(() => {
                      console.log("USERLB", userLeaderboard.time);
                      db.ref(`/leaderboard/${day}/${id}`)
                        .update({
                          solved: 2,
                          time:
                            Math.abs(userLeaderboard.time) +
                            Math.abs(
                              differenceInMinutes(
                                new Date(),
                                new Date(level.startTime)
                              )
                            )
                        })
                        .then(() => {
                          return res.json({
                            message: "CORRECT",
                            data: "GAME_OVER"
                          });
                        });
                    })
                    .catch(error => {
                      console.log("ERROR", error);
                    });
                }
              } else {
                return res.json({
                  message: "WRONG"
                });
              }
            }
          })
          .catch(error => {
            console.log("ERROR", error);
          });
      }
    })
    .catch(error => {
      console.log("ERROR", error);
    });
});

app.listen(PORT, () => {
  console.log(`ON PORT ${PORT}`);
});

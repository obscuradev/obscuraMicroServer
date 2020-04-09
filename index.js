const functions = require("firebase-functions");
const admin = require("firebase-admin");
// const redis = require('redis');
const { format, compareAsc, differenceInMinutes } = require("date-fns");
var bodyParser = require("body-parser");
const cors = require("cors")({
    origin: true
});
var serviceAccount = require("./key.json");
const express = require("express");
// const REDIS_PORT = process.env.REDIS_PORT || 6379;
// const rClient = redis.createClient(REDIS_PORT);

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

//Cache middleware
// function cache(req, res, next) {
//     // rClient.del("levels", (err, res) => {
//     //     console.log("DONE DEL REDIS")
//     // })
//     rClient.get("levels", (err, data) => {
//         if (err) throw err;

//         if (data !== null) {
//             req.levels = data;
//             next();
//         } else {
//             next();
//         }
//     })
// }

app.get("/", (req, res) => {
    res.json({
        message: format(new Date(), 'MM/dd/yyyy'),
        data: "Hey there"
    });
});

app.get("/getlevel/:id",async (req, res) => {
    const id = req.params.id;

    try {

        let levels = req.levels ? JSON.parse(req.levels) : null

        console.log("LEVELS", levels)

        const userFetch = await db.ref(`/users/${id}`).once("value");
        if (levels === null) {
            const levelsFetch = await db.ref("/levels/").once("value")
            levels = levelsFetch.val();
            // rClient.setex("levels", 500, JSON.stringify(levels));
        }
        const user = userFetch.val();

        console.log("USER",user)

        const levelToSend = levels[user.levelsSolved];
        console.log(levelToSend)
        if (!levelToSend) {
            return res.json({
                message: "NO_MORE_LEVELS"
            });
        }

        //check if current request time is after startTime of level

        console.log("NOW COMPARE", compareAsc(new Date(), new Date(levelToSend.startTime)))
        if (compareAsc(new Date(), new Date(levelToSend.startTime)) === -1) {
            return res.json({
                message: "WAIT"
            });

        }

        return res.json({
            message: "LEVEL_FOUND",
            data: levelToSend
        })

    } catch (error) {
        console.log("GET LEVEL CATCH", error)
    }
});


app.post("/check/:name", async (req, res) => {

    const { id, answer } = req.body;

    try {
        let levels = JSON.parse(req.levels) || null;
        if (levels === null) {
            const levelsFetch = await db.ref("/levels/").once("value")
            levels = levelsFetch.val();
            // rClient.setex("levels", 500, JSON.stringify(levels));
        }
        const userFetch = await db.ref(`/users/${id}`).once("value");
        const user = userFetch.val();
        const curLevel = levels[user.levelsSolved];
        console.log("ANSWER", curLevel.answer)

        if (answer === curLevel.answer) {
            const nextLevel = levels[user.levelsSolved + 1];
            let time;
            //calculate time.

            if (compareAsc(new Date(), new Date(curLevel.endTime)) === 1) {
                time = 60 * 3;
            } else {
                time = Math.abs(differenceInMinutes(new Date(), new Date(curLevel.startTime))) == 0 ? 1 : Math.abs(differenceInMinutes(new Date(), new Date(curLevel.startTime)));
            }
            console.log("TIME", time)

            //update user
            await db.ref(`/users/${id}`).update({
                ...user,
                levelsSolved: user.levelsSolved + 1,
                time: (user.time) ? user.time + time : time
            });


            //send response
            if (nextLevel && compareAsc(new Date(), new Date(nextLevel.startTime))) {
                return res.json({
                    message: "CORRECT",
                    data: nextLevel
                });
            } else {
                return res.json({
                    message: "CORRECT",
                    data: "WAIT"
                });
            }
        }

        return res.json({
            message: "WRONG"
        });

    } catch (error) {
        console.log("CHECK CATCH", error)
    }


});

app.listen(PORT, () => {
    console.log(`ON PORT ${PORT}`);
});

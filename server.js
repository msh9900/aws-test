const express = require("express");
const app = express();
const port = 5500;
const MongoClient = require("mongodb").MongoClient;
const methodOverride = require("method-override");

const http = require("http").createServer(app);
const { Server } = require("socket.io");
const io = new Server(http);

app.use(methodOverride("_method"));
app.set("view engine", "ejs");

app.use("/public", express.static("public"));

let db;
MongoClient.connect(
  "mongodb+srv://root:root@cluster0.rqpf5kr.mongodb.net/?retryWrites=true&w=majority",
  function (err, client) {
    if (err) return console.log(err);

    db = client.db("todoapp");

    http.listen(port, function () {
      console.log("5500 포트 오픈");
    });
  }
);

app.use(express.urlencoded({ extended: true }));

app.get("/", function (req, res) {
  res.render("index.ejs");
});
app.get("/write", function (req, res) {
  res.render("write.ejs");
});

app.get("/list", function (req, res) {
  db.collection("post")
    .find()
    .toArray(function (err, result) {
      console.log(result);
      res.render("list.ejs", { posts: result });
    });
});

app.get("/search", function (req, res) {
  console.log(req.query.value);
  var searchReq = [
    {
      $search: {
        index: "nameSearch",
        text: {
          query: req.query.value,
          path: "이름", // 제목날짜 둘다 찾고 싶으면 ['제목', '날짜']
        },
      },
    },
    { $project: { 이름: 1, _id: 0, score: { $meta: "searchScore" } } },
    // { $sort: { _id: 1 } },
    // { $limit: 2 },
  ];
  if (!req.query.value) {
    db.collection("post")
      .find()
      .toArray(function (err, result) {
        console.log(result);
        res.render("search.ejs", { posts: result });
      });
  } else {
    db.collection("post")
      .aggregate(searchReq)
      .toArray(function (err, result) {
        console.log(result);
        res.render("search.ejs", { posts: result });
      });
  }
});

app.get("/detail/:id", function (req, res) {
  db.collection("post").findOne(
    { _id: parseInt(req.params.id) },
    function (err, result) {
      console.log(result);
      res.render("detail.ejs", { data: result });
    }
  );
});

app.get("/edit/:id", (req, res) => {
  db.collection("post").findOne(
    { _id: parseInt(req.params.id) },
    (err, result) => {
      console.log(result);
      res.render("edit.ejs", { post: result });
    }
  );
});

app.put("/edit", (req, res) => {
  db.collection("post").updateOne(
    { _id: parseInt(req.body.id) },
    { $set: { 이름: req.body.title, 나이: req.body.date } },
    (err, result) => {
      console.log(result);
      res.redirect("/list");
    }
  );
});
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const session = require("express-session");

app.use(
  session({ secret: "비밀코드", resave: true, saveUninitialized: false })
);
app.use(passport.initialize());
app.use(passport.session());

app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.post(
  "/login",
  passport.authenticate("local", {
    failureRedirect: "/fail",
  }),
  (req, res) => {
    res.redirect("/");
  }
);

passport.use(
  new LocalStrategy(
    {
      usernameField: "id",
      passwordField: "pw",
      session: true,
      passReqToCallback: false,
    },
    function (입력한아이디, 입력한비번, done) {
      console.log(입력한아이디, 입력한비번);
      db.collection("login").findOne(
        { id: 입력한아이디 },
        function (err, result) {
          if (err) return done(err);
          if (!result)
            return done(null, false, { message: "존재하지않는 아이디요" });
          if (입력한비번 == result.pw) {
            return done(null, result);
          } else {
            return done(null, false, { message: "비번틀렸어요" });
          }
        }
      );
    }
  )
);

app.get("/mypage", logincheck, (req, res) => {
  console.log(req.user);
  res.render("mypage.ejs", { user: req.user });
});

function logincheck(req, res, next) {
  if (req.user) {
    next();
  } else {
    res.send("로그인을 안하셨음");
  }
}
app.get("/signup", (req, res) => {
  res.render("signup.ejs");
});
app.post("/signup", (req, res) => {
  console.log(req.body);
  db.collection("login").insertOne({ id: req.body.id, pw: req.body.pw });
  res.redirect("/login");
});

passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser((아이디, done) => {
  db.collection("login").findOne({ id: 아이디 }, (err, result) => {
    done(null, result);
  });
});

app.post("/register", function (req, res) {
  db.collection("login").insertOne(
    { id: req.body.id, pw: req.body.pw },
    function (err, result) {
      res.redirect("/");
    }
  );
});
app.delete("/delete", function (req, res) {
  console.log(req.body);
  req.body._id = parseInt(req.body._id);

  let deleteData = { _id: req.body._id, 작성자: req.user._id };
  db.collection("post").deleteOne(deleteData, function (err, result) {
    console.log("삭제완료");
    if (err) {
      console.log(err);
    }
    res.status(200).send({ message: "성공했습니다" });
  });
});

app.post("/add", function (req, res) {
  res.send("전송완료");
  db.collection("counter").findOne(
    { name: "게시물갯수" },
    function (err, result) {
      let tP = result.totalPost;

      let 저장할거 = {
        _id: tP + 1,
        이름: req.body.title,
        나이: req.body.date,
        작성자: req.user._id,
      };
      db.collection("post").insertOne(저장할거, function (err, result) {
        console.log("저장완료");
        db.collection("counter").updateOne(
          { name: "게시물갯수" },
          { $inc: { totalPost: 1 } },
          function (err, result) {
            if (err) {
              return console.log(err);
            }
          }
        );
      });
    }
  );

  console.log(req.body);
});

app.use("/shop", require("./routes/shop.js"));
app.use("/board", require("./routes/board.js"));

let multer = require("multer");
let storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/image");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
  fileFilter: function (req, file, callback) {
    var ext = path.extname(file.originalname);
    if (ext !== ".png" && ext !== ".jpg" && ext !== ".jpeg") {
      return callback(new Error("PNG, JPG만 업로드하세요"));
    }
    callback(null, true);
  },
  limits: {
    fileSize: 1024 * 1024,
  },
});

let upload = multer({ storage: storage });

app.get("/upload", function (req, res) {
  res.render("upload.ejs");
});

app.post("/upload", upload.array("profile", 10), function (req, res) {
  res.send("업로드완료");
});

app.get("/image/:imageName", function (req, res) {
  res.sendFile(__dirname + "/public/image/" + req.params.imageName);
});

app.get("/logout", function (req, res) {
  console.log("logout");
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    req.session.destroy(function () {
      res.cookie("connect.sid", "", { maxAge: 0 });
      res.redirect("/");
    });
  });
});
const { ObjectId } = require("mongodb");
const { checkout } = require("./routes/shop.js");
const { Socket } = require("dgram");

app.post("/chat", logincheck, function (요청, 응답) {
  let 저장할거 = {
    title: "무슨채팅방",
    member: [ObjectId(요청.body.당한사람id), 요청.user._id],
    date: new Date(),
  };
  db.collection("chatroom")
    .insertOne(저장할거)
    .then((결과) => {
      응답.send("성공");
    });
});
app.get("/chat", logincheck, function (요청, 응답) {
  db.collection("chatroom")
    .find({ member: 요청.user._id })
    .toArray()
    .then((결과) => {
      응답.render("chat.ejs", { data: 결과 });
    });
});
app.post("/message", logincheck, function (요청, 응답) {
  let 저장할거 = {
    parent: 요청.body.parent,
    content: 요청.body.content,
    userid: 요청.user._id,
    date: new Date(),
  };

  db.collection("message")
    .insertOne(저장할거)
    .then(() => {
      console.log("DB저장성공");
      응답.send("DB저장성공");
    });
});

app.get("/message/:parentid", logincheck, function (요청, 응답) {
  응답.writeHead(200, {
    Connection: "keep-alive",
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
  });

  db.collection("message")
    .find({ parent: 요청.params.parentid })
    .toArray()
    .then((결과) => {
      console.log(결과);
      응답.write("event: test\n");
      응답.write(`data: ${JSON.stringify(결과)}\n\n`);
    });

  const pipeline = [
    { $match: { "fullDocument.parent": 요청.params.parentid } },
  ];
  const collection = db.collection("message");
  const changeStream = collection.watch(pipeline);

  changeStream.on("change", (result) => {
    응답.write("event: test\n");
    응답.write(`data: ${JSON.stringify([result.fullDocument])}\n\n`);
  });
});

app.get("/socket", function (요청, 응답) {
  응답.render("socket.ejs");
});

io.on("connection", function (socket) {
  console.log("유저접속됨");

  socket.on("room1-send", function (data) {
    io.to("room1").emit("broadcast", data);
  });

  socket.on("joinroom", function (data) {
    socket.join("room1");
  });

  socket.on("user-send", function (data) {
    io.emit("broadcast", data);
  });
});

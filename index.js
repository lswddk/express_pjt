const express = require('express');
const app = express();
// cors 문제해결
const cors = require('cors');
app.use(cors());
// json으로 된 post의 바디를 읽기 위해 필요
app.use(express.json())
const jwt = require('jsonwebtoken');
const SECRET_KEY = "your_secret_key"; // 실제 서비스에선 더 복잡하고 안전하게!
const PORT = 3000;

//db 연결
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database.db');

app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
  });
  
  app.post("/articles", (req, res) => {
    // 토큰 확인
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "인증 토큰이 필요합니다." });
    }
  
    const token = authHeader.split(' ')[1];
    jwt.verify(token, SECRET_KEY, (err, decoded) => {
      if (err) {
        return res.status(401).json({ error: "유효하지 않은 토큰입니다." });
      }
  
      // 인증 성공 -> 게시글 작성 처리
      const { title, content } = req.body;
      const userId = decoded.id;  // 토큰에서 유저 ID 추출
  
      db.run(
        `INSERT INTO articles (title, content, user_id) VALUES (?, ?, ?)`,
        [title, content, userId],
        function (err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          res.json({ id: this.lastID, title, content, user_id: userId });
        }
      );
    });
  });

// 커밋 한번해주세요

// 전체 아티클 리스트 주는 api를 만들어주세요
// GET : /articles
// 로그인 안필요
app.get('/articles', (req, res) => {
  const query = `
    SELECT 
      articles.*, 
      users.email 
    FROM articles 
    JOIN users ON articles.user_id = users.id
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);  // returns the list of articles with user emails
  });
});


// 개별 아티클을 주는 api를 만들어주세요 
// GET : /articles/:id
app.get('/articles/:id', (req, res) => {
  let id = req.params.id;

  const query = `
    SELECT articles.id, articles.title, articles.content, articles.created_at, users.email
    FROM articles
    JOIN users ON articles.user_id = users.id
    WHERE articles.id = ?
  `;
  
  db.get(query, [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ message: "Article not found" });
    }
    res.json(row);  // 반환되는 결과에 작성자의 이메일이 포함됩니다.
  });
});

db.all(query, [articleId], (err, rows) => {
  if (err) {
    return res.status(500).json({ error: err.message });
  }
  res.json(rows);  // 반환되는 결과에 댓글 작성자의 이메일이 포함됩니다.
});


app.delete("/articles/:id", (req, res) => {
  const id = req.params.id;

  // 인증 토큰에서 유저 ID 추출
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "인증 토큰이 필요합니다." });
  }

  const token = authHeader.split(' ')[1];
  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: "유효하지 않은 토큰입니다." });
    }

    const userId = decoded.id;  // 토큰에서 유저 ID 추출

    // 해당 게시글의 작성자 확인
    const query = `SELECT user_id FROM articles WHERE id = ?`;
    db.get(query, [id], (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!row) {
        return res.status(404).json({ message: "Article not found" });
      }

      if (row.user_id !== userId) {
        return res.status(403).json({ error: "게시글 삭제 권한이 없습니다." });
      }

      // SQL 삭제 쿼리
      const sql = 'DELETE FROM articles WHERE id = ?';
      db.run(sql, id, function(err) {
        if (err) {
          console.error(err.message);
          return res.status(500).json({ error: err.message });
        }

        // this.changes: 영향을 받은 행의 수
        res.json({ message: `총 ${this.changes}개의 아티클이 삭제되었습니다.` });
      });
    });
  });
});

app.put('/articles/:id', (req, res) => {
  let id = req.params.id;
  let { title, content } = req.body;

  // 인증 토큰에서 유저 ID 추출
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "인증 토큰이 필요합니다." });
  }

  const token = authHeader.split(' ')[1];
  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: "유효하지 않은 토큰입니다." });
    }

    const userId = decoded.id;  // 토큰에서 유저 ID 추출

    // 해당 게시글의 작성자 확인
    const query = `SELECT user_id FROM articles WHERE id = ?`;
    db.get(query, [id], (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!row) {
        return res.status(404).json({ message: "Article not found" });
      }

      if (row.user_id !== userId) {
        return res.status(403).json({ error: "게시글 수정 권한이 없습니다." });
      }

      // SQL 업데이트 쿼리 (파라미터 바인딩 사용)
      const sql = 'UPDATE articles SET title = ?, content = ? WHERE id = ?';
      db.run(sql, [title, content, id], function(err) {
        if (err) {
          console.error('업데이트 에러:', err.message);
          return res.status(500).json({ error: err.message });
        }

        // this.changes: 영향을 받은 행의 수
        res.json({ message: '게시글이 업데이트되었습니다.', changes: this.changes });
      });
    });
  });
});





app.get('/gettest/:id', (req, res)=>{

  console.log(req.query)
  console.log(req.params.id)


  res.send("ok")
})


app.post('/posttest', (req, res)=>{
  console.log(req.body)
  res.send("ok")
})


// POST /articles/:id/comments 라우트
app.post("/articles/:id/comments", (req, res) => {
  const articleId = req.params.id;
  const content = req.body.content;
  
  // 토큰에서 유저 ID 추출
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "인증 토큰이 필요합니다." });
  }

  const token = authHeader.split(' ')[1];
  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: "유효하지 않은 토큰입니다." });
    }

    const userId = decoded.id;  // 토큰에서 유저 ID 추출
    const createdAt = new Date().toISOString();  // 현재 날짜/시간

    const sql = `INSERT INTO comments (content, created_at, article_id, user_id) VALUES (?, ?, ?, ?)`;
    db.run(sql, [content, createdAt, articleId, userId], function(err) {
      if (err) {
        console.error("댓글 삽입 중 에러 발생:", err);
        return res.status(500).json({ error: "댓글을 등록하는데 실패했습니다." });
      }

      res.status(201).json({
        id: this.lastID,
        content: content,
        created_at: createdAt,
        article_id: articleId,
        user_id: userId
      });
    });
  });
});



const bcrypt = require('bcrypt');
const saltRounds = 10; // 일반적으로 10이면 충분함

app.post('/users', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).send("Email and password are required.");
  }

  // 비밀번호 해싱
  bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
    if (err) {
      return res.status(500).send("Error hashing password");
    }

    const query = `INSERT INTO users (email, password) VALUES (?, ?)`;

    db.run(query, [email, hashedPassword], function (err) {
      if (err) {
        if (err.message.includes("UNIQUE constraint failed")) {
          return res.status(409).send("Email already exists.");
        }
        return res.status(500).send("Database error: " + err.message);
      }

      res.status(201).send({
        id: this.lastID,
        email,
      });
    });
  });
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).send("이메일과 패스워드를 입력해주세요");
  }

  const query = `SELECT * FROM users WHERE email = ?`;

  db.get(query, [email], (err, user) => {
    if (err) {
      return res.status(500).send("DB 오류: " + err.message);
    }

    if (!user) {
      return res.status(404).send("이메일이 없습니다");
    }

    // 비밀번호 비교
    bcrypt.compare(password, user.password, (err, result) => {
      if (err) {
        return res.status(500).send("비밀번호 확인 중 오류 발생");
      }

      if (!result) {
        return res.status(401).send("패스워드가 틀립니다");
      }

      // JWT 토큰 생성
      const token = jwt.sign(
        { id: user.id, email: user.email }, // payload
        SECRET_KEY,                         // 비밀 키
        { expiresIn: '1h' }                 // 옵션: 1시간 유효
      );

      // 성공 응답
      res.send({
        message: "로그인 성공!",
        token: token
      });
    });
  });
});

app.get('/logintest', (req, res)=>{
  console.log(req.headers.authorization.split(' ')[1])
  let token = req.headers.authorization.split(' ')[1]


  jwt.verify(token, SECRET_KEY, (err, decoded)=>{
    if(err){
      return res.send("에러!!!")
    }

    return res.send('로그인 성공!')

  })
})
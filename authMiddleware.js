function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
  
    if (!authHeader) {
      return res.status(401).send('인증 헤더 없음');
    }
  
    const token = authHeader.split(' ')[1];
  
    jwt.verify(token, secretKey, (err, decoded) => {
      if (err) {
        return res.status(401).send('토큰 검증 실패');
      }
  
      // 인증 성공 시 decoded 안에 있는 사용자 정보 req에 저장
      req.user = decoded;
      next(); // 다음 미들웨어 or 라우터로
    });
  }

const express = require('express');
const app = express();
const authMiddleware = require('./authMiddleware');

app.get('/logintest', authMiddleware, (req, res) => {
  // req.user에 디코딩된 정보 있음
  res.send(`로그인 성공! 사용자: ${req.user.name || '알 수 없음'}`);
});

// 로그인 필요 없는 라우터는 그냥 사용
app.get('/public', (req, res) => {
  res.send('누구나 접근 가능!');
});
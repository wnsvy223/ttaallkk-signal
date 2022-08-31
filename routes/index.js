/*
<RTCMultiConnection>
The MIT License
Copyright (c) 2014-2018 Muaz Khan <muazkh@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.    
*/
var express = require('express');
var router = express.Router();
var RTCMultiConnectionServer = require('../lib/rtcmulticonnection-server');
var config = {
    "socketURL": "/",
    "dirPath": "",
    "homePage": "/",
    "socketMessageEvent": "RTCMultiConnection-Message",
    "socketCustomEvent": "RTCMultiConnection-Custom-Message",
    "port": 9001,
    "sslKey": "./keys/key.pem",
    "sslCert": "./keys/cert.pem",
    "enableLogs": false,
    "isUseHTTPs": true,
    "enableAdmin": false,
};
var crypto = require("crypto");
var ejs = require("ejs");
var admin = require("firebase-admin");
var nodemailer = require('nodemailer');

var transporter = nodemailer.createTransport({ 
    service: 'naver', 
    auth: { 
      user: process.env.NMAIL_ID, 
      pass: process.env.NMAIL_PASSWORD  
    }
});

module.exports = function(io){
  
    /* Single Page Application 이므로 모든 경로로 들어온 요청은 index페이지를 랜더링 */
    router.get('*', function(req, res, next) {
      res.format({
          'text/html': function () { // 페이지 랜더링, 페이지 Push & Pop, 새로고침 요청
            res.render('index');
          },
        
          'application/json': function () {  // AJAX 요청
            res.send({data: true});
          },
        
          'default': function () {
            res.status(406).send('Not Acceptable')
          }
        });
    });

    /* POST 관리자페이지 */
    router.post('/admin', function(req, res, next) {
      // POST 요쳥으로 넘어온 uid값을 admin모듈로 관리자 구분값 있는지 체크. 관리자일 경우 관리자 페이지, 아닐경우 오류페이지
      admin.auth().verifyIdToken(req.body.idToken).then((decodedToken) => { // 토큰 검증
          admin.auth().getUser(decodedToken.uid).then((userRecord) => { // 관리자 구분값 유무 검증
            if(userRecord.customClaims.admin){
              res.render('admin', {
                NMAIL : process.env.NMAIL_ID,
                ADMIN_EMAIL : process.env.ADMIN_EMAIL,
                SUB_ADMIN_EMAIL : process.env.SUB_ADMIN_EMAIL
              });
            }
            return;
          }).catch(error =>{
            res.status(404);
            res.render('error404', {error: error});
          });
        })
        .catch((error) => {
            res.status(403);
            res.render('error403', {error: error});
        });     
    });

    /* RTCMulticonnection 소켓 연결 처리 */
    io.on('connection', function(socket){
      RTCMultiConnectionServer.addSocket(io, socket, { config: config });
      const params = socket.handshake.query;
      if (!params.socketCustomEvent) {
          params.socketCustomEvent = 'custom-message';
      }
      socket.on(params.socketCustomEvent, function(message) {
          socket.broadcast.emit(params.socketCustomEvent, message);
          console.log('소켓이벤트 : ' + JSON.stringify(params.socketCustomEvent) );
          console.log('메시지 : ' + JSON.stringify(message));
      });

      /* 대화 상대 초대 요청 FCM 전송 */
      socket.on('send-Fcm-Request-Invite', function(message) {
        var deviceToken = message.to;
        var data = message.data;
        var payload = {
          data: {
              title: data.title,
              body: data.body,
              icon: data.icon,
              roomName: data.roomName,
              password: data.password,
              fromUserToken: data.fromUserToken
          },
        }                        
        var options = {
            priority: "high"
        }
        if(deviceToken){
          admin.messaging().sendToDevice(deviceToken, payload, options)
            .then(response=>{
              console.log('대화방 초대 FCM 전송' + JSON.stringify(response));
            })
            .catch(function(error) {
              console.log('대화방 초대 FCM 오류:', error);
            });      
        }else{
            console.log('디바이스 토큰이 등록되지 않은 사용자 입니다.');
        }    
      });

      /* 대화 상대 초대에 대한 응답 FCM 전송 */
      socket.on('send-Fcm-Response-Invite', function(message) {
        var deviceToken = message.to;
        var data = message.data;
        var payload = {
          data: {
              response: data.response,
              fromUserId: data.fromUserId
          },
        }                        
        var options = {
            priority: "high"
        }    
        if(deviceToken){
          admin.messaging().sendToDevice(deviceToken, payload, options)
            .then(response=>{
              console.log('대화방 초대 응답 FCM 전송' + JSON.stringify(response));
            })
            .catch(function(error) {
              console.log('대화방 초대 응답 FCM 오류:', error);
            }); 
        }else{
            console.log('디바이스 토큰이 등록되지 않은 사용자 입니다.');
        }
      });
    
      /* 이메일 인증 */
      socket.on('verify-email', function(account, callback){
        generateVerificationCodeEmail(account, callback); // 인증 코드 이메일 생성
        socket.isVerify = true; // 소켓 객체에 인증진행상태 플래그 변수 추가     
        socket.on('disconnect', function(){ // 인증 진행도중 연결 해제 시 처리
          if(socket.isVerify === true){ // 인증진행상태 플래그 변수가 true(진행중)일때만 소켓연결해제 이벤트 캐치하여 사용자 삭제처리
            admin.auth().getUser(account.uid).then(function(userRecord) {
              if(userRecord.emailVerified === false){ // 이메일 인증 전에 연결 해제 시 사용자 삭제처리
                admin.auth().deleteUser(userRecord.uid).then(function() {
                  removeVerifyNode(userRecord.uid);
                  console.log('연결이 종료되어 인증 진행중인 사용자를 삭제하였습니다.');
                })
                .catch(function(error) {
                    console.log('인증중 연결종료 사용자 삭제 오류 :', error);
                });
              }
            })
            .catch(function(error) {
              console.log('Error fetching user data:', error);
            });
          }
        });
      });

      /* 사용자가 직접 회원가입창을 닫을경우 */
      socket.on('verify-cancel', function(uid, callback){
        removeVerifyNode(uid); // 인증노드 삭제
        admin.auth().deleteUser(uid).then(function() { // 사용자 삭제
            callback({
              status: 200,
              message: 'signup is canceled'
            });
            socket.isVerify = false;
        })
        .catch(function(error) {
          callback({
            status: 404,
            message: 'error' + error
          });
          socket.isVerify = false;
        });
      });

      /* 이메일로 전송된 인증코드값 유효성 확인 */ 
      socket.on('verify-token-check', function(verify, callback){
        admin.database().ref('verify').child(verify.uid).once('value', function(accountData){
          if(accountData.exists()){
            if(verify.token === accountData.child('token').val()){
              admin.auth().getUser(accountData.child('uid').val()).then(function(auth){
                setAdminUser(auth.email); // 관리자 유저 생성
                updateEmailVerification(auth.uid, verify, callback); // 사용자 메일 인증상태 업데이트
                socket.isVerify = false; // 인증완료되면 플래그 변수 false로 만들어서 소켓연결해제 이벤트에서 사용자 삭제 수행되지 않도록 처리
              });
            }else{
              callback({
                status: 400,
                error: 'verification code is invalid.'
              });
            }
          }else{
            callback({
              status: 403,
              error:'verification code is not exist.'
            });
          }
        });
      });
         
      /* 사용자의 알림 노드 세팅 */
      socket.on('set-value-notification', function(postData){
        // 댓글이 달린 게시글의 작성자를 조회하여 작성자의 알림노드에 값 세팅
        admin.database().ref('board').child(postData.board).child(postData.postKey).once('value', function(snapshot){
          if(snapshot.exists()){
            var postOwner = snapshot.child('uid').val();
            var notificationData = {
              isRead: false,
              board: postData.board,
              postKey: postData.postKey,
              replyKey: postData.replyKey,
              replyUserNickname: postData.replyUserNickname,
              timestamp: postData.timestamp
            }
            admin.database().ref('notification').child(postOwner).child(postData.replyKey).set(notificationData);
          }
        });
      });

      /* 댓글알림 FCM 푸시 메시지 전송 */
      socket.on('replyFCM', function(message){
        var deviceToken = message.deviceToken;
        var payload = {
          data: {
            title: message.title,
            body: message.body,
            key: message.key,
            board: message.board
          }
        }
        var options = {
          priority: "high"
        }    
        admin.messaging().sendToDevice(deviceToken, payload, options).then(function(response){
          console.log('댓글 알림 메시지 전송 성공 : ' + JSON.stringify(response));
        }).catch(function(error){
          console.log('댓글 알림 메시지 오류 : ' + error);
        });
      });

      /* 친구 추가 */
      socket.on('add-friend', function(relation){
        if(relation){
          admin.database().ref('relation').child(relation.fromUser).child(relation.toUser).set({
            status : "accept"
          });
          admin.database().ref('relation').child(relation.toUser).child(relation.fromUser).set({
            status : "idle"
          });
        }else{
          console.log('친구 추가 소켓 데이터 누락' + JSON.stringify(relation));
        }
      });

      /* 친구 추가 수락 */
      socket.on('add-friend-accept', function(accept){
        if(accept){
          admin.database().ref('relation').child(accept.fromUser).child(accept.toUser).set({
            status : "accept"
          }, function(error){
            if(error){
              console.log('친구 요청 수락 오류 : ' + error);
            }else{
              console.log('친구 요청 수락 성공' + accept.fromUser + " ==> " + accept.toUser);
            }
          });
        }else{
          console.log('친구 추가 수락 소켓 데이터 누락 ' + JSON.stringify(accept));
        }
      });

      /* 친구 추가 거절 */
      socket.on('add-friend-reject', function(reject){
        if(reject){
          admin.database().ref('relation').child(reject.fromUser).child(reject.toUser).set({
            status : "reject"
          }, function(error){
              if(error){
                console.log('친구 요청 거절 오류 : ' + error);
              }else{
                console.log('친구 요청 거절 성공' + reject.fromUser + " ==> " + reject.toUser);
              }
          });
        }else{
          console.log('친구 추가 거절 소켓 데이터 누락 ' + JSON.stringify(reject));
        }
      });
    });

    return router;
}

// 암호화 내장 모듈 crypto를 이용하여 인증코드를 생성
function generateVerificationCodeEmail(account, callback){
  var key_one = crypto.randomBytes(256).toString('hex').substr(100, 5);
  var key_two = crypto.randomBytes(256).toString('base64').substr(50, 5);
  var token = key_one + key_two;
  var users = {
    uid: account.uid,
    token: token
  }
  admin.database().ref('verify').child(account.uid).set(users, function(err){
    if(err){
      callback({error: err, message: err.message});
    }else{
      sendCustomVerificationCodemail(account, token, callback); // 인증코드 포함된 메일 전송
    }
  });
}

// SMTP 모듈을 이용하여 인증 코드 메일 전송
function sendCustomVerificationCodemail(account, code, callback){
  // 커스텀 이메일 템플릿을 랜더링해서 전송 
  ejs.renderFile("views/mail.ejs", { code: code, displayName: account.displayName }, function (err, template) {
    if (err) {
        console.log(err);
    } else {
      var mailOptions = {
        from : process.env.NMAIL_ID,
        to : account.email,
        subject: `TTAALLKK 회원가입 인증 메일`,
        html: template
      }
      transporter.sendMail(mailOptions, function(error, info){
        if(error){
          console.log('인증코드 메일 전송 오류 :' + error);
          callback({error: error, message: error.message});
        }else{
          console.log('인증코드 메일 전송 성공' + JSON.stringify(info));
          callback({info: info.response});
        }
        transporter.close();
      });
    }
  });
}

// 이메일 인증 상태 업데이트
function updateEmailVerification(uid, verify, callback){
  admin.auth().updateUser(uid, {
      emailVerified: true,
      displayName: verify.displayName
  }).then(function(userRecord){
      console.log('Success updating user:' + JSON.stringify(userRecord));
      callback({
        status: 200,
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName
      });
      removeVerifyNode(userRecord.uid);
  }).catch(function(error) {
      console.log('Error updating user:', error);
  });
}

// 인증에 사용된 DB노드 삭제
function removeVerifyNode(uid){
  admin.database().ref('verify').child(uid).remove().then(function(){
      console.log('인증 노드 삭제 성공');
  }).catch(function(error){
      console.log('인증 노드 삭제 오류 : ' + error);
  });
}

// 관리자 유저 커스텀 클레임값 세팅
function setAdminUser(email){
  if (email && (email === process.env.ADMIN_EMAIL || email === process.env.SUB_ADMIN_EMAIL)) {
    admin.auth().getUserByEmail(email).then((firebaseUser) => {
      if (firebaseUser.emailVerified === true) {
        return admin.auth().setCustomUserClaims(firebaseUser.uid, {
          admin: true,
          accessLevel: 9
        });
      }
    })
    .catch((error) => {
      console.log('커스텀 클레임 세팅 오류 : ' + error);
    });
  }
}
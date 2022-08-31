importScripts('https://www.gstatic.com/firebasejs/7.17.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/7.17.1/firebase-messaging.js');

// 포그라운드 푸시 클릭 (FCM 초기화 전에 클릭 콜백이 정의되어있으면 파이어폭스 브라우저에서 클릭 동작 안하는 이슈있음.)
self.onnotificationclick = function(event) {
  event.preventDefault();
  var postKey = event.notification.data.click_action; // 푸시로 넘어온 댓글달린 게시글 키값
  var typeOfBoard = event.notification.data.board_type;
  event.notification.close();
  event.waitUntil(clients.matchAll({
    type: "window"
  }).then(function(clientList) {
    for (var i = 0; i < clientList.length; i++) {
      var client = clientList[i];
      if (client.url == ('/board/free/detail?postKey=' + postKey) && 'focus' in client){
        return client.focus();
      }
    }
    if (clients.openWindow){
      if(typeOfBoard === "free"){
        return clients.openWindow('/board/free/detail?postKey=' + postKey);
      }else{
        return clients.openWindow('/board/gta/detail?postKey=' + postKey);
      }
    }
  }));
};

// 백그라운드 처리
firebase.initializeApp({ // 프로젝트 설정
    apiKey: "AIzaSyAO2EsLBIg6XRvgSCpOzFYg6cVzI0JvjEY",
    authDomain: "webvoice-d99c6.firebaseapp.com",
    databaseURL: "https://webvoice-d99c6.firebaseio.com",
    projectId: "webvoice-d99c6",
    storageBucket: "webvoice-d99c6.appspot.com",
    messagingSenderId: "486884665140",
    appId: "1:486884665140:web:95ae5c5b2edd27b0",
    measurementId: "G-BEKXY7G9VJ"
});
const messaging = firebase.messaging();
messaging.setBackgroundMessageHandler(function(payload) {
  
    // 백그라운드 푸시 클릭
    self.onnotificationclick = function(event) {
      event.preventDefault();
      var postKey = event.notification.data.click_action; // 푸시로 넘어온 댓글달린 게시글 키값
      var typeOfBoard = event.notification.data.board_type;
      event.notification.close();
      event.waitUntil(clients.matchAll({
        type: "window"
      }).then(function(clientList) {
        for (var i = 0; i < clientList.length; i++) {
          var client = clientList[i];
          if (client.url == ('/board/free/detail?postKey=' + postKey)  && 'focus' in client){
            return client.focus();
          }
        }
        if (clients.openWindow){
          if(typeOfBoard === "free"){
            return clients.openWindow('/board/free/detail?postKey=' + postKey);
          }else{
            return clients.openWindow('/board/gta/detail?postKey=' + postKey);
          }
        }
      }));
    };

    // 게시판 댓글 푸시일 경우에만 노티호출
    if(payload.data.key){ 
      var notificationTitle = payload.data.title;
      var click_action = payload.data.key;
      var board_type = payload.data.board;
      var notificationOptions = {
        body: payload.data.body,
        icon: "https://img.icons8.com/cotton/2x/profile-face.png",
        vibrate: [500,110,500,110,450,110,200,110,170,40,450,110,200,110,170,40,500],
        data:{
          click_action,
          board_type
        },
      };
      self.registration.showNotification(notificationTitle, notificationOptions);
    }
});
/*
<RTCMultiConnection>
The MIT License
Copyright (c) 2014-2018 Muaz Khan <muazkh@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.    

<Howler>
The MIT License
Copyright (c) 2013-2019 James Simpson and GoldFire Studios, Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

<Autolinker>
The MIT License (MIT)
Copyright (c) 2014 Gregory Jacobs (http://greg-jacobs.com)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
"use strict";

import * as consts from './utills/consts.js';
import * as utills from './utills/utills.js';
import * as gtaBoard from './controller/gtaboard.js';
import * as freeBoard from './controller/freeboard.js';
import * as friendController from './controller/friend.js';
import { connectionInstance } from './controller/main.js'; // connection instance
import * as userDAO from './model/userDAO.js';
import * as Toast from '../lib/toast.js';
import * as Loader from '../lib/loader.js';

// [connection instance]
// connection 인스턴스는 프로젝트 전체에서 2개가 생성되어 사용
// 1. main 모듈에서 사용하는 공개방 조회를 위한 인스턴스  
// 2. RTCMultiConnectionClient 모듈에서 사용하는 음성대화용 인스턴스
// 회원가입 모니터링에 사용될 인스턴스는 main 모듈에 이미 생성되었던 것을 사용하여 추가 연결되지 않도록 함.

var connection = new RTCMultiConnection(); // RTCMulticonnection 객체 생성.
var isSubscribed = false; // 푸시 구독 상태 구분값.
var isError = false; // 노티 오류 상태 구분값.
var isOnAir = false; // 음성대화중 상태 구분값.
var serviceWorkerRegister = null; // 서비스워커 저장용 전역변수.
var filesObjectForMultiUser = {}; // 파일 및 참가자 데이터 객체.(Multi Files For Multi Users)
var progressHelper = {}; // 파일 전송 진행상태 정보객체
var isActiveFAB = false; // 플로팅 액션 버튼 활성화 구분값.
var fabCount = 0; // 플로팅 액션 버튼상의 채팅메시지 카운트 배지.
const fabCountMax = 100; // 플로팅 액션 버튼 배지 카운트 최대값. 최대보다 큰값은 +Count로 표기.

getLocaIpAddress(); // 로컬유저 아이피 주소 조회(By Google Stun Server)

registerServiceWorker();
//unRegisterServiceWorker();
if (typeof Notification !== 'undefined') {
    if(Notification.permission !== 'granted'){
        requestPermission();
    }
}

if(firebase.messaging.isSupported()){
    firebase.messaging().onMessage((payload) => {
        if(firebase.auth().currentUser){
            console.log('포그라운드 수신 : ' + JSON.stringify(payload));
            if(payload.data.roomName){ // 대화방 초대용 FCM 메시지 수신
                var roomName = payload.data.roomName;
                $("#modal-invite-title").text(payload.data.title);
                $("#modal-invite-body").text(payload.data.body);
                $("#modal-invite-img").attr("src", payload.data.icon);
                $("#modal-invite").modal();
                if(payload.data.password){
                    connection.password = payload.data.password;
                }
                $("#modal-invite-ok").off('click').on('click', function(event){ // 초대 승인
                    event.preventDefault();
                    if(isOnAir){
                        alert('이미 대화중입니다. 진행중인 대화를 종료하고 다시 참가하세요.')
                    }else{
                        connectionRTC(connection.extra.uid, connection, roomName);
                        connection.join(roomName, function(isJoinedRoom, roomName, error){
                            if(error){
                                if (error === 'Room not available') {
                                    alert('사용할 수 없는 방입니다.');
                                    redirectMain();  
                                    return;
                                } 
                                if(error === 'Room full'){
                                    alert('인원수가 초과되었습니다.');
                                    redirectMain();
                                    return;
                                }
                            }else{
                                $("#modal-invite").modal("hide");
                                if(payload.data.fromUserToken){
                                    sendFcmResponseInvite("accept", payload.data.fromUserToken);
                                }
                            }
                        });
                        onAir(roomName); 
                    }        
                });
                $("#modal-invite-cancel").off('click').on('click', function(event){ // 초대 거절
                    event.preventDefault();
                    if(payload.data.fromUserToken){
                        sendFcmResponseInvite("refuse", payload.data.fromUserToken);
                    }
                });
            }else if(payload.data.response){ // 대화방 초대에 대한 수락 or 거절 응답 FCM 메시지 수신
                var addIcon = $("#" +payload.data.fromUserId + "add-icon");
                if(payload.data.response === "accept"){
                    console.log(payload.data.fromUserId + '님이 수락함');
                    addIcon.removeClass('fas fa-spinner fa-pulse fa-lg');
                    addIcon.addClass('fas fa-plus');
                }else if(payload.data.response === "refuse"){
                    console.log(payload.data.fromUserId + '님이 거절함');
                    addIcon.removeClass('fas fa-spinner fa-pulse fa-lg');
                    addIcon.addClass('fas fa-plus');
                }
            }else{ // 댓글 작성 FCM 수신
                var title = payload.data.title;
                var clickAction = payload.data.key;
                var boardType = payload.data.board;
                var profileUrl = payload.data.icon;
                if(!profileUrl){
                    profileUrl = consts.defaultProfileUrl;
                }
                var options = {
                    body: payload.data.body,
                    icon: profileUrl,
                    vibrate: [500,110,500,110,450,110,200,110,170,40,450,110,200,110,170,40,500],
                    data:{
                        clickAction,
                        boardType
                    },
                };
                if ('serviceWorker' in navigator) {
                    serviceWorkerRegister.showNotification(title, options);   
                }  
            }
        }
    });    
}

// firebase유저 세션상태에 따라 로그인폼 세팅
$(document).ready(function(){
    firebase.auth().onAuthStateChanged(function(user){
        if(user){
            console.log('세션유지 O');
            //console.log("유저정보 : " + JSON.stringify(user));
            // 관리자 이메일 계정을 서버쪽의 firebase admin모듈에서 제공되는 커스텀 클레임을 이용하여 관리자 계정으로 세팅함.
            // admin모듈에 의해 관리자 권한으로 세팅되어진 계정은 공지사항 영역 읽기/쓰기 가능.
            user.getIdTokenResult()
            .then((idTokenResult) => {
                monitoringUservalue(user.uid, idTokenResult.claims.admin, function(){
                    getCurrentUserFriend(user);
                });
                monitoringUserNotificaion(user);
            })
            .catch((error) => {
                console.log(error);
            });     
            $("#id_j").attr("disabled", true);
            $("#id_c").attr("disabled", true);
        }else{
            console.log('세션유지 X');
            $("#id_j").attr("disabled", false);
            $("#id_c").attr("disabled", false);
        }
    });
});

// 사용자 정보 변경값 모니터링 함수. 디바이스 토큰, 닉네임, 프로필값의 경우 유동적으로 변경이 이루어 지는 값이기 때문에 모니터링 함수를 이용하여 변경 이벤트 캐치 후 뷰 갱신
function monitoringUservalue(uid, isAdminUser, callback){
    consts.userRef.child(uid).on('value', function(snapshot){      
        if(snapshot.exists()){
            var token = snapshot.child('deviceToken').val(); // 디바이스 토큰
            var userNickname = snapshot.child('userNickname').val(); // 사용자 닉네임
            var userProfileUrl = snapshot.child('profileUrl').val(); // 프로필 사진
            updateUserDeviceToken(token);
            updateUserNickname(userNickname)
            updateUserProfile(userProfileUrl)
            updateUserReplyNotificaion(uid);
            updateUserFriendNotificaation(uid);
            isAuthSuccess(snapshot.val(), isAdminUser, callback); // 사용자 정보 조회값으로 로그인 뷰 세팅
        }                         
    });
}
// 디바이스 토큰 갱신된 값으로 푸시구독상태 태그변수 변경
function updateUserDeviceToken(token){
    if(!token){
        isSubscribed = false;
    }else{
        isSubscribed = true;
    }     
}

// 닉네임 갱신된 값으로 뷰 변경
function updateUserNickname(nickname){
    if($("#sidebar-userNickname").length){
        $("#sidebar-userNickname").text(nickname);
    } 
}

// 프로필 사진 갱신된 값으로 뷰 변경
function updateUserProfile(profileUrl){
    if($("#profileUrl").length){
        $("#profileUrl").attr("src",profileUrl);
    }
}

// 댓글알림 배지 갱신값으로 뷰 변경 
// 사용자 정보 업데이트 이벤트 발생할 시 댓글알림값도 once로 단발 조회후 업데이트. 실시간 모니터링은 monitoringUserNotificaion함수를 이용
async function updateUserReplyNotificaion(uid){
    await userDAO.getReplyNotificaion(uid).then(function(count){
        if(count > 0){
            $("#notification-badge-alarm").attr('style', 'visibility:visible'); // 사이드바에 있는 댓글 알림 배지
            $("#notification-badge-alarm").text(count);
        }else{
            $("#notification-badge-alarm").attr('style', 'visibility:hidden');
        }
    });
    await userDAO.getTotalBadgeCount(uid).then(function(total){ // 햄버거메뉴에 있는 전체 알림 배지
        if(total > 0){
            $("#sidebar-total-badge").attr('style', 'visibility:visible');
            $("#sidebar-total-badge").text(total); 
        }else{
            $("#sidebar-total-badge").attr('style', 'visibility:hidden');
        }
    });
}

// 친구알림 배지 갱신값으로 뷰 변경
// 사용자 정보 업데이트 이벤트 발생할 시 친구알림값도 once로 단발 조회후 업데이트. 실시간 모니터링은 getCurrentUserFriend함수를 이용
async function updateUserFriendNotificaation(uid){
    await userDAO.getFriendRequestNotification(uid).then(function(count){
        if(count > 0){
            $("#notification-badge-friend").attr('style', 'visibility:visible');
            $("#notification-badge-friend").text(count);
        }else{
            $("#notification-badge-friend").attr('style', 'visibility:hidden');
        }
    });
    await userDAO.getTotalBadgeCount(uid).then(function(total){ // 햄버거메뉴에 있는 전체 알림 배지
        if(total > 0){
            $("#sidebar-total-badge").attr('style', 'visibility:visible');
            $("#sidebar-total-badge").text(total); 
        }else{
            $("#sidebar-total-badge").attr('style', 'visibility:hidden');
        }
    });
}

// 현재 접속한 사용자의 알림정보 실시간 모니터링 함수 (읽지 않은 상태의 알림메시지 50개 제한)
function monitoringUserNotificaion(user){
    consts.notificationRef.child(user.uid).orderByChild('isRead').equalTo(false).limitToLast(consts.maxNotificatiionLimitCount).on('value', function(notification){
        if(notification.exists()){
            var count = notification.numChildren(); // 알림갯수
            $("#notification-badge-alarm").attr('style', 'visibility:visible'); // 사이드바에 있는 댓글 알림 배지
            $("#notification-badge-alarm").text(count);
        }else{
            $("#notification-badge-alarm").attr('style', 'visibility:hidden');
        }
        userDAO.getTotalBadgeCount(user.uid).then(function(total){ // 햄버거메뉴에 있는 전체 알림 배지
            if(total > 0){
                $("#sidebar-total-badge").attr('style', 'visibility:visible');
                $("#sidebar-total-badge").text(total); 
            }else{
                $("#sidebar-total-badge").attr('style', 'visibility:hidden');
            }
        });
    });
}

// 현재 접속한 사용자 친구정보
function getCurrentUserFriend(user){
    // 현재 접속 유저의 전체 친구관계 정보 모니터링
    consts.relationRef.child(user.uid).on('value', function(relation){
        updateUserFriendNotificaation(user.uid); // 친구 추가 요청 승인대기 상태의 모니터링하여 배지 표시
        if(relation.exists()){
            relation.forEach(function(friend){
                // 현재 접속유저에 대한 친구의 상태 변화 이벤트 모니터링
                consts.relationRef.child(friend.key).child(user.uid).on('child_changed', function(friendsRelation){
                    if(friendsRelation.exists()){
                        var myToFriendStatus = friend.child('status').val(); // 나의 친구에 대한 상태값
                        var friendToMyStatus = friendsRelation.val(); // 친구의 나에 대한 상태값
                        if(friendToMyStatus=== "accept" && myToFriendStatus === "accept"){ // 친구입니다.
                            $("#" + friend.key).removeClass('dim-view');
                            consts.userRef.child(friend.key).child('userNickname').once('value', function(friendNickname){ // 친구 닉네임값 조회
                                if(friendNickname.exists()){
                                    $("#" + friend.key).find('h').text(friendNickname.val());
                                }else{
                                    $("#" + friend.key).find('h').text('닉네임 조회 오류');
                                }   
                            });
                        }else if(friendToMyStatus === "reject" && myToFriendStatus === "accept"){ // 상대방이 거절
                            $("#" + friend.key).removeClass('dim-view');
                            $("#" + friend.key).find('h').text('상대방이 거절하였습니다.');
                        }else if(friendToMyStatus === "accept" && myToFriendStatus === "reject"){ // 내가 거절
                            $("#" + friend.key).removeClass('dim-view');
                            $("#" + friend.key).find('h').text('본인이 거절하였습니다.'); 
                        }else{
                            $("#" + friend.key).find('h').text('친구 추가 오류');
                        }
                    }
                });
            });
            $("#relation-empty").css('display', 'none'); // 친구목록 있으면 친구없음 메시지 제거
        }else{
            $("#relation-empty").css('display', 'block'); // 친구목록 없으면 친구없음 메시지 추가
        }
    });

    // 현재 접속 유저의 친구에 대한 상태 변화 이벤트 모니터링
    consts.relationRef.child(user.uid).on('child_changed', async function(friend){
        if(friend.exists()){
            var friendNickname = await consts.userRef.child(friend.key).child('userNickname').once('value'); // 친구 닉네임값
            if(friend.child('status').val() === "reject"){ // 본인이 거절상태
                $("#" + friend.key).removeClass('dim-view');
                $("#" + friend.key).find('h').text('본인이 거절하였습니다.');
            }else if(friend.child('status').val() === "accept"){ // 친구입니다.
                $("#" + friend.key).removeClass('dim-view');
                if(friendNickname.exists()){
                    $("#" + friend.key).find('h').text(friendNickname.val());
                }else{
                    $("#" + friend.key).find('h').text('닉네임 조회 오류');
                }
            }else{
                $("#" + friend.key).find('h').text('친구 추가 오류');
            }
        }
    });

    // 현재 접속 유저의 친구 추가 이벤트 모니터링
    consts.relationRef.child(user.uid).on('child_added', async function(myFriendsList){
        if(myFriendsList.exists()){
            var friend = await  consts.userRef.child(myFriendsList.key).once('value'); // 친구의 사용자 정보 조회
            var friendsToMyRelation = await consts.relationRef.child(myFriendsList.key).child(user.uid).once('value'); // 친구의 나에 대한 상태 정보 조회
            if(friend.exists() && friendsToMyRelation.exists()){
                $("#" + friend.key).remove(); // 중복된 row 제거
                var friendToMyStatus = friendsToMyRelation.child('status').val(); // 친구의 나에 대한 상태값
                var myToFriendStatus = myFriendsList.child('status').val(); // 나의 친구에 대한 상태값
                var friendsRow = "";
                if(myToFriendStatus === "accept" && friendToMyStatus === "idle"){ // 본인이 친구 추가 요청하여 대기상태
                    friendsRow += "<li class='dim-view' id='"+ friend.key +"'>";
                    friendsRow += "<img class='img-circle' src='"+ friend.child('profileUrl').val() +"'>";
                    friendsRow += "<h class='relation-nickname'>대기중입니다.</h>";
                    friendsRow += "<i class='far fa-trash-alt icon-friend-remove' value='"+ friend.key +"'></i>"
                    friendsRow += "</li>";
                }else if(myToFriendStatus === "accept" && friendToMyStatus === "accept"){ // 친구입니다.
                    friendsRow += "<li id='"+ friend.key +"'>";
                    friendsRow += "<img class='img-circle' src='"+ friend.child('profileUrl').val() +"'>";
                    friendsRow += "<h class='relation-nickname'>"+ friend.child('userNickname').val() +"</h>";
                    friendsRow += "<i class='far fa-trash-alt icon-friend-remove' value='"+ friend.key +"'></i>"
                    friendsRow += "</li>";
                }else if(myToFriendStatus === "reject" && friendToMyStatus === "accept"){ // 본인이 거절상태
                    friendsRow += "<li id='"+ friend.key +"'>";
                    friendsRow += "<img class='img-circle' src='"+ friend.child('profileUrl').val() +"'>";
                    friendsRow += "<h class='relation-nickname'>본인이 거절하였습니다.</h>";
                    friendsRow += "<i class='far fa-trash-alt icon-friend-remove' value='"+ friend.key +"'></i>"
                    friendsRow += "</li>";
                }else if(myToFriendStatus === "accept" && friendToMyStatus === "reject"){ // 상대방이 거절 상태
                    friendsRow += "<li id='"+ friend.key +"'>";
                    friendsRow += "<img class='img-circle' src='"+ friend.child('profileUrl').val() +"'>";
                    friendsRow += "<h class='relation-nickname'>상대방이 거절하였습니다.</h>";
                    friendsRow += "<i class='far fa-trash-alt icon-friend-remove' value='"+ friend.key +"'></i>"
                    friendsRow += "</li>";
                }else if(myToFriendStatus === "idle" && friendToMyStatus === "accept"){ // 상대방이 친구 추가 요청하여 본인이 수락or거절 선택 상태
                    friendsRow += "<li class='dim-view' id='"+ friend.key +"'>";
                    friendsRow += "<img class='img-circle' src='"+ friend.child('profileUrl').val() +"'>";
                    friendsRow += "<h class='relation-nickname'>친구 추가 요청</h>";
                    friendsRow += "<i class='far fa-trash-alt icon-friend-remove' value='"+ friend.key +"'></i>"
                    friendsRow += "<div id='"+ friend.key + "relation-btn-from" +"' class='btn-group'>";
                    friendsRow += "<button value='"+ friend.key +"' class='btn btn-success add-friend-accept'><i class='fas fa-check-circle divide-right-5px'></i>수락</button>";
                    friendsRow += "<button value='"+ friend.key +"' class='btn btn-warning add-friend-reject'><i class='fas fa-times-circle divide-right-5px'></i>거절</button>";                                              
                    friendsRow += "</div>";   
                    friendsRow += "</li>";
                }else{
                    friendsRow += "<li><h class='relation-nickname'>친구 추가 오류<h></li>";
                }
                $("#sidebar-friend-list-menu").append(friendsRow);
            }else{
                // 친구가 나를 삭제한 상태
                var deleteRow = "<li class='dim-view' id='"+ friend.key +"'>";
                deleteRow += "<img class='img-circle' src='"+ friend.child('profileUrl').val() +"'>";
                deleteRow += "<h class='relation-nickname'>상대방이 거절하였습니다.</h>";
                deleteRow += "<i class='far fa-trash-alt icon-friend-remove' value='"+ friend.key +"'></i>"
                deleteRow += "</li>";
                $("#sidebar-friend-list-menu").append(deleteRow);
            }
        }
    }); 

    // 현재 접속 유저의 친구 삭제 이벤트 모니터링 
    consts.relationRef.child(user.uid).on('child_removed', function(friend){
        if(friend.exists()){
            $("#" + friend.key).remove(); // 친구목록에서 해당 친구 행 삭제
        }
    });

    // 친추 수락 버튼
    $(document).off('click', ".add-friend-accept").on('click', ".add-friend-accept", function(event){
        event.preventDefault();
        var toUser = $(this).attr('value');
        friendController.friendAccept(toUser, function(){
            console.log('친추 수락 성공 콜백' + toUser)
            $("#" + toUser + "relation-btn-from").remove();
        });
    });

    // 친추 거절 버튼
    $(document).off('click', ".add-friend-reject").on('click', ".add-friend-reject", function(event){
        event.preventDefault();
        var toUser = $(this).attr('value');
        friendController.friendReject(toUser, function(){
            console.log('친추 거절 성공 콜백' + toUser)
            $("#" + toUser + "relation-btn-from").remove();
        });
    });

    // 친구 삭제 버튼
    $(document).off('click', ".icon-friend-remove").on('click', ".icon-friend-remove", function(event){
        event.preventDefault();
        var deleteUser = $(this).attr('value');
        friendController.friendRemove(deleteUser);
    });
}

// 이미지 파일 선택 및 미리보기 
function previewImage(imageFile, preview, arr){
    // imageFile : 선택한 이미지 파일 
    // preview : 선택한 이미지 파일 미리보기할 image 요소
    // arr : 이미지 저장할 배열
    var file = document.querySelector(imageFile);
    file.onchange = function () {
        arr.shift(); // 이미지 선택값이 바뀔경우를 대비하여 파일 변화가 생기면 배열의 1번째 요소를 삭제하여 배열에는 항상 새로선택한 값이 들어가도록함.
        var fileList = file.files ;
        var reader = new FileReader();
        if(fileList.length > 0){
            reader.readAsDataURL(fileList[0]);
            reader.onload = function  () {
                document.querySelector(preview).src = reader.result ;
                var fileUrl = reader.result;
                arr.push(fileUrl);
            };  
        }
    };
}

// 회원가입 모달 프리뷰
var imageArray = []; 
$(document).ready(function(){   
    previewImage("#getfile", "#preview", imageArray); 
    $("#signup-modal").on('hidden.bs.modal', function (){    
        imageArray = []; // 모달 닫히면 배열 초기화
    });
}); 

// 프로필 편집 모달 프리뷰
var editImageArray = [];
$(document).ready(function(){    
    previewImage("#getfileEdit", "#previewEdit", editImageArray);
    $("#edit-modal").on('hidden.bs.modal', function (){    
        editImageArray = []; // 모달 닫히면 배열 초기화
    });
}); 

// 프로필 편집 처리
$(document).ready(function(){         
    $("#edit-submit").click(function(event){
        event.preventDefault();
        var inputNickname = $("#nickname-edit").val();
        if(!inputNickname){
            alert('닉네임을 입력하세요.');
        }else{
            consts.userRef.orderByChild('userNickname').equalTo(inputNickname).once('value', function(snapshot){
                if(snapshot.exists()){
                    alert('동일한 닉네임이 존재합니다.'); // 닉네임 중복 체크
                }else{
                    if(editImageArray.length > 0 && !inputNickname){
                        userDAO.uploadStorage(editImageArray[0], "", "editProfile"); // 프로필 사진만 변경
                    }
                    if(editImageArray.length <= 0 && inputNickname){
                        userDAO.updateUserValue("userNickname", inputNickname); // 닉네임만 변경
                    }
                    if(editImageArray.length > 0 && inputNickname){
                        userDAO.uploadStorage(editImageArray[0], inputNickname, "editBoth"); // 프로필사진 & 닉네임 변경
                    }
                }
            });
        }     
    }); 
});

// 방 만들기
$(document).ready(function(){
    $("#submitCreate").click(function(event){
        event.preventDefault();
        var roomname =  $("#roomname_c").val();
        var password =  $("#password_c").val();
        var id =  $("#id_c").val();
        var isPublicRoom = $("#fancy-checkbox-primary").prop('checked');
        var maxCountOfUsers = $("#count-of-users").val(); // 인원수 설정값
        if(!roomname){
            alert('방이름을 입력하세요.');
        }else if(!password && !isPublicRoom){
            alert('비밀번호를 입력하세요.');
        }else if(!id){
            alert('닉네임을 입력하세요.');
        }else if(!maxCountOfUsers){
            alert('인원수를 입력하세요.');
        }else if(consts.maxParticipantsAllowedCount < maxCountOfUsers){
            alert('최대 허용 인원수는 100명 입니다.');
        }else{
            connectionRTC(id, connection, roomname, maxCountOfUsers);  
            createRoom(roomname, password, connection, maxCountOfUsers);
            onAir(roomname);
        }
        $("#submitCreate").dropdown("toggle");    
    });
});

// 방 참가하기
$(document).ready(function(){
    $("#submitJoin").click(function(event){
        event.preventDefault();
        var roomname =  $("#roomname_j").val();
        var password =  $("#password_j").val();
        var id =  $("#id_j").val();
        var isPublicRoomJoin = $("#fancy-checkbox-primary-join").prop('checked');
        if(!roomname){
            alert('방이름을 입력하세요.');
        }else if(!password && !isPublicRoomJoin){
            alert('비밀번호를 입력하세요.');
        }else if(!id){
            alert('닉네임을 입력하세요.');
        }else{
            connectionRTC(id, connection, roomname, null); 
            joinRoom(roomname, password, connection); 
            onAir(roomname);
        }  
        $('#submitJoin').dropdown("toggle");        
    });
});

// 회원가입
$(document).ready(function(){       
    $("#signup").off('click').on('click', function(event){
        $("#signup-modal").modal('toggle');
        $("#signup-submit").off('click').on('click', function(event){ 
            event.preventDefault();
            var userid = $("#userid-signup").val();
            var userpassword = $("#userpassword-signup").val();
            var userNickname = $("#nickname-signup").val();
            //var url = imageArray[0]; // 회원가입용 프로필 사진 url값
            var url = $("#preview")
            if(!userNickname){
                $("#input-nickname-signup").addClass("has-error");
                $("#input-id-signup").removeClass("has-error");
                $("#input-password-signup").removeClass("has-error");
                $("#label-id-signup").text("이메일");
                $("#label-password-signup").text("비밀번호");
                $("#label-nickname-signup").text("닉네임을 입력하세요."); 
            }else if(!userid){
                $("#input-id-signup").addClass("has-error");
                $("#input-nickname-signup").removeClass("has-error");
                $("#input-password-signup").removeClass("has-error");
                $("#label-nickname-signup").text("닉네임");
                $("#label-password-signup").text("비밀번호");
                $("#label-id-signup").text("이메일을 입력하세요."); 
            }else if(!userpassword){
                $("#input-password-signup").addClass("has-error");
                $("#input-nickname-signup").removeClass("has-error");
                $("#input-id-signup").removeClass("has-error");
                $("#label-nickname-signup").text("닉네임");
                $("#label-id-signup").text("이메일");
                $("#label-password-signup").text("비밀번호를 입력하세요.");  
            }else{
                $("#signup-submit").css('display', 'none');
                Loader.showLoader($("#btn-signup"));    
                checkAutheDuplicate({
                    email: userid,
                    password: userpassword,
                    nickname: userNickname,
                    url: url
                }, function(error){
                    signupVerifyErrorHandler(error);
                });
            }           
        });
    });
});

// 닉네임 중복 체크
function checkAutheDuplicate(account, callback){
    consts.userRef.orderByChild('userNickname').equalTo(account.nickname).once('value', function(snapshot){
        if(snapshot.exists()){
          callback({
              name:'nickname-exists',
              message: 'This nickname is exists. please change another nickname.'
          });
        }else{
            //firebase.auth().useDeviceLanguage(); // 인증 이메일 언어 설정(현재 브라우저에 적용된 언어로 자동 설정)
            if(account.url){
                signupCustomEmailVerify(account, account.url, true, callback);
            }else{
                signupCustomEmailVerify(account, consts.defaultProfileUrl, false, callback);
            }
        }
    });
}

// 이메일 인증 회원가입
function signupCustomEmailVerify(account, profileUrl, isUrlExist, callback){
    firebase.auth().createUserWithEmailAndPassword(account.email, account.password).then(firebaseUser => {
        connectionInstance.getSocket(function(socket){
            var userAccount = {
                email: firebaseUser.user.email,
                uid: firebaseUser.user.uid,
                displayName: account.nickname,
                profileUrl: profileUrl
            }  
            // 인증메일 전송 요청
            requestSendVerifyEmailSocket(socket, userAccount, callback, false);

            // 인증메일의 인증코드 확인 요청
            $(document).off('click', '#verify-token-check').on('click', '#verify-token-check', function(event){
                event.preventDefault();
                var verify = {
                    token: $("#verify-token").val(),
                    uid: firebaseUser.user.uid,
                    displayName: userAccount.displayName
                }
                requestCheckVerifyCodeSocket(socket, verify, userAccount, isUrlExist, callback);
            });

            // 인증메일 재전송 요청
            $(document).off('click', '#resend-verify-email').on('click', '#resend-verify-email', function(event){
                event.preventDefault();
                requestSendVerifyEmailSocket(socket, userAccount, callback, true);
            });
            
            // 가입 인증 수동 취소
            $("#signup-close").off('click').on('click', function(event){
                event.preventDefault();
                requestCancelVerifySocket(socket, firebaseUser.user.uid, callback);
            });
        });
    }, error => {
        // 에러 핸들링
        signupFirebaseAuthErrorHandler(error);
    });
}

// 인증 메일 전송요청 소켓메시지(재전송 요청 플래그변수에 따라 분기)
function requestSendVerifyEmailSocket(socket, userAccount, callback, isReSend){
    // 인증 메일 전송
    socket.emit('verify-email', userAccount ,function(result){
        if(isReSend === true){
            if(result.error){
                callback({
                    name : 'error-email-re-send',
                    message : result.error
                });
            }else{
                console.log("인증 메일 재전송 성공" + result.info);
                alert('인증 메일이 재전송 되었습니다.');
            }
        }else{
            if(result.error){
                callback({
                    name : 'error-email-send',
                    message : result.error
                });
            }else{
                console.log("인증 메일 전송 성공" + result.info);
                renderEmailVerifyForm();
            }
            Loader.hideLoader();
        }
    });
}

// 인증코드 확인 소켓메시지
function requestCheckVerifyCodeSocket(socket, verify, userAccount, isUrlExist, callback){
    socket.emit('verify-token-check', verify, function(response){
        switch(response.status){
            case 200:
                console.log('메일 인증 코드 인증성공' +  JSON.stringify(response));
                if(isUrlExist === true){
                    // 프로필 있는 경우 DB에는 빈값 세팅후 업로드 함수 수행후 값 세팅
                    userDAO.setUserValue({
                        uid: response.uid,
                        email: response.email,
                        profileUrl: "",
                        userNickname: response.displayName
                    }, function(error){
                        if(!error){
                            $("#signup-modal").modal('hide');
                        }
                    });
                    userDAO.uploadStorage(userAccount.profileUrl, response.displayName, "signUp"); // 프로필사진 업로드
                }else{
                    // 프로필 없는 경우 기본 프로필값 세팅
                    userDAO.setUserValue({
                        uid: response.uid,
                        email: response.email,
                        profileUrl: userAccount.profileUrl,
                        userNickname: response.displayName
                    }, function(error){
                        if(!error){
                            $("#signup-modal").modal('hide');
                        }
                    });
                }
                break;
            case 400:
                callback({
                    name: 'invalid-verify-code',
                    message: response.error
                });
                break;
            case 403:
                callback({
                    name: 'none-exists-verification-code',
                    message: response.error
                });
                break;
            default:
        }
    });
}

// 가입 인증 수동 취소
function requestCancelVerifySocket(socket, uid, callback){
    socket.emit('verify-cancel', uid, function(res){
        callback({
            name: 'cancel-verify',
            message: res.message
        })
    });
}

// 인증메일 전송 콜백을 받으면회 원가입 모달에서 인증코드 확인 창 생성
function renderEmailVerifyForm(){
    $("#nickname-signup").prop('disabled', true);
    $("#userid-signup").prop('disabled', true);
    $("#userpassword-signup").prop('disabled', true);
    var verifyForm = "<div id='verify-form'>";
        verifyForm += "<input type='password' id='verify-token' class='form-control text-center' placeholder='인증코드를 입력하세요.'/>";
        verifyForm += "<div>";
        verifyForm += "<button id='verify-token-check' class='btn btn-verify'>인증코드확인</button>";
        verifyForm += "<button id='resend-verify-email' class='btn btn-verify'>메일 재전송</button>";
        verifyForm += "</div>";
        verifyForm += "</div>";
    $("#btn-signup").append(verifyForm);
}

// 커스텀 이메일 인증 오류 핸들러
function signupVerifyErrorHandler(error){
    console.warn(`${error.name}: ${error.message}`);
    Loader.hideLoader();
    switch(error.name){
        case 'nickname-exists':
            $("#input-nickname-signup").addClass('has-error');
            $("#input-id-signup").removeClass('has-error');
            $("#input-password-signup").removeClass('has-error');
            $("#label-id-signup").text("이메일");
            $("#label-password-signup").text("비밀번호");
            $("#label-nickname-signup").text("이미 가입된 닉네임 입니다.");
            $("#signup-submit").css('display', 'block');
            break;
        case 'invalid-verify-code':
            alert('인증 코드가 맞지않습니다. 정확한 인증 코드를 입력해 주세요.');
            break;
        case 'cancel-verify':
            alert('메일 인증이 취소되었습니다.');
            $("#signup-submit").css('display', 'block');
            break;
        case 'error-email-send':
            alert('인증 메일 전송에 실패하였습니다. 잠시 후 다시 시도해주세요.');
            $("#signup-submit").css('display', 'block');
            break; 
        case 'error-email-re-send':
            alert('인증 메일 재전송에 실패하였습니다. 잠시 후 인증 메일을 재전송해주세요.');
            break; 
        case 'none-exists-verification-code':
            alert('인증 코드가 정상적으로 발급되지 않았습니다. 잠시 후 다시 시도해주세요.');
            $("#signup-submit").css('display', 'block');
            break; 
        default: 
    }
}

// Firebase Auth 인증 오류 핸들러
function signupFirebaseAuthErrorHandler(error){
    console.warn('registerUserAndWaitEmailVerification: createUserWithEmailAndPassword failed ! '+error.message+' ('+error.code+')');
    Loader.hideLoader();
    $("#signup-submit").css('display', 'block');
    switch(error.code){
        case 'auth/email-already-in-use':
            $("#input-id-signup").addClass("has-error");
            $("#input-password-signup").removeClass("has-error");
            $("#input-nickname-signup").removeClass("has-error");
            $("#label-password-signup").text("비밀번호");
            $("#label-nickname-signup").text("닉네임");
            $("#label-id-signup").text("이미 가입된 사용자 이메일 입니다.");
            break;
        case 'auth/operation-not-allowed':
            $("#input-id-signup").removeClass("has-error");
            $("#input-password-signup").removeClass("has-error");
            $("#input-nickname-signup").removeClass("has-error");
            $("#label-password-signup").text("비밀번호");
            $("#label-nickname-signup").text("닉네임");
            $("#label-id-signup").text("이메일");
            Toast.toastError('현재 회원 시스템이 비활성화 상태입니다.');
            break;
        case 'auth/uid-already-exists':
            $("#input-id-signup").addClass("has-error");
            $("#input-password-signup").removeClass("has-error");
            $("#input-nickname-signup").removeClass("has-error");
            $("#label-password-signup").text("비밀번호");
            $("#label-nickname-signup").text("닉네임");
            $("#label-id-signup").text("제공된 uid를 기존 사용자가 이미 사용하고 있습니다.");
            break;
        case 'auth/session-cookie-expired':
            console.warn('세션 쿠키가 만료되었습니다.');
            break;
        case 'auth/weak-password':                 
            $("#input-password-signup").addClass("has-error");
            $("#input-id-signup").removeClass("has-error");
            $("#input-nickname-signup").removeClass("has-error");
            $("#label-id-signup").text("이메일");
            $("#label-nickname-signup").text("닉네임");
            $("#label-password-signup").text("비밀번호는 6자 이상 입력해야 합니다.");
            break;
        case 'auth/invalid-email':
            $("#input-id-signup").addClass("has-error");
            $("#input-password-signup").removeClass("has-error");
            $("#input-nickname-signup").removeClass("has-error");
            $("#label-password-signup").text("비밀번호");
            $("#label-nickname-signup").text("닉네임");
            $("#label-id-signup").text("이메일 형식의 아이디를 입력해 주세요.");
            break;
        default:
    }
}

// 로그인
$(document).ready(function(){
    $("#login").click(function(event){
        event.preventDefault();
        var userid = $("#userid").val();
        var userpassword = $("#userpassword").val();   
        var isPersistenceConfirm = $("#fancy-checkbox-primary-session").prop('checked'); // 로그인 유지 체크박스 상태값
        if(!userid){
            Toast.toastError('아이디를 입력하세요.');
        }else if(!userpassword){
            Toast.toastError('비밀번호를 입력하세요.');
        }else{
            if(isPersistenceConfirm){
                firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL)
                .then(function() {
                    loginFirebaseAuth(userid, userpassword);
                    console.log('인증세션(TYPE : LOCAL - 지속성 인증)');
                })
                .catch(function(error) {
                  var errorCode = error.code;
                  var errorMessage = error.message;
                  console.log('인증세션(TYPE : LOCAL) 세팅 오류 : ' + errorCode + '내용 :' + errorMessage);
                });
            }else{
                firebase.auth().setPersistence(firebase.auth.Auth.Persistence.SESSION)
                .then(function() {
                    loginFirebaseAuth(userid, userpassword);
                    console.log('인증세션(TYPE : SESSION - 탭 or 브라우저창 단위 단발성 인증)');
                })
                .catch(function(error) {
                  var errorCode = error.code;
                  var errorMessage = error.message;
                  console.log('인증세션(TYPE : SESSION)  세팅 오류 : ' + errorCode + '내용 :' + errorMessage);
                });
            }   
        }               
    });
});


// 로그인 처리
function loginFirebaseAuth(userid, userpassword){
    firebase.auth().signInWithEmailAndPassword(userid, userpassword)
        .then(function(firebaseUser){ 
            firebaseUser.user.getIdTokenResult()
                .then((idTokenResult) => {
                    if (!!idTokenResult.claims.admin) {
                        console.log('관리자 계정으로 로그인 되었습니다.' );
                    } else {
                        console.log('일반 계정으로 로그인 되었습니다.');
                    }
                })
                .catch((error) => {
                    console.log('Error getIdTokenResult : ' + error);
                }); 
            if(Notification.permission === 'granted'){
                getCurrentToken();
            }else{
                requestPermission();
            }
        })
        .catch(function(error){
            console.log("Login Failed" + error + "\n" + error.code + "\n" + error.message);
            switch(error.code){
                case 'auth/invalid-email':
                    Toast.toastError('이메일 형식의 아이디를 입력해 주세요');
                    break;
                case 'auth/wrong-password':
                    Toast.toastError('잘못된 비밀번호 입니다');
                    break;
                case 'auth/user-not-found':
                    Toast.toastError('가입되지 않았거나 삭제된 사용자 입니다');
                    break;
                case 'auth/operation-not-allowed':
                    Toast.toastError('현재 회원 시스템이 비활성화 상태입니다.');
                    break;
                default:
            }
        });  
}

// 로그인 성공 뷰
function isAuthSuccess(user, isAdminUser, callback){
    var userNickname = user.userNickname;
    var email = user.email;
    var profileUrl = user.profileUrl;
    if(!profileUrl){
        profileUrl = consts.defaultProfileUrl;
    }
    // 프로필 편집 모달에 로그인한 사용자 정보 값 세팅
    $("#previewEdit").attr("src", profileUrl);
    $("#userid-edit").val(email);
    $("#nickname-edit").val(userNickname);
    $("#userid-edit").attr("disabled", true);

    // 네비바, 대화방 생성 & 참가 입력창에 로그인한 사용자 닉네임값 세팅
    $("#id_j").val(userNickname);
    $("#id_c").val(userNickname);

    // 로그인 입력창에 입력된값 초기화
    $("#userid").val("");
    $("#userpassword").val("");

    // 사이드바 사용자메뉴에 사용자 정보 값 세팅
    $("#profileUrl").attr("src", profileUrl);
    $("#sidebar-userNickname").text(userNickname);
    $("#auth-tab").css("display", "none");

    // 로그인 함수 호출 시 유저 모니터링 함수도 같이 호출 되기때문에 뷰 하나 삭제
    $("#auth-tab-signed").remove();

    var signinMenu = "<li id='auth-tab-signed' class='side-tab-title'>";
    signinMenu += "<a href='#sidebar-signed-menu' data-toggle='collapse' aria-expanded='false' class='side-tab-title-text dropdown-toggle'>";
    signinMenu += "<span>사용자 설정</span>";
    signinMenu += "<span class='caret'></span>";
    signinMenu += "</a>";
    signinMenu += "<ul class='collapse list-unstyled divide-all' id='sidebar-signed-menu'>";
    signinMenu += "<li>";
    signinMenu += "<form class='form-dropdown-center'>";       
    signinMenu += "<div id='noti' class=''>";
    signinMenu += "<span class='push-label'>알림설정</span>";
    signinMenu += "<label class='switch' for='switch'>";   
    if(isError){ // 알림 설정값 상태에 따라 뷰 변경
        signinMenu += "<input type='checkbox' id='switch'/>";
        signinMenu += "<div class='slider round text-center'><span><i class='fas fa-exclamation-triangle'></i></span></div>";
    }else if(isSubscribed){
        signinMenu += "<input type='checkbox' id='switch' checked/>";
        signinMenu += "<div class='slider round text-center'><span><i class='fas fa-bell'></i></span></div>";
    }else{
        signinMenu += "<input type='checkbox' id='switch'/>";
        signinMenu += "<div class='slider round text-center'><span><i class='fas fa-bell-slash'></i></span></div>";
    }  
    signinMenu += "</label>"; 
    signinMenu += "</div>";
    signinMenu += "</form>";
    if(isAdminUser){ // 관리자 계정일 경우 관리자 메뉴 버튼 활성화
        signinMenu += "<div class='form-group form-dropdown-input form-dropdown-center'>";
        signinMenu += "<form id='admin-form' role='form' method='post' action='/admin' enctype='application/x-www-form-urlencoded'>"
        signinMenu += "<input id='idToken' name='idToken' type='hidden' value=''>";
        signinMenu += "<button type='submit' id='menu-admin' class='btn btn-danger btn-block'><i class='fas fa-user-lock'></i> 관리자 메뉴 </button>";
        signinMenu += "</form>";
        signinMenu += "</div>";  
    } 
    signinMenu += "<div class='form-group form-dropdown-input form-dropdown-center'>";
    signinMenu += "<button type='submit' id='friends' class='btn btn-success btn-block'><i class='fas fa-user-friends'></i> 친구 검색 </button>";
    signinMenu += "</div>";
    signinMenu += "<div class='form-group form-dropdown-input form-dropdown-center'>";
    signinMenu += "<button type='submit' id='profile' class='btn btn-info btn-block'><i class='fas fa-user-edit'></i> 프로필 편집 </button>";
    signinMenu += "</div>";
    signinMenu += "<div class='form-group form-dropdown-input form-dropdown-center'>";
    signinMenu += "<button type='submit' id='logout' class='btn btn-warning btn-block'><i class='fas fa-sign-out-alt'></i> 로그아웃 </button>";
    signinMenu += "</div>";
    signinMenu += "<div class='form-group form-dropdown-input form-dropdown-center'>";
    signinMenu += "</div>";
    signinMenu += "</li>";
    signinMenu += "</ul>";

    // 친구목록
    signinMenu += "<a id='friends-list' class='side-tab-title-text dropdown-toggle' href='#sidebar-friend-list-menu' data-toggle='collapse' aria-expanded='false'>";
    signinMenu += "<span>친구목록</span>"
    signinMenu += "<span id='notification-badge-friend' class='label label-as-badge'></span>";
    signinMenu += "<span class='caret'></span>";
    signinMenu += "</a>";
    signinMenu += "<ul class='collapse list-unstyled divide-all' id='sidebar-friend-list-menu'>";
    signinMenu += "<li id='relation-empty'>친구 목록이 없습니다.</li>";
    signinMenu += "</ul>";

    // 알림목록
    signinMenu += "<a id='notification-list' class='side-tab-title-text' tabindex='0' data-toggle='popover' data-trigger='focus' title='알림'>";
    signinMenu += "<span>알림</span>"
    signinMenu += "<span id='notification-badge-alarm' class='label label-as-badge'></span>";
    signinMenu += "</a>";

    signinMenu += "</li>";

    $("#user-tab").after(signinMenu); 
    if (typeof callback === 'function') {
        callback(); // 비동기방식으로 데이터를 받아 뷰가 세팅되기때문에 로그인 뷰 세팅과 친구목록 리스트뷰 세팅이 순차적으로 이루어지지 않으므로 로그인뷰가 세팅된 후 콜백을 전달해 그 이후 친구목록 리스트뷰를 추가하는 형태로 구현.
    }

    // 프로필 편집 모달 호출
    $(document).ready(function(){
        $("#profile").click(function(){
            $("#edit-modal").modal('toggle');
        });
    });

    // 관리자 페이지 호출
    $(document).ready(function(){
        $("#menu-admin").click(function(e){
            e.preventDefault();
            firebase.auth().currentUser.getIdToken(/* forceRefresh */ true).then(function(idToken) {
                $("input[name=idToken]").val(idToken);
                $("#admin-form")[0].submit();
            }).catch(function(error) {
                console.log('관리자 페이지 호출 오류 ' + error);
            });
        });
    });

    // 로그아웃 처리
    $(document).ready(function(){
        $("#logout").click(function(){
            firebase.auth().signOut().then(function() {
                console.log('로그아웃성공');
                removeLoginView();                                                                                     
            }).catch(function(error) {
                console.log('로그아웃실패' + error);
            });
        });
    });

    // 회원탈퇴 처리
    $(document).ready(function(){
        $("#delete-auth").click(function(){
            $("#modal-auth-delete-label").removeClass('has-error');
            $("#modal-auth-delete-label").text('회원 탈퇴를 위해 비밀번호를 입력하세요.');
            $("#modal-auth-delete-check-password").modal('show');
            $("#confirm-auth-delete").off('click').on('click', function(event){
                $("#confirm-auth-delete").prop('disabled', true);
                $("#confirm-auth-delete-cancel").prop('disabled', true);
                event.preventDefault();
                var user = firebase.auth().currentUser;
                var checkPassword = $("#check-password").val();
                // firebase에서 사용자 삭제와 같은 민감한 처리를 할 때 최근 로그인한 상태(ID토큰이 만료되지 않은 상태. 1시간 단위로 ID토큰 만료됨)여야 함.
                // reauthenticateWithCredential 메소드를 통해 재인증이 필요함.
                // 모달창으로 부터 받아온 비밀번호로 재인증을 거친 후 삭제 처리 진행.
                const credential = firebase.auth.EmailAuthProvider.credential(
                    user.email,
                    checkPassword
                );
                user.reauthenticateWithCredential(credential).then(function(){
                    user.delete().then(function() {
                        console.log(user.uid + '님이 회원을 탈퇴하셨습니다.');
                        removeLoginView();                           
                        userDAO.deleteUserData(user.uid);
                    }).catch(function(error) {
                        console.log('회원탈퇴실패' + error);
                    });  
                }).catch(function(error){
                    switch(error.code){
                        case 'auth/wrong-password':
                            $("#modal-auth-delete-label").addClass('has-error');
                            $("#modal-auth-delete-label").text('잘못된 비밀번호 입니다.');
                            $("#confirm-auth-delete").prop('disabled', false);
                            $("#confirm-auth-delete-cancel").prop('disabled', false);
                            break;
                        default:    
                    }
                });       
            });
        });
    });

    // 알림 설정 버튼
    $(document).ready(function(){            
        $(".dropdown-menu .switch").on("click", function(e){
            e.stopPropagation(); // 드롭다운 메뉴 사라지지 않도록 클릭이벤트 전이 방지
        });

        $("#switch").on("click", function(e){
            if(connection.DetectRTC.browser.isSafari){
                alert('이 사이트는 사파리 브라우저 이용 시 알림기능에 제한이 있습니다. 크롬 브라우저를 이용하세요.');
            }else{
                if(Notification.permission === 'granted'){
                    if(isSubscribed){
                        deleteToken(); // 토큰을 삭제하여 푸시 수신 OFF
                    }else{
                        getCurrentToken(); // 디바이스 토큰을 다시 발급받아 DB에 세팅하여 푸시 수신 ON
                    }
                }
                if(isError){
                    $(".slider span i").addClass('fas fa-exclamation-triangle');
                }else{
                    $(".slider span i").toggleClass('fas fa-bell-slash fas fa-bell');
                }
            }
        });          
    });

    // 친구 페이지
    $(document).ready(function(){
        $("#friends").on('click', function(event){
            event.preventDefault();
            friendController.getFriendPage(); // friend controller로 부터 친구페이지 호출
            utills.setPageHistory({data: '', url: "/friends"}, "/friends");
        });    
    });

    // 알림 조회
    $(document).ready(function(){
        $("#notification-list").on('click', function(event){
            event.preventDefault();
            userDAO.getCurrentUserNotification(user.uid).then(function(result){
                $(".popover-content").empty();
                if(result){
                    result.forEach(function(row){
                        var pop = "<div id='"+ row.replyKey +"' class='noti-row'>";
                            pop += "<span class='noti-content'>"+ row.replyUserNickname + "님이 댓글을 남겼습니다." +"</span>";
                            pop += "<p class='noti-timestamp pull-right'>"+ moment(row.timestamp).fromNow() +"</p>";
                            pop += "</div>";
                        $(".popover-content").append(pop);
                        if(row.isRead === true){
                            $("#" + row.replyKey).addClass('is-read'); // 읽은 알림 메시지는 회색 dim-view 처리
                        }
                        $("#" + row.replyKey).data('row', row); // data 속성을 이용하여 notification row 조회값 데이터 저장
                    });
                }
            });
        });
    });

    // 알림 목록의 각 행 클릭 시 저장된 값을 가져와서 해당 댓글이 달린 게시물로 이동
    $(document).off('click', '.noti-row').on('click', '.noti-row', function(event){
        event.preventDefault();
        var notiRow = $(this).data('row'); // data 속성에 저장된 각 노티들의 오브젝트값 가져옴
        userDAO.updateNotificationIsRead(user.uid, notiRow.replyKey, function(){
            $("#" + notiRow.replyKey).addClass('is-read'); // 알림 읽음 처리 콜백을 받아 해당 알림 목록 뷰 읽음 표시 처리
        });
        switch(notiRow.board){ // 댓글이 작성된 해당 게시글로 이동
            case 'gta':
                gtaBoard.gtaBoardDetail(notiRow.postKey);
                break;
            case 'free':
                freeBoard.freeBoardDetail(notiRow.postKey);
                break;
            default:
        }
    });
}

// 서비스워커 제거
function unRegisterServiceWorker(){
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function(registrations) {
        for(let registration of registrations) {
            registration.unregister();
            isSubscribed = false;
            console.log('서비스워커 제거');
        }}).catch(function(err) {
            console.log('Service Worker registration failed: ', err);
        });
    }
}

// 서비스워커 등록
function registerServiceWorker(){
    if(firebase.messaging.isSupported()){
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/firebase-messaging-sw.js')
            .then((registration) => {
                serviceWorkerRegister = registration; // 서비스 워커 등록 객체를 전역으로 사용하기 위한 변수
                firebase.messaging().useServiceWorker(registration);                        
                console.log('서비스워커 등록 성공');
            }).catch(function(err) {
                console.log('서비스워커 등록 실패: ', err);
                isError = true;
            });
        }
    }
}

// 알림 권한 요청. 성공시 디바이스 토큰 가져옴
function requestPermission() {
    Notification.requestPermission().then((permission) => {
        if(permission === 'granted'){        
            console.log('알림 권한 승인됨');
            getCurrentToken();
        }else if(permission === 'denied'){
            console.log('알림 권한 거부');
            return;
        }else{
            console.log('알림 권한 미설정');
            return;
        }
    });
}

// 디바이스 토큰 삭제
function deleteToken() {
    if(firebase.messaging.isSupported()){
        firebase.messaging().getToken().then((currentToken) => {
            firebase.messaging().deleteToken(currentToken).then(() => {
                console.log('토큰삭제성공');
                userDAO.deleteTokenToServer((error) => {
                    if(error){
                        $(".slider span i").addClass('fas fa-exclamation-triangle');
                        Toast.toastError('알림 설정 오류');
                    }else{
                        isSubscribed = false;
                        Toast.toastWarning('알림 해제');
                    }
                });
            }).catch((err) => {
                console.log('Unable to delete token. ', err);
                $(".slider span i").addClass('fas fa-exclamation-triangle');
                Toast.toastError('알림 설정 오류');
            });
        }).catch((err) => {
            console.log('Error retrieving Instance ID token. ', err);
            $(".slider span i").addClass('fas fa-exclamation-triangle');
            Toast.toastError('알림 설정 오류');
        });
    }
}

// 디바이스 토큰값을 발급받아 서버에 저장
function getCurrentToken(){
    if(firebase.messaging.isSupported()){
        firebase.messaging().getToken().then((currentToken) => {
            if(currentToken) {
                console.log("토큰발급성공");
                userDAO.setTokenToServer(currentToken, function(error){
                    if(error){
                        $(".slider span i").addClass('fas fa-exclamation-triangle');
                        Toast.toastError('알림 설정 오류');
                    }else{
                        isSubscribed = true;
                        Toast.toastSuccess('알림 설정');
                    }
                });
            }else{
                console.log('No Instance ID token available. Request permission to generate one.');
                requestPermission();
            }
        }).catch((err) => {
            console.log('An error occurred while retrieving token. ', err);
            $(".slider span i").addClass('fas fa-exclamation-triangle');
        });
    }
}

// 로그인된 유저 뷰 요소 삭제
function removeLoginView(){
    onExit();  // 대화종료           
    // 입력폼에 세팅되었던 로그인 유저정보 삭제
    $("#id_j").val("");
    $("#id_c").val(""); 
    $("#input-id-login").removeClass('has-error');
    $("#input-password-login").removeClass('has-error');
    // 로그인 뷰 초기화
    $("#auth-tab").css("display", "");
    $("#auth-tab-signed").remove();
    $("#profileUrl").attr("src", consts.defaultProfileIcon);
    $("#sidebar-userNickname").text("Guest");
    $("#sidebar-total-badge").attr('style', 'visibility:hidden'); // 햄버거 버튼의 알림 배지 삭제
    $("#signup-modal").modal('hide'); // 회원가입 모달 초기화
    $("#edit-modal").modal('hide'); // 프로필 모달 초기화
    $("#modal-auth-delete-check-password").modal('hide');    
    $("#confirm-auth-delete").prop('disabled', false);
    $("#confirm-auth-delete-cancel").prop('disabled', false);  
}


// 메인화면으로 리다이렉트(인증세션은 유지, socket & RTC 연결은 해제)
function redirectMain(){
    window.location.href = '/';
}

// 방 생성 : checkPresence로 방 존재유무 체크 후 
function createRoom(roomName, password, connection, maxCountOfUsers){           
    var isPublicRoom = $("#fancy-checkbox-primary").prop('checked'); // 공개방 여부 체크값
    var now = moment().format('YYYY-MM-DD HH:mm:ss');
    connection.checkPresence(roomName, function(isRoomExist, roomid, extra) {
        if (isRoomExist === true) {                
            alert('같은 이름의 방이 이미 존재합니다.');  
            redirectMain();           
        }else{
            if(isPublicRoom){
                // 공개방
                connection.password = null; // 공개방은 비밀번호값 설정X
                connection.publicRoomIdentifier = consts.publicRoomIdentifier; // 공개방을 구분하기 위한 세팅값
                connection.open(roomName, function(isRoomOpened, roomName, error){
                    if(isRoomOpened && !error){
                        console.log('방 생성 완료(공개방)');
                    }else{
                        console.log('방 생성 오류(공개방) :' + error);
                    }   
                });
            }else{
                // 비공개방
                connection.password = password; // 비밀번호
                connection.publicRoomIdentifier = roomName; // 비공개 방은 방 구분자를 방 제목으로 하여 조회 하도록 함.
                connection.open(roomName, function(isRoomOpened, roomName, error){
                    if(isRoomOpened && !error){
                        console.log('방 생성 완료(비공개방)');
                    }else{
                        console.log('방 생성 오류(비공개방) :' + error);
                    }         
                });
            }      
        }
    });           
}


// 방 참가
function joinRoom(roomName, password, connection){
    var isPublicRoom = $("#fancy-checkbox-primary-join").prop('checked'); // 공개방 여부 체크값

    // checkPresence로 참가하려는 방 존재 유무 체크 후 존재할 경우 넘어온 password값으로 방 참가 (error인자값으로 유효성 체크)
    connection.checkPresence(roomName, function(isRoomExist, roomid, extra) {
        if (isRoomExist === true) {  
            if(isPublicRoom){
                // 공개방
                if(extra._room.isPasswordProtected){ // 공개방 체크박스 체크 후, 참가하려는 방이 비밀번호가 설정된 방일 경우 비밀번호 입력요구 경고창 호출.
                    alert('비밀번호가 설정된 방입니다. 비밀번호를 입력하세요.');
                    redirectMain();  
                    return;
                }else{
                    connection.join(roomName, function(isRoomJoined, roomName, error){
                        if(error){
                            switch(error){
                                case 'Room not available':
                                    alert('사용할 수 없는 방입니다.');
                                    break;
                                case 'Room full':
                                    alert('인원수가 초과되었습니다.');
                                    break;
                                default:
                            }
                            redirectMain();  
                            return;
                        }else{
                            console.log('참가 성공(공개방)');
                        }
                    }); 
                }   
            }else{                     
                connection.password = password;
                connection.join(roomName, function(isJoinedRoom, roomName, error){
                    if(error){
                        switch(error){
                            case 'Invalid password':
                                alert('비밀번호가 틀립니다.');
                                break;
                            case 'Room not available':
                                alert('사용할 수 없는 방입니다.');
                                break;
                            case 'Room full':
                                alert('인원수가 초과되었습니다.');
                                break;
                            default:
                        }
                        redirectMain();  
                        return;
                    }else{
                        console.log('참가성공(비공개방)');
                    }
                });         
            }                                
        } else{
            alert('생성된 방이 없습니다.');
            redirectMain();  
        }
    });
}

// 음성대화중 표시 뷰 요소 추가
function onAir(roomName){
    isOnAir = true;
    visibleDivUserList();
    renderVoiceConferenceView(roomName); // 음성대화 영역 뷰 추가
    renderChatForm(); // 텍스트 채팅창 영역 뷰 추가
}

// 음성대화 사용자 뷰
function renderVoiceConferenceView(roomName){
    var menuCreateRoom = document.getElementById("menu-create-room");
    menuCreateRoom.style.display = "none";
    var menuJoinRoom = document.getElementById("menu-join-room");
    menuJoinRoom.style.display = "none";

    // 음성대화중 상태 표시 및 음성대화종료 드롭다운 메뉴 영역
    var menuOnAir = "<li id='menu-voice-active' class='nav-item dropdown active on-air-slide-in'>";
        menuOnAir += "<a href='' data-toggle='dropdown' class='nav-link dropdown-toggle user-action'>";
        menuOnAir += "<i class='far fa-dot-circle'></i>";
        menuOnAir += "<span class='on-air'>음성대화중</span>";
        menuOnAir += "</a>";
        menuOnAir += "<ul class='dropdown-menu'>";
        menuOnAir += "<li id='disconnect-voice'><a class='dropdown-item text-center'>음성대화종료</a></li>";
        menuOnAir += "</ul>";
        menuOnAir += "</li>";
    $("#header-menu").prepend(menuOnAir);

    // 마이크 ON/OFF 컨트롤 버튼 영역
    var menuOption = "<li id='mute-audio' class='nav-item dropdown on-air-slide-in'>";
        menuOption += "<a href='' data-toggle='dropdown' class='nav-link dropdown-toggle user-action'>";
        menuOption += "<i id='icon-mute-audio' class='fas fa-microphone-alt'></i>";
        menuOption += "<span class='' id='mute-audio-span'>마이크 ON</span>";
        menuOption += "</a>";
        menuOption += "</li>";
    $("#header-menu").prepend(menuOption);

    // 음성 대화 참가 인원, 검색 뷰 영역
    var userList = "<div id='user-list' class='navbar navbar-inverse'></div>";
    $("#div-user-list").append(userList);
    
    // 모바일 디바이스가 아닐 경우에만 드래그, 리사이징 가능
    if(!connection.DetectRTC.isMobileDevice){
        // 음성대화 뷰 드래그 기능 추가
        $("#user-list").draggable();
        
        // 음성대화 뷰 리사이징 기능 추가
        $("#user-list").resizable({
            handles: "n, e, s, w, ne, se, sw, nw", // 모든방향 리사이징
            autoHide: true, // 리사이징 화살표 자동 숨김처리
        });
    }
    
    // 음성대화종료 'x' 버튼, 최소화 '-' 버튼
    var exitConv = "<div class='row exit-conv-div'>";
        exitConv += "<a id='exit-conv'><i class='fas fa-times-circle'></i></a>";
        exitConv += "<a id='minimize-conv'><i class='fas fa-minus-circle'></i></a>";
        exitConv += "</div>";
    $("#user-list").append(exitConv);  

    // 음성대화 초대 상대 검색창 영역
    var searchBar = "<div class='row divide-top divide-bottom dropdown'>";   
        searchBar += "<div id='search-user-area' class='col-md-12'>"; 
        searchBar += "<div class='input-group'>";            
        searchBar += "<input id='input-search-user' type='email' class='form-control text-center' placeholder='닉네임을 입력하세요.' required>";
        searchBar += "<span class='input-group-btn'>";
        searchBar += "<button id='btn-search-user' data-toggle='dropdown' class='btn btn-default dropdown-toggle' type='button'><span class='glyphicon glyphicon-search'></span></button>";
        searchBar += "</span>";
        searchBar += "</div>";
        searchBar += "<div id='search-list-result'></div>";
        searchBar += "</div>";
        searchBar += "</div>";    
    $("#user-list").append(searchBar);

    // 음성대화 참가중인 인원 정보 및 컨트롤 영역
    var userListDiv = "<div id='user-list-div'></div>";
    $("#user-list").append(userListDiv);
    
    $(".remote-user-info-div").draggable();  // jquery-ui-touch-punch의 모바일버전 뷰 요소 드래그 기능 함수
    $(".local-user-info-div").draggable();
    $("#user-list-div").sortable(); // jquery ui에서 제공되는 드래그 & 드랍으로 리스트 요소 이동 및 정렬 기능 함수.
    $("#user-list-div").disableSelection(); // selection 속성 사용 방지 함수.
 
    // 유저 검색 버튼
    $("#btn-search-user").off('click').on('click',function(e){
        e.preventDefault();
        var searchNickName = $("#input-search-user").val();
        if(!searchNickName){
            alert('닉네임을 입력하세요.');
            $("#search-user-list").html("");
        }else{
            searchTalkUser(searchNickName, roomName);
        }    
    });

    // 음성 대화 종료 드롭다운 메뉴
    $("#disconnect-voice").off('click').on('click', function(e){
        e.preventDefault();                                  
        onExit();
    });

    // 음성 대화 종료 'x' 아이콘
    $("#exit-conv").off('click').on('click', function(e){
        e.preventDefault();
        onExit();
    });

    // 음성 대화 창 최소화 '-' 아이콘
    $("#minimize-conv").off('click').on('click', function(e){
        e.preventDefault();
        showFAB();
        minimizeDivUserList();
    });

    // 음성 대화 창 확장 호출용 플로팅 액션 버튼
    $("#fab").off('click').on('click', function(e){
        e.preventDefault();
        hideFAB();
        maxmizeDivUserList();
    });

    // 마이크 ON/OFF 상태 변경
    // 마이크 상태 변경에 따라 ON/OFF시 발상된 이벤트를 onMute/onUmmute 함수에서 캐치하여 아이콘 상태 변경
    // connection객채의 extra에 Mute상태 구분값을 넣어 전달하여 각 유저의 초기 마이크 상태에 따라 아이콘 변경
    $("#mute-audio").click(function(){                                         
        $("i", this).toggleClass('fa-microphone-alt-slash fa-microphone-alt');
        var muteAudioSpan = $("#mute-audio-span").text();
        if(muteAudioSpan == "마이크 OFF"){
            $("#mute-audio-span").text('마이크 ON');
            connection.attachStreams.forEach(function(stream) {
                stream.unmute('audio'); 
                connection.extra.isMute = false;
                connection.updateExtraData();
            });
        }else{
            $("#mute-audio-span").text('마이크 OFF');      
            connection.attachStreams.forEach(function(stream) {
                stream.mute('audio'); 
                connection.extra.isMute = true;
                connection.updateExtraData();
            });   
        }
    });
}

// 채팅창 뷰
function renderChatForm(){
    var chatForm = "<div id='chat-form'>";    
        chatForm += "<div class='panel-heading color-dark'>";        
        chatForm += "<span class='glyphicon glyphicon-comment'></span> 채팅";           
        chatForm += "<div class='btn-group pull-right'>";            
        /* 채팅창 드롭다운 메뉴 옵션
        chatForm += "<button type='button' class='btn btn-default btn-xs dropdown-toggle' data-toggle='dropdown'>";               
        chatForm += "<span class='glyphicon glyphicon-chevron-down'></span>";                    
        chatForm += "</button>";
        chatForm += "<ul class='dropdown-menu slidedown'>";               
        chatForm += "<li><a href=''><span class='glyphicon glyphicon-refresh'>";                   
        chatForm += " </span>Refresh</a></li>";                   
        chatForm += "<li><a href=''><span class='glyphicon glyphicon-ok-sign'>";                    
        chatForm += "</span>Available</a></li>";                    
        chatForm += "<li><a href=''><span class='glyphicon glyphicon-remove'>";                  
        chatForm += "</span>Busy</a></li>";                    
        chatForm += "<li><a href=''><span class='glyphicon glyphicon-time'></span>";                   
        chatForm += "Away</a></li>";                       
        chatForm += "<li class='divider'></li>";                  
        chatForm += "<li><a href=''><span class='glyphicon glyphicon-off'></span>";                    
        chatForm += "Sign Out</a></li>";                        
        chatForm += "</ul>";
        */
        chatForm += "</div>";            
        chatForm += "</div>";  
        chatForm += "<div id='dropZone' class='panel-body panel-chat color-white color-dark'>";     
        chatForm += "<ul class='chat'></ul>";    // 채팅메시지 리스트 영역  
        chatForm += "<form name='uploadForm' id='uploadForm' enctype='multipart/form-data' method='post'>";
        chatForm += "<div id='fileDragDesc'></div>";
        chatForm += "<table id='fileListTable' width='100%' border='0px'>";
        chatForm += "</table>";
        chatForm += "</form>";
        chatForm += "</div>";
        chatForm += "<div class='panel-footer color-dark'>";            
        chatForm += "<div class='input-group'>";        
        chatForm += "<input id='input-chat-message' type='text' class='form-control input-sm' placeholder='메시지를 입력 하세요.'>";        
        chatForm += "<span class='input-group-btn'>";
        chatForm += "<button class='btn btn-success btn-sm' id='btn-send-file'><span class='glyphicon glyphicon-picture'></span></button>";           
        chatForm += "<button class='btn btn-warning btn-sm' id='btn-send-message'><span class='glyphicon glyphicon-send'></span></button>";                
        chatForm += "</span>";               
        chatForm += "</div>";                    
        chatForm += "</div>";
        chatForm += "</div>";                      

    $("#div-user-list").append(chatForm);
    
    // bootstrap의 패널바디(panel-chat)영역을 헤더와 푸터 사이에 남은 크기를 계산하여 높이 적용
    var panelHeader = $(".panel-heading").outerHeight(); // 패널 헤더 높이
    var panelFooter = $(".panel-footer").outerHeight(); // 패널 푸터 높이
    var chatFormDiv = $("#chat-form").outerHeight(); // 채팅 뷰 전체 영역 높이
    var fitHeight = chatFormDiv - (panelHeader + panelFooter);
    $(".panel-chat").css('height', fitHeight + "px");

    // 모바일 디바이스가 아닐 경우에만 드래그, 리사이징 가능
    if(!connection.DetectRTC.isMobileDevice){
        // 채팅 뷰 드래그 기능 추가
        $("#chat-form").draggable();
        
        // 채팅 뷰 리사이징 기능 추가
        $("#chat-form").resizable({
            handles: "n, e, s, w, ne, se, sw, nw", // 모든방향 리사이징
            autoHide: true, // 리사이징 화살표 자동 숨김처리
            resize : function(event,ui) { // 채팅영역이 리사이징되면 패널바디(panel-chat)부분도 비율에 맞게 리사이징
                var panelHeader = $(".panel-heading").outerHeight(); // 패널 헤더 높이
                var panelFooter = $(".panel-footer").outerHeight(); // 패널 푸터 높이
                var resizeHeight = ui.size.height - ( panelHeader + panelFooter ); // 변경해야 할 패널바디(panel-chat)의 높이값
                $(".panel-chat").css('height', resizeHeight + "px");
            },
        });
    }

    // 채팅 전송 버튼 클릭
    $("#btn-send-message").off('click').on('click', function(e){
        e.preventDefault();
        var message = $("#input-chat-message").val();
        if(!message){
            return;
        }else{
            sendMesage(message);
        }   
    });

    // 엔터키 입력해도 채팅 전송
    $("#input-chat-message").keypress(function(event){
        var keycode = (event.keyCode ? event.keyCode : event.which);
        if(keycode == '13'){
            var message = $("#input-chat-message").val();
            if(!message){
                return;
            }else{
                sendMesage(message);
            }
        }
    });
 
    $(function() {
        // 페이지에 파일 드래그시 채팅창에 드랍존 위치 표시
        var pageContainer = $("#page-container");
        var dropZone = $("#dropZone");

        pageContainer.on('dragenter', function(e) {
            e.stopPropagation();
            e.preventDefault(); 
            dropZone.addClass('dropZone-direction');
        });
        pageContainer.on('dragleave', function(e) {
            e.stopPropagation();
            e.preventDefault();
            dropZone.removeClass('dropZone-direction');
        });
        pageContainer.on('dragover', function(e) {   
            e.stopPropagation();
            e.preventDefault();    
            dropZone.addClass('dropZone-direction');
        });
        pageContainer.on('drop', function(e) {
            e.preventDefault();
            dropZone.removeClass('dropZone-direction');
        });
    });
    
    $(function() {
        // 파일 드롭 다운
        var dropZone = $("#dropZone");
 
        dropZone.on('dragenter', function(e) {
            e.stopPropagation();
            e.preventDefault();
            dropZone.css('background-color', '#5cb85c');
        });
        dropZone.on('dragleave', function(e) {
            e.stopPropagation();
            e.preventDefault();
            dropZone.css('background-color', '#FFFFFF');
        });
        dropZone.on('dragover', function(e) {
            e.stopPropagation();
            e.preventDefault();
            dropZone.css('background-color', '#5cb85c');
        });
        dropZone.on('drop', function(e) {
            e.preventDefault();
            dropZone.css('background-color', '#FFFFFF');
    
            var files = e.originalEvent.target.files || e.originalEvent.dataTransfer.files;
            if(files != null){
                if (files.length < 1){
                    console.log("폴더 업로드 불가");
                    return;
                }else if(files.length === 1){ // 파일 한개
                    connection.send(files[0]);
                }else{ // 파일 여러개
                    var merge = []; // 파일 병합용 배열
                    var users = []; // 파일 전송할 참가자 저장용 배열
                    connection.getAllParticipants().forEach(function(userid){
                        // 참가자 숫자만큼 파일 배열 복사 후 병합     
                        var clone = Array.from(files); // 복사본 파일 배열(Array.from()함수를 이용해 유사배열 -> 배열로 변경)
                        merge = merge.concat(clone); // 복사된 파일 배열 병합
                        clone.forEach(function(){
                            users.push(userid); // 전송할 총 파일 갯수와 동일한 사용자 배열 생성(각 유저당 선택한 파일 갯수만큼의 인덱스가 순차적으로 부여)
                        })  
                    });
                    filesObjectForMultiUser.index = (connection.getAllParticipants().length * files.length) -1; // 참가자수 * 파일갯수 = 전체 보내야할 파일 갯수
                    filesObjectForMultiUser.files = merge;
                    filesObjectForMultiUser.users = users;
                    sendFilesToMultipleUser();                     
                }       
            }else{
                alert("파일 선택 오류");
            }
        });
    });

    // 업로드 파일 선택 버튼
    $("#btn-send-file").on('click', function(event){
        event.preventDefault();
        var selector = new FileSelector();
        selector.selectMultipleFiles(function(files) {
            if(files != null){
                if(files.length < 1){
                    return;
                }else if(files.length === 1){ // 파일 한개
                    connection.send(files[0]);
                }else{ // 파일 여러개  
                    var merge = [];
                    var users = [];
                    connection.getAllParticipants().forEach(function(userid){    
                        var clone = Array.from(files);
                        merge = merge.concat(clone);
                        clone.forEach(function(){
                            users.push(userid);
                        })  
                    });
                    filesObjectForMultiUser.index = (connection.getAllParticipants().length * files.length) -1;
                    filesObjectForMultiUser.files = merge;
                    filesObjectForMultiUser.users = users;
                    sendFilesToMultipleUser();                           
                }
            }else{
                alert("파일 선택 오류");
            }
        });
    });
}

// 유저 검색
function searchTalkUser(userNickname, roomName){
    var result = [];
    consts.userRef.orderByChild('userNickname').startAt(userNickname).endAt(userNickname + '\uf8ff').once('value', function(snapshot){
        if(snapshot.exists()){
            snapshot.forEach(function(childsnapshot){         
                var val = childsnapshot.val();        
                if(firebase.auth().currentUser){
                    var currentUid = firebase.auth().currentUser.uid;
                    var remoteUid = childsnapshot.child('uid').val();
                    if(currentUid !== remoteUid){ // 현재 클라에 접속한 유저는 검색결과에서 제외
                        result.push(val);
                    }  
                }else{
                    result.push(val);
                }
            });           
            connection.getAllParticipants().forEach(function(pid) { // 현재 대화방에 참가해 있는 유저는 검색결과에서 제외
                var itemToFind = result.find(function(item){
                    var participantsId = connection.getExtraData(pid).uid
                    return item.uid === participantsId;
                });
                var idx = result.indexOf(itemToFind);
                if(idx > -1) result.splice(idx, 1);  
            });
        }
    }).then(function(){
        appendSearchUserList(result, roomName); 
    });
}

// 음성 대화 전체 영역(사용자 + 채팅) 보임
function visibleDivUserList(){
    $("#div-user-list").attr('style', 'visibility:visible');
}

// 음성 대화 전체 영역(사용자 + 채팅) 숨김
function hiddenDivUserList(){
    $("#div-user-list").attr('style', 'visibility:hidden');
}

// 음성 대화 사용자 영역 보임
function maxmizeDivUserList(){
    $("#div-user-list").addClass("maximize");
    $("#div-user-list").removeClass("minimize");
}

// 음성 대화 사용자 영역 숨김
function minimizeDivUserList(){
    $("#div-user-list").addClass("minimize");
    $("#div-user-list").removeClass("maximize");
}

// 플로팅 액션 버튼 보임
function showFAB(){
    isActiveFAB = true;
    $(".fab-wrapper").attr('style', 'visibility:visible');
    $("#fab").animate({width: '+=50' , height: '+=50'});
    $("#fab").find('i').animate({fontSize: '+=22px'});
}

// 플로팅 액션 버튼 숨김
function hideFAB(){
    fabCount = 0; // 플로팅 액션버튼 배지 카운트값 변수 0으로 리셋
    isActiveFAB = false;
    $("#fab").animate({width: '-=50', height: '-=50'}, function(){
        $(".fab-wrapper").attr('style', 'visibility:hidden');
    });
    $("#fab").find('i').animate({fontSize: '-=22px'});
    $("#fab").css('border', '0');
    $("#fab-message-count").attr('style', 'visibility:hidden');
    $("#fab-message-count").text('0'); // 플로팅 액션버튼 배지 뷰의 값도 0으로 리셋
}

// 플로팅 액션버튼의 채팅메시지 갯수 카운트 배지 세팅
function setFabBadgeCount(){
    var fabMessage = document.getElementById("fab-message-count");
    if(fabMessage){
        fabMessage.style.visibility = "visible";
        fabCount += 1;
        if(fabCount > fabCountMax){
            fabMessage.innerText = "+" + fabCountMax;
        }else{
            fabMessage.innerText = fabCount;
        }
    }
}

// 다수의 유저에게 다수의 파일 전송
// (다수의 유저에게 다수 파일 동시 전송 시, onFileEnd Callback이 부분적으로 호출되지 않는 이슈 있음)
// (파일 배열과 참가자 배열을 만들어서 각 피어 유저들에게 순차적으로 보내는 기능으로 구현)
function sendFilesToMultipleUser(){
    if(filesObjectForMultiUser.index === -1){
        filesObjectForMultiUser = {}; // 모든 전송이 완료된 후 파일 오브젝트 데이터 초기화.
        return;
    } 
    if(!filesObjectForMultiUser.files[filesObjectForMultiUser.index]){
        filesObjectForMultiUser.index = -1;
        return;
    }
    connection.send(filesObjectForMultiUser.files[filesObjectForMultiUser.index], filesObjectForMultiUser.users[filesObjectForMultiUser.index]);
}

// 채팅메시지 전송
function sendMesage(message){
    var user = firebase.auth().currentUser;
    if(user){
        consts.userRef.child(user.uid).once('value').then(function(snapshot){
            if(snapshot.exists()){
                var nickname = snapshot.child('userNickname').val();
                var profileUrl = snapshot.child('profileUrl').val();
                connection.send({
                    type: "chat-message",
                    message: message,
                    nickname: nickname,
                    profileUrl: profileUrl
                });
                appendSendMessage(message, nickname, null);   
            }       
        });    
    }else{
        connection.send({
            type: "chat-message",
            message: message,
            nickname: connection.extra.uid,
            profileUrl: consts.defaultProfileUrl
        });
        appendSendMessage(message, connection.extra.uid, null);
    }           
}

// 내 채팅 메시지 뷰
function appendSendMessage(message, nickname, file){
    var timeStamp = moment().format('YYYY-MM-DD HH:mm:ss');
    var senderMessage = "<li class='right clearfix'><span class='chat-img pull-right'>";
    senderMessage += "<img src='https://placehold.it/50/FA6F57/fff&text=ME' alt='User Avatar' class='img-circle chat-profile-img'>";                
    senderMessage += "</span>";                    
    senderMessage += "<div class='chat-body clearfix'>";                
    senderMessage += "<div class='header chat-message-overflow'>";                    
    senderMessage += "<small class='text-muted'><span class='glyphicon glyphicon-time'></span>" + timeStamp + "</small>";                        
    //senderMessage += "<strong class='pull-right text-color'>" + nickname + "</strong>";                            
    senderMessage += "</div>";                         
    senderMessage += "<p class='chat-message-overflow'>";
    if(file){
        // 파일정보 및 다운로드 링크(img, iframe으로 컨텐츠 로딩)
        if (file.type.indexOf('image') != -1) {
            senderMessage += "<span class='chat-message-filename form-inline'>" + file.name + "</span><a class='form-inline' href='" + file.url + "' target='_blank' download='" + file.name + "'><i class='glyphicon glyphicon-download-alt'></i>(" + utills.bytesToSize(file.size) + ")</a> <br/> <img src='" + file.url + "' title='" + file.name + "' style='width: 80%; margin-top:5px;'>";
        } else {
            senderMessage += "<span class='chat-message-filename form-inline'>" + file.name + "</span><a class='form-inline' href='" + file.url + "' target='_blank' download='" + file.name + "'><i class='glyphicon glyphicon-download-alt'></i>(" + utills.bytesToSize(file.size) + ")</a> <br/> <iframe src='" + file.url + "' title='" + file.name + "' style='width: 80%;border: 0;height: inherit;margin-top:5px;'></iframe>";
        }
    }else{
        senderMessage += Autolinker.link(message, {stripPrefix: false}) // 자동 링크기능 포함된 메시지 
    }                                          
    senderMessage += "</p>";                            
    senderMessage += "</div>";                            
    senderMessage += "</li>";
    
    $(".chat").append(senderMessage);
    $("#input-chat-message").val('');
    if($('.panel-body').length > 0){ // jquery object null check
        $('.panel-body').stop().animate( { scrollTop : $('.panel-body')[0].scrollHeight } , 1000); // 스크롤 채팅창 아래로 이동
    }
}

// 상대 채팅 메시지 뷰
function appendReceveMessage(message, nickname, profileUrl, file){
    var timeStamp = moment().format('YYYY-MM-DD HH:mm:ss');
    var receiveMessage = "<li class='left clearfix'><span class='chat-img pull-left'>";         
    receiveMessage += "<img src='" + profileUrl + "' alt='User Avatar' class='img-circle chat-profile-img'>";                
    receiveMessage += "</span>";                    
    receiveMessage += "<div class='chat-body clearfix'>";               
    receiveMessage += "<div class='header chat-message-overflow'>";                    
    receiveMessage += "<strong class='text-color'>" + nickname + "</strong>";                        
    receiveMessage += "<small class='pull-right text-muted'><span class='glyphicon glyphicon-time'></span>" + timeStamp + "</small>";                            
    receiveMessage += "</div>";                                
    receiveMessage += "<p class='chat-message-overflow'>";
    if(file){
        // 파일정보 및 다운로드 링크(img, iframe으로 컨텐츠 로딩)
        if (file.type.indexOf('image') != -1) {
            receiveMessage += "<span class='chat-message-filename form-inline'>" + file.name + "</span><a class='form-inline' href='" + file.url + "' target='_blank' download='" + file.name + "'><i class='glyphicon glyphicon-download-alt'></i>(" + utills.bytesToSize(file.size) + ")</a> <br/> <img src='" + file.url + "' title='" + file.name + "' style='width: 80%; margin-top:5px;'>";
        } else {
            receiveMessage += "<span class='chat-message-filename form-inline'>" + file.name + "</span><a class='form-inline' href='" + file.url + "' target='_blank' download='" + file.name + "'><i class='glyphicon glyphicon-download-alt'></i>(" + utills.bytesToSize(file.size) + ")</a> <br/> <iframe src='" + file.url + "' title='" + file.name + "' style='width: 80%;border: 0;height: inherit;margin-top:5px;'></iframe>";
        }
    }else{
        receiveMessage += Autolinker.link(message, {stripPrefix: false}) // 자동 링크기능 포함된 메시지 
    }                                                
    receiveMessage += "</p>";                            
    receiveMessage += "</div>";   
    receiveMessage += "</li>"; 
     
    $(".chat").append(receiveMessage);
    if($('.panel-body').length > 0){ 
        $('.panel-body').stop().animate( { scrollTop : $('.panel-body')[0].scrollHeight } , 1000); // 스크롤 채팅창 아래로 이동
    }
}

// 대화방 입장 및 퇴장 시 메시지 추가
function appendParticipantsStateMessage(nickname, type){
    var timeStamp = moment().format('YYYY-MM-DD HH:mm:ss');
    var message = "<li class='clearfix text-center'>";                                         
    message += "<div class='chat-body clearfix'>";               
    message += "<div class='header chat-message-overflow'>"; 
    if(type === "open"){
        message += "<strong class='system-text-color'>" + nickname  + "님이 방에 참가했습니다." + "</strong>"; 
    }else{
        message += "<strong class='system-text-color'>" + nickname  + "님이 방을 나갔습니다." + "</strong>"; 
    }
    message += "<div class='header chat-message-overflow'>"; 
    message += "<small class='pull-right text-muted'><span class='glyphicon glyphicon-time'></span>" + timeStamp + "</small>";                            
    message += "</div>"; 
    message += "</div>";                                                          
    message += "</div>";   
    message += "</li>"; 
     
    $(".chat").append(message);
    if($('.panel-body').length > 0){
        $('.panel-body').stop().animate( { scrollTop : $('.panel-body')[0].scrollHeight } , 1000); // 스크롤 채팅창 아래로 이동
    }
}

// 검색된 유저 목록 뷰 추가 , 검색유저 없으면 결과없음 row 추가
function appendSearchUserList(result, roomName){
    var list = "";
    if(result.length > 0){
        list += "<ul id='search-user-list' class='dropdown-menu'>";
        for(var i=0; i<result.length; i++){
            list += "<div class='divide-5px' id='"+ result[i].uid +"' data-tableid='"+ result[i].uid +"'>";
           
            list += "<div class='search-user-info-div'>";
            if(!result[i].profileUrl){
                list += "<img src='https://img.icons8.com/cotton/2x/profile-face.png'>";
            }else{
                list += "<img src='" + result[i].profileUrl + "'>";
            }  
            list += "<a class='text-color'>" + result[i].userNickname + "</a>";
            list += "</div>";

            list += "<div class='search-user-invite-btn'>";
            list += "<button data-value='"+ result[i].uid +"' class='button-circle'><i id='"+ result[i].uid + "add-icon" +"' class='fas fa-plus'></i></button>";
            list += "</div>";

            list += "</div>";
        }
        list += "</ul>";
    }else{
        list += "<ul id='search-user-list' class='dropdown-menu'>";
        list += "<div id='empty-search-row' class='divide-5px text-center text-color'>검색 결과가 없습니다.</div>"; 
        list += "</ul>";
        $("#empty-search-row").prop('disabled', false)
    }
    $("#search-list-result").html(list);
    
    // 검색결과 드롭다운 출력
    $("#search-user-list").show();
    $(document).on('click', function(){
        $("#search-user-list").hide(); // 드롭다운 이외의 다른영역 클릭 시 검색결과 드롭다운 숨김
    });

    // 검색된 유저 초대버튼 클릭
    $("#search-user-list").off('click').on('click', 'button', function(event){
        event.preventDefault();
        event.stopPropagation();
        var promises = []; // Promise 요청 저장할 배열
        var joinUserUid = $(this).data('value'); // 데이터베이스에서 불러온 유저검색 목록중 클릭한 uid값
        var uidList = []; // connection 객체로 부터 받아온 현재 대화방 참가자의 extra데이터중 uid값 목록 저장할 배열
        connection.getAllParticipants().forEach(function(participants){
            uidList.push(connection.getExtraData(participants).uid);
        });
        if (uidList.indexOf(joinUserUid) != -1) { // 대화방 참가자 uid목록에 클릭한 유저의 uid가 있을 경우 경고창.
            alert('이미 대화에 참여중인 유저입니다.');
        }else if(!firebase.auth().currentUser){
            alert('미 가입자는 대화 초대 기능을 사용할 수 없습니다.');
        }else if(!isSubscribed){
            alert('알림 설정이 비활성화 상태일 경우 대화 초대 기능을 사용할 수 없습니다.');
            $("#user-account-form-islogin").dropdown("toggle"); // 알림구독 유도를 위해 사용자 정보 드롭다운 메뉴 활성화
        }else if(isError){
            alert('알림 설정중 오류가 발생한 상태입니다. 알림 설정 버튼을 다시 누르거나 관리자에게 문의 메일을 보내주세요.');
            $("#user-account-form-islogin").dropdown("toggle");
        }else { // 없을경우 대화방 초대 FCM 메시지 전송
            var addIcon = $("#" + joinUserUid + "add-icon");
            addIcon.addClass('fas fa-spinner fa-pulse fa-lg');
            setTimeout(function() { // 10초 후에는 응답유무 상관없이 로딩 아이콘 제거
                addIcon.removeClass('fas fa-spinner fa-pulse fa-lg');
                addIcon.addClass('fas fa-plus');
            },10000);
           promises.push(consts.userRef.child(joinUserUid).child('deviceToken').once('value')); // 초대할 사람 디바이스 토큰
           promises.push(consts.userRef.child(firebase.auth().currentUser.uid).child('deviceToken').once('value')); // 초대요청을 한 현재 브라우져 접속자 디바이스 토큰
           Promise.all(promises).then(function(res) { // 참조위치 2개 Promise처리
               var receiverToken = res[0];
               var senderToken = res[1];
               checkAuthFcm(roomName, senderToken, receiverToken);
           });
        }     
    });
}

// 대화 초대할 때 가입유무에 따라 프로필 사진값 다르게 해서 FCM전송
function checkAuthFcm(roomName, senderToken, receiverToken){
    if(firebase.auth().currentUser){
        var photoURL = firebase.auth().currentUser.photoURL;
        if(!photoURL){
            photoURL = consts.defaultProfileUrl;
        }
        sendFcmRequestInvite(senderToken, receiverToken, roomName, photoURL);
    }else{
        sendFcmRequestInvite(senderToken, receiverToken, roomName, consts.defaultProfileUrl);
    }
}

// 대화방 초대 FCM 메시지 전송 요청을 위해 서버로 소켓메시지, 페이로드 데이터 전송
function sendFcmRequestInvite(senderToken, receiverToken, roomName, profileUrl){
    var title = '';
    if(firebase.auth().currentUser){
        title = firebase.auth().currentUser.displayName;
    }else{
        title = connection.extra.uid;
    }
    var payload = {
        "to": receiverToken, 
        "data": {
            "title" : title,
            "body": roomName + "방에 초대 되었습니다. 참가 하시겠습니까?",
            "icon": profileUrl,
            "roomName": roomName,
            "password": connection.password,
            "fromUserToken" : senderToken
        }
    }
    connection.getSocket(function(socket){
        socket.emit('send-Fcm-Request-Invite', payload); 
    });
}

// 초대 메시지를 받은 유저의 참가 승인or거절에 대한 응답 FCM전송을 위해 서버로 소켓메시지, 페이로드 데이터 전송
function sendFcmResponseInvite(isAccept, token){
    var payload = {
        "to": token, 
        "data": {
            "response" : isAccept,
            "fromUserId" : firebase.auth().currentUser.uid
        }
    }
    connection.getSocket(function(socket){
        socket.emit('send-Fcm-Response-Invite', payload);
    });
}

// 대화 종료 (소켓연결 해제 및 뷰요소 처리)
function onExit(){ 
    connection.isInitiator = false; // 대화종료 시 방장구분값 false로 초기화
    connection.closeSocket(); 
    // 소켓 닫음(소켓에 연결된 유저가 없을 경우 방 사라짐. 소켓에 연결된 유저 한명이라도 있을 경우 방 재접속 가능).
    connection.attachStreams.forEach(function(stream) {
        stream.stop(); // 미디어 스트림 제거
        removeConferenceView();
    });
    connection.getAllParticipants().forEach(function(pid) {
        connection.disconnectWith(pid);
    });
}

// 대화방 뷰 요소 제거
function removeConferenceView(){
    hiddenDivUserList();
    maxmizeDivUserList(); // 최소화 되어있던 음성대화창 영역 다시 원래 크기로
    hideFAB(); // 플로팅 액션버튼 hide
    isOnAir = false; // 대화중 상태 false
    $(".tr-prevent").prop('disabled', false); // 톡게시판 게시글 클릭 가능하도록 변경
    var menuCreateRoom = document.getElementById("menu-create-room");
    menuCreateRoom.style.display = "block";
    var menuJoinRoom = document.getElementById("menu-join-room");
    menuJoinRoom.style.display = "block";
    $("#menu-voice-active").remove();
    $("#mute-audio").remove();
    //$("#mute-video").remove();
    $("#chat-form").remove();
    $("#user-list").remove();
    $("#roomname_j").val("");
    $("#roomname_c").val("");
    $("#password_j").val("");
    $("#password_c").val("");
}

// Google Stun Server를 이용하여 로컬유저의 아이피를 가져와서 세션스토리지에 저장.
function getLocaIpAddress(){
    var ips = []; // ip 저장 배열.
    connection.DetectRTC.DetectLocalIPAddress(function(ip){
        if(ip){
            ips.push(ip);
            sessionStorage.setItem('ip', ips);
        }
    });
}

// RTCMultiConnection 설정값 세팅
function RTCMultiConnectionConfig(){
    connection.autoCreateMediaElement = false; // 미디어 엘리먼트 자동생성 X(default media element의 경우 unmute시 echo 이슈)
    connection.enableFileSharing = true; // 파일 공유 세팅
    connection.chunkSize = 60 * 1000; // ChunkSize
    connection.autoSaveToDisk = false;  // to make sure file-saver dialog is not invoked.

    // Set video directions and media types
    connection.session = {
        video: false,
        audio: true,
        data: true
    };

    // Choose front or back camera, set resolutions, choose camera/microphone by device-id etc.
    connection.mediaConstraints = {
        video: false,
        audio: {
            echoCancellation: true
        }
    };

    connection.optionalArgument = {};

    connection.processSdp = function(sdp) {
        return sdp; // return unchanged SDP
    };

    connection.sdpConstraints = {
        mandatory: {
            OfferToReceiveAudio: true,
            OfferToReceiveVideo: true,
            VoiceActivityDetection: true,
            IceRestart: true
        },
        optional: []
    };
            
    // set ice server (ignore default STUN+TURN servers)
    connection.iceServers = [];

    // stun server
    connection.iceServers.push({
        urls: [
            'stun:stun.l.google.com:19302',
            'stun:stun.l.google.com:19302?transport=udp',
            //'stun:stun1.l.google.com:19302',
            //'stun:stun2.l.google.com:19302',
        ]
    });

    // turn server
    connection.iceServers.push({ // own viagenie turn server
        urls: 'turn:numb.viagenie.ca',
        username: 'wnsvy223@naver.com',
        credential: 'dlsvygud223@'
    });
    connection.iceServers.push({ // muazkh viagenie turn server
        urls: 'turn:numb.viagenie.ca',
        username: 'webrtc@live.com',
        credential: 'muazkh'
    });
}

// RTCMulticonnection 연결 및 인터페이스 호출
function connectionRTC(userid, connection, roomName, maxCountOfUsers){ 
    sessionStorage.setItem('roomName', roomName); // 세션스토리지에 방 제목 저장     
    
    RTCMultiConnectionConfig(); // RTCMultiConnection 설정 함수 호출 (추후 인자값으로 설정값 동적으로 세팅할 수 있도록 변경)

    // connection객체의 userid값에 커스텀 값 사용 시 initiator의 경우 방을 나갔다가 다시 접속하지 못하는 이슈. 사용자 구분값을 extra객체를 이용해 적용
    var user = firebase.auth().currentUser;
    if(user){
        connection.extra = {
            uid: user.uid
        };
    }else{
        connection.extra = {
            uid: userid
        };
    }
    if(maxCountOfUsers){
        connection.maxParticipantsAllowed = maxCountOfUsers; // 방 최대 인원수 설정
    }   

    connection.onUserIdAlreadyTaken = function(useridAlreadyTaken, yourNewUserId) {
        // 동일한 userid값일 경우 경고창
        alert('동일한 userid가 이미 사용중입니다.');
        redirectMain();
    };
    
    // extra data update check
    connection.onExtraDataUpdated = function(event) {
        // TODO : when peer's extra data updated
    };

    // custom socket event
    connection.getSocket(function(socket){
        // initiator가 방을 나가면 시그널링 소켓서버에서 방에 2번째로 참가한 유저에게 새로 initiator권한 부여하는 소켓메시지 전송.
        // 해당 소켓메시지를 받은 피어는 방장 표시 뷰 업데이트 및 방장 구분용 extra 데이터 업데이트해서 원격 피어들과 공유.
        socket.on('set-isInitiator-true', function(sessionid) {
            connection.extra.owner = true;
            connection.updateExtraData();
            setOwnerMark(connection.userid);
        });

        // 라이브 세션 중 방장 변경 이벤트 수신
        socket.on('set-new-initiator', function(room){
            removeOwnerMenu(); // 방장 전용 뷰 제거
            room.participants.forEach(function(userid){
                // local peer가 방장일 경우 remote peer뷰에 강퇴 및 방장 위임메뉴 세팅
                if(room.owner === connection.userid && userid !== connection.userid){
                    setOwnerMenuToParticipants(userid);
                } 
                
                if(userid === room.owner){ // 방장 변경 이벤트 수신 시 참가자들 중 방장이 된 유저의 뷰에 왕광마크 세팅
                    setOwnerMark(userid);
                }else{ // 방장 변경 이벤트 수신 시 방장이 아닌 참가자들의 뷰에 프로필 이미지 or 기본 프로필 세팅
                    var remoteUid = connection.getExtraData(userid).uid;
                    var localUid = connection.extra.uid;
                    if(remoteUid){
                        userDAO.getUserProfileUrl(remoteUid).then(function(profileUrl){
                            setUserProfileMark(userid, profileUrl);
                        });
                    }else{
                        userDAO.getUserProfileUrl(localUid).then(function(profileUrl){
                            setUserProfileMark(userid, profileUrl);
                        });
                    }
                }
            });     
        });

        // 강제퇴장 이벤트 수신 (서버에서도 강제로 연결을 끊어주기 때문에 클라이언트쪽 코드 변조로도 강제퇴장을 막을 수 없음)
        socket.on('banished-room', function(roomid){
            if(roomid === roomName){
                onExit(); // 강퇴메시지 받으면 연결종료
                $("#kick-modal").modal();
            }
        });

        // 방 참가 시 시그널링서버에서 request-ip 메시지를 방에 참가한 클라이언트들에게 요청.
        // google stun server로 부터 받아온 ip와 userid를 매핑하여 시그널링 서버에 콜백.
        // 시그널링 서버에서 데이터 비교하여 벤 사용자는 이용 제한.
        socket.on('request-ip', function(callback){
            var userIdentifier = {
                userid : connection.userid,
                ip: sessionStorage.getItem('ip')
            }
            callback(userIdentifier);
        })

        // IP벤 당한 유저 입장 불가
        socket.on('user-ip-banished', function(roomid){
            if(roomid === roomName){
                onExit(); // 강퇴메시지 받으면 연결종료
                $(".custom-modal").find(".modal-title").text("추방된 방은 다시 입장할 수 없습니다.");
                $(".custom-modal").modal();
            }
        });

        // 시그널링 서버로 전송할 IP정보 누락 시 연결종료
        socket.on('user-ip-omission', function(roomid){
            if(roomid === roomName){
                onExit(); // 강퇴메시지 받으면 연결종료
                $(".custom-modal").find(".modal-title").text("정보가 누락된 사용자는 입장할 수 없습니다.");
                $(".custom-modal").modal();
            }
        });
    });

    // begin stream
    connection.onstream = function(event){
        console.log(`${event.userid}는 ${connection.DetectRTC.browser.name}브라우저로 접속했습니다.`);
        isOnAir = true; // 대화중 상태 true 
        if(connection.isInitiator){
            connection.extra.owner = true;
        }else{
            connection.extra.owner = false;
        }
        callStartSound(consts.startSound); // 음성 대화 시작 사운드
        creatMediaElement(event); // 음성 대화 뷰 엘리먼트 생성
        initHark({
            stream: event.stream,
            event: event,
            connection: connection,
        });
    }

    // 파일 공유 시작 이벤트 (업로드 메시지 및 로딩바 채팅창에 뷰 세팅)
    connection.onFileStart = function (file){
        $("#btn-send-file").attr('disabled', true); // 전송 시작시 파일전송 버튼 비활성화
        var div = document.createElement('div');
        div.style.padding = '2px 4px';
        div.id = file.uuid;

        var message = "<li class='text-center clearfix'>";                                          
        message += "<div class='chat-body clearfix'>";               
        message += "<div class='header chat-message-overflow'>";
        message += "<strong id='file-sender' class='text-color'></strong><small class='text-center text-muted'>";                                  
        message += "<span class='glyphicon glyphicon-time'></span>" +  moment().format('YYYY-MM-DD HH:mm:ss') + "</small>";                            
        message += "</div>";   
        message += "<p class='chat-message-overflow'>";
        message += "<label class='text-color'>0%</label> <progress></progress>";                                
        message += "</p>";                                                        
        message += "</div>";   
        message += "</li>"; 

        div.innerHTML = message;           
        $(".chat").append(div);
        if($('.panel-body').length > 0){
            $('.panel-body').stop().animate( { scrollTop : $('.panel-body')[0].scrollHeight } , 1000); // 스크롤 채팅창 아래로 이동
        }
        
        if (!file.remoteUserId) {
            progressHelper[file.uuid] = {
                div: div,
                progress: div.querySelector('progress'),
                label: div.querySelector('label')
            };
            progressHelper[file.uuid].progress.max = file.maxChunks;
            return;
        }

        if (!progressHelper[file.uuid]) {
            progressHelper[file.uuid] = {};
        }

        progressHelper[file.uuid][file.remoteUserId] = {
            div: div,
            progress: div.querySelector('progress'),
            label: div.querySelector('label')
        };
        progressHelper[file.uuid][file.remoteUserId].progress.max = file.maxChunks; 
          
        // 업로드 유저 이름 표시
        var extra = connection.getExtraData(file.extra.userid);
        if(file.userid === connection.userid){ // 로컬
            $("#file-sender").text("업로드 중...");
        }else{ // 리모트
            userDAO.getUserNickname(extra.uid).then(function(nickname){
                $("#file-sender").text(nickname + "님이 업로드 중...");
            });
        }
    }

    // 파일 공유 진행상황 이벤트 (업로드 진행상황 업데이트)
    connection.onFileProgress = function (chunk){
        var helper = progressHelper[chunk.uuid];
        if (!helper) {
            return;
        }
        if (chunk.remoteUserId) {
            helper = progressHelper[chunk.uuid][chunk.remoteUserId];
            if (!helper) {
                return;
            }
        }

        helper.progress.value = chunk.currentPosition || chunk.maxChunks || helper.progress.max;
        updateProgress(helper.progress, helper.label);
    };
    
    // 파일 공유 완료 이벤트 (진행상황 로딩바 뷰제거 및 다운로드 링크 뷰 세팅)
    connection.onFileEnd = function(file){
        $("#btn-send-file").attr('disabled', false) // 완료시 파일전송 버튼 활성화
        $("#" + file.uuid).remove();
        var extra = connection.getExtraData(file.extra.userid);
        if(file.userid === connection.userid){ // 로컬
            appendSendMessage(null, extra.uid, file);
        }else{ // 리모트
            consts.userRef.child(extra.uid).once('value').then(function(snapshot){
                if(snapshot.exists()){
                    var nickname = snapshot.child('userNickname').val();
                    var profileUrl = snapshot.child('profileUrl').val();
                    appendReceveMessage(null, nickname, profileUrl, file);
                }else{
                    appendReceveMessage(null, extra.uid, consts.defaultProfileUrl, file);
                }
            });
        }
        if(filesObjectForMultiUser.files){
            filesObjectForMultiUser.index--;
            sendFilesToMultipleUser();
        }
    }   
    
    // 업로드 로딩바 값 업데이트
    function updateProgress(progress, label) {
        if (progress.position === -1) {
            return;
        }
        var position =+ progress.position.toFixed(2).split('.')[1] || 100;
        label.innerHTML = position + '%';
    }

    // detect user device has webcam, microphone, speaker, browser
    connection.DetectRTC.load(function() {
        console.log(connection.DetectRTC);
        if(!connection.DetectRTC.browser.name == "Chrome" || !connection.DetectRTC.browser.name == "FireFox" || connection.DetectRTC.browser.name == "IE"){
            alert('크롬 또는 파이어폭스 브라우저에서 접속해 주세요(익스플로러에서는 동작하지 않습니다).')       
        }
        if(!connection.DetectRTC.hasMicrophone){  
            alert('마이크를 연결해 주세요.');                               
        }                 
    });

    // end stream
    connection.onstreamended = function(event) {      
        removeMediaElement(connection, event);
    };

    // leave room
    connection.onleave = function(event) {
        removeMediaElement(connection, event);
        // 참가자 퇴장 시 채팅창에 퇴장 메시지 추가
        consts.userRef.child(event.extra.uid).child('userNickname').once('value', function(snapshot){
            if(snapshot.exists()){
                appendParticipantsStateMessage(snapshot.val(), "close"); // 가입자
            }else{
                appendParticipantsStateMessage(event.extra.uid, "close"); // 미가입자
            }
        });
    };

    // trigger when data channel open
    connection.onopen = function(event) {
        // 새로운 참가자 입장 시 채팅창에 입장 메시지 추가
        consts.userRef.child(event.extra.uid).child('userNickname').once('value', function(snapshot){
            if(snapshot.exists()){
                appendParticipantsStateMessage(snapshot.val(), "open"); // 가입자
            }else{
                appendParticipantsStateMessage(event.extra.uid, "open"); // 미가입자
            }
        });     
    };

    // detect who speaking using onmessage & send cumstom data message
    connection.onmessage = function(event) {
        var img = document.getElementById(event.data.userid + "img");
        var fab = document.getElementById("fab"); // 대화창 축소로 fab가 화면에 있을경우 fab에 speak/silece 이벤트 표시 및 채팅메시지 카운트 표시
        switch(event.data.type){
            case 'speaking':
                if(img){
                    img.style.border = '3px solid red';
                }
                if(fab && isActiveFAB === true){
                    fab.style.border = '5px solid red';
                }
                break;
            case 'silence':
                if(img){
                    img.style.border = 0;
                }
                if(fab && isActiveFAB === true){
                    fab.style.border = 0;
                }
                break;
            case 'chat-message':
                if(fab && isActiveFAB === true){
                    setFabBadgeCount();
                }
                appendReceveMessage(event.data.message, event.data.nickname, event.data.profileUrl, null); // 상대방 채팅 메시지 수신, 뷰 추가
                break;
            default:
        }     
    };
     
    // detect mute
    connection.onmute = function(event) {      
        if (!event.mediaElement) {
            return;
        }
    
        if (event.muteType === 'both' || event.muteType === 'video') {
            // do video & audio mute function 
        } else if (event.muteType === 'audio') {
            event.mediaElement.muted = true;
            var img = document.getElementById(event.userid + "img");
            var h = document.getElementById(event.userid + "h");
            img.classList.add("dim-view");
            h.classList.add("dim-view");
        }
    };

    // detect unmute
    connection.onunmute = function(event) {         
        if (!event.mediaElement) {
            return;
        }

        if (event.unmuteType === 'both' || event.unmuteType === 'video') {    
            // do video & audio unmute function 
        } else if (event.unmuteType === 'audio') {
            event.mediaElement.muted = false;
            var img = document.getElementById(event.userid + "img");
            var h = document.getElementById(event.userid + "h");
            img.classList.remove("dim-view");
            h.classList.remove("dim-view");             
        }
    };

    connection.bandwidth = {
        audio: 50,  // 50 kbps
        video: 256, // 256 kbps
        screen: 300 // 300 kbps
        // audio : audio bitrates. Minimum 6 kbps and maximum 510 kbps
        // video : video framerates. Minimum 100 kbps; maximum 2000 kbps
        // screen : screen framerates. Minimum 300 kbps; maximum 4000 kbps
    };

    connection.onvolumechange = function(event) {
        //event.mediaElement.style.borderWidth = event.volume;
    };
    
    connection.onerror = function(event) {
        //Error handler
    }

    // 음성 대화 뷰 엘리먼트 생성
    function creatMediaElement(event){    
        var video = document.createElement('video'); // default media element 자동생성X, 대화 시작 시 media element 새로 생성.
        video.id = event.userid + "video";
        try {
            video.setAttributeNode(document.createAttribute('autoplay'));
            video.setAttributeNode(document.createAttribute('playsinline'));
        } catch (e) {
            video.setAttribute('autoplay', true);
            video.setAttribute('playsinline', true);
        }
        if(event.type === 'local') {
            video.volume = 0;
            try {
                video.setAttributeNode(document.createAttribute('muted'));
            } catch (e) {
                video.setAttribute('muted', true);
            }
        }else{
            video.volume = 0.5;
        }
        video.srcObject = event.stream;
        video.style.display = "none";

        var userList = document.getElementById('user-list');

        var div = document.createElement('div');
        div.id = event.userid + "div";
        div.setAttribute("class", "divide-bottom");
        
        var img = document.createElement('img');
        img.id = event.userid + "img";

        var h = document.createElement('h');
        h.id = event.userid + "h";       
        h.setAttribute("class", "divide-left");
        if(event.extra.isMute){ // 상대방의 초기 마이크 상태값에 따라 음소거 뷰 처리
            img.setAttribute("class", "dim-view");
            h.setAttribute("class", "dim-view");
        }

        var userIdDiv = document.createElement('div');
        userIdDiv.id = event.userid + "userIdDiv";
        userIdDiv.appendChild(img);
        userIdDiv.appendChild(h);
        
        var volumeControl = document.createElement('input');
        volumeControl.id = event.userid + "volume-control";
        volumeControl.setAttribute("type", "range");
        volumeControl.min = "0";
        volumeControl.max = "10";
        volumeControl.step = "1";
        volumeControl.value ="5";

        var volumeValue = document.createElement('span');
        volumeValue.setAttribute("class", "volume-value-span");
        
        var iconSpeaker = document.createElement('i');
        iconSpeaker.setAttribute("class", "fas fa-volume-up");

        var volumeDiv = document.createElement('div');
        volumeDiv.setAttribute("class", "volume-control-div");
        volumeDiv.appendChild(volumeControl);

        var volumeValueDiv = document.createElement('div');
        volumeValueDiv.setAttribute("class", "volume-value-div");
        volumeValueDiv.appendChild(volumeValue);
        volumeValue.textContent = volumeControl.value;
             
        var volumeIconDiv = document.createElement('div');
        volumeIconDiv.setAttribute("class", "volume-icon-div");
        volumeIconDiv.appendChild(iconSpeaker);

        div.appendChild(userIdDiv);
        if(event.type === 'remote') {
            div.appendChild(volumeDiv);
            div.appendChild(volumeValueDiv); 
            div.appendChild(volumeIconDiv);             
        }
        div.appendChild(video);

        var userListDiv = document.getElementById('user-list-div');
        userListDiv.appendChild(div);

        userList.appendChild(userListDiv);   
        
        if(event.type === 'remote') {
            var vol = document.getElementById(event.userid + "volume-control");
            // 볼륨 컨트롤러 값 변경
            // Range Tyep Input의 'input' 이벤트를 이용하여 볼륨값 변경을 실시간으로 뷰에 반영 
            vol.addEventListener('input', function(e){
                volumeValue.textContent = e.target.value;
                video.volume = e.target.value / 10;
            });
            userIdDiv.setAttribute("class", "remote-user-info-div user-box");
        }else{
            userIdDiv.setAttribute("class", "local-user-info-div user-box");
        }
     
        // 방정보를 서버로 부터 조회하여 현재 접속 유저가 방장일 경우 참가자들 뷰에 방장용 메뉴 추가
        connection.getSocket(function(socket){
            if(connection.publicRoomIdentifier === consts.publicRoomIdentifier){ // 공개방
                socket.emit('get-public-rooms', consts.publicRoomIdentifier, function(listOfRooms) {
                    listOfRooms.forEach(function(rooms){
                        if(rooms.owner === connection.userid){
                            setOwnerMenuToParticipants(event.userid);
                        } 
                    });
                });
            }else{ // 비공개방
                socket.emit('get-public-rooms', sessionStorage.getItem('roomName'), function(listOfRooms) {
                    listOfRooms.forEach(function(rooms){
                        if(rooms.owner === connection.userid){
                            setOwnerMenuToParticipants(event.userid);
                        } 
                    });
                });
            }
        });     

        setParticipantsElements(event); // 사용자 및 참가자 뷰 세팅
    }  

    // 사용자 및 참가자 정보를 조회하여 로그인, 비로그인, 방장권한 유무등의 조건에 맞춰 뷰 세팅
    function setParticipantsElements(event){
        consts.userRef.child(event.extra.uid).once('value').then(function(snapshot){
            if(snapshot.exists()){  
                // 로그인 유저          
                if(!snapshot.val().profileUrl || snapshot.val().profileUrl === 'anonymous'){
                    if(event.extra.owner){
                        setOwnerMark(event.userid);
                    }else{
                        setUserProfileMark(event.userid, consts.defaultProfileUrl);
                    }
                }else{
                    if(event.extra.owner){
                        setOwnerMark(event.userid);
                    }else{  
                        setUserProfileMark(event.userid, snapshot.val().profileUrl);
                    }
                }                  
                setUserNicknameText(event.userid ,snapshot.val().userNickname);     
            }else{
                // 비 로그인 유저
                if(event.extra.owner){
                    setOwnerMark(event.userid);
                }else{
                    setUserProfileMark(event.userid, consts.defaultProfileUrl);
                }
                setUserNicknameText(event.userid, event.extra.uid);
            }         
        });   
    }

    // 방장용 왕관 마크 프로필 이미지 세팅
    function setOwnerMark(userid){
        var ownerMark = document.getElementById(userid + "img");
        if(ownerMark){
            ownerMark.setAttribute("src", "/images/icon-owner.png");
        }
    }

    // 참가자 닉네임 텍스트 세팅
    function setUserNicknameText(userid, text){
        var nicknameText = document.getElementById(userid + "h");
        if(nicknameText){
            nicknameText.innerText = text;
        }
    }

    // 참가자 프로필 이미지 세팅
    function setUserProfileMark(userid, profileUrl){
        var img = document.getElementById(userid + "img");
        if(img){
            img.setAttribute("src", profileUrl);
        }
    }

    // 참가자 뷰 요소에 방장용 메뉴 세팅(강퇴 버튼 및 방장 위임 버튼)
    function setOwnerMenuToParticipants(userid){
        // 참가자 강퇴 버튼 뷰
        var userIdDiv = document.getElementById(userid + "userIdDiv");
        var kickUserIcon = document.createElement('i');
        kickUserIcon.setAttribute("class", "fas fa-times-circle");
        var kickUserBtn = document.createElement('a');
        kickUserBtn.id = userid + "user-kick";
        kickUserBtn.setAttribute("class", "user-kick");
        kickUserBtn.appendChild(kickUserIcon);
        userIdDiv.appendChild(kickUserBtn);
    
        // 방장 위윔 버튼 뷰
        var changeOwnerDiv = document.createElement('div');
        changeOwnerDiv.setAttribute("class", "change-owner-div");
        var changeOwnerBtn = document.createElement('button');
        changeOwnerBtn.setAttribute("class", "btn btn-danger btn-sm");
        changeOwnerBtn.id = userid + "change-owner";
        var changeOwnerIcon = document.createElement('i');
        changeOwnerIcon.setAttribute("class", "fas fa-crown");
        changeOwnerBtn.appendChild(changeOwnerIcon);
        changeOwnerDiv.appendChild(changeOwnerBtn);
        var div = document.getElementById(userid + "div");
        div.appendChild(changeOwnerDiv);
        
        // 강퇴버튼 클릭 
        kickUserBtn.addEventListener('click', function(e){
            e.preventDefault();
            e.stopPropagation();
            if(connection.isInitiator === true){
                connection.getSocket(function(socket){
                    var userData = {
                        targetUserid: userid
                    }
                    socket.emit('force-kickout', userData, function(response){
                        if(response.success){
                            userDAO.getUserNickname(connection.getExtraData(response.userid).uid).then(function(nickname){
                                console.warn(nickname + '님을 추방하였습니다.');
                            });
                        }else{
                            console.error(response.error);
                        }
                    });
                });
            }
        });
        
        // 방장 위임 버튼 클릭
        changeOwnerBtn.addEventListener('click', function(e){
            e.preventDefault();   
            e.stopPropagation(); 
            if(connection.isInitiator === true){
                connection.getSocket(function(socket){
                    var ownerData = {
                        targetUserid: userid
                    }
                    socket.emit('change-initiator', ownerData, function(response){
                        if(response.isChangeOwner === true){
                            connection.isInitiator = false;
                            connection.extra.owner = false;
                            connection.updateExtraData();
                        }else{
                            console.error(response.error);
                        }
                    });
                });
            }
        });
    }

    // 방장 전용 메뉴 제거
    function removeOwnerMenu(){
        // 강퇴 버튼 뷰 제거
        document.querySelectorAll(".user-kick").forEach(function(kickBtn){
            kickBtn.remove();
        });
        // 방장변경 버튼 뷰 제거
        document.querySelectorAll(".change-owner-div").forEach(function(changeOwnerBtn){
            changeOwnerBtn.remove();
        });
    }
       
    // 대화 참가자 뷰 요소 제거
    function removeMediaElement(connection, event){
        connection.streamEvents.selectAll({
            userid: event.userid
        }).forEach(function(event){
            var div = document.getElementById(event.userid + "div");
            if (div && div.parentNode) {
                div.parentNode.removeChild(div);
            }
        });                   
    } 

    // holwer.js 라이브러리를 사용하여 대화방 생성 및 참가 시 효과음 트리거.
    function callStartSound(soundFile){
        var sound = new Howl({
            src: [soundFile]
        });
        sound.play();
    }

    // Detect Who Speaking
    // https://github.com/muaz-khan/RTCMultiConnection/wiki#detect-who-is-speaking
    function initHark(args){
        if(!window.hark){
            throw 'Please link hark.js';
            return;
        }

        var connection = args.connection;
        var event = args.event;
        var stream = args.stream;
        var options = {};
        var speechEvents = new hark(stream, options); // hark.js 초기화
       
        speechEvents.on('speaking', function(){
            connection.send({
                userid : event.userid,
                type : "speaking"
            });
            var img = document.getElementById(event.userid + "img");
            if(img){
                img.style.border = '3px solid red'; 
            }
            var fab = document.getElementById("fab");
            if(fab && isActiveFAB === true){
                fab.style.border = '5px solid red';
            }
        });

        speechEvents.on('stopped_speaking', function(){
            connection.send({
                userid : event.userid,
                type : "silence"
            });
            var img = document.getElementById(event.userid + "img");
            if(img){
                img.style.border = 0; 
            }
            var fab = document.getElementById("fab");
            if(fab && isActiveFAB === true){
                fab.style.border = 0;
            }
        });

        speechEvents.on('volume_change', function(volume, threshold){
            event.volume = volume;
            event.threshold = threshold;
            connection.onvolumechange(event);
        });
    }
}

export { connection, connectionRTC, onAir, isOnAir, redirectMain }
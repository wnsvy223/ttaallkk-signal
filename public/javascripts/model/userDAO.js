"use strict";

import * as consts from '../utills/consts.js';

// 사용자 닉네임 조회하여 반환해주는 함수
export async function getUserNickname(uid){
    const snapshot = await consts.userRef.child(uid).child('userNickname').once('value');
    if(snapshot.exists()){
        return snapshot.val();
    }else{
        return uid;
    }
}

// 사용자 프로필 이미지 조회하여 반환해주는 함수
export async function getUserProfileUrl(uid){
    const snapshot = await consts.userRef.child(uid).child('profileUrl').once('value');
    if(snapshot.exists()){
        return snapshot.val();
    }else{
        return consts.defaultProfileUrl;
    }
}

// 현재 접속한 사용자 알림 데이터 조회하여 최신순으로 10개 역순전환하여 반환(최신 알림이 맨 위로)
export async function getCurrentUserNotification(uid){
    let arr = [];
    const snapshot = await consts.notificationRef.child(uid).orderByChild('timestamp').limitToLast(consts.notificationLimitCount).once('value');
    if(snapshot.exists()){
        snapshot.forEach(notiValue => {
            arr.push(notiValue.val());
        });
        return arr.reverse();
    }else{
        return null;
    }
}

// 알림 읽음 처리
export function updateNotificationIsRead(uid, key, callback){
    consts.notificationRef.child(uid).child(key).child('isRead').set(true, function(error){
        if(error){
            console.log('댓글 알림 읽음 처리 오류 :' + error);
        }else{
            callback();
        }
    });
}

// 친구알림과 댓글알림값을 모두 조회하여 총 합을 반환.(사이드바 햄버거 메뉴에는 두 알림의 총 합 세팅)
export async function getTotalBadgeCount(uid){
    const friendBadge = await consts.relationRef.child(uid).orderByChild('status').equalTo('idle').once('value');
    const notiBadge = await consts.notificationRef.child(uid).orderByChild('isRead').equalTo(false).limitToLast(consts.maxNotificatiionLimitCount).once('value');
    return friendBadge.numChildren() + notiBadge.numChildren();
}

// 친구 요청 알림 조회하여 알림갯수 반환
export async function getFriendRequestNotification(uid){
    const friendRequest = await consts.relationRef.child(uid).orderByChild('status').equalTo('idle').once('value');
    if(friendRequest.exists()){
        return friendRequest.numChildren(); // 알림갯수
    }else{
        return 0;
    }
}

// 읽지않은 댓글 알림 조회하여 알림갯수 반환
export async function getReplyNotificaion(uid){
    const notification = await consts.notificationRef.child(uid).orderByChild('isRead').equalTo(false).limitToLast(consts.maxNotificatiionLimitCount).once('value');
    if(notification.exists()){
        return notification.numChildren(); // 알림갯수
    }else{
        return 0;
    }
}

// 가입 시 유저정보 DB 세팅
export function setUserValue(userData, callback){    
    consts.userRef.child(uid).set(userData, function(error){
        if (error) {
            console.warn("유저정보 세팅 실패 : " + error);
            callback(error); 
        } else {
            console.log("유저정보 세팅 성공");
            callback(); 
        }
    });
}

// DB에서 해당 유저의 디바이스 토큰 노드값에 토큰값 저장
export function setTokenToServer(currentToken, callback){
    var user = firebase.auth().currentUser;
    if(user){
        var ref = consts.userRef.child(user.uid).child('deviceToken');
        ref.set(currentToken, function(error){
            if(error){
                callback(error);
                console.warn("토큰값 설정 실패 : " + error);
            }else{
                callback();
                console.log("토큰값 설정 성공" );   
            }
        })
    }
}

// DB에서 해당 유저의 디바이스 토큰 삭제
export function deleteTokenToServer(callback){
    var user = firebase.auth().currentUser;
    var ref = consts.userRef.child(user.uid).child('deviceToken');
    ref.remove().then(function(){
        callback();
        console.log(user.uid + '디바이스 토큰 DB 삭제');
    }).catch(function(error){
        callback(error)
        console.warn('디바이스 토큰 DB 삭제 실패' + error);
    });
}

// DB에서 유저 정보 삭제
export function deleteUserData(uid){
    consts.userRef.child(uid).remove().then(function(){
        console.log(uid + '회원정보삭제');
    }).catch(function(error){
        console.log('회원정보삭제실패' + error);
    });
}


// 유저 정보 변경사항 업데이트
export function updateUserValue(node, value){
    var user = firebase.auth().currentUser;    
    consts.userRef.child(user.uid).child(node).set(value, function(error){
        if (error) {
            console.warn("유저정보 업데이트 실패 : " + error);
        } else {
            console.log("유저정보 업데이트 성공");
            $("#edit-modal").modal('hide'); 
        }
    });      
    switch(node){
        case 'userNickname':
            user.updateProfile({
                displayName: value,
            }).then(function() {
                console.log("displayName set success");
            }).catch(function(error) {
                console.warn("displayName set fail : " + error);
            });  
            break;
        case 'profileUrl':
            user.updateProfile({
                photoURL: value,
            }).then(function() {
                console.log("profileUrl set success");
            }).catch(function(error) {
                console.warn("profileUrl set fail : " + error);
            });  
            break;
        default:
    }
}

// 프로파일 이미지 업로드
export function uploadStorage(profileUrl, userNickname, type){       
    var user = firebase.auth().currentUser;
    var storageRef = firebase.storage().ref('profile').child(user.uid).putString(profileUrl, 'data_url');
    if(user){
        storageRef.on('state_changed', function(snapshot) {
            var progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log('Upload is ' + progress + '% done');
            switch (snapshot.state) {
                case firebase.storage.TaskState.PAUSED: 
                    console.log('Upload is paused');
                    break;
                case firebase.storage.TaskState.RUNNING: 
                    console.log('Upload is running');
                    break;
            }
        }, function(error) {
            console.log(error);
        }, function() {
            storageRef.snapshot.ref.getDownloadURL().then(function(downloadURL) {
                switch(type){
                    case 'signUp':
                        updateUserValue("profileUrl", downloadURL);
                        break;
                    case 'editProfile':
                        updateUserValue("profileUrl", downloadURL);
                        break;
                    case 'editBoth':
                        updateUserValue("profileUrl", downloadURL);
                        updateUserValue("userNickname", userNickname);  
                        break;
                    default:
                }
            });
        });
    }              
}


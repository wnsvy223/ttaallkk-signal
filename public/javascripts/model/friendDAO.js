"use strict";

import * as consts from '../utills/consts.js';
import * as utills from '../utills/utills.js';
import { connectionInstance } from '../controller/main.js';

// 친구 추가를 위한 사용자 검색 함수
export function getSearchUser(input){
    var isEmail = utills.isEmail(input); // 입력값이 이메일 형식인지 체크
    if(isEmail){
        return getSearchUserData('email', input); // 이메일로 검색
    }else{
        return getSearchUserData('userNickname', input); // 닉네임으로 검색
    }
}

// 이미 친구 추가된 유저인지 아닌지 체크
async function isAlreadyFriend(uid){
    var currentUserUid = firebase.auth().currentUser.uid;
    const isFriend = await consts.relationRef.child(currentUserUid).child(uid).once('value');
    if(isFriend.exists()){
        return true;
    }else{
        return false;
    }
}

// 친구 검색
function getSearchUserData(type, input){
    var searchUserList = []; // 검색된 유저 저장할 배열
    return consts.userRef.orderByChild(type).startAt(input).endAt(input + "\uf8ff").once('value', function(searchResult){
        if(searchResult.exists()){
            searchResult.forEach(function(searchUesr){
                var searchUesrData = searchUesr.val(); // 검색된 유저 정보
                var searchUesrUid = searchUesr.child('uid').val(); // 검색된 유저 키값
                if(searchUesrUid !== firebase.auth().currentUser.uid){ // 현재 접속된 사용자는 검색목록에서 제외
                    isAlreadyFriend(searchUesrUid).then(function(isFriend){
                        if(!isFriend){ // 현재 친구상태가 아닐경우에만 배열에 추가
                            searchUserList.push(searchUesrData);
                        }
                    });
                }  
            });     
        }
    }).then(function(){
        return searchUserList;
    });  
}

// 친구 추가 요청 소켓메시지 전송
export function requestFriendAdd(toUser){
    var relation = {
        fromUser : firebase.auth().currentUser.uid,
        toUser : toUser
    }
    connectionInstance.getSocket(function(socket){
        socket.emit("add-friend", relation);
    });
}

// 친구 수락 요청 소켓메시지 전송
export function requestFriendAccept(toUser, callback){
    var acceptData = {
        fromUser : firebase.auth().currentUser.uid,
        toUser : toUser
    }
    connectionInstance.getSocket(function(socket){
        socket.emit("add-friend-accept", acceptData);
        callback();
    });
}

// 친구 거절 요청 소켓메시지 전송
export function requestFriendReject(toUser, callback){
    var rejectData = {
        fromUser : firebase.auth().currentUser.uid,
        toUser : toUser
    }
    connectionInstance.getSocket(function(socket){
        socket.emit("add-friend-reject", rejectData);
        callback();
    });
}

// 내 DB노드에서 친구노드 삭제 (현재 접속유저의 노드를 삭제하는 것이므로 권한이 있기때문에 admin모듈 사용하지 않고 직접삭제 가능)
export function requestFriendRemove(friendUid){
    var myUid = firebase.auth().currentUser.uid;
    consts.relationRef.child(myUid).child(friendUid).remove().then(function(){
        console.log('친구 삭제 성공');
    }).catch(function(error){
        console.log('친구 삭제 오류 : ' + error);
    });
}
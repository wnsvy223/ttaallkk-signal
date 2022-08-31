"use strict";

import * as consts from '../utills/consts.js';
import * as utils from '../utills/utills.js';
import * as main from '../controller/main.js';

// -------------------------------------- 게시글 관련 함수 ------------------------------------------//

// 게시판 프리뷰 데이터 조회
export async function getPreview(ref){
    var result = [];
    await ref.orderByChild('idx').limitToLast(consts.previewPostCount).once('value', function (snapshot) {
        if(snapshot.exists()){
            snapshot.forEach(function (childsnapshot) {
                var val = childsnapshot.val();
                result.push(val);
            });
        }
    });
    var reverseArr = result.reverse();
    return reverseArr;
}

// 게시판 글, 댓글 작성자 프로필 이미지
export async function getWriterProfileUrl(uid){  
    var userProfile = await consts.userRef.child(uid).child('profileUrl').once('value');
    if (userProfile.exists()) {
        if (userProfile.val()) {
            return userProfile.val();
        }
        else {
            return consts.defaultProfileIcon;
        }
    }
    else {
        return consts.anonymousIcon;
    }    
}

// 게시판 더보기 데이터 조회
export function getBoardMore(ref){
    var result = [];
    return ref.limitToLast(consts.postCountPerPage).once('value', function(snapshot){
        if(snapshot.exists()){
            snapshot.forEach(function(childsnapshot){
                var val = childsnapshot.val();
                result.push(val);
            });  
        }
    }).then(function(){
        if(!result.length){
            return false;
        }else{
            var reverseArr = result.reverse();
            var recentKey = reverseArr[0].idx //가장 최근 게시글의 키값
            var param = {
                result: reverseArr,
                recentKey: recentKey
            }   
            return param;
        } 
   });  
}

//게시글 내용 보기 데이터 조회
export async function getBoardDetail(ref){
    var result = [];  
    await ref.once('value', function (snapshot) {
        if(snapshot.exists()){
            var val = snapshot.val();
            result.push(val);
        }
    });
    var reverseArr = result.reverse();
    return reverseArr;
}

// 조회수 업데이트
export function updateViews(ref, viewsRef){
    ref.once('value', function(snapshot){
        if(snapshot.exists()){
            viewsRef.transaction(function (currentValue) {
                return (currentValue || 0) + 1;
            },function(error, committed, snapshot){
                if(error){
                  console.log('조회수 트랜잭션 실패 : ', error);
                }else if(!committed){
                  console.log('조회수 트랜잭션 거부');
                }else{
                  console.log('조회수 트랜잭션 성공');
                }
            });
        }
    });
}

// 페이지 새로고침 데이터 조회(세션스토리지에 저장된 현재 페이지의 시작,끝 키값을 가져와서 조회 후 반환)
export async function getRefreshPage(ref){
    var arr = [];
    var startAt = sessionStorage.getItem("startAt");
    var endAt = sessionStorage.getItem("endAt");
    const snapshot = await ref.orderByChild('idx').startAt(startAt).endAt(endAt).once('value');
    if(snapshot.exists()){
        snapshot.forEach(function(result){
            arr.push(result.val());
        });
        var reverseArr = arr.reverse();
        return reverseArr;
    }
}

// 페이징 처리 
export function paging(ref, type){
    var isLastPage = false;
    var recentKey = '';
    var result = [];  
    return ref.once('value', function(snapshot){
        snapshot.forEach(function(childsnapshot){
                var val = childsnapshot.val();
                result.push(val);
            });                 
    }).then(function(){
        var reverseArr = result.reverse(); // 배열역순 
        switch(type){
            case 'forward':
                reverseArr.shift(); //앞으로 가기일땐 결과 배열에서 첫번째 인덱스 삭제
                break;
            case 'backward':
                reverseArr.pop(); //뒤로 가기일땐 결과 배열에서 마지막 인덱스 삭제
                break;
            default:
        } 
        if(reverseArr.length > 0){
            recentKey = reverseArr[0].idx
            if(reverseArr.length < consts.postCountPerPage){
                isLastPage = true;
            }   
            var param = {
                result: reverseArr,
                isLastPage: isLastPage,
                recentKey: recentKey
            } 
            return param;   
        }else{
            var param = {
                message: "마지막 페이지 입니다."
            }
            return param;
        }      
    });
}

// 게시글 데이터 생성
export function setValuePost(title, textWithTag, ref){ 
    var text = utils.htmlToPlaintext(textWithTag); // 에디터에서 적용된 태그값이 제거된 순수 텍스트                                                    
    var user = firebase.auth().currentUser;
    var now = moment().format('YYYY-MM-DD HH:mm:ss');
    
    if(user){ // 로그인 유저    
        ref.set({
            title: escape(title),
            text: text,
            textWithTag: escape(textWithTag),
            uid: user.uid,
            timestamp: now,
            userNickname: escape(user.displayName),
            idx: ref.key,
            views: 0
        }, function(error){
            if (error) {
                console.log("글 작성 실패(로그인유저) : " + error);                             
            } else {
                console.log("글 작성 성공(로그인유저)"); 
            }
            ref.off();               
        });          
        history.back();                        
    }else{ // 비 로그인 유저
        var nickname = $("#post-nickname").val();
        var password = $("#post-password").val();
        if(!nickname){
            alert('닉네임을 입력하세요.');
        }else if(!password){
            alert('비밀번호를 입력하세요.');
        }else{
            ref.set({
                title: escape(title),
                text: text,
                textWithTag: escape(textWithTag),
                uid: "unknown",
                timestamp: now,
                userNickname: escape(nickname),
                idx: ref.key,
                views: 0,
                password: escape(password)
            }, function(error){
                if (error) {
                    console.log("글 작성 실패(비로그인유저) : " + error);
                } else {
                    console.log("글 작성 성공(비로그인유저)");
                }
                ref.off();
            });
            history.back();
        }  
    }       
}

// 게시글 데이터 수정
export function updateValuePost(ref, value){
    const endcodeValue = escape(value);
    ref.set(endcodeValue, function(error){
        if(error){
            console.log("게시글 수정 실패 : " + error);  
        }else{
            console.log("게시글 수정 성공" );   
        }
    })
}

// 게시글 데이터 삭제
export function deleteValuePost(ref){
    return ref.remove().then(function(){
       return true;
    }).catch(function(error) {
       return error;
    });
}

// 게시판 공지사항 데이터 조회
export async function getValueNotice(node){
    const snapshot = await consts.noticeRef.child(node).once('value');
    if (snapshot.exists()) {
        return snapshot.val();
    }    
}

// 게시글 카테고리 별 검색
export async function getSerchValueOrderByCategory(rootRef, node, value){
    var ref = rootRef.orderByChild(node).startAt(value).endAt(value + "\uf8ff").limitToLast(50);
    var result = [];
    await ref.once('value', function(snapshot){
        snapshot.forEach(function(childsnapshot){
            if(snapshot.exists()){
                var val = childsnapshot.val();
                result.push(val);
            }
        });
    });
    if(!result.length) {
        return false;
    }else{
        var reverseArr = result.reverse();
        var recentKey = reverseArr[0].idx; //가장 최근 게시글의 키값
        var param = {
            result: reverseArr,
            recentKey: recentKey,
            type: "search"
        };
        return param;
    }  
}

// -------------------------------------- 댓글 관련 함수 ------------------------------------------//

// 댓글 데이터 생성
export function setValueReply(ref ,key, textWithTag, anonymousNickname, anonymousPassword, callback){
    var text = utils.htmlToPlaintext(textWithTag); // 에디터에서 적용된 태그값이 제거된 순수 텍스트
    var user = firebase.auth().currentUser;
    var now = moment().format('YYYY-MM-DD HH:mm:ss');    
    var replyRef = ref.child(key).child('reply').push();
    ref.orderByChild('idx').equalTo(key).once('value', function(snapshot){
        if(snapshot.exists()){ // DB에 해당 글 참조노드가 있으면 댓글 세팅
            if(user){ // 로그인 유저             
                replyRef.set({
                    text: text,
                    textWithTag: escape(textWithTag),
                    uid: user.uid,
                    timestamp: now,
                    userNickname: escape(user.displayName),
                    idx: replyRef.key
                }, function(error){
                    if (error) {
                        console.log("댓글 작성 실패(회원유저) : " + error);   
                        alert('댓글작성오류(회원유저)' + error);                       
                    } else {
                        console.log("댓글 작성 성공(회원유저)"); 
                        sendReplyFCM(ref, user.displayName, text, key, ref.key);
                        requestSetValueNotification({
                            board: ref.key,
                            postKey: key,
                            replyKey: replyRef.key,
                            replyUserNickname: user.displayName,
                            timestamp: now
                        });
                        callback(key);
                    }
                    replyRef.off();               
                });                                   
            }else{ // 비 로그인 유저
                replyRef.set({
                    text: text,
                    textWithTag: escape(textWithTag),
                    uid: "unknown",
                    timestamp: now,
                    userNickname: escape(anonymousNickname),
                    replyPassword: escape(anonymousPassword),
                    idx: replyRef.key
                }, function(error){
                    if (error) {
                        console.log("댓글 작성 실패(비회원유저) : " + error);
                        alert('댓글작성오류(비회원유저)' + error);
                    } else {
                        console.log("댓글 작성 성공(비회원유저)");
                        sendReplyFCM(ref, anonymousNickname, text, key, ref.key);
                        requestSetValueNotification({
                            board: ref.key,
                            postKey: key,
                            replyKey: replyRef.key,
                            replyUserNickname: anonymousNickname,
                            timestamp: now
                        });
                        callback(key);
                    }
                    replyRef.off();
                });
            }       
        }else{ // 없으면 삭제된 게시글 알림창 호출
            alert('삭제된 게시글 입니다.');
        }
    });
}

// 알림노드 데이터 세팅 요청 (알림노드는 해당 게시글 주인만 읽기/쓰기가 가능하기때문에 서버 권한으로 세팅)
function requestSetValueNotification(postData){
    main.connectionInstance.getSocket(function(socket){
        socket.emit('set-value-notification', postData);
    });
}

// 댓글알림 푸시전송요청 소켓메시지 전송.
function sendReplyFCM(ref, title, text, postKey, board){
    ref.child(postKey).child('uid').once('value', function(uid){
        if(uid.exists()){
            consts.userRef.child(uid.val()).child('deviceToken').once('value', function(deviceToken){
                if(deviceToken.exists()){
                    main.connectionInstance.getSocket(function(socket){
                        var message = {
                            title: title,
                            body: text,
                            key: postKey,
                            board, board,
                            deviceToken : deviceToken.val()
                        }
                        socket.emit('replyFCM', message);
                    }); 
                }               
            });
        }    
    });
}

// 댓글 데이터 수정
export function updateValueReply(ref, edit, callback){
    ref.child(edit.postKey).child('reply').child(edit.replyKey).child('text').set(utils.htmlToPlaintext(edit.newReplyText));
    ref.child(edit.postKey).child('reply').child(edit.replyKey).child('textWithTag').set(escape(edit.newReplyText));
    callback(); // 콜백을 통해 UI업데이트
}
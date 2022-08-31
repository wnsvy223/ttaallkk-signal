"use strict";

import { viewNoticeDetail } from './main.js';
import * as gtaboardView from '../view/gtaboardView.js';
import * as utills from '../utills/utills.js';
import * as consts from '../utills/consts.js';
import * as boardDAO from '../model/boardDAO.js';

var firstdoc; //첫 페이지의 가장 최근 게시글의 키값 저장을 위한 변수
var replyCount = 0; //댓글 첫 로딩,댓글 추가 로딩 시 댓글의 마지막 지점값 
var currentCount = 0; //댓글 추가 로딩 시 시작 지점값

//GTA게시판 더 보기 뷰 세팅
function viewGTABoard(result, isLastPage, recentKey, type){
    if(!result) return;
    
    // 세션스토리지에 현재 페이지의 시작과 끝 키값 저장
    sessionStorage.setItem("endAt", result[0].idx);
    if(result.length < (consts.postCountPerPage - 1)){
        sessionStorage.setItem("startAt", result[result.length - 1].idx);
    }else{
        sessionStorage.setItem("startAt", result[consts.postCountPerPage - 1].idx);
    }

    // 뷰 태그 동적 생성 및 랜더링
    var gtaBoard = gtaboardView.renderGTALoadMore(result, type);
    $("#container").html(gtaBoard); 
    
    // 게시판 테이블 반응형 세팅
    utills.setTableResponsive();
    
    // 게시글 작성자 프로필 사진 세팅
    result.forEach(function(element){
        boardDAO.getWriterProfileUrl(element.uid).then(function(profile){
            $("#" + element.idx).attr('src', profile);
        });
    }); 
    
    // 공지사항 세팅
    boardDAO.getValueNotice('board-gta-notice').then(function(notice){
        $("#notice-gta-title").text(notice.title);
        $("#notice-gta-text").text(notice.text);
        $("#notice-gta-user-profile").attr('src', notice.profileImg);
        $("#notice-gta-user-name").text(notice.name);
        $("#notice-gta-timestamp").text(notice.timestamp);
    });

    // 공지사항 클릭
    $(".notice-row-gta").on('click',function(event){
        $(this).prop('disabled', true);  // button tr 중복 클릭 방지
        event.preventDefault();
        viewNoticeDetail('board-gta-notice');
        utills.setPageHistory({url: "/notice/gta"}, "/notice/gta"); 
    });

    //글쓰기 버튼 클릭
    $("#write-submit-gta").click(function(event){
        $(this).prop('disabled', true);
        event.preventDefault(); 
        getsummernoteGTA();          
        utills.setPageHistory({data: result, url: "/board/gta/write"}, "/board/gta/write");            
    });

    //GTA게시판 글 목록 클릭
    $("#gta-board-table").on('click','tr',function(event){
        $(this).prop('disabled', true); 
        event.preventDefault();
        if(result.length){
            var key = $(this).attr('value');
            gtaBoardDetail(key);
            viewsTransactionGTA(key);
        }
    }); 
    
    //테이블 로우 첫줄(=카테고리) 부분은 클릭이벤트 중지
    $("#gta-board-table").find('tr:first').on('click', function(event) {
        event.preventDefault();
        event.stopPropagation(); 
    }); 

    // 테이블의 작성자 프로필사진 클릭시 게시글 내용으로 이동 방지
    $("#gta-board-table tr").find('img').on('click', function(event) {
        event.preventDefault();
        event.stopPropagation();
    }); 

    if(result !== undefined && result.length){
        if(isLastPage || result.length < 20){ // 마지막 페이지 or 다음 페이지 데이터가 없다면 포워드 버튼 삭제
            $("#forward").css("display","none");
        }
        if(recentKey === firstdoc){ // 맨 첫페이지면 백버튼 삭제
            $("#backward").css("display","none");
        }
    }

    //게시판 페이징 뒤로가기 버튼 클릭
    $("#backward").on('click',function(event){ 
        if(result !== undefined && result.length){
            $("#backward").unbind('click');
            event.preventDefault();      
            var key = result[0].idx;
            paginationGTA("backwardGTA", key);
            var url = "/board/gta/page?" + "endAt=" + key;
            utills.setPageHistory({key: key, url: url, type: "backwardGTA"}, url);     
        }   
    }); 

    //게시판 페이징 앞으로 가기 버튼 클릭
    $("#forward").on('click',function(event){                          
        if(result !== undefined && result.length){
            $("#forward").unbind('click');
            event.preventDefault();
            var key = result[consts.postCountPerPage - 1].idx;             
            paginationGTA("forwardGTA", key);
            var url = "/board/gta/page?" + "startAt=" + key;
            utills.setPageHistory({key: key, url: url, type: "forwardGTA"}, url);
        }                       
    }); 
    redirectBoardGTA();

    var concept = "전체"; //카테고리값
    //카테고리 선택 드롭업 메뉴 클릭
    $("#category-gta").on('click','a',function(e){
        e.preventDefault();
        concept = $(this).text();
        $('.search-panel span #search_concept_gta').text(concept);          
    });

    //검색버튼 클릭
    $("#search-go-gta").on('click',function(e){
        e.preventDefault();
        var text = $('#search_param_gta').val();
        console.log("클릭(버튼) :" + "검색어 : " + text + "카테고리 : " +concept);
        if(!text){
            alert("검색어를 입력하세요.");
        }else{
            searchData(concept, text);
        }
    });
}

//게시판 검색
function searchData(node, value){
    console.log("카테고리 : " + node);
    console.log("검색어 : " + value);
    switch(node){
        case '전체':     
            getSerchDataByAll(value);       
            break;
        case '작성자':
            getSerchDataByCategory("userNickname", value);
            break;
        case '제목':
            getSerchDataByCategory("title", value);
            break;
        case '날짜':
            getSerchDataByCategory("timestamp", value);
            break;
        case '내용':
            getSerchDataByCategory("text", value);
            break;
        default:
    }
}

// 카테고리 별 검색
function getSerchDataByCategory(node, value){
    boardDAO.getSerchValueOrderByCategory(consts.gtaBoardRef, node, value).then(function(param){
        viewGTABoard(param.result, false, param.recentKey, param.type);
    });
}

// 전체 검색
function getSerchDataByAll(value){
    var result = [];
    var ref = firebase.database().ref("board").child("gta");
    ref.once('value', function(snapshot){
        snapshot.forEach(function(childSnapshot){
            ref.child(childSnapshot.key).orderByValue().startAt(value).endAt(value + "\uf8ff").once('value', function(data){
                if(data.val() !== null){
                    ref.child(data.key).once('value', function(searchPost){
                        //console.log("쿼리결과 : " + JSON.stringify(searchPost.val()));
                        var val = searchPost.val();
                        result.push(val);
                    }).then(function(){
                        var reverseArr = result.reverse();
                        var recentKey = reverseArr[0].idx //가장 최근 게시글의 키값
                        var param = {
                            result: reverseArr,
                            recentKey: recentKey
                        }   
                        viewGTABoard(param.result, false, param.recentKey, "search");
                    });          
                }
            });
        });
    });
}

//서머노트 에디터 뷰 세팅
function getsummernoteGTA(){
        //서머노트 에디터 랜더링
        var summernote = gtaboardView.renderSummerNoteGTA();
        $("#container").html(summernote); 

        // 서머노트 에디터 초기화
        $("#summernote").summernote({
            lang: 'ko-KR',               // set language
            height: 500,                 // set editor height
            minHeight: null,             // set minimum height of editor
            maxHeight: null,             // set maximum height of editor
            focus: true                  // set focus to editable area after initializing summernote
        });

        //글 작성 완료 클릭
        $("#write-board-gta").click(function(event){
            event.preventDefault();
            var title = $('#board-title').val();
            var text = $('#summernote').summernote('code');
            if(title === "") {
                alert('제목을 입력하세요.');                     
            }else if($("#summernote").summernote('isEmpty')){
                alert('본문 내용을 입력하세요.');
            }else{
                setValueGTABoard(title, text);             
            }
        });
        redirectBoardGTA();
}

// 게시글 내용 보기 뷰 세팅
function viewGTABoardDetail(result){
    // 게시글 내용 테이블 뷰
    gtaboardView.renderGTABoardDetail(result); //게시물 내용영역 뷰 세팅

    // 동적으로 추가된 뷰의 경우 클릭이벤트가 바인딩 되어있지 않기 때문에 아래 구문을 이용하면 동적으로 추가된 뷰에도 클릭이벤트가 바인딩됨.
    // 회원 유저 댓글 삭제 버튼
    $(document).off('click', '.auth-link').on('click', '.auth-link', function(event){
        var value = $(this).attr('value'); 
        removeReply(result[0].idx, value, "auth", null); 
    })

    // 비회원 유저 댓글 삭제 비밀번호 확인 버튼
    $(document).off('click', '.check-password-button').on('click', '.check-password-button', function(event){
        var value = $(this).attr('value');
        var inputPassword = $("#" + value).find('input').val();
        if(!inputPassword){
            alert('비밀번호를 입력하세요.');
        }else{
            removeReply(result[0].idx, value, "unauth", inputPassword);
        }
    });

    // 회원 유저 댓글 수정
    $(document).off('click', '.auth-link-edit').on('click', '.auth-link-edit', function(event){
        event.preventDefault();         
        var value = $(this).attr('value');   // 댓글 키값         
        editReply(result[0].idx, value);
    });

    // 비회원 유저 댓글 수정
    $(document).off('click', '.anonymous-link-edit').on('click', '.anonymous-link-edit', function(event){
        event.preventDefault();
        var value = $(this).attr('value'); // 댓글 키값
        $("#modal-edit-reply-password").modal();
        $("#confirm-reply-password").off('click').on('click', function(event){
            var inputPassword = $("#check-reply-password").val();
            if(!inputPassword){
                alert('비밀번호를 입력하세요.');
            }else{
                var ref = consts.gtaBoardRef.child(result[0].idx).child('reply').child(value).child('replyPassword');
                ref.once('value', function(snapshot){
                    if(snapshot.exists()){
                        if(snapshot.val() === inputPassword){
                            editReply(result[0].idx, value);
                            $("#modal-edit-reply-password").modal('hide');
                        }else{
                            alert('비밀번호가 틀렸습니다.');
                        }
                    }
                });
            }
        });
    });

    // 비회원 글 수정 버튼
    $("#confirm-pw-edit-post").click(function(event){
        event.preventDefault();
        if(result[0].password){ 
            var password = $("#input-pw-edit-post").val();
            if(!password){
                alert('비밀번호를 입력하세요.');
            }else if(password !== result[0].password){
                alert('비밀번호가 틀렸습니다.');
            }else{
                editPost(result);
                var url = "/board/gta/detail/edit/" + result[0].idx;
                utills.setPageHistory({key: result[0].idx}, url);
            }
        }
    });

    // 비회원 글 삭제용 패스워드 체크 확인 버튼
    $("#confirm-pw-delete-post").unbind("click").bind("click",function(){
        event.preventDefault();
        if(result[0].password){ 
            var password = $("#input-pw-delete-post").val();
            if(!password){
                alert('비밀번호를 입력하세요.');
            }else if(password !== result[0].password){
                alert('비밀번호가 틀렸습니다.');
            }else{
                $("#deleteModalAnonymous").modal();              
            }
        }
    });

    // 비회원 글 삭제 버튼
    $("#delete-post-anonymous").unbind("click").bind("click",function(){
        $("#deleteModalAnonymous").modal('hide');
        deletePost(result[0].idx, false);
        history.back();
    });

    // 게시글 수정 버튼
    $("#btn-board-edit").click(function(event){ 
        event.preventDefault();
        editPost(result);
        var url = "/board/gta/detail/edit/" + result[0].idx;
        utills.setPageHistory({key: result[0].idx}, url);  
    });  

    // 게시글 삭제 버튼   
    $("#delete-post").unbind("click").bind("click",function(){
        event.preventDefault();
        deletePost(result[0].idx, true);
        history.back();  
    }); 

    // 댓글 작성용 서머노트 에디트 초기화
    $("#summernote-reply").summernote({
        lang: 'ko-KR',               // set language
        height: 200,                 // set editor height
        minHeight: null,             // set minimum height of editor
        maxHeight: null,             // set maximum height of editor
        focus: false                  // set focus to editable area after initializing summernote
    }); 
    
    // 댓글 작성 완료 클릭
    $("#write-reply-gta").click(function(event){
        event.preventDefault();
        var text = $('#summernote-reply').summernote('code');
        var anonymousNickname = $("#anonymous-nickname").val();
        var anonymousPassword = $("#anonymous-password").val();     
        var user = firebase.auth().currentUser;
        if(user){
            if($("#summernote-reply").summernote('isEmpty')){
                alert('댓글 내용을 입력하세요.');     
            }else{
                setValueReply(result[0].idx, text, "", "");
                $(this).prop('disabled', true);
            }
        }else{
            if($("#summernote-reply").summernote('isEmpty')){
                alert('댓글 내용을 입력하세요.');        
            }else if(!anonymousNickname){
                alert('닉네임을 입력하세요.');
            }else if(!anonymousPassword){
                alert('비밀번호를 입력하세요.');
            }else{
                setValueReply(result[0].idx, text, anonymousNickname, anonymousPassword);
                $(this).prop('disabled', true);
            }
        }    
    }); 
    redirectBoardGTA();            
}

// 댓글 수정용 폼 생성 및 댓글 데이터 수정 함수 호출
function editReply(postKey, replyKey){
    var text = $("#" + replyKey).find('p').text(); // 댓글 내용 텍스트값

    // 댓글 수정용 서머노트 에디터 초기화
    var editReplySummernote = "<div id='reply-edit-area'>"
    editReplySummernote += "<div id='summernote-reply-edit'>" + text + "</div>";
    editReplySummernote += "<div class='form-group text-right'>";
    editReplySummernote += "<button type='submit' id='edit-reply-ok' class='btn btn-warning divide-right'><i class='glyphicon glyphicon-pencil'></i> 수정 </button>";
    editReplySummernote += "<button id='edit-reply-cancel' class='btn btn-warning'><i class='glyphicon glyphicon-pencil'></i> 취소 </button>";
    editReplySummernote += "</div>";
    editReplySummernote += "</div>";
    
    $("#" + replyKey).children().hide();
    $("#" + replyKey).append(editReplySummernote)
    $("#summernote-reply-edit").summernote({
        lang: 'ko-KR',               // set language
        height: 150,                 // set editor height
        minHeight: null,             // set minimum height of editor
        maxHeight: null,             // set maximum height of editor
        focus: true                  // set focus to editable area after initializing summernote
    });

    // 댓글수정 확인 버튼
    $("#edit-reply-ok").off('click').on('click', function(event){
        var editData = {
            postKey: postKey,
            replyKey: replyKey,
            newReplyText: $("#summernote-reply-edit").summernote('code'),
        }
        boardDAO.updateValueReply(consts.gtaBoardRef, editData, function(){
            $("#" + replyKey).children().show();
            $("#reply-edit-area").remove();
            gtaBoardDetail(editData.postKey);
        });
    });

    // 댓글수정 취소 버튼
    $("#edit-reply-cancel").off('click').on('click', function(event){
        $("#" + replyKey).children().show();
        $("#reply-edit-area").remove();
        $("#summernote-reply-edit").summernote('destroy');
    });
}

// 댓글 삭제 모달창 & DB 댓글데이터 삭제
function removeReply(boardKey, replyKey, type, inputPassword){
    var modal = "<div class='modal fade' id='delete-reply-modal' tabindex='-1' role='dialog' aria-labelledby='exampleModalLabel' aria-hidden='true'>";
        modal += "<div class='modal-dialog' role='document'>";
        modal += "<div class='modal-content'>";  
        modal += "<div class='modal-header'>";     
        modal += "<h5 class='modal-title' id='exampleModalLabel'>댓글 삭제</h5>";        
        modal += "<button type='button' class='close' data-dismiss='modal' aria-label='Close'>";         
        modal += "<span aria-hidden='true'>&times;</span>";          
        modal += "</button>";            
        modal += "</div>";          
        modal += "<div class='modal-body'>";        
        modal += "선택한 댓글을 삭제 하시겠습니까?";        
        modal += "</div>";        
        modal += "<div class='modal-footer'>";       
        modal += "<button id='delete-reply' type='button' class='btn btn-danger'>삭제</button>";        
        modal += "<button type='button' class='btn btn-info' data-dismiss='modal'>취소</button>";            
        modal += "</div>";            
        modal += "</div>";  
        modal += "</div>";  
        modal += "</div>";         
    $("#container").append(modal);  
    $("#delete-reply-modal").modal();
    $("#delete-reply").unbind("click").bind("click",function(){
        $("#delete-reply-modal").modal('hide');
        var ref = consts.gtaBoardRef.child(boardKey).child('reply').child(replyKey);
        switch(type){
            case 'auth':
                ref.remove().then(function(){
                    gtaBoardDetail(boardKey);
                    console.log('댓글삭제 성공');     
                }).catch(function(error) {
                    console.log('댓글삭제 실패' + error);
                    alert('댓글 삭제 오류');
                }); 
                break;
            case 'unauth':
                ref.child('replyPassword').once('value', function(snapshot){
                    if(snapshot.exists()){
                        if(snapshot.val() === inputPassword){ 
                            ref.remove().then(function(){
                                gtaBoardDetail(boardKey);
                                console.log('댓글삭제 성공');     
                            }).catch(function(error) {
                                console.log('댓글삭제 실패' + error);
                                alert('댓글 삭제 오류');
                            }); 
                        }else{
                            alert('비밀번호가 틀렸습니다.');
                        }
                    }
                })
                break;
            default:
        }
    });
}

// GTA게시판 페이지로 리다이렉트
function redirectBoardGTA(){
    $(document).ready(function(){
        $("#board-gta-title").click(function(event){
            event.preventDefault();
            gtaBoard(consts.gtaBoardRef);
            utills.setPageHistory({url: "/board/gta"}, "/board/gta");  
        });
    });
}

// 글 수정 폼 뷰세팅
function editPost(result){
    // 글 수정용 서머노트 에디터 뷰 랜더링
    var editPostArea = gtaboardView.rednerEditPostSummernote(result);
    $("#container").html(editPostArea); 
    $("#edit-summernote").summernote({
        lang: 'ko-KR',               // set language
        height: 500,                 // set editor height
        minHeight: null,             // set minimum height of editor
        maxHeight: null,             // set maximum height of editor
        focus: false                  // set focus to editable area after initializing summernote
    }); 

    // 글 수정 완료 버튼 클릭
    $("#edit-post-ok").click(function(){
        $(this).prop('disabled', true);
        var title = $("#input-edit-post-title").val();
        var text = $("#edit-summernote").summernote('code');
        if(!title){
            alert('제목을 입력 하세요.')
        }else if(!text){
            alert('내용을 입력 하세요.')
        }else{
            setValuePostData(result[0].idx, "title", title);
            setValuePostData(result[0].idx, "text", text); 
            setValuePostData(result[0].idx, "textWithTag", text); 
        }
        history.back(); 
    });

    // 글 수정 취소 버튼 클릭
    $("#edit-post-cancel").click(function(){
        $(this).prop('disabled', true);
        history.back();
    });
    redirectBoardGTA(); 
}

//게시글 DB세팅
function setValueGTABoard(title, textWithTag){ 
    var writeRef = consts.gtaBoardRef.push();
    boardDAO.setValuePost(title, textWithTag, writeRef);
}

//게시글 DB수정
function setValuePostData(key, node, value){
    var ref = consts.gtaBoardRef.child(key).child(node);
    boardDAO.updateValuePost(ref, value);
}

//게시글 DB삭제
function deletePost(key, isAuth){
    var ref = consts.gtaBoardRef.child(key);
    boardDAO.deleteValuePost(ref).then(function(isDeleteSuccess){
        if(isDeleteSuccess){
            if(isAuth){
                console.log('가입유저 게시글 삭제 성공');
                $("#deleteModal").modal('hide');
                $("#btn-board-delete").prop('disabled', true);
                $("#btn-board-edit").prop('disabled', true);
                $("#write-reply-gta").prop('disabled', true);
            }else{
                console.log('미가입유저 게시글 삭제 성공');
                $("#deleteModalAnonymous").modal('hide');
            }
        }
    }).catch(function(error){
        if(isAuth){
            console.log('게시글 삭제 오류(가입유저) : ' + error);
            $("#deleteModal").modal('hide');
        }else{
            console.log('게시글 삭제 오류(미가입유저) : ' + error);
            $("#deleteModalAnonymous").modal('hide');
        }     
        alert('게시글이 정상적으로 삭제되지 않았습니다.' + error);
    });
}

//댓글 DB세팅
function setValueReply(key, textWithTag, anonymousNickname, anonymousPassword){
    boardDAO.setValueReply(consts.gtaBoardRef, key, textWithTag, anonymousNickname, anonymousPassword, function(postKey){
        if(postKey){
            gtaBoardDetail(postKey); //게시글 내용 뷰 갱신
        }
    });
}

//조회수 업데이트 트랜잭션 
function viewsTransactionGTA(key){
    var ref = consts.gtaBoardRef.child(key);
    var viewsRef = consts.gtaBoardRef.child(key).child('views');
    boardDAO.updateViews(ref, viewsRef);
}

//GTA게시판 더 보기 데이터 요청
function gtaBoard(ref){
    boardDAO.getBoardMore(ref).then(function(data){
        if(!data.result.length){
            viewGTABoard("", false, "", "", "paging");
        }else{
            viewGTABoard(data.result, false, data.recentKey, "paging");
        }
    });
}

//게시글 내용 보기 데이터 요청
function gtaBoardDetail(key){
    var ref = firebase.database().ref('board').child('gta').child(key);
    boardDAO.getBoardDetail(ref).then(function(result){
        if(result.length > 0){
            viewGTABoardDetail(result);
            utills.setPageHistory({data: key, url: "/board/gta/detail?postKey=" + key}, "/board/gta/detail?postKey=" + key);
        }else{
            alert('삭제된 게시글 입니다.'); 
        }
    });  
}

//GTA게시판 페이징 처리 데이터 요청
function paginationGTA(page, key){
    switch(page){
        case 'forwardGTA':
            var ref = firebase.database().ref('board').child('gta').orderByKey().endAt(key).limitToLast(consts.postCountPerPage + 1);
            paginatorGTA(ref, 'forward');
            break;
        case 'backwardGTA': 
            var ref = firebase.database().ref('board').child('gta').orderByKey().startAt(key).limitToFirst(consts.postCountPerPage + 1);
            paginatorGTA(ref, 'backward');
            break;
        default:
        // 페이징 처리시 현재 페이지의 마지막 키값과 다음페이지의 첫번째 키값이 중복되므로 페이지당 글 갯수(20) + 1개의 키값을 가져온뒤
        // 페이징 함수에서 중복되는 키값 인덱스 삭제
    }
}

/* Firebase Paging 처리 함수 */
function paginatorGTA(ref, type){
    boardDAO.paging(ref, type).then(function(data){
        if(data){
            viewGTABoard(data.result, data.isLastPage, data.recentKey, "paging");  //추가 페이지 로드
        }else{
            alert(data.message); // 마지막 페이지 메시지
        }
    });  
}

export { redirectBoardGTA, gtaBoard, getsummernoteGTA, gtaBoardDetail, paginationGTA, viewsTransactionGTA, viewGTABoard }
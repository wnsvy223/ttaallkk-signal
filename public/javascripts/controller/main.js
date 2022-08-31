/*
The MIT License
Copyright (c) 2014-2018 Muaz Khan <muazkh@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.    
*/
"use strict";

import { redirectBoardFree, freeBoard, getsummernote, freeBoardDetail, pagination, viewsTransaction, viewFreeBoard } from './freeboard.js';
import { redirectBoardGTA, gtaBoard, getsummernoteGTA, gtaBoardDetail, paginationGTA, viewsTransactionGTA, viewGTABoard } from './gtaboard.js';
import { talkBoard, clickRowTalkBoard } from './talkboard.js';
import { isOnAir } from '../RTCMultiConnectionClient.js';
import * as mainView from '../view/mainView.js';
import * as consts from '../utills/consts.js';
import * as utills from '../utills/utills.js';
import * as boardDAO from '../model/boardDAO.js';
import * as friend from '../controller/friend.js';

var connectionInstance = new RTCMultiConnection();
console.log('브라우저 :' + connectionInstance.DetectRTC.browser.name);
if(connectionInstance.DetectRTC.browser.name === "IE"){
    alert('이 사이트는 인터넷 익스플로러를 지원하지 않습니다. 크롬 브라우저를 이용하세요.');
}

$(document).ready(function(){
    var currentUrl = window.location.href; // 현재 url주소를 가져옴
    console.log("현재 주소 : "+ currentUrl)
    var queryString = utills.getQueryStringObject(); // 현재 주소의 쿼리스트링을 파싱한 값
    if(queryString.postKey){ // 키값이 있는 주소일 경우 = 노티를 통해 들어온 경우 해당 게시글 페이지를 그려줌
        if(window.location.pathname === "/board/gta/detail"){
            gtaBoardDetail(queryString.postKey);
        }else{
            freeBoardDetail(queryString.postKey); 
        }
    }else if(queryString.startAt || queryString.endAt){ // 페이징 로직중 새로고침 시 세션스토리지에 저장된 시작,끝 키값을 가져와서 페이지 다시 그려줌
        if(window.location.pathname === "/board/gta/page"){
            boardDAO.getRefreshPage(consts.gtaBoardRef).then(function(result){
                viewGTABoard(result, false, result[0].idx, "paging");
            });
        }else{
            boardDAO.getRefreshPage(consts.freeBoardRef).then(function(result){
                viewFreeBoard(result, false, result[0].idx, "paging");
            });
        }
    }else if(window.location.pathname === "/board/free"){ // pathname에 따라 기능별 페이지 그려줌
        freeBoard(consts.freeBoardRef);
    }else if(window.location.pathname === "/board/free/write"){
        getsummernote();
    }else if(window.location.pathname === "/board/gta"){
        gtaBoard(consts.gtaBoardRef);
    }else if(window.location.pathname === "/board/gta/write"){
        getsummernoteGTA();
    }else if(window.location.pathname === "/board/talk"){
        talkBoard();
    }else if(window.location.pathname === "/notice/gta"){
        viewNoticeDetail('board-gta-notice');
    }else if(window.location.pathname === "/notice/free"){
        viewNoticeDetail('board-free-notice');
    }else if(window.location.pathname === "/friends"){
        friend.getFriendPage();
    }else{
        mainBoard(); // 키값이 없는 주소일 경우 메인화면 그려줌
    }  
    $("#app-title").off('click').on('click', function(event){
        event.preventDefault();
        mainBoard();
        utills.setPageHistory({url: "/"}, "/");
    });
});

// 페이지 히스토리 팝업 처리
$(document).ready(function(){
    window.onpopstate = function (event) {
        //console.log("히스토리팝업" + JSON.stringify(event.state));
        if(event.state === null || event.state.url ==='/'){
            mainBoard();
        }else if(event.state.url === '/board/free'){
            freeBoard(consts.freeBoardRef);
        }else if(event.state.url === '/board/free/write'){
            getsummernote();
        }else if((event.state.url === '/board/free/detail?postKey=' + event.state.data) && event.state.data){
            freeBoardDetail(event.state.data);
        }else if(event.state.key && (event.state.type === "forward")){                     
            pagination("forward", event.state.key, event.state.postCount);
        }else if(event.state.key && (event.state.type === "backward")){
            pagination("backward", event.state.key, event.state.postCount);
        }else if(event.state.url === '/board/gta'){
            gtaBoard(consts.gtaBoardRef);
        }else if(event.state.url === '/board/gta/write'){
            getsummernoteGTA();
        }else if((event.state.url === '/board/gta/detail?postKey=' + event.state.data) && event.state.data){
            gtaBoardDetail(event.state.data);
        }else if(event.state.key && (event.state.type === "forwardGTA")){                   
            paginationGTA("forwardGTA", event.state.key, event.state.postCount);
        }else if(event.state.key && (event.state.type === "backwardGTA")){
            paginationGTA("backwardGTA", event.state.key, event.state.postCount);
        }else if(event.state.url === '/board/talk'){
            talkBoard(); 
        }else if(event.state.url === '/notice/gta'){
            viewNoticeDetail('board-gta-notice');
        }else if(event.state.url === '/notice/free'){
            viewNoticeDetail('board-free-notice');
        }else if(event.state.url === '/friends'){
            friend.getFriendPage();
        }
    }
});

// 사이드바 게시판 리스트
$(document).ready(function(){
    $("#sidebar-board-gta").off('click').on('click', function(event){
        event.preventDefault();
        gtaBoard(consts.gtaBoardRef);
        utills.setPageHistory({url: "/board/gta"}, "/board/gta");
    });
    $("#sidebar-board-free").off('click').on('click', function(event){
        event.preventDefault();
        freeBoard(consts.freeBoardRef);
        utills.setPageHistory({url: "/board/free"}, "/board/free"); 
    });
    $("#sidebar-board-talk").off('click').on('click', function(event){
        event.preventDefault();
        talkBoard();
        utills.setPageHistory({url: "/board/talk"}, "/board/talk");
    });
});

// 메인화면 게시판 보드 데이터 요청
// (소켓통신 결과값인 톡게시판 데이터 요청 함수와, 나머지 두 게시판 파이어베이스쿼리 데이터 요청 함수가 비동기 형식이기 때문에 처리 완료시점이 다름.)
// (각 함수 내부적으로 Promise를 반환하므로 await을 사용하여 동기방식으로 호출되도록 변경하여 뷰 세팅이 순차적으로 이루어 지도록 함.)
async function mainBoard(){
    // GTA 게시판 데이터 요청
    await boardDAO.getPreview(consts.gtaBoardRef).then(function(result){
        $("#container").empty(); // 컨테이너 뷰 자식요소 모두 삭제
        preViewGTABoard(result); 
    });
    // 자유 게시판 데이터 요청
    await boardDAO.getPreview(consts.freeBoardRef).then(function(result){
        preViewFreeBoard(result); 
    });
    // 톡 게시판 데이터 요청
    getTalkBoardPreView();
}

// 공지사항 상세 내용 뷰 세팅
function viewNoticeDetail(ref){
    boardDAO.getValueNotice(ref).then(function(value){
        if(value){
            var notice = "<div>";
            notice += "<div class='card'>";
            notice += "<ul class='list-group list-group-flush'>";
            notice += "<div class='card card-price'>";
            notice += "<div class='card card-default card-header'>";
            notice += "<ul class='details'>";      
            notice += "<li class='price'><span>공지사항</span></li>";     
            notice += "</ul>";              
            notice += "</div>";    
            notice += "<div class='card-body'>";     
            notice += "<table class='table table-bordered table-hover table-sm table-style'>";
            notice += "<tr>";
            notice += "<td class='text-left td-break-word'><span class='board-title' id='notice-title'>"+ value.title +"<span></td>";   
            notice += "</tr>";  
            notice += "<tr>";  
            notice += "<td class='text-left td-break-word'>";
            notice += "<img id='notice-owner-img' class='td-user-profile img-circle' src='"+ value.profileImg +"'></img>";
            notice += "<h6 class='userNickname' id='notice-owner-name'>"+ value.name +"</h6>";
            notice += "<h6 id='notice-timestamp' class='timestamp pull-right'>"+ value.timestamp +"</h6>";
            notice += "</td>";
            notice += "</tr>";   
            notice += "<tr>";    
            notice += "<td class='text-left board-detail td-break-word'><h5 id='notice-text' class='board-text'>"+ value.text +"</h5></td>";          
            notice += "</tr>";       
            notice += "</table>";      
            notice += "</div>";  
            notice += "</div>"; 
        
            $("#container").html(notice); 
        }  
    });
}

// GTA 게시판 프리뷰
function preViewGTABoard(result){
        // 뷰 태그 동적 생성 및 랜더링
        var previewGTA = mainView.renderGTAPreview(result);
        $("#container").append(previewGTA);      
        
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

        // GTA 게시판 글쓰기 버튼 클릭
        $("#write-post-boardgta-preview").click(function(event){
            $("#write-post-boardgta-preview").unbind('click'); // a태그 중복클릭 방지 
            event.preventDefault();
            getsummernoteGTA();          
            utills.setPageHistory({url: "/board/gta/write"}, "/board/gta/write");
        });

        // 더보기 버튼 클릭
        $("#board-more-gta").click(function(event){   
            $("#board-more-gta").unbind('click'); // a태그 중복클릭 방지 
            event.preventDefault();                                  
            gtaBoard(consts.gtaBoardRef);
            utills.setPageHistory({data: result, url: "/board/gta"}, "/board/gta");                                                 
        });

        // 메인화면 GTA게시판 글 목록 클릭          
        $("#gta-board-table").on('click','tr',function(event){
            $(this).prop('disabled', true);  // button tr 중복 클릭 방지
            event.preventDefault();
            if(result.length){
                var key = $(this).attr('value');
                gtaBoardDetail(key);
                viewsTransactionGTA(key);
            }   
        }); 

        // 테이블 로우 첫줄(=카테고리) 부분은 클릭이벤트 중지
        $("#gta-board-table").find('tr:first').on('click', function(event) {
            event.preventDefault();
            event.stopPropagation(); 
        });      
        redirectBoardGTA();

        // 테이블의 작성자 프로필사진 클릭시 게시글 내용으로 이동 방지
        $("#gta-board-table tr").find('img').on('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
        }); 
}

// 자유게시판 프리뷰
function preViewFreeBoard(result){
        // 뷰 태그 동적 생성 및 랜더링          
        var previewFree = mainView.renderFreePreview(result);
        $("#container").append(previewFree);      
        
        // 게시판 테이블 반응형 세팅
        utills.setTableResponsive();

        // 게시글 작성자 프로필 사진 세팅
        result.forEach(function(element){
            boardDAO.getWriterProfileUrl(element.uid).then(function(profile){
                $("#" + element.idx).attr('src', profile);
            });
        }); 

        // 공지사항 세팅
        boardDAO.getValueNotice('board-free-notice').then(function(notice){
            $("#notice-free-title").text(notice.title);
            $("#notice-free-text").text(notice.text);
            $("#notice-free-user-profile").attr('src', notice.profileImg);
            $("#notice-free-user-name").text(notice.name);
            $("#notice-free-timestamp").text(notice.timestamp);
        });

        // 공지사항 클릭
        $(".notice-row-free").on('click',function(event){
            $(this).prop('disabled', true);  // button tr 중복 클릭 방지
            event.preventDefault();
            viewNoticeDetail('board-free-notice');
            utills.setPageHistory({url: "/notice/free"}, "/notice/free");
        });

        // 자유 게시판 글쓰기 버튼 클릭
        $("#write-post-boardfree-preview").click(function(event){
            $("#write-post-boardfree-preview").unbind('click'); // a태그 중복클릭 방지 
            event.preventDefault();
            getsummernote();          
            utills.setPageHistory({data: result, url: "/board/free/write"}, "/board/free/write");                      
        });
        
        // 더보기 버튼 클릭
        $("#board-more").click(function(event){   
            $("#board-more").unbind('click'); // a태그 중복클릭 방지 
            event.preventDefault();                                  
            freeBoard(consts.freeBoardRef);   
            utills.setPageHistory({data: result, url: "/board/free"}, "/board/free");                                                  
        });

        // 메인화면 자유게시판 글 목록 클릭          
        $("#main-board-table").on('click','tr',function(event){
            $(this).prop('disabled', true);  // button tr 중복 클릭 방지
            event.preventDefault();
            if(result.length){
                var key = $(this).attr('value');
                freeBoardDetail(key);
                viewsTransaction(key);
            }   
        }); 

        // 테이블 로우 첫줄(=카테고리) 부분은 클릭이벤트 중지
        $("#main-board-table").find('tr:first').on('click', function(event) {
            event.preventDefault();
            event.stopPropagation(); 
        });      
        redirectBoardFree();          
          
        // 테이블의 작성자 프로필사진 클릭시 게시글 내용 이동 방지
        $("#main-board-table tr").find('img').on('click', function(event) {
            event.preventDefault();
            event.stopPropagation(); 
        }); 
}

// 톡게시판 프리뷰 데이터 가져오기
function getTalkBoardPreView(){
    connectionInstance.getSocket(function(socket){
        socket.emit('get-public-rooms', consts.publicRoomIdentifier, function(listOfRooms) {
            if(listOfRooms){
                preViewTalkBoard(listOfRooms);     
            }
        });
    });
}

// 톡게시판 프리뷰 
function preViewTalkBoard(result){
        // 뷰 태그 동적 생성 및 랜더링
        var previewTalk = mainView.renderTalkPreview(result);
        $("#container").append(previewTalk); // 메인화면에서의 경우 톡게시판 프리뷰부분이 화면 영역을 덮어쓰지않고 append로 추가
        
        // 게시판 테이블 반응형 세팅
        utills.setTableResponsive();

        // 톡게시판 프리뷰 새로고침 아이콘 클릭
        $("#refresh-talk-board").on('click', function(event){
            event.preventDefault();
            $("#refresh-talk-board").addClass("refresh-loading");
            setTimeout(function() {
                $("#refresh-talk-board").removeClass("refresh-loading");
                refreshTalkPreview();
            },1000);
        });

        // 더보기 버튼 클릭
        $("#board-talk-more").off('click').on('click', function(event){   
            event.preventDefault();       
            talkBoard();                     
            connectionInstance.getSocket(function(socket){
                socket.emit('get-public-rooms', consts.publicRoomIdentifier, function(listOfRooms) {
                    if(listOfRooms){
                        utills.setPageHistory({data: listOfRooms, url: "/board/talk"}, "/board/talk"); 
                    }
                }); 
            });                                                  
        });

        // 톡 게시판 글 목록 클릭(tr-prevent클래스가 적용된 row인 톡게시판 게시글 row에만 적용)   
        $("#board-talk-table").off('click').on('click','tr.tr-prevent',function(event){
            console.log("대화중?" + isOnAir)
            if(isOnAir){
                alert('이미 대화중입니다.');
            }else{
                event.preventDefault();
                event.stopPropagation();
                var roomName = $(this).attr('value');
                if(roomName !== undefined){
                    clickRowTalkBoard(roomName);
                }      
            }        
        });   

        // 테이블 로우 첫줄(=카테고리) 부분은 클릭이벤트 중지
        $("#board-talk-table").find('tr:first').on('click', function(event) {
            event.preventDefault();
            event.stopPropagation(); 
        });
        // 생성된 방이 없을 경우에도 해당 메시지 표시된 row 클릭이벤트 중지
        $("#board-talk-table").find("#empty-row").on('click', function(event) {
            event.preventDefault();
            event.stopPropagation(); 
        });           
        
        //대화게시판 타이틀 클릭
        $("#board-talk-title").click(function(event){
            $("#board-talk-title").unbind('click'); // a태그 중복클릭 방지 
            event.preventDefault();
            talkBoard();
            connectionInstance.getSocket(function(socket){
                socket.emit('get-public-rooms', consts.publicRoomIdentifier, function(listOfRooms) {
                    if(listOfRooms){
                        utills.setPageHistory({data: listOfRooms, url: "/board/talk"}, "/board/talk");
                    }
                }); 
            });
        });    
}

// 톡게시판 프리뷰 새로고침 버튼
function refreshTalkPreview(){
    connectionInstance.getSocket(function(socket){
        socket.emit('get-public-rooms', consts.publicRoomIdentifier, function(listOfRooms) {
            if(listOfRooms){
                if(listOfRooms.length > 0){
                    $("#board-talk-table > tbody > tr.tr-prevent").remove();
                    var limitOffset = 0;
                    if(listOfRooms.length > 10){
                        limitOffset = 10;
                    }else{
                        limitOffset = listOfRooms.length;
                    }
                    for(var i=0; i<limitOffset; i++){
                        var row = "<tr class='tr-prevent' value='"+ listOfRooms[i].sessionid +"'><td class='text-center'>" + (i + 1) + "</td><td class='text-center'>" + listOfRooms[i].sessionid + "</td><td class='text-center'>" + listOfRooms[i].participants.length + " / " + listOfRooms[i].maxParticipantsAllowed +"</td></tr>";                        
                        $("#board-talk-table > tbody:last").append(row);
                    } 
                }else{
                    var emptyRow = "<tr id='empty-row' class='tr-prevent'><td class='text-center' colspan='3'>생성된 대화방이 없습니다.</td></tr>";
                    $("#board-talk-table > tbody > tr.tr-prevent").remove();
                    $("#board-talk-table > tbody:last").append(emptyRow);
                }
                utills.setTableResponsive();// 게시판 테이블 반응형 세팅
            }
        });
    });
}

export { connectionInstance, viewNoticeDetail }
/*
The MIT License
Copyright (c) 2014-2018 Muaz Khan <muazkh@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.    
*/
"use strict";

import { connection, connectionRTC, onAir, isOnAir, redirectMain } from '../RTCMultiConnectionClient.js';
import { connectionInstance } from './main.js'
import * as talkBoardView from '../view/talkboardView.js';
import * as consts from '../utills/consts.js';
import * as utills from '../utills/utills.js';

// 톡 게시판 데이터 가져오기
function talkBoard(){
    connectionInstance.getSocket(function(socket){
        socket.emit('get-public-rooms', consts.publicRoomIdentifier, function(listOfRooms) {
            if(listOfRooms){
                viewTalkBoard(listOfRooms);     
            }
        });
    });
}

// 톡게시판 추가 로딩 뷰
function viewTalkBoard(result){
        // 톡게시판 추가 로딩 뷰 랜더링   
        var boardTalk = talkBoardView.renderTalkLoadMore(result);
        $("#container").html(boardTalk);

        // 게시판 테이블 반응형 세팅
        utills.setTableResponsive();

        // 톡게시판 새로고침 아이콘 클릭
        $("#refresh-talk-board").on('click', function(event){
            event.preventDefault();
            $("#refresh-talk-board").addClass("refresh-loading");
            setTimeout(function() {
                $("#refresh-talk-board").removeClass("refresh-loading");
                talkBoard();
            },1000);
        });

        // 게시글 추가 로딩 버튼 클릭
        $("#load-more-row").on('click', function(event){
            event.preventDefault();
            //
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
            utills.setPageHistory({data: result, url: "/board/talk"}, "/board/talk");
        });   
}

function clickRowTalkBoard(roomName){
    var user = firebase.auth().currentUser;
    if(user){
        connectionRTC(user.uid, connection, roomName);
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
                
            }
        }); 
        onAir(roomName);  
    }else{
        // 비로그인 유저의 경우 닉네임 입력 모달창 호출 후 입력값으로 대화방 입장.
        $("#talkboard-anonymous-modal").modal('show');
        $("#submit-talkboard-id").off('click').on('click', function(event){
            $("#talkboard-anonymous-modal").modal('hide');
            event.preventDefault();
            event.stopPropagation();
            var anonymousNickname = $("#input-talkboard-id").val();
            if(!anonymousNickname){
                $("#alert-input-id").modal('show'); // 경고창 모달
                $(".tr-prevent").prop('disabled', false);
            }else{
                connectionRTC(anonymousNickname, connection, roomName);
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
                        
                    }
                });
                onAir(roomName);  
            }     
        });
        // 취소 혹은 dim 영역 클릭으로 모달창 닫힐 시 게시판 클릭불가 속성 삭제
        $("#cancel-talkboard-id").off('click').on('click', function(){
            $(".tr-prevent").prop('disabled', false);
        });
        $("#talkboard-anonymous-modal").on('hidden.bs.modal', function () {
            $(".tr-prevent").prop('disabled', false);
        });
    }     
}

function appendRow(result){
    for(var i=0; i<result.length; i++){
        var boardTalk = "";
        if(result[i].maxCountOfUsers){
            if(result[i].joinUser){
                boardTalk += "<tr class='tr-prevent' value='"+ result[i].roomName +"'><td class='col-md-6 ellipsis'>" + result[i].roomName + "</td><td class='col-md-2 ellipsis'>" + result[i].timestamp + "</td><td class='col-md-2 ellipsis text-center'>" + Object.keys(result[i].joinUser).length + " / " + result[i].maxCountOfUsers +"</td></tr>";                    
            }else{
                boardTalk += "<tr class='tr-prevent' value='"+ result[i].roomName +"'><td class='col-md-6 ellipsis'>" + result[i].roomName + "</td><td class='col-md-2 ellipsis'>" + result[i].timestamp + "</td><td class='col-md-2 ellipsis text-center'> 0 / " + result[i].maxCountOfUsers +" </td></tr>";                    
            }
        }
        $("#board-talk-table").append(boardTalk);
        $("#load-more-row").remove();       
    }  
    
    $("#load-more-row").click(function(event){
        event.preventDefault();
        if(result.length > 0){
            loadMore(result[result.length -1].idx);
        }else{
            $("#load-more-row").remove();
        }    
    })
}

export { talkBoard, viewTalkBoard, clickRowTalkBoard }
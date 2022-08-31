"use strict";

export function renderTalkLoadMore(result){
    var boardTalk = "<div id='board-talk-container'>";
    boardTalk += "<div id='board-talk-detail' class='card'>";
    boardTalk += "<div class='card card-price'>";
    boardTalk += "<div class='card card-default card-header'>";
    boardTalk += "<ul class='details'>";      
    boardTalk += "<li class='price'><a id='board-talk-title' class='pluslink'>대화게시판</a><a id='refresh-talk-board' class='board-icon pluslink'><i id='refresh-icon' class='fas fa-redo-alt'></i></a></li>";   
    boardTalk += "</ul>";              
    boardTalk += "</div>";          
    boardTalk += "<div class='table-wrap card-body'>";        
    boardTalk += "<table id='board-talk-table' class='table table-hover table-sm'>";        
    boardTalk += "<thead>";
    boardTalk += "<tr class='card card-default card-header'>";
    boardTalk += "<th class='text-center col-md-2'>번호</th>";  
    boardTalk += "<th class='text-center col-md-5'>제목</th>";
    boardTalk += "<th class='text-center col-md-5'>현재인원수 / 총인원수</th>";   
    boardTalk += "</tr>";
    boardTalk += "</thead>";
    boardTalk += "<tbody>";
    if(!result || result.length <= 0){
        boardTalk += "<tr id='empty-row' class='tr-prevent'><td class='text-center' colspan='3'>생성된 대화방이 없습니다.</td></tr>";
    }else{
        for(var i=0; i<result.length; i++){ // 테이블에 해당 값들 부여
            if((result[i].isPasswordProtected === false)){ //공개 방인 경우
                boardTalk += "<tr class='tr-prevent' value='"+ result[i].sessionid +"'>";
                boardTalk += "<td class='text-center'>" + (i + 1) + "</td>";
                boardTalk += "<td class='text-center'>" + result[i].sessionid + "</td>";
                boardTalk += "<td class='text-center'>" + result[i].participants.length + " / " + result[i].maxParticipantsAllowed +"</td>";
                boardTalk += "</tr>";;
            }else{ //비공개 방인 경우
                boardTalk += "<tr id='empty-row' class='tr-prevent'>";
                boardTalk += "<td class='text-center' colspan='3'>생성된 대화방이 없습니다.</td>";
                boardTalk += "</tr>";
            }             
        }if(result.length > 10){
            boardTalk += "<tr id='load-more-row' class='text-center'><td colspan='3'><a><i class='fas fa-caret-down'></i></a></td></tr>";
        }  
    }   
    boardTalk += "</tbody>";
    boardTalk += "</table>";    
    boardTalk += "</div> ";   
    boardTalk += "</div> ";                       
    boardTalk += "</div> ";              
    boardTalk += "</div> ";   

    return boardTalk;
}
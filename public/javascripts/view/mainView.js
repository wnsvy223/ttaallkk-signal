"use strict";

// GTA 게시판 프리뷰 랜더링
export function renderGTAPreview(result){
    var boardgta = "<div id='board-gta-container'>";
        boardgta += "<div class='card'>";
        boardgta += "<div class='card card-price'>";
        boardgta += "<div class='card card-default card-header'>";
        boardgta += "<ul class='details'>";      
        boardgta += "<li class='price'><a id='board-gta-title' class='pluslink'>GTA 게시판</a></li>";       
        boardgta += "</ul>";              
        boardgta += "</div>";
        boardgta += "<div class='table-wrap card-body'>";        
        boardgta += "<table id='gta-board-table' class='table table-hover table-sm'>";        
        boardgta += "<thead>";
        boardgta += "<tr class='card card-default card-header'>";
        boardgta += "<th class='text-center col-md-7'>제목</th>";  
        boardgta += "<th class='text-center col-md-2'>작성자</th>";
        boardgta += "<th class='text-center col-md-2'>날짜</th>";
        boardgta += "<th class='text-center col-md-1'>조회수</th>";   
        boardgta += "</tr>";
        boardgta += "</thead>";          
        boardgta += "<tbody>";
        // 공지사항 영역
        boardgta += "<tr class='notice-row-gta' colspan='3'>";
        boardgta += "<td class='text-center' id='notice-gta-title'></td>";
        boardgta += "<td class='text-center'><img id='notice-gta-user-profile' class='tr-user-profile img-circle'></img><span id='notice-gta-user-name'></span></td>";
        boardgta += "<td class='text-center note' id='notice-gta-timestamp'></td>";
        boardgta += "<td class='text-center'></td>";
        boardgta += "</tr>";
        if(result !== undefined){
            if(!result.length){
                boardgta += "<tr><td class='text-center' colspan='4'>게시글이 없습니다.</td></tr>";  
            }else{
                for(var i=0; i<result.length; i++){ // 테이블에 해당 값들 부여
                    var title = unescape(result[i].title);
                    var userNickname = unescape(result[i].userNickname);
                    var timestamp = result[i].timestamp;
                    var views = result[i].views;
                    if(result[i].reply){
                        var badgeCount = Object.values(result[i].reply).length;
                        if(result[i].uid === "unknown"){
                            boardgta += "<tr value='"+ result[i].idx +"'>";
                            boardgta += "<td>" + title + "<span class='badge'>" + badgeCount + "</span></td>";         
                            boardgta += "<td class='text-center'><img class='tr-user-profile img-circle' id='"+ result[i].idx +"'></img>" + userNickname + "</td>";
                            boardgta += "<td class='text-center note'>" + timestamp + "</td>";
                            boardgta += "<td class='text-center note'>" + views + "</td>";
                            boardgta += "</tr>"; 
                        }else{
                            boardgta += "<tr value='"+ result[i].idx +"'>";
                            boardgta += "<td>" + title + "<span class='badge'>" + badgeCount + "</span></td>";         
                            boardgta += "<td class='text-center'><img class='tr-user-profile img-circle' id='"+ result[i].idx +"'></img>" + userNickname + + "<img class='profile' src='/images/icon-star.png'></img></td>";
                            boardgta += "<td class='text-center note'>" + timestamp + "</td>";
                            boardgta += "<td class='text-center note'>" + views + "</td>";
                            boardgta += "</tr>"; 
                        }
                    }else{
                        if(result[i].uid === "unknown"){
                            boardgta += "<tr value='"+ result[i].idx +"'>";
                            boardgta += "<td >" + title + "</td>";         
                            boardgta += "<td class='text-center'><img class='tr-user-profile img-circle' id='"+ result[i].idx +"'></img>" + userNickname + "</td>";
                            boardgta += "<td class='text-center note'>" + timestamp + "</td>";
                            boardgta += "<td class='text-center note'>" + views + "</td>";
                            boardgta += "</tr>"; 
                        }else{
                            boardgta += "<tr value='"+ result[i].idx +"'>";
                            boardgta += "<td>" + title + "</td>";         
                            boardgta += "<td class='text-center'><img class='tr-user-profile img-circle' id='"+ result[i].idx +"'></img>" + userNickname + + "<img class='profile' src='/images/icon-star.png'></img></td>";
                            boardgta += "<td class='text-center note'>" + timestamp + "</td>";
                            boardgta += "<td class='text-center note'>" + views + "</td>";
                            boardgta += "</tr>"; 
                        }
                    }
                }
            }
        }
        boardgta += "</tbody>";      
        boardgta += "</table>";
        boardgta += "<div>";              
        boardgta += "<a class='board-icon pluslink' id='board-more-gta'>더보기</a>";  
        boardgta += "<a class='board-icon pluslink divide-right' id='write-post-boardgta-preview'>글쓰기</a>"; 
        boardgta += "</div>"; 
        boardgta += "</div>";
        boardgta += "</div>";
        boardgta += "</div>";
        boardgta += "</div>";                                 
        boardgta += "</div>";

        return boardgta;
}

// 자유게시판 프리뷰 랜더링
export function renderFreePreview(result){
    var boardfree = "<div id='board-free-container'>";
        boardfree += "<div class='card'>";
        boardfree += "<div class='card card-price'>";
        boardfree += "<div class='card card-default card-header'>";
        boardfree += "<ul class='details'>";      
        boardfree += "<li class='price'><a id='board-free-title' class='pluslink'>자유게시판</a></li>";       
        boardfree += "</ul>";              
        boardfree += "</div>";          
        boardfree += "<div class='table-wrap card-body'>";        
        boardfree += "<table id='main-board-table' class='table table-hover table-sm'>";        
        boardfree += "<thead>";
        boardfree += "<tr class='card card-default card-header'>";
        boardfree += "<th class='text-center col-md-7'>제목</th>";  
        boardfree += "<th class='text-center col-md-2'>작성자</th>";
        boardfree += "<th class='text-center col-md-2'>날짜</th>";
        boardfree += "<th class='text-center col-md-1'>조회수</th>";   
        boardfree += "</tr>";
        boardfree += "</thead>";   
        boardfree += "<tbody>";
        // 공지사항 영역
        boardfree += "<tr class='notice-row-free'>";
        boardfree += "<td class='text-center' id='notice-free-title'></td>";
        boardfree += "<td class='text-center'><img id='notice-free-user-profile' class='tr-user-profile img-circle'></img><span id='notice-free-user-name'></span></td>";
        boardfree += "<td class='text-center note' id='notice-free-timestamp'></td>";
        boardfree += "<td class='text-center'></td>";
        boardfree += "</tr>";
        if(result !== undefined){
            if(!result.length){
                boardfree += "<tr><td class='text-center' colspan='4'>게시글이 없습니다.</td></tr>";  
            }else{
                for(var i=0; i<result.length; i++){ // 테이블에 해당 값들 부여
                    var title = unescape(result[i].title);
                    var userNickname = unescape(result[i].userNickname);
                    var timestamp = result[i].timestamp;
                    var views = result[i].views;
                    if(result[i].reply){
                        var badgeCount = Object.values(result[i].reply).length;
                        if(result[i].uid === "unknown"){
                            boardfree += "<tr value='"+ result[i].idx +"'>";
                            boardfree += "<td>" + title + " <span class='badge'>" + badgeCount + "</span></td>";
                            boardfree += "<td class='text-center'><img class='tr-user-profile img-circle' id='"+ result[i].idx +"'></img>" + userNickname + "</td>";
                            boardfree += "<td class='text-center note'>" + timestamp + "</td>";
                            boardfree += "<td class='text-center note'>" + views + "</td>";
                            boardfree += "</tr>";                 
                        }else{
                            boardfree += "<tr value='"+ result[i].idx +"'>";
                            boardfree += "<td>" + title + " <span class='badge'>" + badgeCount + "</span></td>";
                            boardfree += "<td class='text-center'><img class='tr-user-profile img-circle' id='"+ result[i].idx +"'></img>" + userNickname + "<img class='profile' src='/images/icon-star.png'></img></td>";
                            boardfree += "<td class='text-center note'>" + timestamp + "</td>";
                            boardfree += "<td class='text-center note'>" + views + "</td>";
                            boardfree += "</tr>";                 
                        }
                   }else{
                        if(result[i].uid === "unknown"){
                            boardfree += "<tr value='"+ result[i].idx +"'>";
                            boardfree += "<td>" + title + "</td>";
                            boardfree += "<td class='text-center'><img class='tr-user-profile img-circle' id='"+ result[i].idx +"'></img>" + userNickname + "</td>";
                            boardfree += "<td class='text-center note'>" + timestamp + "</td>";
                            boardfree += "<td class='text-center note'>" + views + "</td>";
                            boardfree += "</tr>";
                        }else{
                            boardfree += "<tr value='"+ result[i].idx +"'><td class='col-md-7 ellipsis'>" + title + "</td>";
                            boardfree += "<td><img class='tr-user-profile img-circle' id='"+ result[i].idx +"'></img>" + userNickname + "<img class='profile' src='/images/icon-star.png'></img></td>"
                            boardfree += "<td class='text-center note'>" + timestamp + "</td>";
                            boardfree += "<td class='text-center note'>" + views + "</td>";
                            boardfree += "</tr>";                 
                        }
                    }
                }
            }           
        }         
        boardfree += "</tbody>";
        boardfree += "</table>";
        boardfree += "<div>";           
        boardfree += "<a class='board-icon pluslink' id='board-more'>더보기</a>";  
        boardfree += "<a class='board-icon pluslink divide-right' id='write-post-boardfree-preview'>글쓰기</a>";
        boardfree += "</div>";        
        boardfree += "</div> ";   
        boardfree += "</div> ";         
        boardfree += "</div> ";              
        boardfree += "</div> ";
        boardfree += "</div> ";

        return boardfree;
}

// 톡 게시판 프리뷰 랜더링
export function renderTalkPreview(result){
    var boardTalk = "<div id='board-talk-container'>";
        boardTalk += "<div class='card'>";
        boardTalk += "<div class='card card-price'>";
        boardTalk += "<div class='card card-default card-header'>";
        boardTalk += "<ul class='details'>";      
        boardTalk += "<li class='price'><a id='board-talk-title' class='pluslink'>대화게시판</a><a id='refresh-talk-board' class='board-icon pluslink'><i class='fas fa-redo-alt'></i></a></li>";       
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
            var listLength = 0;
            if(result.length > 10){
                listLength = 10;
            }else{
                listLength = result.length;
            } // 프리뷰에는 최대 10개 글만 보여줌
            for(var i=0; i<listLength; i++){ // 테이블에 해당 값들 부여
                if((result[i].isPasswordProtected === false)){ // 공개 방인 경우
                    boardTalk += "<tr class='tr-prevent' value='"+ result[i].sessionid +"'>";
                    boardTalk += "<td class='text-center'>" + (i + 1) + "</td>";
                    boardTalk += "<td class='text-center'>" + result[i].sessionid + "</td>";
                    boardTalk += "<td class='text-center'>" + result[i].participants.length + " / " + result[i].maxParticipantsAllowed +"</td>";
                    boardTalk += "</tr>";
                }else{ // 비공개 방인 경우
                    boardTalk += "<tr id='empty-row' class='tr-prevent'>";
                    boardTalk += "<td class='text-center' colspan='3'>생성된 대화방이 없습니다.</td>";
                    boardTalk += "</tr>";
                }             
            }
        }   
        boardTalk += "</tbody>";
        boardTalk += "</table>"; 
        boardTalk += "<div>";           
        boardTalk += "<a class='board-icon pluslink' id='board-talk-more'>더보기 <i class='fas fa-angle-double-right></i></a>";            
        boardTalk += "</div> ";     
        boardTalk += "</div> ";   
        boardTalk += "</div> ";        
        boardTalk += "</div> ";              
        boardTalk += "</div> ";   

        return boardTalk;
}
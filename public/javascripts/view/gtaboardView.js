"use strict";

import * as utils from '../utills/utills.js';
import * as consts from '../utills/consts.js';
import * as boardDAO from '../model/boardDAO.js';

var firstdoc; //첫 페이지의 가장 최근 게시글의 키값 저장을 위한 변수
const replyCountPerPage = 5; //페이지당 댓글 표시제한 갯수
var replyCount = 0; //댓글 첫 로딩,댓글 추가 로딩 시 댓글의 마지막 지점값 
var currentCount = 0; //댓글 추가 로딩 시 시작 지점값

// GTA 게시판 더보기 뷰 랜더링
export function renderGTALoadMore(result, type){
    var gtaBoard = "<div id='board-gta-detail' class='card'>";
        gtaBoard += "<div class='card card-price'>";
        gtaBoard += "<div class='card card-default card-header'>";        
        gtaBoard += "<ul class='details'>";            
        gtaBoard += "<li class='price'><a id='board-gta-title' class='pluslink'>GTA 게시판</a></li>";
        gtaBoard += "</ul>";                     
        gtaBoard += "</div>";                
        gtaBoard += "<div class='table-wrap card-body'>";           
        gtaBoard += "<table id='gta-board-table' class='table table-hover table-sm'>";            
        gtaBoard += "<thead>";
        gtaBoard += "<tr class='card card-default card-header'>";
        gtaBoard += "<th class='text-center col-md-7'>제목</th>";  
        gtaBoard += "<th class='text-center col-md-2'>작성자</th>";
        gtaBoard += "<th class='text-center col-md-2'>날짜</th>";
        gtaBoard += "<th class='text-center col-md-1'>조회수</th>";   
        gtaBoard += "</tr>";
        gtaBoard += "</thead>";   
        gtaBoard += "<tbody>";
        // 공지사항 영역
        gtaBoard += "<tr class='notice-row-gta'>";
        gtaBoard += "<td class='text-center' id='notice-gta-title'></td>";
        gtaBoard += "<td class='text-center'><img id='notice-gta-user-profile' class='tr-user-profile img-circle'></img><span id='notice-gta-user-name'></span></td>";
        gtaBoard += "<td class='text-center note' id='notice-gta-timestamp'></td>";
        gtaBoard += "<td class='text-center'></td>";
        gtaBoard += "</tr>";   

        if(result !== undefined){
            if(!result.length){
                gtaBoard += "<tr><td class='text-center' colspan='4'>게시글이 없습니다.</td></tr>";  
            }else{
                for(var i=0; i< result.length; i++){
                    var title = unescape(result[i].title);
                    var userNickname = unescape(result[i].userNickname);
                    var timestamp = result[i].timestamp;
                    var views = result[i].views;
                    if(result[i].reply){
                        var badgeCount = Object.values(result[i].reply).length;
                        if(result[i].uid === "unknown"){
                            gtaBoard += "<tr value='"+ result[i].idx +"'>";
                            gtaBoard += "<td>" + title + "<span class='badge'>" + badgeCount + "</span></td>";         
                            gtaBoard += "<td class='text-center'><img class='tr-user-profile img-circle' id='"+ result[i].idx +"'></img>" + userNickname + "</td>";
                            gtaBoard += "<td class='text-center note'>" + timestamp + "</td>";
                            gtaBoard += "<td class='text-center note'>" + views + "</td>";
                            gtaBoard += "</tr>";             
                        }else{
                            gtaBoard += "<tr value='"+ result[i].idx +"'>";
                            gtaBoard += "<td>" + title + "<span class='badge'>" + badgeCount + "</span></td>";         
                            gtaBoard += "<td class='text-center'><img class='tr-user-profile img-circle' id='"+ result[i].idx +"'></img>" + userNickname + + "<img class='profile' src='/images/icon-star.png'></img></td>";
                            gtaBoard += "<td class='text-center note'>" + timestamp + "</td>";
                            gtaBoard += "<td class='text-center note'>" + views + "</td>";
                            gtaBoard += "</tr>";
                        }
                    }else{
                        if(result[i].uid === "unknown"){
                            gtaBoard += "<tr value='"+ result[i].idx +"'>";
                            gtaBoard += "<td >" + title + "</td>";         
                            gtaBoard += "<td class='text-center'><img class='tr-user-profile img-circle' id='"+ result[i].idx +"'></img>" + userNickname + "</td>";
                            gtaBoard += "<td class='text-center note'>" + timestamp + "</td>";
                            gtaBoard += "<td class='text-center note'>" + views + "</td>";
                            gtaBoard += "</tr>";
                        }else{
                            gtaBoard += "<tr value='"+ result[i].idx +"'>";
                            gtaBoard += "<td>" + title + "</td>";         
                            gtaBoard += "<td class='text-center'><img class='tr-user-profile img-circle' id='"+ result[i].idx +"'></img>" + userNickname + + "<img class='profile' src='/images/icon-star.png'></img></td>";
                            gtaBoard += "<td class='text-center note'>" + timestamp + "</td>";
                            gtaBoard += "<td class='text-center note'>" + views + "</td>";
                            gtaBoard += "</tr>";                 
                        }
                    }            
                }   
            }    
        }                 
        gtaBoard += "</tbody>";
        gtaBoard += "</table>";
        gtaBoard += "</div>";
        gtaBoard += "</div>";
        gtaBoard += "</div>";

        // 글쓰기 버튼
        gtaBoard += "<div class='board-write'>";
        gtaBoard += "<button type='submit' id='write-submit-gta' class='btn btn-info btn-block'><i class='fas fa-pencil-alt'></i></i> 글쓰기 </button> ";
        gtaBoard += "</div>";

        // 검색창
        gtaBoard += "<div class='row divide'>";    
        gtaBoard += "<div class='col-xs-8 col-xs-offset-2'>";
        gtaBoard += "<div class='input-group'>";
        gtaBoard += "<div class='input-group-btn search-panel dropup'>";
        gtaBoard += "<button type='button' class='btn btn-default dropdown-toggle' data-toggle='dropdown'>";
        gtaBoard += "<span id='search_concept_gta'>전체</span> <span class='caret'></span>";
        gtaBoard += "</button>";
        gtaBoard += "<ul id='category-gta' class='dropdown-menu' role='menu'>";
        gtaBoard += "<li><a>전체</a></li>";       
        gtaBoard += "<li><a>작성자</a></li>";
        gtaBoard += "<li><a>제목</a></li>";
        gtaBoard += "<li><a>날짜</a></li>";
        gtaBoard += "<li><a>내용</a></li>";           
        gtaBoard += "</ul>";
        gtaBoard += "</div>";                
        gtaBoard += "<input type='text' id='search_param_gta' class='form-control' name='x'>";
        gtaBoard += "<span class='input-group-btn'>";
        gtaBoard += "<button id='search-go-gta' class='btn btn-default' type='button'><span class='glyphicon glyphicon-search'></span></button>";
        gtaBoard += "</span>";
        gtaBoard += "</div>";
        gtaBoard += "</div>";
        gtaBoard += "</div>";     
                            
        // 페이징 버튼
        if(type === 'paging'){
            gtaBoard += "<div class='text-center'>";
            gtaBoard += "<ul class='pagination'>";  
            gtaBoard += "<li id='backward'><a>&lsaquo;</a></li>"                     
            gtaBoard += "<li id='forward'><a>&rsaquo;</a></li>";                                                                                   
            gtaBoard += "</ul>";
            gtaBoard += "</div>";
        }

    return gtaBoard;
}

// GTA 게시판 글 작성 에디터 랜더링
export function renderSummerNoteGTA(){
    var summernote = "<div id='board-container'>";
    summernote += "<div class='card'>";
    summernote += "<ul class='list-group list-group-flush'>";
    summernote += "<div class='card card-price'>";
    summernote += "<div class='card card-default card-header'>";
    summernote += "<ul class='details'>";      
    summernote += "<li class='price'><a id='board-gta-title' class='pluslink'>GTA 게시판</a></li>";     
    summernote += "</ul>";              
    summernote += "</div>";    
    summernote += "<div class='summernote-padding'>";   
    summernote += "<div id='editor'>";
    summernote += "<div class='form-group'>";
    summernote += "<label class='label-color'>제목</label>";
    summernote += "<input type='text' class='form-control' id='board-title'/>";
    summernote += "</div>";
    summernote += "<label class='label-color'>본문</label>";
    summernote += "<div id='summernote'></div>";
    summernote += "<div class='form-group text-center'>";
    if(!firebase.auth().currentUser){
        summernote += "<div class='form-group'>";
        summernote += "<label class='label-color'>닉네임</label>";
        summernote += "<input type='text' class='form-control' id='post-nickname'/>";
        summernote += "<label class='label-color'>비밀번호</label>";
        summernote += "<input type='password' class='form-control' id='post-password'/>";
        summernote += "</div>";
    }
    summernote += "<button type='submit' id='write-board-gta' class='btn btn-info'><i class='glyphicon glyphicon-pencil'></i> 글 작성 완료 </button>";
    summernote += "</div>";
    summernote += "</div>";
    summernote += "</div>";
     
    return summernote;
}

// GTA 게시판 글 내용 뷰 렌더링
export function renderGTABoardDetail(result){
    var detailarea = "<div id='board-container'>";
        detailarea += "<div class='card'>";
        detailarea += "<ul class='list-group list-group-flush'>";
        detailarea += "<div class='card card-price'>";
        detailarea += "<div class='card card-default card-header'>";
        detailarea += "<ul class='details'>";      
        detailarea += "<li class='price'><a id='board-gta-title' class='pluslink'>GTA 게시판</a></li>";     
        detailarea += "</ul>";              
        detailarea += "</div>";    
        detailarea += "<div class='card-body'>";     
        detailarea += "<table class='table table-bordered table-hover table-sm table-style'>";
        detailarea += "<tr>";
        detailarea += "<td class='text-left td-break-word'><h4 class='board-title'>"+ unescape(result[0].title) +"<h4></td>";   
        detailarea += "</tr>";  
        detailarea += "<tr>";
        if(result[0].uid === 'unknown'){
            detailarea += "<td class='text-left td-break-word'>";
            detailarea += "<img class='td-user-profile img-circle' id='"+ result[0].idx +"'></img>";
            detailarea += "<h6 class='userNickname'>"+ unescape(result[0].userNickname) +"</h6>";
            detailarea += "<h6 class='timestamp pull-right'>"+ result[0].timestamp +"</h6>";
            detailarea += "</td>";  
        }else{
            detailarea += "<td class='text-left td-break-word'>";
            detailarea += "<img class='td-user-profile img-circle' id='"+ result[0].idx +"'></img>";
            detailarea += "<h6 class='userNickname'>"+ unescape(result[0].userNickname) +"<img class='profile' src='/images/icon-star.png'></img></h6>";
            detailarea += "<h6 class='timestamp pull-right'>"+ result[0].timestamp +"</h6>";
            detailarea += "</td>";  
        }
        detailarea += "</tr>";   
        detailarea += "<tr>";    
        detailarea += "<td class='text-left board-detail td-break-word'><h5 class='board-text'>"+ unescape(result[0].textWithTag) +"</h5></td>";          
        detailarea += "</tr>";       
        detailarea += "</table>";      
        detailarea += "</div>";  
        detailarea += "</div>"; 

        // 글작성자가 접속한 유저일 경우 수정, 삭제 버튼 활성화
        var user = firebase.auth().currentUser;
        if(user && (user.uid === result[0].uid)){
            detailarea += "<div class='form-group text-right'>";
            detailarea += "<button type='button' id='btn-board-edit' class='btn btn-warning btn-edit'><i class='far fa-edit'></i> 수정 </button>";
            detailarea += "<button data-toggle='modal' data-target='#deleteModal' type='button' id='btn-board-delete' class='btn btn-warning btn-edit'><i class='far fa-trash-alt'></i> 삭제 </button>";
            detailarea += "</div>";
        // 글작성자가 미가입 유저이고 접속한 유저가 미가입유저인 경우 색이 다른 수정, 삭제 버튼 활성화 & 비밀번호 체크에 성공해야만 수정, 삭제 가능
        }else if(!user && (result[0].uid === "unknown")){
            detailarea += "<div class='dropdown form-group text-right' id='unknown-user-area'>"; 
            detailarea += "<form class='form-inline'>";                   
            detailarea += "<button data-toggle='dropdown' type='button' id='btn-board-edit-anonymous' class='btn btn-danger btn-edit'><i class='far fa-edit'></i> 수정 </button>";
            detailarea += "<ul class='dropdown-menu dropdown-menu-right'>";                                    
            detailarea += "<div class='form-dropdown-input'>";             
            detailarea += "<form class='form-inline text-center'>";
            detailarea += "<label class='divide-all'>수정</label>";
            detailarea += "<input id='input-pw-edit-post' type='password' class='form-control' placeholder='비밀번호를 입력하세요.'/>";
            detailarea += "<button id='confirm-pw-edit-post' type='button' class='form-control btn btn-danger'><i class='fas fa-user-check'></i>확인 </button>";
            detailarea += "</form>";
            detailarea += "</div>";
            detailarea += "</ul>";
            detailarea += "<button data-toggle='dropdown' type='button' id='btn-board-delete-anonymous' class='btn btn-danger btn-edit'><i class='far fa-trash-alt'></i> 삭제 </button>";       
            detailarea += "<ul class='dropdown-menu dropdown-menu-right'>";                                    
            detailarea += "<div class='form-dropdown-input'>";         
            detailarea += "<form class='form-inline text-center'>";
            detailarea += "<label class='divide-all'>삭제</label>";
            detailarea += "<input id='input-pw-delete-post' type='password' class='form-control' placeholder='비밀번호를 입력하세요.'/>";
            detailarea += "<button id='confirm-pw-delete-post' type='button' class='form-control btn btn-danger'><i class='fas fa-user-check'></i>확인 </button>";
            detailarea += "</form>";
            detailarea += "</div>";
            detailarea += "</ul>";
            detailarea += "</form>";  
            detailarea += "</div>";
        }

        // 게시글 작성자 프로필 사진 세팅
        result.forEach(function(element){
            boardDAO.getWriterProfileUrl(element.uid).then(function(profile){
                $("#" + element.idx).attr('src', profile);
            });
        }); 
        
        // 댓글 내용 뷰
        if(result[0].reply){
            var replyKey = Object.keys(result[0].reply);
            var replyVal = Object.values(result[0].reply);
            detailarea += "<div id='reply'>"; 
            if(replyVal.length < replyCountPerPage){ //댓글갯수가 표시제한갯수인 replyCountPerPage값보다 적으면
                replyCount = replyVal.length; //댓글갯수만큼 뷰 추가
            }else{
                replyCount = replyCountPerPage; //댓글개수가 더 많으면 표시제한갯수만큼 뷰 추가
            }
            for(var i=0; i<replyCount; i++){
                detailarea += "<div class='panel-body card card-default'>"; 
                detailarea += "<ul class='media-list' id='"+ replyVal[i].idx +"'>";
                detailarea += "<li class='media'>";
                detailarea += "<div class='media-body'>";                
                detailarea += "<span class='text-muted pull-right'>";                
                detailarea += "<small class='text-muted'>" + replyVal[i].timestamp + "</small>";                    
                detailarea += "</span>";  
                if(replyVal[i].uid === "unknown"){
                    detailarea += "<img class='tr-user-profile img-circle' id='"+ replyVal[i].idx + "profile" +"'></img>";
                    detailarea += "<strong class='text-success'>" + unescape(replyVal[i].userNickname) + "</strong>";     
                }else{
                    detailarea += "<img class='tr-user-profile img-circle' id='"+ replyVal[i].idx + "profile" +"'></img>";
                    detailarea += "<strong class='text-success'>" + unescape(replyVal[i].userNickname) + "<img class='profile' src='/images/icon-star.png'></img></strong>";   
                }                                              
                detailarea += "<p class='reply-text'>" + unescape(replyVal[i].textWithTag) + "</p>";                                                              
                detailarea += "</div>";                   
                detailarea += "</li>";   
                if(user && (user.uid === replyVal[i].uid)){
                    detailarea += "<div class='text-right'>";
                    detailarea += "<a value='"+ replyVal[i].idx +"' class='pluslink auth-link-edit divide-right'><i class='far fa-edit'></i></a>";
                    detailarea += "<a value='"+ replyVal[i].idx +"' class='pluslink auth-link'><i class='far fa-trash-alt'></i></a>";
                    detailarea += "</div>";
                }else if(!user && (replyVal[i].uid === "unknown")){
                    detailarea += "<div class='dropdown text-right'>";
                    detailarea += "<a value='"+ replyVal[i].idx +"' class='pluslink anonymous-link-edit divide-right'><i class='far fa-edit'></i></a>";                             
                    detailarea += "<a data-toggle='dropdown' class='pluslink anonymous-link'><i class='far fa-trash-alt'></i></a>";  
                    detailarea += "<ul class='dropdown-menu dropdown-menu-right'>";                                     
                    detailarea += "<div class=' form-dropdown-input'>";                
                    detailarea += "<form class='form-inline text-center'>";
                    detailarea += "<label class='divide-all'>비밀번호</label>";
                    detailarea += "<input id='" + replyVal[i].idx + "' type='password' class='form-control check-password-input'/>";
                    detailarea += "<button value='"+ replyVal[i].idx +"' type='button' class='form-control btn btn-danger check-password-button'><i class='fas fa-user-check'></i>확인 </button>";
                    detailarea += "</form>";
                    detailarea += "</div>";
                    detailarea += "</ul>";
                    detailarea += "</div>";
                }  
                detailarea += "</ul>";      
                detailarea += "</div>";   
            }      
            detailarea += "</div>";
            if(replyVal.length > replyCountPerPage){ // 댓글갯수가 표시제한갯수 보다 많으면 더보기 버튼 활성
                detailarea += "<div id='reply-load-more' class='text-center'><a><i class='fas fa-caret-down'></i></a></div>"; 
            }

            // 댓글 작성자 프로필 사진 적용
            replyVal.forEach(function(element){
                boardDAO.getWriterProfileUrl(element.uid).then(function(profile){
                    $("#" + element.idx + "profile").attr('src', profile);
                });
            });
        }
                      
        // 댓글 입력 뷰
        detailarea += "<div id='reply-input' class='divide'>";      
        if(!user){
            detailarea += "<div>"
            detailarea += "<label class='label-color divide-right'>댓글작성</label>";
            detailarea += "<input id='anonymous-nickname' class='text-center anonymous-input' type='text' placeholder='닉네임'/>";
            detailarea += "<input id='anonymous-password' class='text-center anonymous-input' type='password' placeholder='비밀번호'/>";
            detailarea += "</div>"
        }
        detailarea += "<div id='summernote-reply'></div>";
        detailarea += "<div class='form-group text-center'>";
        detailarea += "<button type='submit' id='write-reply-gta' class='btn btn-info'><i class='glyphicon glyphicon-pencil'></i> 댓글 작성 </button>";
        detailarea += "</div>";
        detailarea += "</div>";   

        $("#container").html(detailarea); //게시물 내용영역 뷰 세팅

        // 댓글 추가 로딩
        $("#reply-load-more").on('click', function(evnet){
            evnet.preventDefault();
            var replyKey = Object.keys(result[0].reply);
            var replyVal = Object.values(result[0].reply);
            currentCount = replyCount; //시작지점값을 마지막값으로 바꾼 후
            replyCount = replyCount + consts.replyCountPerPage; //추가 로딩될 마지막 지점값은 현재 마지막값에서 + 표시제한갯수    
            if(replyVal.length <= replyCount){ //DB에서 조회된 전체 댓글수가 마지막지점값보다 작을경우(= 남은 댓글수가 표시제한값보다 작을경우)
                replyCount = replyVal.length; //마지막 지점값은 댓글전체수
                $("#reply-load-more").remove(); //추가로딩버튼 제거
            }         
            for(var i=currentCount; i<replyCount; i++){
                var replyView = "<div class='panel-body card card-default'>"; 
                replyView += "<ul class='media-list' id='"+ replyVal[i].idx +"'>";
                replyView += "<li class='media'>";
                replyView += "<div class='media-body'>";                
                replyView += "<span class='text-muted pull-right'>";                
                replyView += "<small class='text-muted'>" + replyVal[i].timestamp + "</small>";                    
                replyView += "</span>";  
                if(replyVal[i].uid === "unknown"){
                    replyView += "<img class='tr-user-profile img-circle' id='"+ replyVal[i].idx + "profile" +"'></img>";
                    replyView += "<strong class='text-success'>" + unescape(replyVal[i].userNickname) + "</strong>";     
                }else{
                    replyView += "<img class='tr-user-profile img-circle' id='"+ replyVal[i].idx + "profile" +"'></img>";
                    replyView += "<strong class='text-success'>" + unescape(replyVal[i].userNickname) + "<img class='profile' src='/images/icon-star.png'></img></strong>";   
                }                                              
                replyView += "<p class='reply-text'>" + unescape(replyVal[i].textWithTag) + "</p>";                                                               
                replyView += "</div>";                   
                replyView += "</li>";   
                if(user && (user.uid === replyVal[i].uid)){
                    replyView += "<div class='text-right'>";
                    replyView += "<a value='"+ replyVal[i].idx +"' class='pluslink auth-link-edit divide-right'><i class='far fa-edit'></i></a>";
                    replyView += "<a value='"+  replyVal[i].idx +"' class='pluslink auth-link'><i class='far fa-trash-alt'></i></a>";
                    replyView += "</div>";
                }else if(!user && (replyVal[i].uid === "unknown")){
                    replyView += "<div class='dropdown text-right'>";
                    detailarea += "<a value='"+ replyVal[i].idx +"' class='pluslink anonymous-link-edit divide-right'><i class='far fa-edit'></i></a>";                            
                    replyView += "<a data-toggle='dropdown' class='pluslink anonymous-link'><i class='far fa-trash-alt'></i></a>";  
                    replyView += "<ul class='dropdown-menu dropdown-menu-right'>";                                     
                    replyView += "<div class=' form-dropdown-input'>";                
                    replyView += "<form class='form-inline text-center'>";
                    replyView += "<label class='divide-all'>비밀번호</label>";
                    replyView += "<input id='" + replyVal[i].idx + "' type='password' class='form-control check-password-input'/>";
                    replyView += "<button value='"+  replyVal[i].idx +"' type='button' class='form-control btn btn-danger check-password-button'><i class='fas fa-user-check'></i>확인 </button>";
                    replyView += "</form>";
                    replyView += "</div>";
                    replyView += "</ul>";
                    replyView += "</div>";
                }  
                replyView += "</ul>";      
                replyView += "</div>";  
                $("#reply").append(replyView); //로딩된 댓글 뷰 추가

                // 댓글 작성자 프로필 사진 적용
                replyVal.forEach(function(element){
                    boardDAO.getWriterProfileUrl(element.uid).then(function(profile){
                        $("#" + element.idx + "profile").attr('src', profile);
                    });
                });
            }         
        });
}

// 글 수정 에디터 랜더링
export function rednerEditPostSummernote(result){
    var editPostArea = "<div id='board-container'>";
    editPostArea += "<div class='card'>";
    editPostArea += "<ul class='list-group list-group-flush'>";
    editPostArea += "<div class='card card-price'>";
    editPostArea += "<div class='card card-default card-header'>";
    editPostArea += "<ul class='details'>";      
    editPostArea += "<li class='price'><a id='board-gta-title' class='pluslink'>GTA 게시판</a></li>";     
    editPostArea += "</ul>";              
    editPostArea += "</div>";    
    editPostArea += "<div class='card-body'>";     
    editPostArea += "<table class='table table-bordered table-hover table-sm' cellspacing='0' width='100%'>"
    editPostArea += "<tr>";
    editPostArea += "<tr>"; 
    editPostArea += "<td class='text-left'><input id='input-edit-post-title' type='text' size='20' style='width:100%; border: 0;' value='" + unescape(result[0].title) + "'></td>";
    editPostArea += "</tr>";    
    editPostArea += "<td class='text-left'>"+ unescape(result[0].userNickname) +"</td>";  
    editPostArea += "</tr>";     
    editPostArea += "<td class='text-left'>"+ result[0].timestamp +"</td>";  
    editPostArea += "</tr>";   
    editPostArea += "<tr>";   
    editPostArea += "<td id='edit-summernote'>" + unescape(result[0].textWithTag) + "</td>";
    editPostArea += "</tr>";       
    editPostArea += "</table>";
    editPostArea += "<div class='form-group text-right'>";
    editPostArea += "<button type='button' id='edit-post-ok' class='btn btn-warning btn-edit'><i class='far fa-check-circle'></i> 확인 </button>";
    editPostArea += "<button type='button' id='edit-post-cancel' class='btn btn-warning btn-edit'><i class='far fa-times-circle'></i> 취소 </button>";
    editPostArea += "</div>";
    editPostArea += "</div>";  
    editPostArea += "</div>"; 
    
    return editPostArea;
}
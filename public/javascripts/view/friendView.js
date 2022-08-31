"use strict";

// 친구 페이지 랜더링
export function renderFriendPage(){
    var friendPage = "<div class='row divide divide-bottom'>";    
    friendPage += "<div class='col-xs-8 col-xs-offset-2'>";
    friendPage += "<div class='input-group'>";            
    friendPage += "<input type='text' id='search_friend_input' class='form-control' placeholder='닉네임 또는 이메일을 입력하세요.'>";
    friendPage += "<span class='input-group-btn'>";
    friendPage += "<button id='btn-search-friend' class='btn btn-default' type='button'><span class='glyphicon glyphicon-search'></span></button>";
    friendPage += "</span>";
    friendPage += "</div>";
    friendPage += "</div>";
    friendPage += "</div>"; 
    friendPage += "<div id='friend-container'></div>"    
    
    return friendPage ;
}

// 친구 검색 결과 랜더링
export function renderFriendSearchList(result){
    var friendList = "<div class='container-fluid'>";
    friendList += "<div class='row'>";
    if(result.length <= 0){
        friendList += "<div class='col-md-12 text-center'>검색된 유저가 없습니다.</div>"
    }else{
        result.forEach(function(user){
            friendList += "<div class='col-md-3'>";
            friendList += "<br>";    
            friendList += "<div class='followed-user-entry'>";
            friendList += "<div class='followed-user-top' style='background-image: url("+ user.profileUrl +");'>";        
            friendList += "</div>";        
            friendList += "<div class='followed-user-bottom'>";            
            friendList += "<img class='followed-user-img' src='"+ user.profileUrl +"'/>";
            friendList += "<h2 class='followed-user-name'>"+ user.userNickname +"</h2>";            
            friendList += "<p class='followed-user-screenname'><span></span>"+ user.email +"</p>";            
            friendList += "<p class='followed-user-description'> User descriptions text and stuff</p>";                
            friendList += "</div>"; 
            friendList += "<div class='box-btn-group-friend'>";  
            friendList += "<div class='btn-group btn-group-friend'>";   
            friendList += "<button type='button' value='" + user.uid + "' class='btn btn-success btn-add-friend'> 친구추가 </button>";
            //friendList += "<button type='button' value='" + user.uid + "' class='btn btn-warning btn-info-friend'> 추가기능 </button>";                                   
            friendList += "</div>";
            friendList += "</div>";               
            friendList += "</div>";              
            friendList += "</div>";
        });
    }
    friendList += "</div>";
    friendList += "</div>";

    return friendList;
}

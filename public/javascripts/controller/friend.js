"use strict";

import * as friendView from '../view/friendView.js';
import * as friendDAO from '../model/friendDAO.js';

// 친구 페이지 로딩
export function getFriendPage(){
    var friendPage = friendView.renderFriendPage();
    $("#container").html(friendPage);

    // 검색 버튼 클릭
    $(document).off('click', "#btn-search-friend").on('click', "#btn-search-friend", function(event){
        event.preventDefault();
        var input = $("#search_friend_input").val();
        if(!input){
            alert('닉네임 또는 이메일을 입력하세요.');
        }else{
            friendDAO.getSearchUser(input).then(function(result){
                if(result){ 
                    var friendList = friendView.renderFriendSearchList(result);
                    $("#friend-container").html(friendList);     
                }
            });  
        }
    });

    // 친구 추가 버튼 클릭
    $(document).off('click', ".btn-add-friend").on('click', ".btn-add-friend", function(event){
        event.preventDefault();
        $(this).prop('disabled', true);
        var targetUser = $(this).attr('value');
        friendDAO.requestFriendAdd(targetUser);
    });

    /*
    // 추가 기능 버튼
    $(document).off('click', ".btn-info-friend").on('click', ".btn-info-friend", function(event){
        event.preventDefault();
        var targetUser = $(this).attr('value');
    });
    */
}

// 친구 추가 수락 요청
export function friendAccept(toUser, callback){
    friendDAO.requestFriendAccept(toUser, callback);
}

// 친구 추가 거절 요청
export function friendReject(toUser, callback){
    friendDAO.requestFriendReject(toUser, callback);
}

// 친구 삭제 모달 호출
export function friendRemove(friend){
    $("#modal-remove-friend-confirm").modal('toggle');
    $("#confirm-remove-friend").off('click').on('click', function(event){
        $("#modal-remove-friend-confirm").modal('hide');
        event.preventDefault();
        friendDAO.requestFriendRemove(friend);
    });
}
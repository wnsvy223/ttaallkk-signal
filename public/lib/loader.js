"use strict";

// 로딩 상태 뷰 보여주기
export function showLoader(parentNode){
    var loader = "<div class='loader'>";
        loader += "<p>Loading...</p>";
        loader += "<div class='loader-wrapper'>";
        loader += "<div class='loader-inner'></div>";
        loader += "<div class='loader-inner'></div>";
        loader += "<div class='loader-inner'></div>";
        loader += "</div>";
        loader += "</div>";    
    parentNode.append(loader);
}

// 로딩 상태 뷰 숨기기
export function hideLoader(){
    $(".loader").remove();
}
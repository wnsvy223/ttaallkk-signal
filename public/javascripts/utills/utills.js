"use strict";

// HTML 태그요소 제거 정규표현식 함수
export function removeHTML(str){
    str = str.replace(/<br\/>/ig,"\n");
    str = str.replace(/<(\/)?([a-zA-Z]*)(\s[a-zA-Z]*=[^>]*)?(\s)*(\/)?>/ig, "");
    return str;
}

export function htmlToPlaintext(text) {
    return text ? String(text).replace(/<[^>]+>/gm, '') : '';
}

// 파일 사이즈 바이트 변환
export function bytesToSize(bytes) {
    var k = 1000;
    var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) {
        return '0 Bytes';
    }
    var i = parseInt(Math.floor(Math.log(bytes) / Math.log(k)), 10);
    return (bytes / Math.pow(k, i)).toPrecision(3) + ' ' + sizes[i];
}

// histroy Api를 이용한 현재 경로 페이지 스택세팅
export function setPageHistory(data, currentUrl){
    var historyUrl = window.location.pathname + window.location.search; // 전체 url에서 호스트를 제외한 나머지 경로 + 파라미터값을 포함한 url(인자값으로 넘어오는 currentUrl이 host제외한 값이 넘어옴)
    if(typeof(history.pushState) === 'function'){
        {
            if(historyUrl === currentUrl){ 
                history.replaceState(data, "", currentUrl); // 현재 경로와 히스토리 스택에 쌓을 경로가 동일하면 갱신(replace)
            }else{
                history.pushState(data, "", currentUrl); // 현재 경로와 히스토리 스택에 쌓을 경로가 다르면 누적(push)
            }  
        }
    }  
}

// 이메일 형식 체크 정규표현식 함수
export function isEmail(asValue) {
	var regExp = /^[0-9a-zA-Z]([-_\.]?[0-9a-zA-Z])*@[0-9a-zA-Z]([-_\.]?[0-9a-zA-Z])*\.[a-zA-Z]{2,3}$/i;
	return regExp.test(asValue); // 형식에 맞는 경우 true 리턴	
}

// Url 쿼리스트링 파싱 함수
export function getQueryStringObject() {
    var queryString = window.location.search.substr(1).split('&');
    if (queryString == "") return {};
    var result = {};
    for (var i = 0; i < queryString.length; ++i) {
        var parseQueryString = queryString[i].split('=', 2);
        if (parseQueryString.length == 1)
            result[parseQueryString[0]] = "";
        else
            result[parseQueryString[0]] = decodeURIComponent(parseQueryString[1].replace(/\+/g, " "));
    }
    return result;
}

// 테이블 모바일 반응형 세팅(각 행은 카드뷰 형태로 변환 후 data-title 속성으로 테이블 헤더의 목록들을 세팅)
export function setTableResponsive(){
    $(".table-wrap").each(function() {
        var nmtTable = $(this);
        var nmtHeadRow = nmtTable.find("thead tr");
        nmtTable.find("tbody tr").each(function() {
        var curRow = $(this);
        for (var i = 0; i < curRow.find("td").length; i++) {
            var rowSelector = "td:eq(" + i + ")";
            var headSelector = "th:eq(" + i + ")";
            curRow.find(rowSelector).attr('data-title', nmtHeadRow.find(headSelector).text());
        }
        });
    });
}
"use strict";

export const postCountPerPage = 20; // 페이지당 게시글 표시 수
export const previewPostCount = 5; // 프리뷰 페이지 게시글 표시 수
export const replyCountPerPage = 5; // 페이지당 댓글 표시 수
export const freeBoardRef = firebase.database().ref('board').child('free'); // 자유게시판 루트 참조 경로
export const gtaBoardRef = firebase.database().ref('board').child('gta'); // gta게시판 루트 참조 경로
export const userRef = firebase.database().ref('users'); // 사용자 정보 루트 참조 경로
export const noticeRef = firebase.database().ref('admin'); // 공지사항 루트 참조 경로
export const relationRef = firebase.database().ref('relation'); // 친구관계 참조 경로
export const notificationRef = firebase.database().ref('notification'); // 알림 데이터 참조 경로
export const anonymousIcon = "/images/icon-avatar.png"; // 게시글 작성자 익명유저 아이콘
export const defaultProfileIcon = "/images/icon-avatar.png"; // 로그인 메뉴 사용자 기본아이콘
export const publicRoomIdentifier = 'publicRoomIdentifier'; // 공개방 구분 태그
export const startSound = '/sounds/sound_join.mp3';
export const defaultProfileUrl = "https://img.icons8.com/cotton/2x/profile-face.png"; // 톡방 사용자 기본 아이콘
export const maxParticipantsAllowedCount = 100; // 대화방 최대 허용 인원수
export const notificationLimitCount = 10; // 알림 조회 제한값
export const maxNotificatiionLimitCount = 50; // 알림 모니터링 제한값
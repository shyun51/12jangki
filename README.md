# 십이장기 온라인

온라인으로 즐기는 십이장기 게임입니다.

## 설치 방법

1. Firebase CLI 설치
```bash
npm install -g firebase-tools
```

2. Firebase 로그인
```bash
firebase login
```

3. 프로젝트 초기화
```bash
firebase init
```

4. Firebase 설정
- Firebase 콘솔에서 새 프로젝트 생성
- 웹 앱 등록
- `js/firebase-config.js` 파일에 설정값 입력

## 실행 방법

1. 로컬 테스트
```bash
firebase serve
```

2. 배포
```bash
firebase deploy
```

## 기능

- 멀티플레이 (1대1)
- 싱글플레이 (AI 대전)
- 온라인 플레이
  - 실시간 대전
  - 채팅 기능
  - 방 생성/참가

## 기술 스택

- HTML5
- CSS3
- JavaScript
- Firebase
  - Authentication
  - Realtime Database
  - Hosting 
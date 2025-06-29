// Firebase 설정
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  databaseURL: "YOUR_DATABASE_URL",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Firebase 초기화
firebase.initializeApp(firebaseConfig);

// 데이터베이스 참조
const database = firebase.database();
const auth = firebase.auth();

// 게임방 관련 참조
const roomsRef = database.ref('rooms');
const gamesRef = database.ref('games');
const usersRef = database.ref('users'); 
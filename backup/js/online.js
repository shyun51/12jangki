/* online.js = 온라인으로 대전하기 위한 코드드 */

// Firebase 설정
const firebaseConfig = {
  // Firebase 콘솔에서 가져온 설정값을 여기에 입력
};

// Firebase 초기화
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();

class OnlineGame {
  constructor() {
    this.rooms = {};
    this.currentRoom = null;
    this.currentUser = null;
  }

  // 사용자 인증
  async signIn() {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      const result = await auth.signInWithPopup(provider);
      this.currentUser = result.user;
      return true;
    } catch (error) {
      console.error('로그인 실패:', error);
      return false;
    }
  }

  // 방 생성
  async createRoom(roomName) {
    const roomRef = database.ref('rooms').push();
    await roomRef.set({
      name: roomName,
      createdBy: this.currentUser.uid,
      players: {
        [this.currentUser.uid]: {
          name: this.currentUser.displayName,
          team: 1
        }
      },
      status: 'waiting',
      gameState: null
    });
    return roomRef.key;
  }

  // 방 참가
  async joinRoom(roomId) {
    const roomRef = database.ref(`rooms/${roomId}`);
    const snapshot = await roomRef.once('value');
    const room = snapshot.val();

    if (room.status === 'waiting' && Object.keys(room.players).length < 2) {
      await roomRef.child(`players/${this.currentUser.uid}`).set({
        name: this.currentUser.displayName,
        team: 2
      });
      return true;
    }
    return false;
  }

  // 게임 상태 동기화
  syncGameState(roomId, gameState) {
    const roomRef = database.ref(`rooms/${roomId}`);
    roomRef.update({
      gameState: gameState
    });
  }

  // 채팅 메시지 전송
  async sendChatMessage(roomId, message) {
    const chatRef = database.ref(`rooms/${roomId}/chat`).push();
    await chatRef.set({
      sender: this.currentUser.displayName,
      message: message,
      timestamp: firebase.database.ServerValue.TIMESTAMP
    });
  }
}

// 온라인 게임 인스턴스 생성
const onlineGame = new OnlineGame();

// 이벤트 리스너 등록
document.getElementById('onlineBtn').addEventListener('click', async () => {
  if (await onlineGame.signIn()) {
    // 온라인 게임 UI 표시
    showOnlineGameUI();
  }
});

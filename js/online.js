/* online.js = 온라인으로 대전하기 위한 코드드 */

// Firebase 설정
const firebaseConfig = {
  // Firebase 콘솔에서 가져온 설정값을 여기에 입력
};

// Firebase 초기화
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();

// 온라인 게임 관련 변수
let currentRoom = null;
let currentGame = null;
let currentUser = null;
let isTeamMode = false;
let currentTeam = null;

class OnlineGame {
  constructor() {
    this.rooms = {};
    this.currentRoom = null;
    this.currentUser = null;
    this.gameState = null;
    this.teamVotes = {};
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
  async createRoom(roomName, isTeamGame = false) {
    const roomRef = database.ref('rooms').push();
    const roomData = {
      name: roomName,
      created: firebase.database.ServerValue.TIMESTAMP,
      status: 'waiting',
      isTeamMode: isTeamGame,
      players: {},
      maxPlayers: isTeamGame ? 10 : 2
    };
    
    return roomRef.set(roomData).then(() => {
      this.currentRoom = roomRef.key;
      return this.joinRoom(this.currentRoom);
    });
  }

  // 방 참가
  async joinRoom(roomId) {
    const roomRef = database.ref(`rooms/${roomId}`);
    const snapshot = await roomRef.once('value');
    const room = snapshot.val();

    if (room.status === 'playing') {
      throw new Error('이미 게임이 진행 중입니다.');
    }
    
    const playerCount = Object.keys(room.players || {}).length;
    if (playerCount >= room.maxPlayers) {
      throw new Error('방이 가득 찼습니다.');
    }
    
    await roomRef.child(`players/${this.currentUser.uid}`).set({
      name: this.currentUser.displayName || '플레이어',
      joined: firebase.database.ServerValue.TIMESTAMP,
      team: isTeamMode ? (playerCount < 5 ? 'team1' : 'team2') : null
    });
    return true;
  }

  // 게임 상태 동기화
  syncGameState(roomId, gameState) {
    const roomRef = database.ref(`rooms/${roomId}`);
    roomRef.update({
      gameState: gameState
    });
  }

  // 채팅 메시지 전송
  async sendChatMessage(roomId, message, type = 'all') {
    const chatRef = database.ref(`rooms/${roomId}/chat`).push();
    await chatRef.set({
      userId: this.currentUser.uid,
      userName: this.currentUser.displayName || '플레이어',
      message: message,
      type: type,
      timestamp: firebase.database.ServerValue.TIMESTAMP
    });
  }

  // 팀 투표
  async voteForMove(roomId, move) {
    const roomRef = database.ref(`rooms/${roomId}`);
    const team = this.currentRoom.players[this.currentUser.uid].team;
    const voteRef = roomRef.child(`teamVotes/team${team}/${this.currentUser.uid}`);
    
    await voteRef.set({
      move: move,
      timestamp: firebase.database.ServerValue.TIMESTAMP,
      team: team
    });
  }

  // 투표 결과 확인
  async getVoteResult(roomId, team) {
    const snapshot = await database.ref(`rooms/${roomId}/teamVotes/team${team}`).once('value');
    const votes = snapshot.val() || {};
    
    // 가장 많은 표를 받은 이동 선택
    const moveCounts = {};
    Object.values(votes).forEach(vote => {
      const moveKey = JSON.stringify(vote.move);
      moveCounts[moveKey] = (moveCounts[moveKey] || 0) + 1;
    });

    const maxVotes = Math.max(...Object.values(moveCounts));
    const winningMoves = Object.entries(moveCounts)
      .filter(([_, count]) => count === maxVotes)
      .map(([move]) => JSON.parse(move));

    return winningMoves[Math.floor(Math.random() * winningMoves.length)];
  }

  // 게임 시작
  async startGame(roomId) {
    const roomRef = database.ref(`rooms/${roomId}`);
    await roomRef.update({
      status: 'playing',
      gameState: {
        board: initializeBoard(),
        currentTurn: 'team1',
        lastMove: null
      }
    });
  }

  // 게임 종료
  async endGame(roomId, winner) {
    const roomRef = database.ref(`rooms/${roomId}`);
    await roomRef.update({
      status: 'finished',
      winner: winner
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

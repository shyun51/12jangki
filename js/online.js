class OnlineGame {
  constructor() {
    this.currentRoom = null;
    this.playerId = null;
    this.isHost = false;
    this.gameState = null;
    this.initializeEventListeners();
  }

  initializeEventListeners() {
    // 방 생성 버튼
    document.getElementById('createRoomBtn').addEventListener('click', () => this.createRoom());
    
    // 방 참가 버튼
    document.getElementById('joinRoomBtn').addEventListener('click', () => this.joinRoom());
    
    // 채팅 전송
    document.getElementById('sendChatBtn').addEventListener('click', () => this.sendChat());
  }

  async createRoom() {
    const roomName = document.getElementById('roomNameInput').value;
    if (!roomName) {
      alert('방 이름을 입력해주세요.');
      return;
    }

    const roomRef = database.ref('rooms').push();
    const roomData = {
      name: roomName,
      host: auth.currentUser.uid,
      players: {
        [auth.currentUser.uid]: {
          name: auth.currentUser.displayName || 'Player 1',
          team: 1
        }
      },
      gameState: null,
      createdAt: Date.now()
    };

    try {
      await roomRef.set(roomData);
      this.currentRoom = roomRef.key;
      this.isHost = true;
      this.setupRoomListeners();
      this.updateRoomUI();
    } catch (error) {
      console.error('방 생성 실패:', error);
      alert('방 생성에 실패했습니다.');
    }
  }

  async joinRoom() {
    const roomId = document.getElementById('roomIdInput').value;
    if (!roomId) {
      alert('방 번호를 입력해주세요.');
      return;
    }

    const roomRef = database.ref(`rooms/${roomId}`);
    const snapshot = await roomRef.once('value');
    const roomData = snapshot.val();

    if (!roomData) {
      alert('존재하지 않는 방입니다.');
      return;
    }

    if (Object.keys(roomData.players).length >= 2) {
      alert('방이 가득 찼습니다.');
      return;
    }

    try {
      await roomRef.child('players').child(auth.currentUser.uid).set({
        name: auth.currentUser.displayName || 'Player 2',
        team: 2
      });

      this.currentRoom = roomId;
      this.isHost = false;
      this.setupRoomListeners();
      this.updateRoomUI();
    } catch (error) {
      console.error('방 참가 실패:', error);
      alert('방 참가에 실패했습니다.');
    }
  }

  setupRoomListeners() {
    const roomRef = database.ref(`rooms/${this.currentRoom}`);
    
    // 게임 상태 변경 감지
    roomRef.child('gameState').on('value', (snapshot) => {
      this.gameState = snapshot.val();
      this.updateGameUI();
    });

    // 플레이어 변경 감지
    roomRef.child('players').on('value', (snapshot) => {
      const players = snapshot.val();
      this.updatePlayersUI(players);
    });

    // 채팅 메시지 감지
    roomRef.child('messages').on('child_added', (snapshot) => {
      const message = snapshot.val();
      this.addChatMessage(message);
    });
  }

  async sendChat() {
    const chatInput = document.getElementById('chatInput');
    const message = chatInput.value.trim();
    
    if (!message) return;

    const messageData = {
      sender: auth.currentUser.uid,
      senderName: auth.currentUser.displayName || 'Player',
      text: message,
      timestamp: Date.now()
    };

    try {
      await database.ref(`rooms/${this.currentRoom}/messages`).push(messageData);
      chatInput.value = '';
    } catch (error) {
      console.error('메시지 전송 실패:', error);
    }
  }

  addChatMessage(message) {
    const chatMessages = document.getElementById('chatMessages');
    const messageElement = document.createElement('div');
    messageElement.className = 'chat-message';
    messageElement.innerHTML = `
      <span class="sender">${message.senderName}:</span>
      <span class="text">${message.text}</span>
    `;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  updateRoomUI() {
    document.getElementById('modeSelection').classList.add('hidden');
    document.getElementById('onlineScreen').classList.remove('hidden');
  }

  updateGameUI() {
    if (!this.gameState) return;
    
    // 게임 보드 업데이트
    const board = document.getElementById('onlineBoard');
    board.innerHTML = '';
    
    // 게임 상태에 따라 보드 렌더링
    // TODO: 게임 보드 렌더링 로직 구현
  }

  updatePlayersUI(players) {
    const playerList = document.createElement('div');
    playerList.className = 'player-list';
    
    Object.entries(players).forEach(([id, player]) => {
      const playerElement = document.createElement('div');
      playerElement.className = 'player';
      playerElement.textContent = `${player.name} (Team ${player.team})`;
      playerList.appendChild(playerElement);
    });

    const roomList = document.getElementById('roomList');
    roomList.innerHTML = '';
    roomList.appendChild(playerList);
  }
}

// 온라인 게임 인스턴스 생성
const onlineGame = new OnlineGame(); 
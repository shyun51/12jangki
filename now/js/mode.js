class GameMode {
  constructor() {
    this.modeSelection = document.getElementById('modeSelection');
    this.gameScreen = document.getElementById('gameScreen');
    this.multiplayerBtn = document.getElementById('multiplayerBtn');
    this.singleplayerBtn = document.getElementById('singleplayerBtn');
    this.onlineBtn = document.getElementById('onlineBtn');
    this.backToMenuBtn = document.getElementById('backToMenuBtn');

    this.initializeEventListeners();
  }

  initializeEventListeners() {
    this.multiplayerBtn.addEventListener('click', () => this.startMultiplayer());
    this.singleplayerBtn.addEventListener('click', () => this.startSingleplayer());
    this.onlineBtn.addEventListener('click', () => this.startOnline());
    this.backToMenuBtn.addEventListener('click', () => this.showModeSelection());
  }

  showModeSelection() {
    this.modeSelection.classList.remove('hidden');
    this.gameScreen.classList.add('hidden');
  }

  showGameScreen() {
    this.modeSelection.classList.add('hidden');
    this.gameScreen.classList.remove('hidden');
  }

  startMultiplayer() {
    this.showGameScreen();
    // 기존 게임 로직 초기화
    if (window.game) {
      window.game.initialize();
    }
  }

  startSingleplayer() {
    this.showGameScreen();
    // AI 모드 초기화
    if (window.game) {
      window.game.initialize(true);
    }
  }

  startOnline() {
    this.showGameScreen();
    // 온라인 모드 초기화
    if (window.onlineGame) {
      window.onlineGame.initialize();
    }
  }
}

// 게임 모드 인스턴스 생성
window.gameMode = new GameMode(); 


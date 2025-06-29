/* game.js - 메인 게임 컨트롤러 */

class Game {
    constructor() {
      this.mode = 'multiplayer'; // multiplayer, singleplayer, online
      this.aiDifficulty = 'medium'; // easy, medium, hard
      this.isAIMode = false;
      this.aiPlayer = 2; // AI는 Player 2
      this.moveHistory = [];
      this.gameStats = {
        player1Wins: 0,
        player2Wins: 0,
        totalGames: 0
      };
    }
  
    initialize(aiMode = false, difficulty = 'medium') {
      this.isAIMode = aiMode;
      this.aiDifficulty = difficulty;
      this.mode = aiMode ? 'singleplayer' : 'multiplayer';
      
      // UI 업데이트
      this.updateModeDisplay();
      
      // 기존 board.js의 초기화 함수 호출
      if (typeof init === 'function') {
        init();
      }
      
      console.log(`게임 시작: ${this.mode} 모드 ${aiMode ? `(AI 난이도: ${difficulty})` : ''}`);
    }
  
    updateModeDisplay() {
      const statusEl = document.getElementById('status');
      if (statusEl && this.isAIMode) {
        statusEl.innerHTML = `
          <div>Player 1 vs AI (${this.aiDifficulty})</div>
          <div>Player ${current} 차례</div>
        `;
      }
    }
  
    // 턴 종료 시 호출되는 함수
    onTurnEnd(currentPlayer) {
      if (this.isAIMode && currentPlayer === this.aiPlayer) {
        // AI 턴 처리
        setTimeout(() => {
          this.makeAIMove();
        }, 500); // 0.5초 후 AI 이동
      }
    }
  
    makeAIMove() {
      if (!this.isAIMode || current !== this.aiPlayer) return;
  
      const ai = new AIPlayer(this.aiDifficulty);
      const move = ai.getBestMove(board, reserve, current);
      
      if (move) {
        if (move.type === 'move') {
          // 말 이동
          const from = move.from;
          const to = move.to;
          
          // 이동 시뮬레이션
          const mover = board[from];
          const target = board[to];
          
          // 히스토리 저장
          history.push(clone({board, reserve, current}));
          
          // 말 이동 실행
          if (target) {
            reserve[current].push({
              type: target.type === TYPES.H ? TYPES.P : target.type,
              owner: current
            });
          }
          board[to] = mover;
          board[from] = null;
          
          // 승진 체크
          const [r] = rc(to);
          if (mover.type === TYPES.P && 
              ((mover.owner === 1 && r === 0) || (mover.owner === 2 && r === 3))) {
            mover.type = TYPES.H;
          }
          
        } else if (move.type === 'drop') {
          // 말 드롭
          const pieceIndex = move.pieceIndex;
          const position = move.position;
          
          const piece = reserve[current][pieceIndex];
          reserve[current].splice(pieceIndex, 1);
          
          // 후를 드롭할 때는 포로 변경
          const type = piece.type === TYPES.H ? TYPES.P : piece.type;
          board[position] = {type: type, owner: current};
        }
        
        // 턴 종료
        endTurn();
      }
    }
  
    // 게임 종료 처리
    onGameEnd(winner) {
      this.gameStats.totalGames++;
      if (winner === 1) {
        this.gameStats.player1Wins++;
      } else if (winner === 2) {
        this.gameStats.player2Wins++;
      }
      
      console.log(`게임 종료: Player ${winner} 승리!`);
      console.log('게임 통계:', this.gameStats);
    }
  
    // 게임 재시작
    restart() {
      this.moveHistory = [];
      this.initialize(this.isAIMode, this.aiDifficulty);
    }
  
    // 난이도 변경
    setDifficulty(difficulty) {
      this.aiDifficulty = difficulty;
      console.log(`AI 난이도 변경: ${difficulty}`);
    }
  
    // 게임 상태 저장 (localStorage 대신 메모리에 저장)
    saveGameState() {
      return {
        board: clone(board),
        reserve: clone(reserve),
        current: current,
        mode: this.mode,
        aiDifficulty: this.aiDifficulty,
        gameStats: clone(this.gameStats)
      };
    }
  
    // 게임 상태 로드
    loadGameState(savedState) {
      if (savedState) {
        board = savedState.board;
        reserve = savedState.reserve;
        current = savedState.current;
        this.mode = savedState.mode;
        this.aiDifficulty = savedState.aiDifficulty;
        this.gameStats = savedState.gameStats;
        
        draw();
      }
    }
  }
  
  // 전역 게임 인스턴스
  window.game = new Game();
  
  // board.js의 endTurn 함수 수정을 위한 후킹
  const originalEndTurn = window.endTurn;
  window.endTurn = function() {
    if (originalEndTurn) {
      originalEndTurn();
    }
    
    // AI 턴 처리
    if (window.game && window.game.isAIMode) {
      window.game.onTurnEnd(current);
    }
  };
/* ai.js - AI 시스템 구현 */

class AIPlayer {
    constructor(difficulty = 'medium') {
      this.difficulty = difficulty;
      this.maxDepth = this.getMaxDepth();
      
      // 말의 기본 가치
      this.pieceValues = {
        [TYPES.K]: 1000,  // 왕
        [TYPES.J]: 5,     // 상
        [TYPES.S]: 3,     // 사
        [TYPES.P]: 2,     // 포
        [TYPES.H]: 4      // 후
      };
  
      // 위치별 보너스 (3x4 보드)
      this.positionBonus = {
        [TYPES.K]: [
          0, 2, 0,    // 0행 (상대 진영)
          1, 3, 1,    // 1행
          1, 3, 1,    // 2행
          0, 5, 0     // 3행 (내 진영)
        ],
        [TYPES.J]: [
          3, 1, 3,
          2, 0, 2,
          2, 0, 2,
          3, 1, 3
        ],
        [TYPES.S]: [
          2, 0, 2,
          1, 2, 1,
          1, 2, 1,
          2, 0, 2
        ],
        [TYPES.P]: [
          0, 1, 0,
          2, 3, 2,
          2, 3, 2,
          0, 1, 0
        ],
        [TYPES.H]: [
          1, 2, 1,
          3, 4, 3,
          3, 4, 3,
          1, 2, 1
        ]
      };
    }
  
    getMaxDepth() {
      switch (this.difficulty) {
        case 'easy': return 1;
        case 'medium': return 2;
        case 'hard': return 3;
        default: return 2;
      }
    }
  
    // 최적의 이동 찾기
    getBestMove(board, reserve, player) {
      if (this.difficulty === 'easy') {
        return this.getRandomMove(board, reserve, player);
      }
      
      const result = this.minimax(board, reserve, player, this.maxDepth, true, -Infinity, Infinity);
      return result.move;
    }
  
    // 랜덤 이동 (쉬운 난이도)
    getRandomMove(board, reserve, player) {
      const moves = this.getAllPossibleMoves(board, reserve, player);
      if (moves.length === 0) return null;
      
      return moves[Math.floor(Math.random() * moves.length)];
    }
  
    // 미니맥스 알고리즘 (알파-베타 가지치기 포함)
    minimax(board, reserve, player, depth, isMaximizing, alpha, beta) {
      if (depth === 0 || this.isGameOver(board)) {
        return { score: this.evaluateBoard(board, reserve, player), move: null };
      }
  
      const moves = this.getAllPossibleMoves(board, reserve, player);
      let bestMove = null;
  
      if (isMaximizing) {
        let maxScore = -Infinity;
        
        for (const move of moves) {
          const { newBoard, newReserve } = this.applyMove(board, reserve, move, player);
          const result = this.minimax(newBoard, newReserve, 3 - player, depth - 1, false, alpha, beta);
          
          if (result.score > maxScore) {
            maxScore = result.score;
            bestMove = move;
          }
          
          alpha = Math.max(alpha, result.score);
          if (beta <= alpha) break; // 알파-베타 가지치기
        }
        
        return { score: maxScore, move: bestMove };
      } else {
        let minScore = Infinity;
        
        for (const move of moves) {
          const { newBoard, newReserve } = this.applyMove(board, reserve, move, player);
          const result = this.minimax(newBoard, newReserve, 3 - player, depth - 1, true, alpha, beta);
          
          if (result.score < minScore) {
            minScore = result.score;
            bestMove = move;
          }
          
          beta = Math.min(beta, result.score);
          if (beta <= alpha) break; // 알파-베타 가지치기
        }
        
        return { score: minScore, move: bestMove };
      }
    }
  
    // 보드 평가 함수
    evaluateBoard(board, reserve, player) {
      let score = 0;
      
      // 1. 보드 위 말들의 가치 계산
      for (let i = 0; i < board.length; i++) {
        const piece = board[i];
        if (piece) {
          let pieceScore = this.pieceValues[piece.type];
          
          // 위치 보너스 추가
          pieceScore += this.positionBonus[piece.type][i] * 0.1;
          
          // 승진한 포(후)에 추가 보너스
          if (piece.type === TYPES.H) {
            pieceScore += 1;
          }
          
          if (piece.owner === player) {
            score += pieceScore;
          } else {
            score -= pieceScore;
          }
        }
      }
      
      // 2. 예비 말들의 가치
      for (const piece of reserve[player]) {
        score += this.pieceValues[piece.type] * 0.5; // 예비 말은 절반 가치
      }
      for (const piece of reserve[3 - player]) {
        score -= this.pieceValues[piece.type] * 0.5;
      }
      
      // 3. 왕의 안전성
      const myKingPos = this.findKing(board, player);
      const enemyKingPos = this.findKing(board, 3 - player);
      
      if (myKingPos >= 0) {
        score += this.evaluateKingSafety(board, myKingPos, player) * 2;
      }
      
      if (enemyKingPos >= 0) {
        score -= this.evaluateKingSafety(board, enemyKingPos, 3 - player) * 2;
      }
      
      // 4. 승리 조건 체크
      if (this.isWinning(board, player)) {
        score += 10000;
      } else if (this.isWinning(board, 3 - player)) {
        score -= 10000;
      }
      
      return score;
    }
  
    // 왕의 안전성 평가
    evaluateKingSafety(board, kingPos, player) {
      const [r, c] = rc(kingPos);
      let safety = 0;
      
      // 적 진영에 있으면 보너스
      if ((player === 1 && r === 0) || (player === 2 && r === 3)) {
        safety += 50;
      }
      
      // 주변 아군 말의 수
      const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
      for (const [dr, dc] of dirs) {
        const nr = r + dr, nc = c + dc;
        if (inBounds(nr, nc)) {
          const piece = board[idx(nr, nc)];
          if (piece && piece.owner === player) {
            safety += 3;
          }
        }
      }
      
      return safety;
    }
  
    // 모든 가능한 이동 생성
    getAllPossibleMoves(board, reserve, player) {
      const moves = [];
      
      // 1. 보드 위 말들의 이동
      for (let i = 0; i < board.length; i++) {
        const piece = board[i];
        if (piece && piece.owner === player) {
          const legalMoves = getLegalMoves(i);
          for (const to of legalMoves) {
            moves.push({ type: 'move', from: i, to: to });
          }
        }
      }
      
      // 2. 예비 말 드롭 (중앙 6칸만)
      const dropPositions = this.getValidDropPositions(board);
      for (let i = 0; i < reserve[player].length; i++) {
        for (const pos of dropPositions) {
          moves.push({ type: 'drop', pieceIndex: i, position: pos });
        }
      }
      
      return moves;
    }
  
    // 유효한 드롭 위치 반환 (중앙 6칸)
    getValidDropPositions(board) {
      const positions = [];
      const middleArea = [
        idx(1, 0), idx(1, 1), idx(1, 2),  // 1행
        idx(2, 0), idx(2, 1), idx(2, 2)   // 2행
      ];
      
      for (const pos of middleArea) {
        if (!board[pos]) {
          positions.push(pos);
        }
      }
      
      return positions;
    }
  
    // 이동 적용 (시뮬레이션)
    applyMove(board, reserve, move, player) {
      const newBoard = [...board];
      const newReserve = {
        1: [...reserve[1]],
        2: [...reserve[2]]
      };
      
      if (move.type === 'move') {
        const mover = newBoard[move.from];
        const target = newBoard[move.to];
        
        // 잡힌 말 처리
        if (target) {
          const capturedType = target.type === TYPES.H ? TYPES.P : target.type;
          newReserve[player].push({ type: capturedType, owner: player });
        }
        
        // 말 이동
        newBoard[move.to] = { ...mover };
        newBoard[move.from] = null;
        
        // 승진 처리
        const [r] = rc(move.to);
        if (mover.type === TYPES.P && 
            ((mover.owner === 1 && r === 0) || (mover.owner === 2 && r === 3))) {
          newBoard[move.to].type = TYPES.H;
        }
        
      } else if (move.type === 'drop') {
        const piece = newReserve[player][move.pieceIndex];
        newReserve[player].splice(move.pieceIndex, 1);
        
        // 후를 드롭할 때는 포로 변경
        const type = piece.type === TYPES.H ? TYPES.P : piece.type;
        newBoard[move.position] = { type: type, owner: player };
      }
      
      return { newBoard, newReserve };
    }
  
    // 왕 찾기
    findKing(board, player) {
      return board.findIndex(p => p && p.owner === player && p.type === TYPES.K);
    }
  
    // 게임 종료 체크
    isGameOver(board) {
      return this.findKing(board, 1) < 0 || this.findKing(board, 2) < 0 ||
             this.isWinning(board, 1) || this.isWinning(board, 2);
    }
  
    // 승리 조건 체크
    isWinning(board, player) {
      const kingPos = this.findKing(board, player);
      if (kingPos < 0) return false;
      
      const [r] = rc(kingPos);
      
      // 왕이 적 진영에 있는지 체크
      if ((player === 1 && r === 0) || (player === 2 && r === 3)) {
        // 적이 왕을 잡을 수 있는지 체크
        const enemyMoves = this.getAllPossibleMoves(board, reserve, 3 - player)
          .filter(move => move.type === 'move')
          .map(move => move.to);
        
        return !enemyMoves.includes(kingPos);
      }
      
      return false;
    }
  }
  
  // AI 디버깅용 함수들
  window.AIPlayer = AIPlayer;
  
  // AI 테스트 함수
  function testAI() {
    const ai = new AIPlayer('medium');
    const move = ai.getBestMove(board, reserve, current);
    console.log('AI 추천 이동:', move);
    
    if (move) {
      console.log(`AI가 ${move.type} 이동을 제안했습니다.`);
      if (move.type === 'move') {
        console.log(`${move.from}에서 ${move.to}로 이동`);
      } else if (move.type === 'drop') {
        console.log(`${move.pieceIndex}번 말을 ${move.position}에 드롭`);
      }
    }
  }
  
  // AI 성능 테스트
  function benchmarkAI() {
    const difficulties = ['easy', 'medium', 'hard'];
    const results = {};
    
    for (const diff of difficulties) {
      const ai = new AIPlayer(diff);
      const startTime = performance.now();
      
      // 10번 이동 계산
      for (let i = 0; i < 10; i++) {
        ai.getBestMove(board, reserve, current);
      }
      
      const endTime = performance.now();
      results[diff] = {
        avgTime: (endTime - startTime) / 10,
        maxDepth: ai.maxDepth
      };
    }
    
    console.log('AI 성능 벤치마크:', results);
    return results;
  } 
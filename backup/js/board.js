/* board.js - 개선된 십이장기 게임 로직 */

const ROWS = 4, COLS = 3, AREA = ROWS * COLS;
const TYPES = { K:'왕', J:'상', S:'사', P:'포', H:'후' };
const COLORS = { 1:'#0072B2', 2:'#D55E00' };          // color-blind safe
const DIR = { 1:-1, 2:+1 };                           // 전진 방향

// 말 이동 방향 표시용 아이콘
const PIECE_ICONS = {
  [TYPES.K]: '✦',  // 왕 - 모든 방향
  [TYPES.J]: '✚',  // 상 - 십자 방향
  [TYPES.S]: '✕',  // 사 - 대각선 방향
  [TYPES.P]: '↑',  // 포 - 전진
  [TYPES.H]: '⬢'   // 후 - 뒷 대각선 방향 2칸을 제외한 6칸 이동 가능
};

/* ── 상태 ── */
let board, reserve, current, selected, history;

/* ── DOM ── */
const boardEl   = document.getElementById('board');
const statusEl  = document.getElementById('status');
const res1El    = document.getElementById('reserve1');
const res2El    = document.getElementById('reserve2');
const overlayEl = document.getElementById('gameOver');
const winnerEl  = document.getElementById('winnerMsg');
const restartBtn= document.getElementById('restartBtn');
const undoBtn   = document.getElementById('undoBtn');

/* ── 유틸 ── */
const idx = (r,c)=>r*COLS+c;
const rc  = i=>[Math.floor(i/COLS), i%COLS];
const inBounds = (r,c)=>r>=0&&r<ROWS&&c>=0&&c<COLS;
const clone = obj=>JSON.parse(JSON.stringify(obj));
const place = (r,c,p)=>board[idx(r,c)]=p;

// 중앙 6칸 체크 함수 (드롭 제한용)
const isMiddleArea = (i) => {
  const [r, c] = rc(i);
  return (r === 1 || r === 2) && c >= 0 && c < 3;
};

/* ── 초기화 ── */
function init(){
  board = Array(AREA).fill(null);
  reserve = {1:[], 2:[]};
  history = [];
  current = 1;
  selected = null;

  /* 초기 배치 */
  place(3,0,{type:TYPES.S,owner:1});
  place(3,1,{type:TYPES.K,owner:1});
  place(3,2,{type:TYPES.J,owner:1});
  place(2,1,{type:TYPES.P,owner:1});

  place(0,0,{type:TYPES.S,owner:2});
  place(0,1,{type:TYPES.K,owner:2});
  place(0,2,{type:TYPES.J,owner:2});
  place(1,1,{type:TYPES.P,owner:2});

  overlayEl.classList.add('hidden');
  draw();
}

/* ── 그리기 ── */
function draw(){
  boardEl.innerHTML='';

  board.forEach((piece,i)=>{
    const cell=document.createElement('div');
    cell.className='cell';
    cell.dataset.index=i;
    
    // 선택된 말 하이라이트
    if(selected && selected.type==='move' && selected.from===i)
      cell.classList.add('highlight');
    
    // 드롭 모드일 때 중앙 6칸 하이라이트
    if(selected && selected.type==='drop' && isMiddleArea(i) && !piece)
      cell.classList.add('highlight');
    
    cell.addEventListener('click',onCellClick);

    if(piece){
      const p=document.createElement('div');
      p.className='piece';
      p.style.background=COLORS[piece.owner];
      p.textContent=piece.type;
      p.dataset.type=piece.type;
      p.dataset.owner=piece.owner;
      
      // 말 방향 표시 아이콘 추가
      const icon = document.createElement('span');
      icon.className = 'piece-icon';
      icon.textContent = PIECE_ICONS[piece.type] || '';
      p.appendChild(icon);
      
      cell.appendChild(p);
    }
    boardEl.appendChild(cell);
  });

  // 이동 가능한 지점 표시
  if(selected && selected.type==='move') {
    selected.to.forEach(i => {
      const cell = boardEl.children[i];
      const dot = document.createElement('div');
      dot.className = 'movable-dot';
      cell.appendChild(dot);
    });
  }

  renderReserve(res1El,1);
  renderReserve(res2El,2);
  updateStatus();
}

function updateStatus() {
  let statusText = `Player ${current} 차례`;
  
  // AI 모드 표시
  if (window.game && window.game.isAIMode) {
    if (current === 1) {
      statusText = `당신의 차례 (vs AI ${window.game.aiDifficulty})`;
    } else {
      statusText = `AI 생각 중... (${window.game.aiDifficulty})`;
    }
  }
  
  statusEl.textContent = statusText;
}

function renderReserve(el,owner){
  el.innerHTML='';
  reserve[owner].forEach((p,idx)=>{
    const d=document.createElement('div');
    d.className='piece';
    d.style.background=COLORS[owner];
    d.textContent=p.type;
    d.dataset.index=idx;
    d.dataset.owner=owner;
    d.addEventListener('click',onReserveClick);
    
    // 예비 말에도 아이콘 추가
    const icon = document.createElement('span');
    icon.className = 'piece-icon small';
    icon.textContent = PIECE_ICONS[p.type] || '';
    d.appendChild(icon);
    
    el.appendChild(d);
  });
}

/* ── 클릭 핸들러 ── */
function onCellClick(e){
  const i=+e.currentTarget.dataset.index;
  
  // 이동 실행
  if(selected && selected.type==='move' && selected.to.includes(i)){
    movePiece(selected.from,i);
    selected=null;
    return;
  }
  
  // 드롭 실행 (중앙 6칸 제한)
  if(selected && selected.type==='drop' && board[i]===null){
    if(!isMiddleArea(i)) {
      showMessage('포획한 말은 중앙 6칸에만 놓을 수 있습니다!', 'warning');
      return;
    }
    dropPiece(i);
    selected=null;
    return;
  }
  
  // 말 선택
  const piece=board[i];
  if(piece && piece.owner===current){
    const moves = getLegalMoves(i);
    if(moves.length > 0) {
      selected={type:'move',from:i,to:moves};
      highlight(selected.to);
    } else {
      showMessage('이동할 수 있는 곳이 없습니다.', 'info');
    }
  }else{
    selected=null;
    draw();
  }
}

function onReserveClick(e){
  const owner=+e.currentTarget.dataset.owner;
  if(owner!==current) return;
  
  selected={
    type:'drop',
    piece:reserve[owner][+e.currentTarget.dataset.index],
    reserveIdx:+e.currentTarget.dataset.index
  };
  draw();
  showMessage('중앙 6칸 중 한 곳을 선택하세요.', 'info');
}

/* ── 메시지 표시 ── */
function showMessage(text, type = 'info') {
  // 기존 메시지 제거
  const existingMsg = document.querySelector('.game-message');
  if (existingMsg) existingMsg.remove();
  
  const msg = document.createElement('div');
  msg.className = `game-message ${type}`;
  msg.textContent = text;
  
  document.body.appendChild(msg);
  
  // 3초 후 자동 제거
  setTimeout(() => {
    if (msg.parentNode) msg.remove();
  }, 3000);
}

/* ── 하이라이트 ── */
function highlight(cells){
  draw();
  cells.forEach(i=>boardEl.children[i].classList.add('highlight'));
}

/* ── 이동 생성 ── */
function getLegalMoves(i){
  const piece=board[i];
  if(!piece) return [];
  const [r,c]=rc(i), o=piece.owner;
  let dirs=[];
  
  switch(piece.type){
    case TYPES.K: // 왕 - 모든 방향 1칸
      dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]; 
      break;
    case TYPES.J: // 상 - 십자 방향 1칸
      dirs=[[1,0],[-1,0],[0,1],[0,-1]]; 
      break;
    case TYPES.S: // 사 - 대각선 방향 1칸
      dirs=[[1,1],[1,-1],[-1,1],[-1,-1]]; 
      break;
    case TYPES.P: // 포 - 전진만
      dirs=[[DIR[o],0]]; 
      break;
    case TYPES.H: // 후 - 다방향 (승진된 포)
      dirs=[[1,0],[-1,0],[0,1],[0,-1],[DIR[o],1],[DIR[o],-1],[-DIR[o],0]];
      break;
  }
  
  let moves = [];
  
  for(const [dr,dc] of dirs) {
    if(piece.type === TYPES.J) {
      // 상은 한 칸만 이동 가능
      const nr = r + dr;
      const nc = c + dc;
      if(inBounds(nr, nc)) {
        const targetIdx = idx(nr, nc);
        const target = board[targetIdx];
        if(!target || target.owner !== o) {
          moves.push(targetIdx);
        }
      }
    } else {
      // 다른 말들은 1칸만 이동
      const nr = r + dr;
      const nc = c + dc;
      if(inBounds(nr, nc)) {
        const targetIdx = idx(nr, nc);
        const target = board[targetIdx];
        if(!target || target.owner !== o) {
          moves.push(targetIdx);
        }
      }
    }
  }
  
  return moves;
}

/* ── 실행 ── */
function movePiece(from,to){
  history.push(clone({board,reserve,current}));
  const mover=board[from];
  const target=board[to];

  // 잡힌 말 처리
  if(target) {
    const capturedType = target.type === TYPES.H ? TYPES.P : target.type;
    reserve[current].push({type:capturedType,owner:current});
    showMessage(`${target.type}을(를) 포획했습니다!`, 'success');
  }
  
  board[to]=mover;
  board[from]=null;

  // 승진 체크
  const [r]=rc(to);
  if(mover.type===TYPES.P && ((mover.owner===1&&r===0)||(mover.owner===2&&r===3))){
    mover.type=TYPES.H;
    showMessage('포가 후로 승진했습니다!', 'success');
  }
  
  endTurn();
}

function dropPiece(at){
  history.push(clone({board,reserve,current}));
  const p=selected.piece;
  reserve[current].splice(selected.reserveIdx,1);
  
  // 후를 드롭할 때는 포로 변경
  const type = p.type === TYPES.H ? TYPES.P : p.type;
  board[at]={type:type,owner:current};
  
  showMessage(`${type}을(를) 배치했습니다.`, 'success');
  endTurn();
}

function endTurn(){
  if(checkWin()) return;
  current=3-current;
  draw();
  
  // 게임 컨트롤러에 턴 종료 알림
  if(window.game) {
    window.game.onTurnEnd(current);
  }
}

/* ── 승리 판정 ── */
function findKing(o){ return board.findIndex(p=>p&&p.owner===o&&p.type===TYPES.K); }

function legalMovesFor(o){
  let m=[];
  board.forEach((p,i)=>{ if(p&&p.owner===o) m.push(...getLegalMoves(i)); });
  return m;
}

function kingSafeInEnemyCamp(o){
  const k=findKing(o);
  if(k<0) return false;
  const [r]=rc(k);
  if((o===1&&r!==0)||(o===2&&r!==3)) return false;
  return !legalMovesFor(3-o).includes(k);
}

function checkWin(){
  const king1 = findKing(1);
  const king2 = findKing(2);
  
  // 왕이 잡혔을 때
  if(king1<0){ declareWin(2, '상대 왕을 포획했습니다!'); return true;}
  if(king2<0){ declareWin(1, '상대 왕을 포획했습니다!'); return true;}
  
  // 왕이 적진에서 안전할 때
  if(kingSafeInEnemyCamp(1)){ declareWin(1, '왕이 적진에서 안전합니다!'); return true;}
  if(kingSafeInEnemyCamp(2)){ declareWin(2, '왕이 적진에서 안전합니다!'); return true;}
  
  return false;
}

function declareWin(winner, reason = ''){
  const winText = window.game && window.game.isAIMode 
    ? (winner === 1 ? '승리!' : 'AI 승리!') 
    : `Player ${winner} 승리!`;
    
  winnerEl.innerHTML = `
    <h2>${winText}</h2>
    <p>${reason}</p>
  `;
  overlayEl.classList.remove('hidden');
  
  // 게임 컨트롤러에 게임 종료 알림
  if(window.game) {
    window.game.onGameEnd(winner);
  }
}

function undo() {
  if (history.length === 0) {
    showMessage('되돌릴 수 없습니다.', 'warning');
    return;
  }
  
  const prevState = history.pop();
  board = prevState.board;
  reserve = prevState.reserve;
  current = prevState.current;
  selected = null;
  
  overlayEl.classList.add('hidden');
  draw();
  showMessage('이전 상태로 되돌렸습니다.', 'info');
}

/* ── 이벤트 ── */
restartBtn.addEventListener('click', () => {
  if(window.game) {
    window.game.restart();
  } else {
    init();
  }
});
undoBtn.addEventListener('click', undo);

// 키보드 단축키
document.addEventListener('keydown', (e) => {
  switch(e.key) {
    case 'u':
    case 'U':
      if(e.ctrlKey) {
        e.preventDefault();
        undo();
      }
      break;
    case 'r':
    case 'R':
      if(e.ctrlKey) {
        e.preventDefault();
        if(window.game) window.game.restart();
      }
      break;
    case 'Escape':
      selected = null;
      draw();
      break;
  }
});

document.addEventListener('DOMContentLoaded',init);

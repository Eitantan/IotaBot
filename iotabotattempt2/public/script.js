var board = null, rand = null;
var $status = $('#status');
var $fen = $('#fen');
var $pgn = $('#pgn');
var $cmom = $('#checkmateometer')
var red = 0, blue = 0;
var game = new Chess();

const PIECE_VALUES = {
    'p': 1,
    'n': 3,
    'b': 3,
    'r': 5,
    'q': 9,
    'k': 1000 // Arbitrary high value for the king
};

function onDragStart(source, piece, position, orientation) {
    // do not pick up pieces if the game is over
    if (game.game_over()) return false;

    // only pick up pieces for the side to move
    if ((game.turn() === 'w' && piece.search(/^b/) !== -1) || game.turn() === 'b') {
        return false;
    }
}

function onDrop(source, target) {
    // see if the move is legal
    var move = game.move({
        from: source,
        to: target,
        promotion: 'q' // NOTE: always promote to a queen for example simplicity
    });

    // illegal move
    if (move === null) return 'snapback';

    // Make the move for black
    window.setTimeout(handleBlackMove, 250);
}

// update the board position after the piece snap
// for castling, en passant, pawn promotion
function onSnapEnd() {
    updateStatus();
    board.position(game.fen());
}

function updateStatus() {
    var status = '';

    // checkmate?
    if (game.in_checkmate()) {
        status = 'Game over, ' + game.turn() + ' is in checkmate.';
    }

    // draw?
    else if (game.in_draw()) {
        status = 'Game over, drawn position';
    }

    // game still on
    else {
        var moveColor = 'White';
        if (game.turn() === 'b') {
            moveColor = 'Black';
        }

        status = moveColor + ' to move';

        // check?
        if (game.in_check()) {
            status += ', ' + moveColor + ' is in check';
        }
    }

    $status.html(status);
    $fen.html(game.fen());
    $pgn.html(game.pgn());
}

let movesConsidered = 0
function evaluate(currentGame, maximizer) {
    movesConsidered += 1
    if (currentGame.in_checkmate()) {
        console.log("I see checkmate for " + currentGame.turn())
        if (currentGame.turn() === maximizer) {
            red += 1
        } else {
            blue += 1
        }
        return currentGame.turn() === maximizer ? -1000 : 1000;
    } else if (currentGame.in_draw()) {
        return 0;
    }

    let score = 0;

    $cmom.css("color", `rgb(${Math.round(red / movesConsidered)},0,${Math.round(blue / movesConsidered)})`)

    // Simple evaluation for having more pieces than white
    // Give the bot points for every black piece standing by piece value
    // Vice versa for white
    // Give the bot points for empty squares (hopefully to reduce the amount of pieces on the board)
    for (let square of currentGame.SQUARES) {
        if (currentGame.get(square)) {
            if (currentGame.get(square).color === maximizer) {
                score += PIECE_VALUES[currentGame.get(square).type.toLowerCase()]
            } else {
                score -= PIECE_VALUES[currentGame.get(square).type.toLowerCase()]
            }
        } else {
            score += 0.1
        }
        
    }

    return score;
}

function minimax(currentGame, depth, maximizer, alpha, beta) {
    movesConsidered = 0

    if (depth === 0 || currentGame.game_over()) {
        const eval = evaluate(currentGame, maximizer);
        return { evaluation: eval, move: null };
    }

    let bestMove = null;
    if (currentGame.turn() === maximizer) {
        let maxEval = -Infinity;
        for (let move of currentGame.moves()) {
            let childGame = new Chess(currentGame.fen());
            childGame.move(move);
            let result = minimax(childGame, depth - 1, maximizer, alpha, beta);
            if (result.evaluation > maxEval) {
                maxEval = result.evaluation;
                bestMove = move;
            }
            alpha = Math.max(alpha, result.evaluation);
            if (beta <= alpha) break;
        }
        return { evaluation: maxEval, move: bestMove };
    } else {
        let minEval = Infinity;
        for (let move of currentGame.moves()) {
            let childGame = new Chess(currentGame.fen());
            childGame.move(move);
            let result = minimax(childGame, depth - 1, maximizer, alpha, beta);
            if (result.evaluation < minEval) {
                minEval = result.evaluation;
                bestMove = move;
            }
            beta = Math.min(beta, result.evaluation);
            if (beta <= alpha) break;
        }
        return { evaluation: minEval, move: bestMove };
    }
}

var move_number=0

function handleBlackMove() {
    move_number++;
    red = 0, blue = 0, pieceNumber = 0
    for (var square of game.SQUARES) {
        if (game.get(square)) pieceNumber++
    }
    // var depth = pieceNumber < 13 ? Math.round(Math.sqrt(move_number)) : move_number <= 12 ? 3 : 4
    var depth = Math.min(Math.round((36 * (pieceNumber ** -1))), 7)
    var bestMove = minimax(game, depth+1, 'b', -Infinity, Infinity).move;
    if (bestMove) {
        console.log(move_number + ": Found move " + bestMove + " at depth " + Math.max(3, Math.round(1.05 * Math.sqrt(move_number))))
        game.move(bestMove);
        updateStatus();
        board.position(game.fen());
    }
}

const CONFIG = {
    pieceTheme: 'https://chessboardjs.com/img/chesspieces/alpha/{piece}.png',
    draggable: true,
    position: 'start',
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd
};
board = Chessboard('myBoard', CONFIG);

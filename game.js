let socket = io();
let screen = document.getElementById("screen");
let canvas = document.getElementById("game");
let context = canvas.getContext("2d");

let menu = document.getElementById("menu");
let entry = document.getElementById("entry");
let name_f = document.getElementById("name");
let join_b = document.getElementById("join");
let start_b = document.getElementById("start");
let players = document.getElementById("players");

// ローカル情報
let myToken = ""
let isJoinGame = false;
let isGM = false;

let cameraX = 0;
let cameraY = 0;
let mouseX = 0;
let mouseY = 0;
let isMouseDown = false;
let playerX = 0;
let playerY = 0;
let AimX = 0;
let AimY = 0;
let worldradius = 1200;
let pNo = -1;

let color = [{ c1: "rgb(127, 63, 63)", c2: "rgb(191, 95, 95)", c3: "rgb(255, 127, 127)", c4: "rgb(255, 191, 191)" },
    { c1: "rgb(63, 63, 127)", c2: "rgb(95, 95, 191)", c3: "rgb(127, 127, 255)", c4: "rgb(191, 191, 255)" },
    { c1: "rgb(63, 127, 63)", c2: "rgb(95, 191, 95)", c3: "rgb(127, 255, 127)", c4: "rgb(191, 255, 191)" },
    { c1: "rgb(127, 127, 63)", c2: "rgb(191, 191, 95)", c3: "rgb(255, 255, 127)", c4: "rgb(255, 255, 191)" },
    { c1: "rgb(127, 63, 127)", c2: "rgb(191, 95, 191)", c3: "rgb(255, 127, 255)", c4: "rgb(255, 191, 255)" },
    { c1: "rgb(63, 127, 127)", c2: "rgb(95, 191, 191)", c3: "rgb(127, 255, 255)", c4: "rgb(191, 255, 255)" }];

// 初期化
resizeCanvas()
// イベント関数
window.addEventListener("resize", resizeCanvas);

// socket.io接続＆Token取得
socket.on("token", function (token) {
    myToken = token;
    console.log(myToken)
});

// Joinボタン押下時
join_b.addEventListener("mousedown", function (e) {
    if (isJoinGame == false) {
        if (name_f.value == "") {
            name_f.value = "Guest " + myToken.substring(0, 3);
        }
        socket.emit("join", { id: myToken, n: name_f.value });
        name_f.remove();
        join_b.remove();
        isJoinGame = true;
    }
})


// GameStartボタン押下時
start_b.addEventListener("mousedown", function (e) {
    socket.emit("game_start");
})

// プレイヤー参加時
socket.on("join_player", function (html) {
    players.innerHTML = html;
});

// ゲームマスター委任時
socket.on("setGM", function () {
    start_b.style.display = "block";
});

// ゲームスタート処理
socket.on("game_start", function (players) {
    if (isJoinGame == true) {
        menu.innerHTML = "";
        for (let i in players) {
            if (players[i].id == myToken) {
                pNo = players[i].no
            }
        }
        cameraX = players[pNo].x;
        cameraY = players[pNo].y;
        playerX = players[pNo].x;
        playerY = players[pNo].y;
    }
    if (isJoinGame == false && players.length > 1) {
        menu.innerHTML = "";
        menu.innerHTML += '<h1 id="title">MarbleWars</h1><h2 class="players">観戦中</h2><h2 class="player">ゲーム中です</h2> <h2 class="player">しばらく待ってからリログしてください</h2> ';
    }
});

// 観戦モード処理
socket.on("observer", function (mes) {
    isJoinGame = false;
    menu.innerHTML = "";
    menu.innerHTML += '<h1 id="title">MarbleWars</h1><h2 class="players">観戦中</h2><h2 class="player">'+ mes +'</h2> <h2 class="player">しばらく待ってからリログしてください</h2> ';
});

// アップデート処理
socket.on("update", function (world) {
    drawWorld(world);
    drawInfo(world);
});

// カメラ移動処理
window.addEventListener("mousedown", function () { isMouseDown = true; });
window.addEventListener("mouseup", function () { isMouseDown = false; });
window.addEventListener("mousemove", function (e) {
    if (isMouseDown == true) {
        cameraX -= e.clientX - mouseX;
        cameraY -= e.clientY - mouseY;
        if (cameraX < - worldradius) { cameraX = - worldradius }
        if (cameraX > worldradius) { cameraX = worldradius }
        if (cameraY < - worldradius) { cameraY = - worldradius }
        if (cameraY > worldradius) { cameraY = worldradius }
    }
    mouseX = e.clientX;
    mouseY = e.clientY;
});
window.addEventListener("contextmenu", function (e) {
    if (isJoinGame == true) {
        AimX = cameraX - canvas.width / 2.0 + e.clientX;
        AimY = cameraY - canvas.height / 2.0 + e.clientY;
        socket.emit("aim", { n: pNo, x: AimX, y: AimY });
    }
});
document.oncontextmenu = function () { return false; }



// キャンパスのリサイズ
function resizeCanvas() {
    canvas.width = screen.clientWidth;
    canvas.height = screen.clientHeight;
}

// 描画
function drawWorld(world) {

    // 設定
    context.imageSmoothingEnabled = false;
    context.lineWidth = 5;
    context.font = "bold 24px 'YuGothic Medium'";
    context.textAlign = "center";
    context.textBaseline = "middle";

    // 背景
    context.fillStyle = "rgb(191, 191, 191)";
    context.fillRect(0, 0, canvas.width, canvas.height);

    // ステージ
    context.fillStyle = "rgb(223, 223, 223)";
    context.strokeStyle = "rgb(127, 127, 127)";
    context.beginPath();
    context.arc(canvas.width / 2.0 - cameraX, canvas.height / 2.0 - cameraY, world.radius, 0, Math.PI * 2, true);
    context.fill();
    context.stroke();

    // 拠点
    for (var i in world.bases) {
        if (world.bases[i].id != -1) {
            context.fillStyle = color[world.bases[i].id].c3;
            context.strokeStyle = color[world.bases[i].id].c1;
        } else {
            context.fillStyle = "rgb(191, 191, 191)";
            context.strokeStyle = "rgb(127, 127, 127)";
        }
        context.beginPath();
        context.arc(world.bases[i].x + canvas.width / 2.0 - cameraX, world.bases[i].y + canvas.height / 2.0 - cameraY, 40.0, 0, Math.PI * 2, true);
        context.fill();
        context.stroke();
        //context.fillStyle = "rgb(63, 63, 63)";
        //context.fillText(world.bases[i].ra, world.bases[i].x + canvas.width / 2.0 - cameraX, world.bases[i].y + canvas.height / 2.0 - cameraY, 1000)
    }

    // 兵士
    for (var i in world.soldiers) {
        context.fillStyle = color[world.soldiers[i].id].c4;
        context.strokeStyle = color[world.soldiers[i].id].c2;
        context.beginPath();
        context.arc(world.soldiers[i].x + canvas.width / 2.0 - cameraX, world.soldiers[i].y + canvas.height / 2.0 - cameraY, 20.0, 0, Math.PI * 2, true);
        context.fill();
        context.stroke();
    }

    // 自拠点テキスト
    for (var i in world.players) {
        if (world.players[i].isAlive == true) {
            context.fillStyle = color[i].c1;
            context.fillText(world.players[i].name, world.players[i].x + canvas.width / 2.0 - cameraX, world.players[i].y + canvas.height / 2.0 - cameraY, 1000)
        }
    }

    //エイム
    if (isJoinGame == true) {
        context.strokeStyle = "rgb(63, 63, 63)";
        context.beginPath();
        context.arc(AimX + canvas.width / 2.0 - cameraX, AimY + canvas.height / 2.0 - cameraY, 20.0, 0, Math.PI * 2, true);
        context.moveTo(AimX + canvas.width / 2.0 - cameraX - 40.0, AimY + canvas.height / 2.0 - cameraY);
        context.lineTo(AimX + canvas.width / 2.0 - cameraX + 40.0, AimY + canvas.height / 2.0 - cameraY);
        context.moveTo(AimX + canvas.width / 2.0 - cameraX, AimY + canvas.height / 2.0 - cameraY - 40.0);
        context.lineTo(AimX + canvas.width / 2.0 - cameraX, AimY + canvas.height / 2.0 - cameraY + 40.0);
        context.stroke();
    }
}

function drawInfo(world) {
    //情報
    context.textAlign = "left";
    context.textBaseline = "top";
    context.fillStyle = "rgba(255, 255, 255, 0.5)";
    context.fillRect(20, 20, 200, 320);
    context.fillStyle = "rgb(63, 63, 63)";
    context.fillText("残り " + world.survivor + " 人", 40, 40, 1000);
    let y = 80;
    for (var i in world.players) {
        if (world.players[i].isAlive == true) {
            context.fillText(world.players[i].name, 40, y + i * 40, 1000);
        }
    }
}
// cd \C_TUT\Web\GitHubPages\MarbleWars
// npm run dev
// ngrok http 8000

console.log("nodejs");

var http = require("http");
var fs = require("fs");
var url = require("url");
var io = require('socket.io')(http);
var html = fs.readFileSync("game.html");
var css = fs.readFileSync("style.css");
var js = fs.readFileSync("game.js");
var PORT = 8000;

var server = http.createServer((req, res) => {

    const url_parts = url.parse(req.url);
    console.log(url_parts.pathname);

    switch (url_parts.pathname) {
        case '/':
        case '/game.html':
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.write(html);
            res.end();
            break;
        case '/style.css':
            res.writeHead(200, { 'Content-Type': 'text/css' });
            res.write(css);
            res.end();
            break;
        case '/game.js':
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.write(js);
            res.end();
            break;
        default:
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('お探しのページは見つかりません。');
            break;
    }
});

server.listen(PORT, () => {
    console.log("server runnning!");
});

var io = require('socket.io')(server, {
    cors: {
        origin: "http://localhost:8000",
        methods: ["GET", "POST"],
        transports: ['websocket', 'polling'],
        credentials: true
    },
    allowEIO3: true
});




// ゲームクラス部 --------------------------------

class Player {
    constructor(id, name, x, y, no) {
        this.id = id;
        this.name = name;
        this.x = x;
        this.y = y;
        this.no = no;
        this.aimX = 0;
        this.aimY = 0;
        this.isAlive = true;
    }
}

class World {
    constructor() {
        this.players = [];
        this.survivor = 0;
        this.radius = 1200;
        this.bases = [];
        this.soldiers = [];
        this.chunks = [];
        this.chunkDiv = 16;
        let t = Math.random() * 2.0 * Math.PI;
        for (let i = 0; i < 30; i++) {
            let r = Math.sqrt(Math.random()) * (this.radius - 200.0);
            let newBase = new Base(-1, -1, r * Math.cos(t), r * Math.sin(t));
            this.bases.push(newBase);
            t += 2.0 * Math.PI/30.0;

        }
        for (let i = 0; i < this.chunkDiv; i++) {
            let chunkXs = [];
            for (let j = 0; j < this.chunkDiv; j++) {
                let newChunk = new Chunk(i, j);
                chunkXs.push(newChunk);
            }
            this.chunks.push(chunkXs);
        }

        console.log("Create World");
    }

    allBaseSetChunks() {
        for (let i in this.bases) {
            this.bases[i].setChunk();
        }
    }

    allBaseRun(fps) {
        for (let i in this.bases) {
            this.bases[i].run(fps);
        }
    }

    allSoldiersSetChunks() {
        for (let i in this.soldiers) {
            this.soldiers[i].setChunk();
        }
    }

    allSoldiersRun(fps) {
        for (let i in this.soldiers) {
            this.soldiers[i].run(fps);
            if (this.soldiers[i].a == false) {
                this.soldiers.splice(i, 1)
                i--;
            }
        }
    }

    allChunksResetSoldiers() {
        for (let i in this.chunks) {
            for (let j in this.chunks[i]) {
                this.chunks[i][j].resetSoldiers();
            }
        }
    }

    allChunksIsCollision() {
        for (let i in this.chunks) {
            for (let j in this.chunks[i]) {
                this.chunks[i][j].isCollision();
            }
        }
    }
}

class Base {
    constructor(id, c, x, y) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.p = 0;
        this.ra = [];
        this.core = c;
    }

    setChunk() {
        let x = Math.floor((this.x + world.radius) / (world.radius / (world.chunkDiv / 2)));
        let y = Math.floor((this.y + world.radius) / (world.radius / (world.chunkDiv / 2)));
        world.chunks[x][y].bases.push(this);
    }

    attacked(id) {
        this.ra.push(id);
        if (this.ra.length > 20) { this.ra = this.ra.slice(this.ra.length - 20); }
        let ac = [0, 0, 0, 0, 0, 0];
        for (let i in this.ra) {
            ac[this.ra[i]]++;
            if (ac[this.ra[i]] >= 10 && this.id != this.ra[i]) {
                this.dominated(this.ra[i]);
                break;
            }
        }
    }

    dominated(id) {
        this.id = id
        if (this.core != -1 && world.players[Number(this.core)].isAlive == true) {
            io.to(world.players[Number(this.core)].id).emit("observer", "負け… あなたは" + world.survivor + "位です");
            world.players[Number(this.core)].isAlive = false;
            setSurvivor();
        }
    }

    run() {
        if (this.id != -1) {
            this.p += 1 / fps;
        }
        if (this.p > 2.0) {
            let d = Math.sqrt(Math.pow(world.players[this.id].aimX - this.x, 2) + Math.pow(world.players[this.id].aimY - this.y, 2));
            let vx = 250 * (world.players[this.id].aimX - this.x) / d;
            let vy = 250 * (world.players[this.id].aimY - this.y) / d;
            world.soldiers.push(new Soldier(this.id, this.x, this.y, vx, vy));
            this.p = 0;
        }
    }

}

class Soldier {
    constructor(id, x, y, vx, vy) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.t = 0;
        this.a = true;
        this.isA = -1;
    }

    setChunk() {
        let x = Math.floor((this.x + world.radius) / (world.radius / (world.chunkDiv / 2)));
        let y = Math.floor((this.y + world.radius) / (world.radius / (world.chunkDiv / 2)));
        if (0 <= x && x < world.chunkDiv && 0 <= y && y < world.chunkDiv) {
            world.chunks[x][y].soldiers.push(this);
        } else {
            this.x = 0;
            this.y = 0;
        }
    }

    run() {
        this.t += 1 / fps;
        this.x += this.vx / fps;
        this.y += this.vy / fps;

        if (this.x * this.x + this.y * this.y > (world.radius - 20.0) * (world.radius - 20.0) && -this.x * this.vx + -this.y * this.vy < 0) {
            let a = -this.vx * -this.x / (world.radius - 20.0) + -this.vy * -this.y / (world.radius - 20.0);
            this.vx = this.vx + 2 * a * -this.x / world.radius;
            this.vy = this.vy + 2 * a * -this.y / world.radius;
            this.isA = -1;
        }

        if (this.t > 10) {
            this.a = false;
        }
    }
}

class Chunk {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.bases = [];
        this.soldiers = [];
    }

    resetSoldiers() {
        this.soldiers = [];
    }

    isCollision() {
        for (let i in this.soldiers) {
            this.isCollisionUnit(this.soldiers[i], this)
            if (this.x > 0) { this.isCollisionUnit(this.soldiers[i], world.chunks[this.x - 1][this.y]) }
            if (this.x < world.chunkDiv - 1) { this.isCollisionUnit(this.soldiers[i], world.chunks[this.x + 1][this.y]) }
            if (this.y > 0) { this.isCollisionUnit(this.soldiers[i], world.chunks[this.x][this.y - 1]) }
            if (this.y < world.chunkDiv - 1) { this.isCollisionUnit(this.soldiers[i], world.chunks[this.x][this.y + 1]) }
            if (this.x > 0 && this.y > 0) { this.isCollisionUnit(this.soldiers[i], world.chunks[this.x - 1][this.y - 1]) }
            if (this.x > 0 && this.y < world.chunkDiv - 1) { this.isCollisionUnit(this.soldiers[i], world.chunks[this.x - 1][this.y + 1]) }
            if (this.x < world.chunkDiv - 1 && this.y > 0) { this.isCollisionUnit(this.soldiers[i], world.chunks[this.x + 1][this.y - 1]) }
            if (this.x < world.chunkDiv - 1 && this.y < world.chunkDiv - 1) { this.isCollisionUnit(this.soldiers[i], world.chunks[this.x + 1][this.y + 1]) }
        }
    }

    isCollisionUnit(soldier, chunk) {
    for (let j in chunk.soldiers) {
        if (Math.pow(chunk.soldiers[j].x - soldier.x, 2) + Math.pow(chunk.soldiers[j].y - soldier.y, 2) < 40 * 40) {
            if (soldier.id == chunk.soldiers[j].id) {
                /*
                let d = Math.sqrt(Math.pow(chunk.soldiers[j].x - soldier.x, 2) + Math.pow(chunk.soldiers[j].y - soldier.y, 2));
                if ((soldier.x - chunk.soldiers[j].x) * soldier.vx + (soldier.y - chunk.soldiers[j].y) * soldier.vy < 0) {
                    let ai = -soldier.vx * (soldier.x - chunk.soldiers[j].x) / d + -soldier.vy * (soldier.y - chunk.soldiers[j].y) / d;
                    soldier.vx = soldier.vx + 2 * ai * (soldier.x - chunk.soldiers[j].x) / d;
                    soldier.vy = soldier.vy + 2 * ai * (soldier.y - chunk.soldiers[j].y) / d;
                }
                if ((chunk.soldiers[j].x - soldier.x) * chunk.soldiers[j].vx + (chunk.soldiers[j].y - soldier.y) * chunk.soldiers[j].vy < 0) {
                    let aj = -chunk.soldiers[j].vx * (chunk.soldiers[j].x - soldier.x) / d + -chunk.soldiers[j].vy * (chunk.soldiers[j].y - soldier.y) / d;
                    chunk.soldiers[j].vx = chunk.soldiers[j].vx + 2 * aj * (chunk.soldiers[j].x - soldier.x) / d;
                    chunk.soldiers[j].vy = chunk.soldiers[j].vy + 2 * aj * (chunk.soldiers[j].y - soldier.y) / d;
                }
                */
            } else {
                soldier.a = false;
                chunk.soldiers[j].a = false;
            }
        }
    }
    for (let j in chunk.bases) {
        if (Math.pow(chunk.bases[j].x - soldier.x, 2) + Math.pow(chunk.bases[j].y - soldier.y, 2) < 60 * 60) {
            if (soldier.id == chunk.bases[j].id) {
                if ((soldier.x - chunk.bases[j].x) * soldier.vx + (soldier.y - chunk.bases[j].y) * soldier.vy < 0) {
                    let d = Math.sqrt(Math.pow(chunk.bases[j].x - soldier.x, 2) + Math.pow(chunk.bases[j].y - soldier.y, 2));
                    let a = -soldier.vx * (soldier.x - chunk.bases[j].x) / d + -soldier.vy * (soldier.y - chunk.bases[j].y) / d;
                    soldier.vx = soldier.vx + 2 * a * (soldier.x - chunk.bases[j].x) / d;
                    soldier.vy = soldier.vy + 2 * a * (soldier.y - chunk.bases[j].y) / d;
                }
            } else {
                soldier.a = false;
            }
            if (soldier.isA != chunk.bases[j].id) {
                chunk.bases[j].attacked(soldier.id);
                soldier.isA = chunk.bases[j].id;
            }
        }
    }
}
}

// ワールド操作部

let world = new World();
world.allBaseSetChunks();
let isGameStart = false;
let gameMaster = "";
let fps = 60.0;

// 繋がっている最中
io.on("connection", function (socket) {

    // 再起動が必要なら再起動
    if (world.survivor <= 0) {
        isGameStart = false;
        world = new World();
        world.allBaseSetChunks();
    }

    // トークン送信
    io.to(socket.id).emit("token", socket.id);
    if (isGameStart == false) {
        sendPlayerName();
    } else {
        io.to(socket.id).emit("observer", "ゲーム中です");
    }

    // プレイヤー参加処理
    socket.on("join", function (data) {
        if (world.players.length < 6) {
            let newPlayer = new Player(data.id, data.n, 100, 100, world.players.length);
            world.players.push(newPlayer);
            setSurvivor();
            sendPlayerName();
        } else {
            io.to(socket.id).emit("observer", "プレイヤーがいっぱいです");
        }
    });

    // プレイヤー退出時処理
    socket.on("disconnect", () => {
        if (isGameStart == false) {
            for (var i in world.players) {
                if (world.players[i].id == socket.id) {
                    world.players.splice(i, 1);
                    setSurvivor();
                    break;
                }
            }
            for (let i = 0; i < world.players.length; i++) {
                world.players[i].no = i;
            }
            sendPlayerName();
        } else {
            for (var i in world.players) {
                if (world.players[i].id == socket.id) {
                    world.players[i].isAlive = false;
                    setSurvivor();
                }
            }
        }
    });

    // ゲームスタート
    socket.on("game_start", function (){
        isGameStart = true;
        setSurvivor();
        let t = Math.random() * 2.0 * Math.PI;
        for (let i in world.players) {
            let newBase = new Base(i, i, (world.radius - 100.0) * Math.cos(t), (world.radius - 100.0) * Math.sin(t));
            world.bases.push(newBase);
            world.players[i].x = newBase.x;
            world.players[i].y = newBase.y;
            t += 2.0 * Math.PI / world.players.length;
        }
        world.allBaseSetChunks();
        io.emit("game_start", world.players);
    });

    // エイム処理
    socket.on("aim", function (aim) {
        world.players[aim.n].aimX = aim.x;
        world.players[aim.n].aimY = aim.y;
    })

});

// 周期的処理
setInterval(() => {

    if (isGameStart == true) {

        world.allBaseRun();
        world.allSoldiersRun();

        world.allChunksResetSoldiers();
        world.allSoldiersSetChunks();
        world.allChunksIsCollision();

        io.emit("update", world);
    }

}, 1000 / fps);

function sendPlayerName(){
    let players_html = '<h2 class="players">- Players -</h2>'
    for (let i in world.players) {
        players_html += '<h2 class="player">' + world.players[i].name
        if (i == 0) {
            players_html += ' (GM)'
        }
        players_html += '</h2>'
    }
    io.emit("join_player", players_html);

    if (world.players.length > 0) {
        if (gameMaster != world.players[0].id) {
            io.to(world.players[0].id).emit("setGM");
            gameMaster = world.players[0].id;
        }
    }
}

function setSurvivor() {
    let n = 0;
    let id = 0;
    for (let i in world.players) {
        if (world.players[i].isAlive == true) {
            n++;
            id = i;
        }
    }
    if (n == 1 && isGameStart == true) {
        io.to(world.players[id].id).emit("observer", "優勝！ おめでとう！！！");
        world.players[id].isAlive = false;
        n = 0;
    }
    world.survivor = n;
}
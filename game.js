class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 800;
        this.canvas.height = 600;
        
        this.score = 0;
        this.timeLeft = 60;
        this.life = 3;
        this.hasFood = false;

        // Web Audio APIの初期化
        this.initAudio();
        
        // 音声ファイルの読み込み
        this.loadAudioFiles();
        
        // 音声の再生状態
        this.bgmPlaying = false;
        this.soundEnabled = false;

        // プレイヤー（親鳥）の初期設定
        this.player = {
            x: this.canvas.width / 2,
            y: this.canvas.height / 2,
            width: 30,
            height: 30,
            speed: 5,
            dx: 0,
            dy: 0,
            facingRight: false
        };

        // 巣の位置
        this.nest = {
            x: this.canvas.width - 200,
            y: this.canvas.height / 2,
            width: 60,
            height: 40
        };

        // 木の設定
        this.tree = {
            x: this.canvas.width - 100,
            y: 0,
            width: 60,
            height: this.canvas.height,
            branchStartY: this.canvas.height / 2 - 50
        };

        // 餌（虫）の配列
        this.foods = [];
        this.foodSpawnTimer = 0;
        this.foodSpawnInterval = 60;

        // 敵の配列
        this.enemies = [];
        this.enemySpawnTimer = 0;
        this.enemySpawnInterval = 120;

        // キーの状態
        this.keys = {
            ArrowLeft: false,
            ArrowRight: false,
            ArrowUp: false,
            ArrowDown: false,
            Space: false
        };

        // イベントリスナーの設定
        // 画像のロード
        this.playerImage = new Image();
        this.playerImage.src = 'images/pigeon.png';
        
        this.chickImage = new Image();
        this.chickImage.src = 'images/chick.png';

        this.butterflyImage = new Image();
        this.butterflyImage.src = 'images/butterfly.png';

        this.crowImage = new Image();
        this.crowImage.src = 'images/crow.png';

        this.setupEventListeners();

        // 音声の初期化を試みる（ユーザーインタラクション前でも）
        this.initSound();
        this.initBGM();
        
        // ゲームループの開始
        this.gameLoop();

        // タイマーの開始
        this.startTimer();
    }

    setupEventListeners() {
        // キーダウンイベント
        window.addEventListener('keydown', (e) => {
            if (this.keys.hasOwnProperty(e.code)) {
                this.keys[e.code] = true;
                
                // ユーザーインタラクション後にBGMを再生
                this.playBGM();
                
                // 効果音の初期化も試みる
                if (!this.soundEnabled) {
                    this.initSound();
                }
            }
        });

        // キーアップイベント
        window.addEventListener('keyup', (e) => {
            if (this.keys.hasOwnProperty(e.code)) {
                this.keys[e.code] = false;
            }
        });
        
        // クリックイベント
        this.canvas.addEventListener('click', () => {
            // BGMを再生
            this.playBGM();
            
            // 効果音の初期化も試みる
            if (!this.soundEnabled) {
                this.initSound();
            }
        });
        
        // BGM再生ボタンのイベントリスナー
        const bgmButton = document.getElementById('bgmButton');
        if (bgmButton) {
            bgmButton.addEventListener('click', () => {
                // BGMを再生
                this.playBGM();
                
                // 効果音の初期化も試みる
                if (!this.soundEnabled) {
                    this.initSound();
                }
            });
        }
    }
    
    // Web Audio APIの初期化
    initAudio() {
        try {
            // AudioContextの作成
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
            
            // 音声バッファの初期化
            this.buffers = {};
            
            // BGM用のノード
            this.bgmSource = null;
            this.bgmGainNode = null;
            
            console.log('Web Audio APIが初期化されました');
        } catch (error) {
            console.error('Web Audio APIの初期化に失敗しました:', error);
        }
    }
    
    // 音声ファイルの読み込み
    loadAudioFiles() {
        // 読み込む音声ファイルのリスト
        const audioFiles = {
            bgm: 'musics/bgm_001.ogg',
            getFoodSound: 'se/get.ogg'
        };
        
        // 各ファイルを読み込む
        Object.keys(audioFiles).forEach(key => {
            const url = audioFiles[key];
            
            // Fetch APIを使ってファイルを取得
            fetch(url)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`音声ファイルの取得に失敗しました: ${url}`);
                    }
                    return response.arrayBuffer();
                })
                .then(arrayBuffer => {
                    // ArrayBufferをデコード
                    return this.audioContext.decodeAudioData(arrayBuffer);
                })
                .then(audioBuffer => {
                    // バッファに保存
                    this.buffers[key] = audioBuffer;
                    console.log(`音声ファイルが読み込まれました: ${key}`);
                    
                    // BGMが読み込まれたら、ユーザーインタラクション後に再生できるようにする
                    if (key === 'bgm') {
                        const bgmButton = document.getElementById('bgmButton');
                        if (bgmButton) {
                            bgmButton.disabled = false;
                        }
                    }
                })
                .catch(error => {
                    console.error(`音声ファイルの読み込みに失敗しました: ${key}`, error);
                });
        });
    }
    
    // BGM再生用のヘルパーメソッド
    playBGM() {
        if (!this.bgmPlaying && this.buffers.bgm) {
            console.log('BGM再生を試みます');
            
            try {
                // AudioContextが停止していたら再開
                if (this.audioContext.state === 'suspended') {
                    this.audioContext.resume();
                }
                
                // 既存のBGMを停止
                if (this.bgmSource) {
                    this.bgmSource.stop();
                }
                
                // BGM用のノードを作成
                this.bgmSource = this.audioContext.createBufferSource();
                this.bgmSource.buffer = this.buffers.bgm;
                this.bgmSource.loop = true;
                
                // ゲインノードを作成（音量調整用）
                this.bgmGainNode = this.audioContext.createGain();
                this.bgmGainNode.gain.value = 0.5; // 音量を設定
                
                // ノードを接続
                this.bgmSource.connect(this.bgmGainNode);
                this.bgmGainNode.connect(this.audioContext.destination);
                
                // BGMを再生
                this.bgmSource.start(0);
                this.bgmPlaying = true;
                
                // BGMが再生されたらボタンのテキストを変更
                const bgmButton = document.getElementById('bgmButton');
                if (bgmButton) {
                    bgmButton.textContent = 'BGM再生中';
                }
                
                // 効果音の再生を許可
                this.soundEnabled = true;
                
                console.log('BGMの再生が成功しました');
            } catch (error) {
                console.error('BGM再生中に例外が発生しました:', error);
            }
        }
    }
    
    // 効果音再生用のヘルパーメソッド
    playSound(soundName) {
        if (this.soundEnabled && this.buffers[soundName]) {
            try {
                // AudioContextが停止していたら再開
                if (this.audioContext.state === 'suspended') {
                    this.audioContext.resume();
                }
                
                // 効果音用のノードを作成
                const source = this.audioContext.createBufferSource();
                source.buffer = this.buffers[soundName];
                
                // ゲインノードを作成（音量調整用）
                const gainNode = this.audioContext.createGain();
                gainNode.gain.value = 0.7; // 音量を設定
                
                // ノードを接続
                source.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                // 効果音を再生
                source.start(0);
                
                console.log(`効果音の再生が成功しました: ${soundName}`);
            } catch (error) {
                console.error(`効果音再生中に例外が発生しました: ${soundName}`, error);
            }
        } else {
            console.log(`効果音の再生ができません: ${soundName}`);
        }
    }
    
    // AudioContextの初期化（ユーザーインタラクション後）
    initSound() {
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume().then(() => {
                console.log('AudioContextが再開されました');
                this.soundEnabled = true;
            }).catch(error => {
                console.error('AudioContextの再開に失敗しました:', error);
            });
        } else {
            this.soundEnabled = true;
        }
    }
    
    // BGMの初期化（ユーザーインタラクション後）
    initBGM() {
        // AudioContextの状態を確認
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume().then(() => {
                console.log('AudioContextが再開されました');
                // BGMの再生を試みる
                if (!this.bgmPlaying && this.buffers.bgm) {
                    this.playBGM();
                }
            }).catch(error => {
                console.error('AudioContextの再開に失敗しました:', error);
            });
        }
    }

    startTimer() {
        const timer = setInterval(() => {
            this.timeLeft--;
            document.getElementById('time').textContent = `残り時間: ${this.timeLeft}`;
            
            if (this.timeLeft <= 0) {
                clearInterval(timer);
                this.gameOver();
            }
        }, 1000);
    }

    spawnFood() {
        if (this.foodSpawnTimer <= 0 && this.foods.length < 5) {
            this.foods.push({
                x: Math.random() * (this.canvas.width - 20),
                y: Math.random() * (this.canvas.height / 2),
                width: 25,
                height: 25,
                dx: (Math.random() - 0.5) * 4,
                dy: (Math.random() - 0.5) * 4
            });
            this.foodSpawnTimer = this.foodSpawnInterval;
        }
        this.foodSpawnTimer--;
    }

    spawnEnemy() {
        if (this.enemySpawnTimer <= 0 && this.enemies.length < 3) {
            const side = Math.random() > 0.5 ? 'left' : 'right';
            this.enemies.push({
                x: side === 'left' ? -30 : this.canvas.width + 30,
                y: Math.random() * (this.canvas.height / 2),
                width: 45,
                height: 45,
                dx: side === 'left' ? 3 : -3,
                dy: 0
            });
            this.enemySpawnTimer = this.enemySpawnInterval;
        }
        this.enemySpawnTimer--;
    }

    updatePlayer() {
        // 初期速度の設定（ゲーム開始時に右に飛ぶ）
        if (this.player.dx === 0 && this.player.dy === 0) {
            this.player.dx = this.player.speed;
            this.player.facingRight = true;
        }

        // 方向キーによる速度の更新
        const prevDx = this.player.dx;
        const prevDy = this.player.dy;

        if (this.keys.ArrowLeft || this.keys.ArrowRight) {
            this.player.dx = this.keys.ArrowLeft ? -this.player.speed : this.player.speed;
            this.player.facingRight = this.player.dx > 0;
        }
        if (this.keys.ArrowUp || this.keys.ArrowDown) {
            this.player.dy = this.keys.ArrowUp ? -this.player.speed : this.player.speed;
        }

        // キーが押されていない場合は前回の速度を維持
        if (!this.keys.ArrowLeft && !this.keys.ArrowRight) {
            this.player.dx = prevDx;
        }
        if (!this.keys.ArrowUp && !this.keys.ArrowDown) {
            this.player.dy = prevDy;
        }

        // 速度に基づく位置の更新
        this.player.x += this.player.dx;
        this.player.y += this.player.dy;

        // 画面端の制限と跳ね返り
        if (this.player.x <= 0 || this.player.x >= this.canvas.width - this.player.width) {
            this.player.dx *= -1;
            this.player.facingRight = !this.player.facingRight;
        }
        if (this.player.y <= 0 || this.player.y >= this.canvas.height - this.player.height) {
            this.player.dy *= -1;
        }

        this.player.x = Math.max(0, Math.min(this.canvas.width - this.player.width, this.player.x));
        this.player.y = Math.max(0, Math.min(this.canvas.height - this.player.height, this.player.y));
    }

    updateFoods() {
        for (let i = this.foods.length - 1; i >= 0; i--) {
            const food = this.foods[i];
            food.x += food.dx;
            food.y += food.dy;

            // 画面端での跳ね返り
            if (food.x <= 0 || food.x >= this.canvas.width - food.width) food.dx *= -1;
            if (food.y <= 0 || food.y >= this.canvas.height - food.height) food.dy *= -1;

            // プレイヤーとの衝突判定
            if (!this.hasFood && this.checkCollision(this.player, food)) {
                this.foods.splice(i, 1);
                this.hasFood = true;
                
                // 餌を捕まえた時に効果音を再生
                if (this.soundEnabled && this.buffers.getFoodSound) {
                    // 効果音を再生
                    this.playSound('getFoodSound');
                    console.log('餌を捕まえた時に効果音を再生しました');
                }
            }
        }
    }

    updateEnemies() {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.x += enemy.dx;
            enemy.y += enemy.dy;

            // 画面外に出た敵の削除
            if (enemy.x < -50 || enemy.x > this.canvas.width + 50) {
                this.enemies.splice(i, 1);
                continue;
            }

            // プレイヤーとの衝突判定
            if (this.checkCollision(this.player, enemy)) {
                this.life--;
                document.getElementById('life').textContent = `ライフ: ${'❤️'.repeat(this.life)}`;
                this.enemies.splice(i, 1);

                if (this.life <= 0) {
                    this.gameOver();
                }
            }
        }
    }

    checkCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }

    checkNestDelivery() {
        if (this.hasFood && this.checkCollision(this.player, this.nest)) {
            this.score += 100;
            document.getElementById('score').textContent = `スコア: ${this.score}`;
            this.hasFood = false;
        }
    }

    draw() {
        // 空色の背景
        this.ctx.fillStyle = '#87CEEB';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 木の葉の描画
        this.ctx.beginPath();
        this.ctx.arc(this.tree.x + this.tree.width / 2, this.tree.height / 4,
            120, 0, Math.PI * 2);
        this.ctx.fillStyle = '#2D5A27';
        this.ctx.fill();

        // 木の幹の描画
        this.ctx.fillStyle = '#6B4423';
        this.ctx.fillRect(this.tree.x, this.tree.y, this.tree.width, this.tree.height);

        // メイン枝の描画
        this.ctx.beginPath();
        this.ctx.moveTo(this.tree.x + this.tree.width / 2, this.tree.branchStartY);
        
        // ベジェ曲線で自然な枝を描画
        const cp1x = this.tree.x + this.tree.width / 2 + 50;
        const cp1y = this.tree.branchStartY;
        const cp2x = this.nest.x;
        const cp2y = this.nest.y + 10;
        const endX = this.nest.x + this.nest.width / 2;
        const endY = this.nest.y + 20;
        
        this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
        this.ctx.lineWidth = 12;
        this.ctx.strokeStyle = '#6B4423';
        this.ctx.stroke();

        // 小枝の描画
        this.drawSmallBranch(this.tree.x + this.tree.width / 2, this.tree.branchStartY + 30, -30, 40);
        this.drawSmallBranch(this.tree.x + this.tree.width / 2, this.tree.branchStartY - 30, 20, 30);

        // 巣の描画（円形の巣）
        this.ctx.beginPath();
        this.ctx.arc(this.nest.x + this.nest.width / 2, this.nest.y + this.nest.height / 2, 
                    this.nest.width / 2, 0, Math.PI * 2);
        this.ctx.fillStyle = '#8B4513';
        this.ctx.fill();
        
        // 巣の模様（質感）
        for (let i = 0; i < 8; i++) {
            this.ctx.beginPath();
            this.ctx.arc(this.nest.x + this.nest.width / 2, this.nest.y + this.nest.height / 2, 
                        (this.nest.width / 2) * (0.5 + i * 0.1), 0, Math.PI * 0.5);
            this.ctx.strokeStyle = '#6B4423';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }

        // 雛鳥の描画
        this.ctx.drawImage(this.chickImage, this.nest.x + 15, this.nest.y - 5, 30, 30);

        // 餌の描画
        this.foods.forEach(food => {
            this.ctx.save();
            if (food.dx > 0) {
                this.ctx.scale(-1, 1);
                this.ctx.drawImage(this.butterflyImage, -food.x - food.width, food.y, food.width, food.height);
            } else {
                this.ctx.drawImage(this.butterflyImage, food.x, food.y, food.width, food.height);
            }
            this.ctx.restore();
        });

        // 敵の描画
        this.enemies.forEach(enemy => {
            this.ctx.save();
            if (enemy.dx > 0) {
                this.ctx.scale(-1, 1);
                this.ctx.drawImage(this.crowImage, -enemy.x - enemy.width, enemy.y, enemy.width, enemy.height);
            } else {
                this.ctx.drawImage(this.crowImage, enemy.x, enemy.y, enemy.width, enemy.height);
            }
            this.ctx.restore();
        });

        // プレイヤーの描画
        this.ctx.save();
        if (this.player.facingRight) {
            this.ctx.scale(-1, 1);
            this.ctx.drawImage(this.playerImage, -this.player.x - this.player.width, this.player.y, this.player.width, this.player.height);
        } else {
            this.ctx.drawImage(this.playerImage, this.player.x, this.player.y, this.player.width, this.player.height);
        }
        this.ctx.restore();
    }

    gameOver() {
        // BGMを停止
        if (this.bgmSource) {
            try {
                this.bgmSource.stop();
                this.bgmPlaying = false;
                console.log('BGMを停止しました');
            } catch (error) {
                console.error('BGM停止中にエラーが発生しました:', error);
            }
        }
        
        alert(`ゲームオーバー！\nスコア: ${this.score}`);
        location.reload();
    }

    // 小枝を描画するヘルパーメソッド
    drawSmallBranch(startX, startY, angle, length) {
        this.ctx.beginPath();
        this.ctx.moveTo(startX, startY);
        const endX = startX + length * Math.cos(angle * Math.PI / 180);
        const endY = startY + length * Math.sin(angle * Math.PI / 180);
        this.ctx.lineTo(endX, endY);
        this.ctx.lineWidth = 6;
        this.ctx.strokeStyle = '#6B4423';
        this.ctx.stroke();
    }

    gameLoop() {
        this.updatePlayer();
        this.spawnFood();
        this.spawnEnemy();
        this.updateFoods();
        this.updateEnemies();
        this.checkNestDelivery();
        this.draw();

        requestAnimationFrame(() => this.gameLoop());
    }
}

// ゲームの開始
window.onload = () => {
    new Game();
};

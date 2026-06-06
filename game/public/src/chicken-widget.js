var DinoChicken = (function () {
  var SPRITE_SIZE = 64;
  var FRAME_RATE = 12;

  var util = {
    getRadians: function (direction) {
      return Math.PI * 2 / (8 / direction) - Math.PI / 2;
    },
    isOutOfBounds: function (size, left, top, maxX, maxY) {
      if (left <= 0) return [true, 0, top];
      if (top <= 0) return [true, left, 0];
      if (left + size >= maxX) return [true, maxX - size, top];
      if (top + size >= maxY) return [true, left, maxY - size];
      return [false, left, top];
    }
  };

  function getAnimArray(animationDefs, imgSize) {
    var animations = {};
    var directionsAlpha = ['e', 'n', 'ne', 'nw', 's', 'se', 'sw', 'w'];

    for (var prop in animationDefs) {
      var animInfo = animationDefs[prop];
      for (var i = 0; i < 8; i++) {
        var direction = directionsAlpha[i];
        var animArray = (animations[prop + '_' + direction] = []);
        for (var j = 0; j < animInfo.frames; j++) {
          var directionOffset = i * animInfo.frames * imgSize;
          var frameOffset = j * imgSize;
          animArray.push(animInfo.start * imgSize + directionOffset + frameOffset);
        }
      }
    }

    return animations;
  }

  function Chicken(el, x, y) {
    this.el = el;
    this.x = x;
    this.y = y;
    this.dir = 0;
    this.picking = false;
    this.lastTime = 0;
    this.lastFrameTime = 0;
    this.moveSpeed = 0.1;
    this.frameIndex = 0;
    this.animating = false;
    this.currentAnim = null;
    this.directions = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];
    this.restPoses = {
      e: { anim: 'running', frame: 2 },
      w: { anim: 'running', frame: 2 }
    };
    this.animations = getAnimArray({
      picking: { start: 0, frames: 9 },
      running: { start: 72, frames: 8 },
      hit: { start: 144, frames: 7 }
    }, SPRITE_SIZE);
    this.setPosition(x, y);
    this.setRestPose();
  }

  Chicken.prototype.setPosition = function (x, y) {
    this.x = x;
    this.y = y;
    this.el.style.left = x + 'px';
    this.el.style.top = y + 'px';
  };

  Chicken.prototype.setFrame = function (animKey, frameIndex) {
    var frames = this.animations[animKey];
    if (!frames) return;
    this.currentAnim = animKey;
    this.frameIndex = frameIndex % frames.length;
    this.el.style.backgroundPosition = (-frames[this.frameIndex]) + 'px 0';
  };

  Chicken.prototype.setRestPose = function () {
    var dirName = this.directions[this.dir];
    var pose = this.restPoses[dirName] || { anim: 'picking', frame: 0 };
    this.animating = false;
    this.setFrame(pose.anim + '_' + dirName, pose.frame);
  };

  Chicken.prototype.playAnim = function (action) {
    var animKey = action + '_' + this.directions[this.dir];
    if (this.currentAnim !== animKey) {
      this.frameIndex = 0;
    }
    this.animating = true;
    this.setFrame(animKey, this.frameIndex);
  };

  Chicken.prototype.advanceFrame = function (time) {
    if (!this.animating || !this.currentAnim) return;
    var frames = this.animations[this.currentAnim];
    if (!frames || frames.length <= 1) return;
    if (time - this.lastFrameTime >= 1000 / FRAME_RATE) {
      this.frameIndex = (this.frameIndex + 1) % frames.length;
      this.el.style.backgroundPosition = (-frames[this.frameIndex]) + 'px 0';
      this.lastFrameTime = time;
    }
  };

  Chicken.prototype.update = function (time, stageWidth, stageHeight, playerDir) {
    if (this.lastTime === 0) {
      this.lastTime = time;
      this.lastFrameTime = time;
      return;
    }

    if (this.picking) {
      this.playAnim('picking');
      this.advanceFrame(time);
    } else if (playerDir !== null) {
      this.dir = playerDir;
      var timeDiff = time - this.lastTime;
      var radians = util.getRadians(playerDir);
      var newX = this.x + Math.cos(radians) * timeDiff * this.moveSpeed;
      var newY = this.y + Math.sin(radians) * timeDiff * this.moveSpeed;
      var bounded = util.isOutOfBounds(SPRITE_SIZE, newX, newY, stageWidth, stageHeight);
      this.setPosition(bounded[1], bounded[2]);
      this.playAnim('running');
      this.advanceFrame(time);
    } else {
      this.setRestPose();
    }

    this.lastTime = time;
  };

  function getStyles(config) {
    var spriteUrl = config.spriteUrl;

    return `
      .dino-chicken-root {
        position: fixed;
        inset: 0;
        z-index: 2147483646;
        pointer-events: none;
      }
      .dino-chicken-root .dino-chicken-hint {
        position: fixed;
        top: 16px;
        left: 16px;
        padding: 12px 16px;
        background: rgba(0, 0, 0, .55);
        color: #fff;
        font: 14px/1.5 Helvetica Neue, sans-serif;
        border-radius: 6px;
        pointer-events: auto;
        z-index: 1;
      }
      .dino-chicken-root .dino-chicken-stage {
        position: absolute;
        inset: 0;
      }
      .dino-chicken-root .dino-chicken-sprite {
        position: absolute;
        width: ${SPRITE_SIZE}px;
        height: ${SPRITE_SIZE}px;
        background-image: url("${spriteUrl}");
        background-repeat: no-repeat;
        image-rendering: pixelated;
        image-rendering: crisp-edges;
      }
    `;
  }

  function createRoot(config) {
    var mode = config.mode || 'demo';
    var hint = config.hint ||
      'arrow keys move \u00b7 space peck' +
      (mode === 'inject' ? ' \u00b7 click bookmark again to remove' : '');

    var root = document.createElement('div');
    root.className = 'dino-chicken-root';

    var hintEl = document.createElement('div');
    hintEl.className = 'dino-chicken-hint';
    hintEl.textContent = hint;

    var stage = document.createElement('div');
    stage.className = 'dino-chicken-stage';

    var sprite = document.createElement('div');
    sprite.className = 'dino-chicken-sprite';

    stage.appendChild(sprite);
    root.appendChild(hintEl);
    root.appendChild(stage);

    return { root: root, stage: stage, sprite: sprite };
  }

  function mount(config) {
    var mode = config.mode || 'demo';
    var spriteUrl = config.spriteUrl;

    var style = document.createElement('style');
    style.textContent = getStyles({ spriteUrl: spriteUrl });

    var dom = createRoot(config);
    var gameEl = dom.stage;
    var chicken = new Chicken(
      dom.sprite,
      window.innerWidth / 2 - SPRITE_SIZE / 2,
      window.innerHeight / 2 - SPRITE_SIZE / 2
    );

    var keys = { up: false, down: false, left: false, right: false };
    var rafId = 0;

    function getDirFromKeys() {
      var up = keys.up && !keys.down;
      var down = keys.down && !keys.up;
      var left = keys.left && !keys.right;
      var right = keys.right && !keys.left;

      if (up) {
        if (left) return 7;
        if (right) return 1;
        return 0;
      }
      if (down) {
        if (left) return 5;
        if (right) return 3;
        return 4;
      }
      if (left) return 6;
      if (right) return 2;
      return null;
    }

    function onKeyDown(e) {
      switch (e.key) {
        case 'ArrowUp': keys.up = true; e.preventDefault(); break;
        case 'ArrowDown': keys.down = true; e.preventDefault(); break;
        case 'ArrowLeft': keys.left = true; e.preventDefault(); break;
        case 'ArrowRight': keys.right = true; e.preventDefault(); break;
        case ' ': chicken.picking = true; e.preventDefault(); break;
      }
    }

    function onKeyUp(e) {
      switch (e.key) {
        case 'ArrowUp': keys.up = false; e.preventDefault(); break;
        case 'ArrowDown': keys.down = false; e.preventDefault(); break;
        case 'ArrowLeft': keys.left = false; e.preventDefault(); break;
        case 'ArrowRight': keys.right = false; e.preventDefault(); break;
        case ' ': chicken.picking = false; e.preventDefault(); break;
      }
    }

    function onResize() {
      var bounded = util.isOutOfBounds(
        SPRITE_SIZE,
        chicken.x,
        chicken.y,
        gameEl.clientWidth,
        gameEl.clientHeight
      );
      chicken.setPosition(bounded[1], bounded[2]);
    }

    function gameLoop(time) {
      chicken.update(time, gameEl.clientWidth, gameEl.clientHeight, getDirFromKeys());
      rafId = requestAnimationFrame(gameLoop);
    }

    function destroy() {
      cancelAnimationFrame(rafId);
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('keyup', onKeyUp, true);
      window.removeEventListener('resize', onResize);
      if (style.parentNode) style.parentNode.removeChild(style);
      if (dom.root.parentNode) dom.root.parentNode.removeChild(dom.root);
      if (typeof window !== 'undefined' && window.__dinoChicken) {
        delete window.__dinoChicken;
      }
    }

    document.head.appendChild(style);
    document.documentElement.appendChild(dom.root);
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('keyup', onKeyUp, true);
    window.addEventListener('resize', onResize);
    rafId = requestAnimationFrame(gameLoop);

    return {
      chicken: chicken,
      root: dom.root,
      stage: gameEl,
      destroy: destroy
    };
  }

  return {
    mount: mount,
    getStyles: getStyles,
    createRoot: createRoot
  };
})();

if (typeof window !== 'undefined') {
  window.DinoChicken = DinoChicken;
}

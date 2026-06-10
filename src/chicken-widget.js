var DinoChicken = (function () {
  var SPRITE_SIZE = 64;
  var FRAME_RATE = 12;
  var DIR = {
    N: 0,
    NE: 1,
    E: 2,
    SE: 3,
    S: 4,
    SW: 5,
    W: 6,
    NW: 7
  };

  var PECK_DIR_OFFSETS = {
    0: { x: -3 / SPRITE_SIZE, y: 12 / SPRITE_SIZE },
    1: { x: -2 / SPRITE_SIZE, y: 11 / SPRITE_SIZE },
    2: { x: -3 / SPRITE_SIZE, y: 9 / SPRITE_SIZE },
    3: { x: 2 / SPRITE_SIZE, y: 4 / SPRITE_SIZE },
    4: { x: 3 / SPRITE_SIZE, y: 4 / SPRITE_SIZE },
    5: { x: 2 / SPRITE_SIZE, y: 8 / SPRITE_SIZE },
    6: { x: 2 / SPRITE_SIZE, y: 11 / SPRITE_SIZE },
    7: { x: 0, y: 15 / SPRITE_SIZE }
  };

  var util = {
    getRadians: function (direction) {
      return Math.PI * 2 / (8 / direction) - Math.PI / 2;
    },
    getDirFromDelta: function (dx, dy) {
      if (dx === 0 && dy === 0) return 0;
      var angle = Math.atan2(dy, dx) + Math.PI / 2;
      if (angle < 0) angle += Math.PI * 2;
      return Math.round(angle / (Math.PI / 4)) % 8;
    },
    isOutOfBounds: function (size, left, top, maxX, maxY) {
      var minCoord = -size / 2;
      var maxLeft = maxX - size / 2;
      var maxTop = maxY - size / 2;
      var boundedLeft = Math.max(minCoord, Math.min(maxLeft, left));
      var boundedTop = Math.max(minCoord, Math.min(maxTop, top));
      return [boundedLeft !== left || boundedTop !== top, boundedLeft, boundedTop];
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
    this.scale = 1;
    this.autonomousPeck = false;
    this.autoPeckLetter = null;
    this.picking = false;
    this.lastTime = 0;
    this.lastFrameTime = 0;
    this.moveSpeed = 0.07;
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

  Chicken.prototype.getDisplaySize = function () {
    return SPRITE_SIZE * this.scale;
  };

  Chicken.prototype.setScale = function (scale) {
    this.scale = scale;
    this.el.style.transform = scale === 1 ? '' : 'scale(' + scale + ')';
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

  Chicken.prototype.advanceFrame = function (time, loop) {
    if (!this.animating || !this.currentAnim) return false;
    var frames = this.animations[this.currentAnim];
    if (!frames || frames.length <= 1) return false;
    if (loop === undefined) loop = true;

    if (time - this.lastFrameTime >= 1000 / FRAME_RATE) {
      var atLastFrame = this.frameIndex >= frames.length - 1;

      if (!atLastFrame) {
        this.frameIndex += 1;
        this.el.style.backgroundPosition = (-frames[this.frameIndex]) + 'px 0';
      } else if (loop) {
        this.frameIndex = 0;
        this.el.style.backgroundPosition = (-frames[0]) + 'px 0';
      } else {
        this.animating = false;
        this.lastFrameTime = time;
        return true;
      }

      this.lastFrameTime = time;
    }

    return false;
  };

  Chicken.prototype.startPeck = function () {
    this.picking = true;
    this.frameIndex = 0;
    this.playAnim('picking');
  };

  Chicken.prototype.cancelPeck = function () {
    this.picking = false;
  };

  Chicken.prototype.update = function (time, stageWidth, stageHeight, playerDir) {
    if (this.lastTime === 0) {
      this.lastTime = time;
      this.lastFrameTime = time;
      return;
    }

    if (playerDir !== null) {
      if (this.picking) {
        this.cancelPeck();
      }
      this.dir = playerDir;
      var timeDiff = time - this.lastTime;
      var radians = util.getRadians(playerDir);
      var speed = this.moveSpeed * this.scale;
      var newX = this.x + Math.cos(radians) * timeDiff * speed;
      var newY = this.y + Math.sin(radians) * timeDiff * speed;
      var bounded = util.isOutOfBounds(this.getDisplaySize(), newX, newY, stageWidth, stageHeight);
      this.setPosition(bounded[1], bounded[2]);
      this.playAnim('running');
      this.advanceFrame(time, true);
    } else if (this.picking) {
      var peckFrame = this.frameIndex;
      this.playAnim('picking');
      var peckFinished = this.advanceFrame(time, false);

      if (peckFrame !== 4 && this.frameIndex === 4 && this.onPeckHit) {
        this.onPeckHit();
      }

      if (peckFinished) {
        this.picking = false;
        this.setRestPose();
      }
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
        bottom: 16px;
        left: 50%;
        transform: translate(-50%, 0);
        padding: 12px 16px;
        color: #fff;
        background: rgba(0, 0, 0, 0.25);
        font: 14px/1.5 Helvetica Neue, sans-serif;
        border-radius: 14px;
        pointer-events: auto;
        z-index: 1;
        text-shadow: 0 1px 2px rgba(0, 0, 0, .8);
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
        transform-origin: top left;
        z-index: 3;
      }
      .dino-chicken-root .dino-chicken-peck-dot {
        position: fixed;
        transform: translate(-50%, -50%);
        display: none;
        pointer-events: none;
        z-index: 2;
      }
      .dino-chicken-peck-dot:after {
        font-size: 20px;
        content: '⊹';
        color: red;
        line-height: 0;
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
      }
    `;
  }

  function createRoot(config) {
    var mode = config.mode || 'demo';
    var hint = config.hint ||
      'arrow keys move \u00b7 space peck \u00b7 1/2 size' +
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

    var peckDot = document.createElement('div');
    peckDot.className = 'dino-chicken-peck-dot';

    stage.appendChild(sprite);
    stage.appendChild(peckDot);
    root.appendChild(hintEl);
    root.appendChild(stage);

    return { root: root, stage: stage, sprite: sprite, peckDot: peckDot };
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
    var hiddenElements = [];
    var lastPlayerInputTime = null;
    var IDLE_BEFORE_AUTO_MS = 2000;

    var autonomous = {
      peckTarget: null,
      moveUntil: 0,
      pauseUntil: 0,
      moveDir: 0,
      pecksSinceWalk: 0,
      mustWalkUntil: 0,

      reset: function (time) {
        this.peckTarget = null;
        this.moveUntil = 0;
        this.pauseUntil = time + 400;
        this.pecksSinceWalk = 0;
        this.mustWalkUntil = 0;
      },

      isTargetValid: function (target) {
        if (!target) return false;
        if (target.node) {
          return target.node.parentNode && isPeckableTextNode(target.node);
        }
        if (target.el) {
          return target.el.parentNode && target.el.style.visibility !== 'hidden';
        }
        return false;
      },

      refreshTarget: function (time) {
        var center = getChickenCenter();
        var minDist = 0;
        if (time < this.mustWalkUntil) {
          minDist = center.peckReach * 1.3;
        }
        this.peckTarget = pickAutonomousTarget(minDist);
        this.moveUntil = time + 1600 + Math.random() * 800;
        if (time < this.mustWalkUntil) {
          this.moveUntil = this.mustWalkUntil;
        }
        if (this.peckTarget) {
          var dx = this.peckTarget.x - center.x;
          var dy = this.peckTarget.y - center.y;
          this.moveDir = util.getDirFromDelta(dx, dy);
        }
      },

      getMoveDir: function (time, chicken) {
        if (chicken.picking || time < this.pauseUntil) {
          return null;
        }

        if (!this.isTargetValid(this.peckTarget) || time >= this.moveUntil) {
          this.refreshTarget(time);
        }

        if (!this.peckTarget) {
          return null;
        }

        refreshLetterTargetCoords(this.peckTarget);

        if (time < this.mustWalkUntil) {
          chicken.dir = this.moveDir;
          return this.moveDir;
        }

        if (!this.peckTarget.node) {
          chicken.dir = this.moveDir;
          return this.moveDir;
        }

        var peckDir = findPeckDirForLetter(this.peckTarget);
        if (peckDir !== null) {
          chicken.dir = peckDir;
          chicken.autonomousPeck = true;
          chicken.autoPeckLetter = {
            node: this.peckTarget.node,
            offset: this.peckTarget.offset
          };
          chicken.startPeck();
          this.peckTarget = null;
          this.pauseUntil = time + 400 + Math.random() * 400;
          this.pecksSinceWalk += 1;
          if (this.pecksSinceWalk >= 2) {
            this.pecksSinceWalk = 0;
            this.mustWalkUntil = time + 1600 + Math.random() * 800;
            this.moveUntil = this.mustWalkUntil;
            this.refreshTarget(time);
          } else {
            this.moveUntil = 0;
          }
          return null;
        }

        chicken.dir = this.moveDir;
        return this.moveDir;
      }
    };

    function isPeckableTextNode(node) {
      var el = node.parentElement;
      while (el) {
        if (dom.root.contains(el)) return false;
        if (el.style && el.style.visibility === 'hidden') return false;
        el = el.parentElement;
      }
      return true;
    }

    function getCharClientPoint(node, offset) {
      try {
        var range = document.createRange();
        range.setStart(node, offset);
        range.setEnd(node, Math.min(offset + 1, node.length));
        var rect = range.getBoundingClientRect();
        if (!rect.width && !rect.height) return null;
        return {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
          node: node,
          offset: offset
        };
      } catch (err) {
        return null;
      }
    }

    function collectLetterTargets() {
      var candidates = [];
      var walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: function (node) {
            if (!node.textContent || !/\S/.test(node.textContent)) {
              return NodeFilter.FILTER_REJECT;
            }
            if (!isPeckableTextNode(node)) {
              return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );

      while (walker.nextNode()) {
        var node = walker.currentNode;
        var text = node.textContent;
        for (var i = 0; i < text.length; i++) {
          if (/\s/.test(text.charAt(i))) continue;
          var point = getCharClientPoint(node, i);
          if (point) candidates.push(point);
        }
      }

      return candidates;
    }

    function getChickenCenter() {
      var rect = dom.sprite.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        peckReach: rect.width * 0.55
      };
    }

    function addDistances(candidates, center) {
      var i;
      var point;
      var dx;
      var dy;

      for (i = 0; i < candidates.length; i++) {
        point = candidates[i];
        dx = point.x - center.x;
        dy = point.y - center.y;
        point.dist = Math.sqrt(dx * dx + dy * dy);
      }

      return candidates;
    }

    function pickFromClosestPool(candidates, poolSize) {
      candidates.sort(function (a, b) { return a.dist - b.dist; });
      var pool = candidates.slice(0, Math.min(poolSize, candidates.length));
      return pool[Math.floor(Math.random() * pool.length)];
    }

    function pickFromFarthestPool(candidates, poolSize) {
      candidates.sort(function (a, b) { return b.dist - a.dist; });
      var pool = candidates.slice(0, Math.min(poolSize, candidates.length));
      return pool[Math.floor(Math.random() * pool.length)];
    }

    function pickAutonomousTarget(minDist) {
      var center = getChickenCenter();
      var walkMin = minDist || center.peckReach * 1.25;
      var letterCandidates = addDistances(collectLetterTargets(), center);

      if (letterCandidates.length) {
        var walkCandidates = [];
        var i;
        for (i = 0; i < letterCandidates.length; i++) {
          if (letterCandidates[i].dist >= walkMin) {
            walkCandidates.push(letterCandidates[i]);
          }
        }
        if (walkCandidates.length) {
          return pickFromClosestPool(walkCandidates, 12);
        }
        return pickFromFarthestPool(letterCandidates, 8);
      }

      var emojiTargets = document.querySelectorAll('.peck-target');
      var emojiCandidates = [];
      var el;
      var emojiRect;

      for (i = 0; i < emojiTargets.length; i++) {
        el = emojiTargets[i];
        if (isIgnoredPeckElement(el)) continue;
        emojiRect = el.getBoundingClientRect();
        if (!emojiRect.width && !emojiRect.height) continue;
        emojiCandidates.push({
          x: emojiRect.left + emojiRect.width / 2,
          y: emojiRect.top + emojiRect.height / 2,
          el: el
        });
      }

      if (emojiCandidates.length) {
        addDistances(emojiCandidates, center);
        var emojiWalkCandidates = [];
        for (i = 0; i < emojiCandidates.length; i++) {
          if (emojiCandidates[i].dist >= walkMin) {
            emojiWalkCandidates.push(emojiCandidates[i]);
          }
        }
        if (emojiWalkCandidates.length) {
          return pickFromClosestPool(emojiWalkCandidates, 6);
        }
        return pickFromFarthestPool(emojiCandidates, 4);
      }

      return null;
    }

    function getCharRect(node, offset) {
      try {
        var range = document.createRange();
        range.setStart(node, offset);
        range.setEnd(node, Math.min(offset + 1, node.length));
        return range.getBoundingClientRect();
      } catch (err) {
        return null;
      }
    }

    function refreshLetterTargetCoords(letter) {
      if (!letter || !letter.node) return;
      var point = getCharClientPoint(letter.node, letter.offset);
      if (point) {
        letter.x = point.x;
        letter.y = point.y;
      }
    }

    function getLetterAlignThreshold(letter) {
      var rect = getCharRect(letter.node, letter.offset);
      if (!rect || (!rect.width && !rect.height)) return 8;
      var size = Math.max(rect.width, rect.height, 8);
      return Math.max(4, size * 0.35);
    }

    function getPeckPointForDir(dir) {
      var rect = dom.sprite.getBoundingClientRect();
      var spriteSize = rect.width;
      var radians = util.getRadians(dir);
      var centerX = rect.left + spriteSize / 2;
      var centerY = rect.top + spriteSize / 2;
      var peckDistance = spriteSize / 2 - (16 / SPRITE_SIZE) * spriteSize;
      var x = centerX + Math.cos(radians) * peckDistance;
      var y = centerY + Math.sin(radians) * peckDistance;
      var offset = PECK_DIR_OFFSETS[dir];

      if (offset) {
        x += offset.x * spriteSize;
        y += offset.y * spriteSize;
      }

      return { x: x, y: y };
    }

    function findPeckDirForLetter(letter) {
      var bestDir = null;
      var bestDist = Infinity;
      var threshold = getLetterAlignThreshold(letter);
      var i;
      var point;
      var dist;

      for (i = 0; i < 8; i++) {
        point = getPeckPointForDir(i);
        dist = Math.sqrt(
          (point.x - letter.x) * (point.x - letter.x) +
          (point.y - letter.y) * (point.y - letter.y)
        );
        if (dist < bestDist) {
          bestDist = dist;
          bestDir = i;
        }
      }

      if (bestDist > threshold) {
        return null;
      }

      return bestDir;
    }

    function isIgnoredPeckElement(el) {
      return (
        !el ||
        dom.root.contains(el) ||
        el === document.documentElement ||
        el === document.body ||
        (el.classList && el.classList.contains('peck-targets')) ||
        el.style.visibility === 'hidden'
      );
    }

    function getPeckPoint() {
      return getPeckPointForDir(chicken.dir);
    }

    function setChickenScale(scale) {
      chicken.setScale(scale);
      var bounded = util.isOutOfBounds(
        chicken.getDisplaySize(),
        chicken.x,
        chicken.y,
        gameEl.clientWidth,
        gameEl.clientHeight
      );
      chicken.setPosition(bounded[1], bounded[2]);
    }

    function updatePeckDot() {
      /*
      if (!chicken.picking) {
        dom.peckDot.style.display = 'none';
        return;
      }
      */

      var point = getPeckPoint();
      dom.peckDot.style.display = 'block';
      dom.peckDot.style.left = point.x + 'px';
      dom.peckDot.style.top = point.y + 'px';
    }

    function findPeckTargetAt(x, y) {
      dom.root.style.visibility = 'hidden';
      var elements = document.elementsFromPoint(x, y);
      dom.root.style.visibility = '';

      for (var i = 0; i < elements.length; i++) {
        if (!isIgnoredPeckElement(elements[i])) {
          return elements[i];
        }
      }

      return null;
    }

    function getCaretPositionFromPoint(x, y) {
      if (document.caretPositionFromPoint) {
        return document.caretPositionFromPoint(x, y);
      }
      if (document.caretsFromPoint) {
        var carets = document.caretsFromPoint(x, y);
        if (carets && carets.length) return carets[0];
      }
      if (document.caretRangeFromPoint) {
        var range = document.caretRangeFromPoint(x, y);
        if (range) {
          return { offsetNode: range.startContainer, offset: range.startOffset };
        }
      }
      return null;
    }

    function wrapCharAtNode(node, offset) {
      if (!node || node.nodeType !== Node.TEXT_NODE || !node.parentNode) {
        return null;
      }
      if (!isPeckableTextNode(node)) {
        return null;
      }

      var text = node.textContent;
      if (!text || !text.length) {
        return null;
      }

      if (offset >= text.length) {
        offset = text.length - 1;
      }
      if (offset < 0 || !text.charAt(offset)) {
        return null;
      }

      var textNode = node;
      if (offset > 0) {
        textNode = textNode.splitText(offset);
      }
      if (textNode.length > 1) {
        textNode.splitText(1);
      }

      var span = document.createElement('span');
      span.style.visibility = 'hidden';
      textNode.parentNode.insertBefore(span, textNode);
      span.appendChild(textNode);

      return span;
    }

    function wrapCharAtCaret(pos) {
      if (!pos || !pos.offsetNode) return null;
      return wrapCharAtNode(pos.offsetNode, pos.offset);
    }

    function unwrapCharSpan(span) {
      var parent = span.parentNode;
      if (!parent) return;

      var textNode = document.createTextNode(span.textContent);
      parent.insertBefore(textNode, span);
      parent.removeChild(span);
      parent.normalize();
    }

    function doPeck() {
      var charSpan = null;

      if (chicken.autoPeckLetter) {
        charSpan = wrapCharAtNode(
          chicken.autoPeckLetter.node,
          chicken.autoPeckLetter.offset
        );
        chicken.autoPeckLetter = null;
      }

      if (!charSpan) {
        var point = getPeckPoint();
        var pos = getCaretPositionFromPoint(point.x, point.y);
        charSpan = pos ? wrapCharAtCaret(pos) : null;
      }

      if (charSpan) {
        hiddenElements.push({ type: 'char', span: charSpan });
      } else if (!chicken.autonomousPeck) {
        var missPoint = getPeckPoint();
        var el = findPeckTargetAt(missPoint.x, missPoint.y);
        if (el) {
          hiddenElements.push({ type: 'element', el: el, visibility: el.style.visibility });
          el.style.visibility = 'hidden';
        }
      }

      chicken.autonomousPeck = false;
    }

    function startPeckIfReady() {
      if (chicken.picking || getDirFromKeys() !== null) return;
      chicken.startPeck();
    }

    function applyFacingFromKeys() {
      var dir = getDirFromKeys();
      if (dir !== null) {
        chicken.dir = dir;
      }
    }

    chicken.onPeckHit = doPeck;

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

    function getMovementDir(time) {
      var playerDir = getDirFromKeys();
      if (playerDir !== null) {
        lastPlayerInputTime = time;
        autonomous.reset(time);
        return playerDir;
      }

      if (lastPlayerInputTime === null) {
        lastPlayerInputTime = time;
      }

      if (time - lastPlayerInputTime < IDLE_BEFORE_AUTO_MS) {
        return null;
      }

      return autonomous.getMoveDir(time, chicken);
    }

    function onKeyDown(e) {
      switch (e.key) {
        case 'ArrowUp': keys.up = true; applyFacingFromKeys(); e.preventDefault(); break;
        case 'ArrowDown': keys.down = true; applyFacingFromKeys(); e.preventDefault(); break;
        case 'ArrowLeft': keys.left = true; applyFacingFromKeys(); e.preventDefault(); break;
        case 'ArrowRight': keys.right = true; applyFacingFromKeys(); e.preventDefault(); break;
        case ' ':
          if (!e.repeat) startPeckIfReady();
          e.preventDefault();
          break;
        case '1':
          if (!e.repeat) setChickenScale(1);
          e.preventDefault();
          break;
        case '2':
          if (!e.repeat) setChickenScale(2);
          e.preventDefault();
          break;
      }
    }

    function onKeyUp(e) {
      switch (e.key) {
        case 'ArrowUp': keys.up = false; e.preventDefault(); break;
        case 'ArrowDown': keys.down = false; e.preventDefault(); break;
        case 'ArrowLeft': keys.left = false; e.preventDefault(); break;
        case 'ArrowRight': keys.right = false; e.preventDefault(); break;
        case ' ': e.preventDefault(); break;
      }
    }

    function onResize() {
      var bounded = util.isOutOfBounds(
        chicken.getDisplaySize(),
        chicken.x,
        chicken.y,
        gameEl.clientWidth,
        gameEl.clientHeight
      );
      chicken.setPosition(bounded[1], bounded[2]);
    }

    function gameLoop(time) {
      chicken.update(time, gameEl.clientWidth, gameEl.clientHeight, getMovementDir(time));
      updatePeckDot();
      rafId = requestAnimationFrame(gameLoop);
    }

    function destroy() {
      cancelAnimationFrame(rafId);
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('keyup', onKeyUp, true);
      window.removeEventListener('resize', onResize);

      for (var i = 0; i < hiddenElements.length; i++) {
        var hidden = hiddenElements[i];
        if (hidden.type === 'char') {
          unwrapCharSpan(hidden.span);
        } else {
          hidden.el.style.visibility = hidden.visibility;
        }
      }

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

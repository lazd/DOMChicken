#!/usr/bin/env node

var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var WIDGET = path.join(ROOT, 'game/public/src/chicken-widget.js');
var SPRITE = path.join(ROOT, 'game/public/sprites/chicken/chicken-sprite.png');
var DEMO = path.join(ROOT, 'game/public/chicken-demo.html');
var OUT_DIR = path.join(ROOT, 'dist');
var OUT_HTML = path.join(OUT_DIR, 'index.html');
var OUT_DEMO = path.join(OUT_DIR, 'demo.html');
var OUT_TXT = path.join(OUT_DIR, 'bookmarklet.txt');
var OUT_JS = path.join(OUT_DIR, 'bookmarklet.js');
var OUT_WIDGET = path.join(OUT_DIR, 'src/chicken-widget.js');
var OUT_SPRITE = path.join(OUT_DIR, 'sprites/chicken/chicken-sprite.png');

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function minify(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}();,:=<>\+\-\*\/&|\[\]\?])\s*/g, '$1')
    .trim();
}

function buildInjectScript(spriteDataUrl) {
  var widget = fs.readFileSync(WIDGET, 'utf8');
  return (
    '(function(){' +
    'if(window.__dinoChicken){window.__dinoChicken.destroy();return;}' +
    widget +
    'window.__dinoChicken=DinoChicken.mount({' +
    'mode:"inject",' +
    'spriteUrl:' + JSON.stringify(spriteDataUrl) +
    '});' +
    '})();'
  );
}

function buildBookmarklet(spriteDataUrl) {
  return 'javascript:' + minify(buildInjectScript(spriteDataUrl));
}

function buildHtml(bookmarklet) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>DOMChicken</title>
    <style>
      body { font: 16px/1.5 Helvetica Neue, sans-serif; max-width: 640px; margin: 40px auto; padding: 0 20px; }
      a.bookmarklet {
        display: inline-block; padding: 12px 18px; background: #c4a574; color: #000;
        text-decoration: none; border-radius: 6px; font-weight: bold;
      }
      code { background: #f4f4f4; padding: 2px 6px; border-radius: 4px; }
      textarea { width: 100%; height: 120px; font: 12px monospace; margin-top: 8px; }
    </style>
  </head>
  <body>
    <h1>DOMChicken Bookmarklet</h1>
    <p>Have you ever wanted to pilot a chicken around a webpage and devour DOM nodes?</p>
    <p>If so, drag this link to your bookmarks bar, then click it on any page to inject the DOM chicken.</p>
    <p><a class="bookmarklet" id="bookmarklet" href="#">🐔 Chicken</a></p>
    <p>Use arrow keys to move and space to peck and remove DOM elements.</p>
    <p>Click the bookmark again on the same page to remove the chicken and restore the page.</p>
    <details>
      <summary>Bookmarklet URL</summary>
      <textarea id="bookmarklet-url" readonly></textarea>
    </details>
    <script>
      var bookmarklet = ${JSON.stringify(bookmarklet)};
      document.getElementById("bookmarklet").href = bookmarklet;
      document.getElementById("bookmarklet-url").value = bookmarklet;
    </script>

    <p>Authored by <a href="https://github.com/lazd/DOMChicken" target="_blank">lazd</a> based on a project by <a href="https://github.com/svnh/Dinosaurio" target="_blank">svnh</a></p>
  </body>
</html>
`;
}

function main() {
  var spriteDataUrl =
    'data:image/png;base64,' +
    fs.readFileSync(SPRITE).toString('base64');

  var inject = buildInjectScript(spriteDataUrl);
  var minified = minify(inject);
  var bookmarklet = buildBookmarklet(spriteDataUrl);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_JS, minified + '\n');
  fs.writeFileSync(OUT_TXT, bookmarklet + '\n');
  fs.writeFileSync(OUT_HTML, buildHtml(bookmarklet));
  copyFile(DEMO, OUT_DEMO);
  copyFile(WIDGET, OUT_WIDGET);
  copyFile(SPRITE, OUT_SPRITE);

  console.log('Wrote ' + OUT_JS);
  console.log('Wrote ' + OUT_TXT);
  console.log('Wrote ' + OUT_HTML);
  console.log('Wrote ' + OUT_DEMO);
  console.log('Wrote ' + OUT_WIDGET);
  console.log('Wrote ' + OUT_SPRITE);
  console.log('Bookmarklet length: ' + bookmarklet.length + ' chars');
}

main();

#!/usr/bin/env node

var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var WIDGET = path.join(ROOT, 'game/public/src/chicken-widget.js');
var SPRITE = path.join(ROOT, 'game/public/sprites/chicken/chicken-sprite.png');
var OUT_DIR = path.join(ROOT, 'dist');
var OUT_HTML = path.join(OUT_DIR, 'index.html');
var OUT_TXT = path.join(OUT_DIR, 'bookmarklet.txt');
var OUT_JS = path.join(OUT_DIR, 'bookmarklet.js');

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
  return '<!doctype html>\n' +
    '<html>\n' +
    '  <head>\n' +
    '    <meta charset="utf-8">\n' +
    '    <title>Chicken Bookmarklet</title>\n' +
    '    <style>\n' +
    '      body { font: 16px/1.5 Helvetica Neue, sans-serif; max-width: 640px; margin: 40px auto; padding: 0 20px; }\n' +
    '      a.bookmarklet {\n' +
    '        display: inline-block; padding: 12px 18px; background: #c4a574; color: #000;\n' +
    '        text-decoration: none; border-radius: 6px; font-weight: bold;\n' +
    '      }\n' +
    '      code { background: #f4f4f4; padding: 2px 6px; border-radius: 4px; }\n' +
    '      textarea { width: 100%; height: 120px; font: 12px monospace; margin-top: 8px; }\n' +
    '    </style>\n' +
    '  </head>\n' +
    '  <body>\n' +
    '    <h1>Chicken Bookmarklet</h1>\n' +
    '    <p>Drag this link to your bookmarks bar, then click it on any page to inject the chicken.</p>\n' +
    '    <p><a class="bookmarklet" id="bookmarklet" href="#">🐔 Chicken</a></p>\n' +
    '    <p>Click the bookmark again on the same page to remove the chicken. No server required.</p>\n' +
    '    <h2>Setup</h2>\n' +
    '    <ol>\n' +
    '      <li>Run <code>npm run build:bookmarklet</code> after changing the widget or sprite.</li>\n' +
    '      <li>Run <code>npm run deploy:bookmarklet</code> to publish to GitHub Pages.</li>\n' +
    '      <li>Drag the bookmark link above into your bookmarks bar.</li>\n' +
    '    </ol>\n' +
    '    <h2>Bookmarklet URL</h2>\n' +
    '    <textarea id="bookmarklet-url" readonly></textarea>\n' +
    '    <script>\n' +
    '      var bookmarklet = ' + JSON.stringify(bookmarklet) + ';\n' +
    '      document.getElementById("bookmarklet").href = bookmarklet;\n' +
    '      document.getElementById("bookmarklet-url").value = bookmarklet;\n' +
    '    </script>\n' +
    '  </body>\n' +
    '</html>\n';
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

  console.log('Wrote ' + OUT_JS);
  console.log('Wrote ' + OUT_TXT);
  console.log('Wrote ' + OUT_HTML);
  console.log('Bookmarklet length: ' + bookmarklet.length + ' chars');
}

main();

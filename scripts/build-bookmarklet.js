#!/usr/bin/env node

var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var SOURCE = path.join(__dirname, 'chicken-inject.source.js');
var OUT_JS = path.join(ROOT, 'game/public/chicken-bookmarklet.js');
var OUT_HTML = path.join(ROOT, 'game/public/chicken-bookmarklet.html');

function parseArgs(argv) {
  var baseUrl = 'http://localhost:3000';

  for (var i = 2; i < argv.length; i++) {
    if (argv[i] === '--base-url' && argv[i + 1]) {
      baseUrl = argv[++i].replace(/\/$/, '');
    } else if (argv[i] === '--help' || argv[i] === '-h') {
      console.log(
        'Usage: node scripts/build-bookmarklet.js [--base-url URL]\n\n' +
        '  --base-url   Origin where game/public is hosted (default: http://localhost:3000)'
      );
      process.exit(0);
    }
  }

  return { baseUrl: baseUrl };
}

function minify(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}();,:=<>\+\-\*\/&|\[\]\?])\s*/g, '$1')
    .trim();
}

function buildInjectScript(spriteUrl) {
  var source = fs.readFileSync(SOURCE, 'utf8');
  var inject = source.replace('__SPRITE_URL__', JSON.stringify(spriteUrl));
  return inject;
}

function buildLoaderBookmarklet(scriptUrl) {
  return (
    'javascript:void(function(u){' +
    'if(window.__dinoChicken){window.__dinoChicken.destroy();return;}' +
    'var s=document.createElement(\'script\');' +
    's.src=u+\'?\'+Date.now();' +
    'document.body.appendChild(s);' +
    '})(' + JSON.stringify(scriptUrl) + ')'
  );
}

function buildHtml(baseUrl, loaderBookmarklet, scriptUrl, spriteUrl) {
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
    '    <p><a class="bookmarklet" href="' + loaderBookmarklet + '">🐔 Chicken</a></p>\n' +
    '    <p>Click the bookmark again on the same page to remove the chicken.</p>\n' +
    '    <h2>Setup</h2>\n' +
    '    <ol>\n' +
    '      <li>Host <code>game/public</code> (e.g. <code>npm start</code> or any static server).</li>\n' +
    '      <li>Rebuild with your host URL: <code>node scripts/build-bookmarklet.js --base-url ' + baseUrl + '</code></li>\n' +
    '      <li>Drag the bookmark link above into your bookmarks bar.</li>\n' +
    '    </ol>\n' +
    '    <h2>Assets</h2>\n' +
    '    <ul>\n' +
    '      <li>Script: <code>' + scriptUrl + '</code></li>\n' +
    '      <li>Sprite: <code>' + spriteUrl + '</code></li>\n' +
    '    </ul>\n' +
    '    <h2>Bookmarklet URL</h2>\n' +
    '    <textarea readonly>' + loaderBookmarklet + '</textarea>\n' +
    '  </body>\n' +
    '</html>\n';
}

function main() {
  var opts = parseArgs(process.argv);
  var scriptUrl = opts.baseUrl + '/chicken-bookmarklet.js';
  var spriteUrl = opts.baseUrl + '/sprites/chicken/chicken-sprite.png';
  var inject = buildInjectScript(spriteUrl);
  var minified = minify(inject);
  var loaderBookmarklet = buildLoaderBookmarklet(scriptUrl);

  fs.writeFileSync(OUT_JS, minified + '\n');
  fs.writeFileSync(OUT_HTML, buildHtml(opts.baseUrl, loaderBookmarklet, scriptUrl, spriteUrl));

  console.log('Wrote ' + OUT_JS);
  console.log('Wrote ' + OUT_HTML);
  console.log('Base URL: ' + opts.baseUrl);
  console.log('Bookmarklet length: ' + loaderBookmarklet.length + ' chars');
}

main();

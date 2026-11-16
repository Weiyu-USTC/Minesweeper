// Bundle the local game into one HTML file. No third-party dependencies.
const fs = require('node:fs');
const path = require('node:path');
const read = file => fs.readFileSync(path.join(__dirname, file), 'utf8');
const checkOnly = process.argv.includes('--check');
function bundle(source, destination) {
  let html = read(source);
  html = html.replace(/<link\s+rel="stylesheet"\s+href="([^"]+)"\s*\/?\s*>/g,
    (_, file) => '<style>\n' + read(file) + '\n</style>');
  html = html.replace(/<script\s+src="([^"]+)"\s*><\/script>/g,
    (_, file) => '<script>\n' + read(file).replace(/<\/script/gi, '<\\/script') + '\n</script>');
  if (checkOnly) {
    const target = path.join(__dirname, destination);
    if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== html) {
      console.error(destination + ' is missing or out of date. Run npm run build.');
      process.exitCode = 1;
    } else console.log('Verified ' + destination);
  } else {
    fs.writeFileSync(path.join(__dirname, destination), html);
    console.log('Created ' + destination);
  }
}
bundle('index.html', 'Minesweeper.html');
bundle('tutorial.html', 'Minesweeper Tutorial.html');

const readline = require('readline')
const { Reader, Parser } = require('./parser.js')
const evalApply = require('./evalApply.js')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'User > '
})

rl.prompt()

function read(str) {
  const reader = new Reader(str)
  const ast = Parser(reader)
  return ast[0]
}

function eval(ast) {
  return evalApply(ast)
}

function print(str) {
  console.log(str)
  return str
}

function repl(str) {
  print(eval(read(str)))
}

rl.on('line', line => {
  repl(line)
  rl.prompt()
})

rl.on('close', _ => {
  console.log('\nexit')
  process.exit(0)
})

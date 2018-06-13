
const program = require('./parserCombinator.js')

function tokenizer(str) {
  // [\s,]* 匹配任意个数的空格或逗号，但不捕获
  // ~@|[\[\]{}()'`~^@] 捕获 ~@ 符号或 []{}()'`~^@ 中任意一个符号
  // "(?:\\.|[^\\"])*" 捕获双引号中的内容，如果中间出现带反斜杠的双引号, 则包含在内
  // ;.* 捕获注释
  // [^\s\[\]{}('"`,;)]* 捕获所有特殊字符的字符串
  let tokens = []
  const regex = /[\s,]*(~@|[\[\]{}()'`~^@]|"(?:\\.|[^\\"])*"|;.*|[^\s\[\]{}('"`,;)]*)/g
  // 使用带有 /g 参数的正则表达式时，可对同一个字符串多次调用 exec 方法，
  // 每次调用都会更新 lastIndex (下一次匹配开始的位置)
  let i = 0
  while ((match = regex.exec(str))[1] != '') {
    // 注释忽略不处理
    if (match[0] === ';') continue
    tokens.push({
      token: match[1],
      arrIndex: i++,
      strIndex: match.index,
      input: match.input
    })
  }
  return tokens
}

function parser(tokens) {
  const errManager = {
    restTokens: tokens,
    errorInfo: ''
  }
  const { ast, err } = program(tokens, errManager)
  if (ast) return ast
  throw err.errorInfo
}

module.exports = { tokenizer, parser }
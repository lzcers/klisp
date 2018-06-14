
const program = require('./parserCombinator.js')

class Parser {
  constructor(reader, rule) {
    this.errManager = {
      errposition: 0,
      errToken: {},
      errorInfo: [],
      restTokens: []
    }
    this.reader = reader
    this.rule = rule
    this.ast = {}
  }
  step() {

  }
  result() {}
}

class Reader {
  constructor(code) {
    this.code = code
    this.tokens = this._tokenizer(code)
    this.index = 0
  }

  peek() {
    return this.tokens[this.index]
  }

  next() {
    return this.tokens[this.index++]
  }

  _tokenizer(str) {
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
    let match = null
    while ((match = regex.exec(str))[1] != '') {
      // 注释忽略不处理
      if (match[0] === ';') continue
      tokens.push({
        token: match[1],
        arrIndex: i++,
        strIndex: match.index,
      })
    }
    return tokens    
  }
}


// const r = new Reader('(+ 1 2 3)')
// console.log(r.next())
// console.log(r.next())
module.exports = { Reader, Parser }
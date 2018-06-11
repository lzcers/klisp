const keyword = new Set(['def', 'if', 'lambda'])
// 首先定义 Parser, 它是一个接受 tokens 返回 Result 的函数
// Parser := Tokens => Result | null
// tokens 就定义为数组好了 
// Tokens := Array 
// Result 是一个数组，第一个元素是解析结果数组，第二元素是剩下的tokens, 如果为 null 则为解析失败
// 然后我们来定义第一个 parser
// 这个 parser 对任何一个 token 都解析成功，并吃掉它，相当于 G -> ε
const Successed = tokens => [{type: 'any', value: tokens[0]}, tokens.slice(1)]

// 一个高阶函数，用于创建标识符解析器， 比如说 Ｇ　-> s 解析 s 终结符
const ID = id => tokens => tokens[0] === id ? [{type: 'identifier', value: tokens[0]}, tokens.slice(1)] : null

// 只要有一个解析器解析成功就是解析成功, 相当文法中的 | 符号，比如 G -> A | B | C
const OR = (...parsers) => tokens => {
  for (const p of parsers) {
    const result = p(tokens)
    if (result) return result
  }
  return null
}

// 只有全部解析器都解析成功才成功， 相当于文法的连接
// 比如对于文法 G -> A B C 
// 只有 A B C 都解析成功, G 才解析成功
const SEQ = (...parsers) => tokens => {
  let result = []
  let rest = tokens
  for (const p of parsers) {
    const r = p(rest)
    if (r) {
      result = result.concat(r[0])
      rest = r[1]
    } else return null
  }
  return [result, rest]
}
// 对 tokens 使用一个 parser 解析任意次，直到解析失败，将结果返回，max 设置为 -1 相当于正则里的 *
const REP = (parser, max = -1) => tokens => {
  let count = 0;
  let result = []
  let rest = tokens
  while(count >= max) {
    const r = parser(rest)
    if (r) { 
      result = result.concat(r[0])
      rest = r[1]
      count++
    } else break
  }
  return [result, rest]
}

const NUM = tokens => /\d/g.test(tokens[0]) ? [{type: 'number', value: Number(tokens[0])}, tokens.slice(1)] : null
const BOOL = tokens => {
  const t = ID('#t')(tokens)
  const f = ID('#f')(tokens)
  return t ? [{type: 'bool', value: true}, t[1]] : f ? [{type: 'bool', value: false}, f[1]] : null
}
const STR = tokens => {
  const r = /^"(.*)"$/g.exec(tokens[0])
  if (r) return [{type: 'string', value: r[1]}, tokens.slice(1)]
  return null
}
// lisp 语法定义, 参考 R5RS
// <EXP> -> <VAR> | <LITERAL> | PRODCALL | LAMBDA | LET
const EXP = tokens => OR(VAR, LITERAL, PRODCALL, LAMBDA, LET)(tokens)

// <SELFEVAL> -> <BOOL> | <STR> | <NUM>
const SELFEVAL = tokens => {
  const r = OR(BOOL, STR, NUM)(tokens)
  if (r) r[0].type = 'selfeval'
  return r
}
// <syntactic keyword> -> let | def | lambda | if ...
const SYNTAXKEYWORD = tokens => {
  const r = OR(ID('('), ID(')'),ID('let'), ID('def'), ID('lambda'), ID('if'))(tokens)
  if (r) r[0].type = 'syntaxkeyword'
  return r
}
// <VAR> -> <any <identifier> that is not also a <syntactic keyword>
const VAR = tokens => { 
  const OPERATOR = OR(ID('+'), ID('-'), ID('*'), ID('/'))
  const NOTSYNTAXKEYWORD = tokens => {
    if (!SYNTAXKEYWORD(tokens)&&!SELFEVAL(tokens)) {
      return Successed(tokens)
    }
    return null
  }
  const r = OR(OPERATOR, NOTSYNTAXKEYWORD)(tokens)
  if (r) r[0].type = 'var'
  return r
}
// <LITERAL> -> <SELFEVAL>
const LITERAL = SELFEVAL
// <OPERATOR> -> EXP
const OPERATOR = tokens => EXP(tokens)
// <PRODCALL> -> (<OPERATOR> <EXP>*）
const PRODCALL = tokens => {
  const r = SEQ(ID('('), OPERATOR, REP(EXP), ID(')'))(tokens)
  // 去掉 () 
  return r ? [{type: 'procedurecall', value: r[0].slice(1, -1)}, r[1]] : null
}

// <BINDSPEC> -> (<VAR> <EXP>)
const BINDSPEC = tokens => {
  const r = SEQ(ID('('), VAR, EXP, ID(')'))(tokens)
  if (r) return [{type: 'bindspec', value: [r[0][1], r[0][2]]}, r[1]]
  return r
}
// <DEFINE> -> (define <VAR> <EXP>)
const DEFINE = tokens => {
  const r = SEQ(ID('('), ID('define'), VAR, EXP, ID(')'))(tokens)
  if (r) return [{type: 'define', value: [r[0][2].value, r[0][3]]},r[1]]
  return r
}
// <BODY> -> <DEFINE>* EXP <EXP>* 
const BODY = tokens => { 
  const r = SEQ(REP(DEFINE), EXP, REP(EXP))(tokens)
  if (r) return [{type: 'body', value: r[0]}, r[1]]
  return r
}
// <LET> -> (let (<BINDSPEC>*) <BODY>) | (let <VAR> (<BINDSPEC>*) <BODY>) 
const LET = tokens => {
  const r = OR(SEQ(ID('('), ID('let'), ID('('), REP(BINDSPEC), ID(')'), BODY, ID(')')), SEQ(ID('('), ID('let'), VAR, ID('('), REP(BINDSPEC), ID(')'), BODY, ID(')')))(tokens)
  if (r) return [{type: 'let', value: {
    var: r[0][2].type == 'var' ? r[0][2] : null,
    bindspecs: r[0].filter(i => i.type == 'bindspec'),
    body: r[0].find(i => i.type == 'body')
  }}, r[1]]
  throw 'failed to parse let'
  return r
}
// <FORMALS> -> (<VAR>*)
const FORMALS = tokens => {
  const r = SEQ(ID('('),REP(VAR), ID(')'))(tokens)
  if (r) return [{type: 'formals', value: r[0].slice(1, -1)}, r[1]]
  return r
}
// <LAMBDA> -> (lambda <FORMALS> <BODY>)
const LAMBDA = tokens => {
  const r = SEQ(ID('('), ID('lambda'), FORMALS, BODY, ID(')'))(tokens)
  if (r) return [{type: 'lambda', formals: r[0][2], body:r[0][3]}, r[1]]
  return r
}
// <COMMAND> ->
const COMMAND = tokens => EXP(tokens)
const COMMANDORDEF = tokens => OR(COMMAND, DEFINE)(tokens)
// <PROGRAM> -> <command or definition>*
const PROGRAM = tokens => REP(COMMANDORDEF)(tokens)

module.exports = EXP
// 定义环境
const baseProcedure = {
  '+': args => args.reduce((pre, cur) => cur + pre),
  '-': args => args.reduce((pre, cur) => cur - pre),
  '*': args => args.reduce((pre, cur) => cur * pre),
  '/': args => args.reduce((pre, cur) => cur / pre),
}
const env = [
  baseProcedure
]

function lookup(key, env) {
  for (let e of env) {
    if (e[key]) return e[key]
  }
  return null
}
function extEnv(frame, env) {
  return [frame, ...env]
}

function defEval(exp, env) {
  const i = exp.value[0]
  const value = eval(exp.value[1], env)
  env[0][i] = value
}

function letEval(exp, env) {
  const value = exp.value
  const frame = value.bindspecs.reduce((pre, cur) => {
    pre[cur.value[0].value] = eval(cur.value[1], env)
    return pre
  },{})
  // 处理另一种形式的 <LET> -> (let <VAR> <BINDSPEC> <BODY>) 
  // if (value.var) frame[value] = value.body
  // 返回最后一个表达式的值
  return value.body.value.map(e => eval(e, extEnv(frame, env))).pop()
}

function makeProcedure(formals, body, env) {
  return {type: 'lambdacall', formals: formals, body: body, env: env}
}

function eval(exp, env) {
  switch(exp.type) {
    case 'selfeval':
      return exp.value
    case 'var':
      const v = lookup(exp.value, env) 
      if (!v) throw 'what the fuck?'
      return v
    case 'define':
      return defEval(exp, env)
    case 'lambda':
      return makeProcedure(exp.formals, exp.body, env)
    case 'let':
      return letEval(exp, env)
    case 'procedurecall':
      return apply(eval(exp.value[0], env), exp.value.slice(1).map(e => eval(e, env)), env)
    default:
      throw 'what the fuck?'
  }
}

function apply(procedurecall, args, env) {
  // 基本过程 
  if (typeof procedurecall == 'function') 
    return procedurecall(args)
  else if (procedurecall.type == 'lambdacall') {
    const formals = procedurecall.formals.value.map(e => e.value)
    const argments = formals.reduce((pre, cur, i) => {
      pre[cur] = args[i]
      return pre
    },{})
    // 动态作用域
    // return procedurecall.body.value.map(e => eval(e, [argments, ...env])).pop()
    // 词法作用域
    const lexEnv = [argments, ...procedurecall.env] 
    return procedurecall.body.value.map(e => eval(e, lexEnv)).pop()
  }
}

module.exports = ast => eval(ast, env)

// // 作用域测试
// repl('(let ((y 2)) ((lambda (x) (+ x y)) 1))')
// // 词法作用域测试
// repl(`(let ((x 2))
// (let ((f (lambda (y) (* x y))))
//  (let ((x 4))
//   (f 3))))`)

// // define 测试
// repl('((lambda (x) (define f (lambda (x) (+ x 1))) (+ (f 3) x 1)) 3)')
// repl(`(let ((x 2)) (+ x 1))`)

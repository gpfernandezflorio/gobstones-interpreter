import chai from 'chai';

import { i18n } from '../src/i18n';
import {
  ASTNode,
  /* Definitions */
  ASTDefProgram,
  ASTDefProcedure,
  ASTDefFunction,
  /* Statements */
  ASTStmtBlock,
  ASTStmtReturn,
  ASTStmtIf,
  ASTStmtRepeat,
  ASTStmtForeach,
  ASTStmtWhile,
  ASTStmtSwitch,
  ASTStmtAssignVariable,
  ASTStmtAssignTuple,
  ASTStmtProcedureCall,
  /* Patterns */
  ASTPatternWildcard,
  ASTPatternConstructor,
  ASTPatternTuple,
  /* Expressions */
  ASTExprVariable,
  ASTExprConstantNumber,
  ASTExprConstantString,
  ASTExprList,
  ASTExprTuple,
  ASTExprConstructor,
  ASTExprConstructorUpdate,
  ASTExprAnd,
  ASTExprOr,
  ASTExprFunctionCall,
  /* SwitchBranch */
  ASTSwitchBranch,
  /* FieldValue */
  ASTFieldValue,
} from '../src/ast';
import { UnknownPosition } from '../src/reader';
import {
  Token,
  T_EOF, T_NUM, T_STRING, T_LOWERID, T_UPPERID,
  /* Keywords */
  T_PROGRAM, T_INTERACTIVE, T_PROCEDURE, T_FUNCTION, T_RETURN,
  T_IF, T_THEN, T_ELSE, T_REPEAT, T_FOREACH, T_IN, T_WHILE,
  T_SWITCH, T_TO, T_LET, T_NOT, T_DIV, T_MOD, T_TYPE,
  T_IS, T_RECORD, T_VARIANT, T_CASE, T_FIELD, T_UNDERSCORE,
  /* Symbols */
  T_LPAREN, T_RPAREN, T_LBRACE, T_RBRACE, T_LBRACK, T_RBRACK, T_COMMA,
  T_SEMICOLON, T_RANGE, T_GETS, T_PIPE, T_ASSIGN,
  T_EQ, T_NE, T_LE, T_GE, T_LT, T_GT, T_AND, T_OR, T_CONCAT, T_PLUS,
  T_MINUS, T_TIMES, T_POW
} from '../src/token';
import { Parser } from '../src/parser';

chai.expect();
const expect = chai.expect;

/* Return true iff the expressions are syntactically equal.
 * An expression might be:
 * - null,
 * - a token (instance of Token),
 * - a node (instance of ASTNode) whose children are expressions,
 * - a list of expressions. */
function syntacticallyEqual(e1, e2) {
  if (e1 === '?' || e2 === '?') {
    return true;
  }
  if (e1 === null && e2 === null) {
    return true;
  } else if (e1 instanceof Token && e2 instanceof Token) {
    return e1.tag === e2.tag
        && e1.value === e2.value;
  } else if (e1 instanceof ASTNode && e2 instanceof ASTNode) {
    return e1.tag === e2.tag
        && syntacticallyEqual(e1.children, e2.children);
  } else if (e1 instanceof Array && e2 instanceof Array) {
    if (e1.length !== e2.length) {
      return false;
    }
    for (var i = 0; i < e1.length; i++) {
      if (!syntacticallyEqual(e1[i], e2[i])) {
        return false;
      }
    }
    return true;
  } else {
    return false;
  }
}

function tok(tag, value) {
  return new Token(tag, value, UnknownPosition, UnknownPosition);
}

function expectAST(obtainedAst, expectedAst) {
  return expect(syntacticallyEqual(obtainedAst, expectedAst)).equals(true);
}

it('Parser - Accept empty program definition', () => {
  var parser = new Parser('program {}');
  expectAST(parser.parse(), [
    new ASTDefProgram(
      new ASTStmtBlock([])
    )
  ]);
});

it('Parser - Reject empty source', () => {
  var parser = new Parser('');
  expect(() => parser.parse()).throws(i18n('errmsg:empty-source'));
});

it('Parser - Reject things other than definitions at the toplevel', () => {
  var parser = new Parser('if');
  expect(() => parser.parse()).throws(
      i18n('errmsg:expected-but-found')(
        i18n('definition'),
        i18n('T_IF')
      )
  );
});

it('Parser - Program definition: fail on no left brace', () => {
  var parser = new Parser('program');
  expect(() => parser.parse()).throws(
    i18n('errmsg:expected-but-found')(
      i18n('T_LBRACE'),
      i18n('T_EOF')
    )
  );
});

it('Parser - Program definition: fail on no right brace', () => {
  var parser = new Parser('program {');
  expect(() => parser.parse()).throws(
    i18n('errmsg:expected-but-found')(
      i18n('statement'),
      i18n('T_EOF')
    )
  );
});

it('Parser - Program definition: keep track of positions', () => {
  var parser = new Parser('\n   program {\n\n\n}');
  var tree = parser.parse();
  expect(tree.length).equals(1);
  expect(tree[0].startPos.line).equals(2);
  expect(tree[0].startPos.column).equals(4);
  expect(tree[0].endPos.line).equals(5);
  expect(tree[0].endPos.column).equals(1);
});

it('Parser - Procedure definition with no parameters', () => {
  var parser = new Parser('procedure P() {}');
  expectAST(parser.parse(), [
    new ASTDefProcedure(
      tok(T_UPPERID, 'P'),
      [],
      new ASTStmtBlock([])
    )
  ]);
});

it('Parser - Procedure definition with one parameters', () => {
  var parser = new Parser('procedure Poner(color) {}');
  expectAST(parser.parse(), [
    new ASTDefProcedure(
      tok(T_UPPERID, 'Poner'),
      [tok(T_LOWERID, 'color')],
      new ASTStmtBlock([])
    )
  ]);
});

it('Parser - Procedure definition with two parameters', () => {
  var parser = new Parser('procedure PonerN(n,col) {}');
  expectAST(parser.parse(), [
    new ASTDefProcedure(
      tok(T_UPPERID, 'PonerN'),
      [tok(T_LOWERID, 'n'), tok(T_LOWERID, 'col')],
      new ASTStmtBlock([])
    )
  ]);
});

it('Parser - Procedure definition with three parameters', () => {
  var parser = new Parser('procedure Q(x ,y, z) {}');
  expectAST(parser.parse(), [
    new ASTDefProcedure(
      tok(T_UPPERID, 'Q'),
      [tok(T_LOWERID, 'x'), tok(T_LOWERID, 'y'), tok(T_LOWERID, 'z')],
      new ASTStmtBlock([])
    )
  ]);
});

it('Parser - Procedure definition: fail on missing argument list', () => {
  var parser = new Parser('procedure P {}');
  expect(() => parser.parse()).throws(
    i18n('errmsg:expected-but-found')(
      i18n('T_LPAREN'),
      i18n('T_LBRACE')
    )
  );
});

it('Parser - Procedure definition: fail on missing comma', () => {
  var parser = new Parser('procedure P(x y) {}');
  expect(() => parser.parse()).throws(
    i18n('errmsg:expected-but-found')(
      i18n('<alternative>')([
        i18n('T_COMMA'),
        i18n('T_RPAREN')
      ]),
      i18n('T_LOWERID')
    )
  );
});

it('Parser - Procedure definition: reject initial comma', () => {
  var parser = new Parser('procedure P(,x) {}');
  expect(() => parser.parse()).throws(
    i18n('errmsg:expected-but-found')(
      i18n('T_LOWERID'),
      i18n('T_COMMA')
    )
  );
});

it('Parser - Procedure definition: reject trailing comma', () => {
  var parser = new Parser('procedure P(x,y,) {}');
  expect(() => parser.parse()).throws(
    i18n('errmsg:expected-but-found')(
      i18n('T_LOWERID'),
      i18n('T_RPAREN')
    )
  );
});

it('Parser - Procedure definition: fail on invalid name', () => {
  var parser = new Parser('procedure p(x, y) {}');
  expect(() => parser.parse()).throws(
    i18n('errmsg:expected-but-found')(
      i18n('T_UPPERID'),
      i18n('T_LOWERID')
    )
  );
});

it('Parser - Procedure definition: fail on invalid parameter', () => {
  var parser = new Parser('procedure P(x, Y) {}');
  expect(() => parser.parse()).throws(
    i18n('errmsg:expected-but-found')(
      i18n('T_LOWERID'),
      i18n('T_UPPERID')
    )
  );
});

it('Parser - Procedure definition: fail on invalid block', () => {
  var parser = new Parser('procedure P\n(x, y) }');
  expect(() => parser.parse()).throws(
    i18n('errmsg:expected-but-found')(
      i18n('T_LBRACE'),
      i18n('T_RBRACE')
    )
  );
});
 
it('Parser - Procedure definition: keep track of positions', () => {
  var parser = new Parser(
      '/*@BEGIN_REGION@A@*//*ignore*/procedure P\n' +
      '/*@BEGIN_REGION@B@*/(x,y){} procedure Q()\n' +
      '{     /*@END_REGION@B@*/            }'
  );
  var tree = parser.parse();
  expect(tree.length).equals(2);
  expect(tree[0].startPos.line).equals(1);
  expect(tree[0].startPos.column).equals(11);
  expect(tree[0].startPos.region).equals('A');
  expect(tree[0].endPos.line).equals(2);
  expect(tree[0].endPos.column).equals(7);
  expect(tree[0].endPos.region).equals('B');
  expect(tree[1].startPos.line).equals(2);
  expect(tree[1].startPos.column).equals(9);
  expect(tree[1].startPos.region).equals('B');
  expect(tree[1].endPos.line).equals(3);
  expect(tree[1].endPos.column).equals(19);
  expect(tree[1].endPos.region).equals('A');
});

it('Parser - Function definition with no parameters', () => {
  var parser = new Parser('function f() {}');
  expectAST(parser.parse(), [
    new ASTDefFunction(
      tok(T_LOWERID, 'f'),
      [],
      new ASTStmtBlock([])
    )
  ]);
});

it('Parser - Function definition with one parameter', () => {
  var parser = new Parser('function nroBolitas(color) {}');
  expectAST(parser.parse(), [
    new ASTDefFunction(
      tok(T_LOWERID, 'nroBolitas'),
      [tok(T_LOWERID, 'color')],
      new ASTStmtBlock([])
    )
  ]);
});

it('Parser - Function definition with two parameters', () => {
  var parser = new Parser('function nroBolitasAl(c, d) {}');
  expectAST(parser.parse(), [
    new ASTDefFunction(
      tok(T_LOWERID, 'nroBolitasAl'),
      [tok(T_LOWERID, 'c'), tok(T_LOWERID, 'd')],
      new ASTStmtBlock([])
    )
  ]);
});

it('Parser - Function definition with three parameters', () => {
  var parser = new Parser('function gg(x,yy,zzz) {}');
  expectAST(parser.parse(), [
    new ASTDefFunction(
      tok(T_LOWERID, 'gg'),
      [tok(T_LOWERID, 'x'), tok(T_LOWERID, 'yy'), tok(T_LOWERID, 'zzz')],
      new ASTStmtBlock([])
    )
  ]);
});

it('Parser - Mixed function and procedure definitions', () => {
  var parser = new Parser(
                 'function f(x) {}\n' +
                 'procedure P() {}\n' +
                 'procedure Q(x, y) {}\n' +
                 'program{}'
               );
  expectAST(parser.parse(), [
    new ASTDefFunction(
      tok(T_LOWERID, 'f'),
      [tok(T_LOWERID, 'x')],
      new ASTStmtBlock([])
    ),
    new ASTDefProcedure(
      tok(T_UPPERID, 'P'),
      [],
      new ASTStmtBlock([])
    ),
    new ASTDefProcedure(
      tok(T_UPPERID, 'Q'),
      [tok(T_LOWERID, 'x'), tok(T_LOWERID, 'y')],
      new ASTStmtBlock([])
    ),
    new ASTDefProgram(
      new ASTStmtBlock([])
    )
  ]);
});

it('Parser - Reject non-statement when expecting statement', () => {
  var parser = new Parser('program { + }');
  expect(() => parser.parse()).throws(
      i18n('errmsg:expected-but-found')(
        i18n('statement'),
        i18n('T_PLUS')
      )
  );
});

it('Parser - Return: no results', () => {
  var parser = new Parser('program { return () }');
  expectAST(parser.parse(), [
    new ASTDefProgram(
      new ASTStmtBlock([
        new ASTStmtReturn(
          new ASTExprTuple([])
        )
      ])
    )
  ]);
});

it('Parser - Return: one result', () => {
  var parser = new Parser('function f() { return (x) }');
  expectAST(parser.parse(), [
    new ASTDefFunction(tok(T_LOWERID, 'f'), [],
          new ASTStmtBlock([
            new ASTStmtReturn(
              new ASTExprVariable(tok(T_LOWERID, 'x'))
            )
          ])
        )
  ]);
});

it('Parser - Return: two results', () => {
  var parser = new Parser('program { return (z1,z2) }');
  expectAST(parser.parse(), [
    new ASTDefProgram(
          new ASTStmtBlock([
            new ASTStmtReturn(
              new ASTExprTuple([
                new ASTExprVariable(tok(T_LOWERID, 'z1')),
                new ASTExprVariable(tok(T_LOWERID, 'z2')),
              ])
            )
          ])
        )
  ]);
});

it('Parser - Return: keep track of positions (no results)', () => {
  var parser = new Parser('program {\n\n\n return\n() }');
  var tree = parser.parse();
  expect(tree[0].body.statements[0].result.expressions.length).equals(0);
  expect(tree[0].body.statements[0].startPos.line).equals(4);
  expect(tree[0].body.statements[0].startPos.column).equals(2);
  expect(tree[0].body.statements[0].endPos.line).equals(5);
  expect(tree[0].body.statements[0].endPos.column).equals(2);
});

it('Parser - Return: keep track of positions (one result)', () => {
  var parser = new Parser('program {\n\n\n return\n(col) }');
  var tree = parser.parse();
  expect(tree[0].body.statements[0].startPos.line).equals(4);
  expect(tree[0].body.statements[0].startPos.column).equals(2);
  expect(tree[0].body.statements[0].endPos.line).equals(5);
  expect(tree[0].body.statements[0].endPos.column).equals(5);
});

it('Parser - Return: keep track of positions (two results)', () => {
  var parser = new Parser('program {\n\n\n return\n(col,dir) }');
  var tree = parser.parse();
  expect(tree[0].body.statements[0].result.expressions.length).equals(2);
  expect(tree[0].body.statements[0].startPos.line).equals(4);
  expect(tree[0].body.statements[0].startPos.column).equals(2);
  expect(tree[0].body.statements[0].endPos.line).equals(5);
  expect(tree[0].body.statements[0].endPos.column).equals(9);
});

it('Parser - Nested block statements', () => {
  var parser = new Parser('program { { { {} } {} } { {} } {} }');
  expectAST(parser.parse(), [
    new ASTDefProgram(
      new ASTStmtBlock([
        new ASTStmtBlock([
          new ASTStmtBlock([
            new ASTStmtBlock([
            ])
          ]),
          new ASTStmtBlock([
          ])
        ]),
        new ASTStmtBlock([
          new ASTStmtBlock([
          ])
        ]),
        new ASTStmtBlock([
        ])
      ])
    )
  ]);
});

it('Parser - If without "else"', () => {
  var parser = new Parser('program { if (a) {} }');
  expectAST(parser.parse(), [
    new ASTDefProgram(
      new ASTStmtBlock([
        new ASTStmtIf(
          new ASTExprVariable(tok(T_LOWERID, 'a')),
          new ASTStmtBlock([]),
          null
        )
      ])
    )
  ]);
});

it('Parser - If using the optional "then" keyword', () => {
  var parser = new Parser('program { if (cond) then {} }');
  expectAST(parser.parse(), [
    new ASTDefProgram(
      new ASTStmtBlock([
        new ASTStmtIf(
          new ASTExprVariable(tok(T_LOWERID, 'cond')),
          new ASTStmtBlock([]),
          null
        )
      ])
    )
  ]);
});

it('Parser - If with "else"', () => {
  var parser = new Parser('program { if (xxx) {} else {} }');
  expectAST(parser.parse(), [
    new ASTDefProgram(
      new ASTStmtBlock([
        new ASTStmtIf(
          new ASTExprVariable(tok(T_LOWERID, 'xxx')),
          new ASTStmtBlock([]),
          new ASTStmtBlock([])
        )
      ])
    )
  ]);
});

it('Parser - Nested if', () => {
  var parser = new Parser(
                 'program {\n' +
                 '  if (a) {\n' +
                 '    if (b) then {\n' +
                 '      if (c) {\n' +
                 '      }\n' +
                 '      if (d) {\n' +
                 '      }\n' +
                 '    } else {\n' +
                 '      if (e) then {\n' +
                 '      }\n' +
                 '    }\n' +
                 '    if (f) then {\n' +
                 '    }\n' +
                 '  } else {\n' +
                 '    if (e) {\n' +
                 '    }\n' +
                 '    if (f) then {\n' +
                 '      if (g) then {\n' +
                 '      }\n' +
                 '    } else {\n' +
                 '      if (h) then {\n' +
                 '      }\n' +
                 '      if (i) then {\n' +
                 '      }\n' +
                 '    }\n' +
                 '  }\n' +
                 '}'
               );

  function ifthen(c, t) {
    return new ASTStmtIf(
             new ASTExprVariable(tok(T_LOWERID, c)),
             new ASTStmtBlock(t),
             null);
  }

  function ifthenelse(c, t, e) {
    return new ASTStmtIf(
             new ASTExprVariable(tok(T_LOWERID, c)),
             new ASTStmtBlock(t),
             new ASTStmtBlock(e));
  }

  expectAST(parser.parse(), [
    new ASTDefProgram(
      new ASTStmtBlock([
        ifthenelse('a', [
          ifthenelse('b', [
            ifthen('c', []),
            ifthen('d', [])
          ], [
            ifthen('e', [])
          ]),
          ifthen('f', [
          ]),
        ], [
          ifthen('e', [
          ]),
          ifthenelse('f', [
            ifthen('g', [])
          ], [
            ifthen('h', []),
            ifthen('i', [])
          ]),
        ])
      ])
    )
  ]);
});

it('Parser - If: fail if missing left parenthesis', () => {
  var parser = new Parser('program { if xxx) {} else {} }');
  expect(() => parser.parse()).throws(
    i18n('errmsg:expected-but-found')(
      i18n('T_LPAREN'),
      i18n('T_LOWERID')
   )
  );
});

it('Parser - If: fail if missing right parenthesis', () => {
  var parser = new Parser('program { if (xxx {} else {} }');
  expect(() => parser.parse()).throws(
    i18n('errmsg:expected-but-found')(
      i18n('T_RPAREN'),
      i18n('T_LBRACE')
   )
  );
});

it('Parser - If: fail if missing then block', () => {
  var parser = new Parser('program { if(xxx)');
  expect(() => parser.parse()).throws(
    i18n('errmsg:expected-but-found')(
      i18n('T_LBRACE'),
      i18n('T_EOF')
   )
  );
});

it('Parser - If: fail if missing else block', () => {
  var parser = new Parser('program { if(xxx) {} else');
  expect(() => parser.parse()).throws(
    i18n('errmsg:expected-but-found')(
      i18n('T_LBRACE'),
      i18n('T_EOF')
   )
  );
});


it('Parser - If: keep track of positions', () => {
  var parser = new Parser('program {\n  if (xxx) {\n  } else {\n  }\n}');
  var tree = parser.parse();
  expect(tree[0].body.statements.length).equals(1);
  expect(tree[0].body.statements[0].startPos.line).equals(2);
  expect(tree[0].body.statements[0].startPos.column).equals(3);
  expect(tree[0].body.statements[0].endPos.line).equals(4);
  expect(tree[0].body.statements[0].endPos.column).equals(3);
});

it('Parser - Repeat', () => {
  var parser = new Parser('program { repeat (n) {} }');
  expectAST(parser.parse(), [
    new ASTDefProgram(
      new ASTStmtBlock([
        new ASTStmtRepeat(
          new ASTExprVariable(tok(T_LOWERID, 'n')),
          new ASTStmtBlock([])
        )
      ])
    )
  ]);
});

it('Parser - Nested repeat', () => {
  var parser = new Parser(
                 'program {\n' +
                 '  repeat (nro1) {\n' +
                 '    repeat (nro2) {}\n' +
                 '  }\n' +
                 '  repeat (nro3) {\n' +
                 '  }\n' +
                 '}'
               );
  expectAST(parser.parse(), [
    new ASTDefProgram(
      new ASTStmtBlock([
        new ASTStmtRepeat(
          new ASTExprVariable(tok(T_LOWERID, 'nro1')),
          new ASTStmtBlock([
            new ASTStmtRepeat(
              new ASTExprVariable(tok(T_LOWERID, 'nro2')),
              new ASTStmtBlock([
              ])
            )
          ])
        ),
        new ASTStmtRepeat(
          new ASTExprVariable(tok(T_LOWERID, 'nro3')),
          new ASTStmtBlock([
          ])
        )
      ])
    )
  ]);
});


it('Parser - Repeat: fail if missing left parenthesis', () => {
  var parser = new Parser('program { repeat n) {} }');
  expect(() => parser.parse()).throws(
    i18n('errmsg:expected-but-found')(
      i18n('T_LPAREN'),
      i18n('T_LOWERID')
   )
  );
});

it('Parser - Repeat: fail if missing right parenthesis', () => {
  var parser = new Parser('program { repeat (n');
  expect(() => parser.parse()).throws(
    i18n('errmsg:expected-but-found')(
      i18n('T_RPAREN'),
      i18n('T_EOF')
   )
  );
});

it('Parser - Repeat: keep track of positions', () => {
  var parser = new Parser('program { repeat (n) { } repeat(m) { } }');
  var tree = parser.parse();
  expect(tree[0].body.statements.length).equals(2);
  expect(tree[0].body.statements[0].startPos.line).equals(1);
  expect(tree[0].body.statements[0].startPos.column).equals(11);
  expect(tree[0].body.statements[0].endPos.line).equals(1);
  expect(tree[0].body.statements[0].endPos.column).equals(24);
  expect(tree[0].body.statements[1].startPos.line).equals(1);
  expect(tree[0].body.statements[1].startPos.column).equals(26);
  expect(tree[0].body.statements[1].endPos.line).equals(1);
  expect(tree[0].body.statements[1].endPos.column).equals(38);
});

it('Parser - Foreach', () => {
  var parser = new Parser('program { foreach i in expr {} }');
  expectAST(parser.parse(), [
    new ASTDefProgram(
      new ASTStmtBlock([
        new ASTStmtForeach(
          tok(T_LOWERID, 'i'),
          new ASTExprVariable(tok(T_LOWERID, 'expr')),
          new ASTStmtBlock([])
        )
      ])
    )
  ]);
});

it('Parser - Nested foreach', () => {
  var parser = new Parser(
                 'program {\n' +
                 '  foreach dir in lista1 {\n' +
                 '    foreach col in lista2 {\n' +
                 '    }\n' +
                 '    foreach col in lista3 {\n' +
                 '    }\n' +
                 '  }\n' +
                 '}'
               );
  expectAST(parser.parse(), [
    new ASTDefProgram(
      new ASTStmtBlock([
        new ASTStmtForeach(
          tok(T_LOWERID, 'dir'),
          new ASTExprVariable(tok(T_LOWERID, 'lista1')),
          new ASTStmtBlock([
            new ASTStmtForeach(
              tok(T_LOWERID, 'col'),
              new ASTExprVariable(tok(T_LOWERID, 'lista2')),
              new ASTStmtBlock([])
            ),
            new ASTStmtForeach(
              tok(T_LOWERID, 'col'),
              new ASTExprVariable(tok(T_LOWERID, 'lista3')),
              new ASTStmtBlock([])
            )
          ])
        )
      ])
    )
  ]);
});


it('Parser - Foreach: fail if wrong index name', () => {
  var parser = new Parser('program { foreach I in expr {} }');
  expect(() => parser.parse()).throws(
    i18n('errmsg:expected-but-found')(
      i18n('T_LOWERID'),
      i18n('T_UPPERID')
    )
  );
});

it('Parser - Foreach: fail if missing "in"', () => {
  var parser = new Parser('program { foreach i ( expr ) {} }');
  expect(() => parser.parse()).throws(
    i18n('errmsg:expected-but-found')(
      i18n('T_IN'),
      i18n('T_LPAREN')
    )
  );
});

it('Parser - Foreach: fail if missing block', () => {
  var parser = new Parser('program { foreach i in expr }');
  expect(() => parser.parse()).throws(
    i18n('errmsg:expected-but-found')(
      i18n('T_LBRACE'),
      i18n('T_RBRACE')
    )
  );
});

it('Parser - Foreach: keep track of positions', () => {
  var parser = new Parser('program {\nforeach\ni\nin\nexpr\n{\n}\n}');
  var tree = parser.parse();
  expect(tree[0].body.statements.length).equals(1);
  expect(tree[0].body.statements[0].startPos.line).equals(2);
  expect(tree[0].body.statements[0].startPos.column).equals(1);
  expect(tree[0].body.statements[0].endPos.line).equals(7);
  expect(tree[0].body.statements[0].endPos.column).equals(1);
});

it('Parser - While', () => {
  var parser = new Parser('program { while (cond) {} }');
  expectAST(parser.parse(), [
    new ASTDefProgram(
      new ASTStmtBlock([
        new ASTStmtWhile(
          new ASTExprVariable(tok(T_LOWERID, 'cond')),
          new ASTStmtBlock([])
        )
      ])
    )
  ]);
});

it('Parser - Nested while', () => {
  var parser = new Parser(
                 'program {\n' +
                 '  while (cond1) {\n' +
                 '    while (cond2) {\n' +
                 '    }\n' +
                 '  }\n' +
                 '  while (cond3) {\n' +
                 '  }\n' +
                 '}'
               );
  expectAST(parser.parse(), [
    new ASTDefProgram(
      new ASTStmtBlock([
        new ASTStmtWhile(
          new ASTExprVariable(tok(T_LOWERID, 'cond1')),
          new ASTStmtBlock([
            new ASTStmtWhile(
              new ASTExprVariable(tok(T_LOWERID, 'cond2')),
              new ASTStmtBlock([])
            )
          ])
        ),
        new ASTStmtWhile(
          new ASTExprVariable(tok(T_LOWERID, 'cond3')),
          new ASTStmtBlock([])
        )
      ])
    )
  ]);
});

it('Parser - While: fail if missing left parenthesis', () => {
  var parser = new Parser('program { while cond {} }');
  expect(() => parser.parse()).throws(
    i18n('errmsg:expected-but-found')(
      i18n('T_LPAREN'),
      i18n('T_LOWERID')
    )
  );
});

it('Parser - While: fail if missing right parenthesis', () => {
  var parser = new Parser('program { while (cond while {} }');
  expect(() => parser.parse()).throws(
    i18n('errmsg:expected-but-found')(
      i18n('T_RPAREN'),
      i18n('T_WHILE')
    )
  );
});

it('Parser - While: fail if missing block', () => {
  var parser = new Parser('program { while (cond) /*{}*/ }');
  expect(() => parser.parse()).throws(
    i18n('errmsg:expected-but-found')(
      i18n('T_LBRACE'),
      i18n('T_RBRACE')
    )
  );
});

it('Parser - Switch: empty (no branches)', () => {
  var parser = new Parser(
                 'program {' +
                 '  switch (a) {' +
                 '  }' +
                 '}'
               );
  expectAST(parser.parse(), [
    new ASTDefProgram(
      new ASTStmtBlock([
        new ASTStmtSwitch(
          new ASTExprVariable(tok(T_LOWERID, 'a')),
          []
        )
      ])
    )
  ]);
});

it('Parser - Switch: empty with optional keyword "to"', () => {
  var parser = new Parser(
                 'program {' +
                 '  switch (foo) to {' +
                 '  }' +
                 '}'
               );
  expectAST(parser.parse(), [
    new ASTDefProgram(
      new ASTStmtBlock([
        new ASTStmtSwitch(
          new ASTExprVariable(tok(T_LOWERID, 'foo')),
          []
        )
      ])
    )
  ]);
});

it('Parser - Switch: empty with keyword "match"', () => {
  var parser = new Parser(
                 'program {' +
                 '  match (bar) to {' +
                 '  }' +
                 '}'
               );
  expectAST(parser.parse(), [
    new ASTDefProgram(
      new ASTStmtBlock([
        new ASTStmtSwitch(
          new ASTExprVariable(tok(T_LOWERID, 'bar')),
          []
        )
      ])
    )
  ]);
});

it('Parser - Switch: wildcard', () => {
  var parser = new Parser(
                 'program {' +
                 '  switch (foo) {' +
                 '    _ -> {' +
                 '      if (bar) {}' +
                 '    }' +
                 '  }' +
                 '}'
               );
  expectAST(parser.parse(), [
    new ASTDefProgram(
      new ASTStmtBlock([
        new ASTStmtSwitch(
          new ASTExprVariable(tok(T_LOWERID, 'foo')),
          [
            new ASTSwitchBranch(
              new ASTPatternWildcard(),
              new ASTStmtBlock([
                new ASTStmtIf(
                  new ASTExprVariable(tok(T_LOWERID, 'bar')),
                  new ASTStmtBlock([]),
                  null
                )
              ])
            )
          ]
        )
      ])
    )
  ]);
});

it('Parser - Switch: constructors without arguments', () => {
  var parser = new Parser(
                 'program {' +
                 '  switch (foo) {' +
                 '    Norte -> {}' +
                 '    Este -> {}' +
                 '    Sur -> {}' +
                 '    _ -> {}' +
                 '  }' +
                 '}'
               );
  expectAST(parser.parse(), [
    new ASTDefProgram(
      new ASTStmtBlock([
        new ASTStmtSwitch(
          new ASTExprVariable(tok(T_LOWERID, 'foo')),
          [
            new ASTSwitchBranch(
              new ASTPatternConstructor(
                tok(T_UPPERID, 'Norte'),
                []
              ),
              new ASTStmtBlock([])
            ),
            new ASTSwitchBranch(
              new ASTPatternConstructor(
                tok(T_UPPERID, 'Este'),
                []
              ),
              new ASTStmtBlock([])
            ),
            new ASTSwitchBranch(
              new ASTPatternConstructor(
                tok(T_UPPERID, 'Sur'),
                []
              ),
              new ASTStmtBlock([])
            ),
            new ASTSwitchBranch(
              new ASTPatternWildcard(),
              new ASTStmtBlock([])
            )
          ]
        )
      ])
    )
  ]);
});

it('Parser - Switch: constructors with arguments', () => {
  var parser = new Parser(
                 'program {' +
                 '  switch (foo) {' +
                 '    INIT()           -> {}' +
                 '    Leaf(x)          -> {}' +
                 '    Norte            -> {}' +
                 '    Cons(x, xs)      -> {}' +
                 '    A(foo, bar, baz) -> {}' +
                 '  }' +
                 '}'
               );
  expectAST(parser.parse(), [
    new ASTDefProgram(
      new ASTStmtBlock([
        new ASTStmtSwitch(
          new ASTExprVariable(tok(T_LOWERID, 'foo')),
          [
            new ASTSwitchBranch(
              new ASTPatternConstructor(
                tok(T_UPPERID, 'INIT'),
                []
              ),
              new ASTStmtBlock([])
            ),
            new ASTSwitchBranch(
              new ASTPatternConstructor(
                tok(T_UPPERID, 'Leaf'),
                [tok(T_LOWERID, 'x')]
              ),
              new ASTStmtBlock([])
            ),
            new ASTSwitchBranch(
              new ASTPatternConstructor(
                tok(T_UPPERID, 'Norte'),
                []
              ),
              new ASTStmtBlock([])
            ),
            new ASTSwitchBranch(
              new ASTPatternConstructor(
                tok(T_UPPERID, 'Cons'),
                [tok(T_LOWERID, 'x'), tok(T_LOWERID, 'xs')]
              ),
              new ASTStmtBlock([])
            ),
            new ASTSwitchBranch(
              new ASTPatternConstructor(
                tok(T_UPPERID, 'A'),
                [
                  tok(T_LOWERID, 'foo'),
                  tok(T_LOWERID, 'bar'),
                  tok(T_LOWERID, 'baz')
                ]
              ),
              new ASTStmtBlock([])
            ),
          ]
        )
      ])
    )
  ]);
});

it('Parser - Switch: tuples', () => {
  var parser = new Parser(
                 'program {' +
                 '  switch (foo) {' +
                 '    ()    -> {}' +
                 '    (x,y) -> {}' +
                 '    (foo, bar, baz) -> {}' +
                 '    _ -> {}' +
                 '  }' +
                 '}'
               );
  expectAST(parser.parse(), [
    new ASTDefProgram(
      new ASTStmtBlock([
        new ASTStmtSwitch(
          new ASTExprVariable(tok(T_LOWERID, 'foo')),
          [
            new ASTSwitchBranch(
              new ASTPatternTuple([]),
              new ASTStmtBlock([])
            ),
            new ASTSwitchBranch(
              new ASTPatternTuple([
                tok(T_LOWERID, 'x'),
                tok(T_LOWERID, 'y'),
              ]),
              new ASTStmtBlock([])
            ),
            new ASTSwitchBranch(
              new ASTPatternTuple([
                tok(T_LOWERID, 'foo'),
                tok(T_LOWERID, 'bar'),
                tok(T_LOWERID, 'baz'),
              ]),
              new ASTStmtBlock([])
            ),
            new ASTSwitchBranch(
              new ASTPatternWildcard(),
              new ASTStmtBlock([])
            )
          ]
        )
      ])
    )
  ]);
});

it('Parser - Switch: reject singleton tuple pattern', () => {
  var parser = new Parser(
                 'program {' +
                 '  switch (foo) {' +
                 '    (x)    -> {}' +
                 '  }' +
                 '}'
               );
  expect(() => parser.parse()).throws(
    i18n('errmsg:pattern-tuple-cannot-be-singleton')
  );
});

it('Parser - Switch: reject if missing braces', () => {
  var parser = new Parser(
                 'program {' +
                 '  switch (foo)' +
                 '    _ -> {}' +
                 '}'
               );
  expect(() => parser.parse()).throws(
    i18n('errmsg:expected-but-found')(
      i18n('T_LBRACE'),
      i18n('T_UNDERSCORE')
    )
  );
});

it('Parser - Switch: reject malformed pattern (single variable)', () => {
  var parser = new Parser(
                 'program {' +
                 '  switch (foo) {' +
                 '    x -> {}' +
                 '  }' +
                 '}'
               );
  expect(() => parser.parse()).throws(
    i18n('errmsg:expected-but-found')(
      i18n('pattern'),
      i18n('T_LOWERID')
    )
  );
});

it('Parser - Switch: reject malformed pattern (nested tuples)', () => {
  var parser = new Parser(
                 'program {' +
                 '  switch (foo) {' +
                 '    ((x,y),z) -> {}' +
                 '  }' +
                 '}'
               );
  expect(() => parser.parse()).throws(
    i18n('errmsg:expected-but-found')(
      i18n('T_LOWERID'),
      i18n('T_LPAREN')
    )
  );
});

it('Parser - Switch: keep track of positions', () => {
  var parser = new Parser(
                 'program {\n' +
                 '  switch (foo) {\n' +
                 '    A(b) -> {}\n' +
                 '  }\n' +
                 '}\n'
               );
  var tree = parser.parse();
  expect(tree[0].body.statements[0].startPos.line).equals(2);
  expect(tree[0].body.statements[0].startPos.column).equals(3);
  expect(tree[0].body.statements[0].endPos.line).equals(4);
  expect(tree[0].body.statements[0].endPos.column).equals(3);
});

it('Parser - Let: variable assignment', () => {
  var parser = new Parser(
                 'program {' +
                 '  let foo := bar' +
                 '  let bar := baz' +
                 '}\n'
               );
  expectAST(parser.parse(), [
    new ASTDefProgram(
      new ASTStmtBlock([
        new ASTStmtAssignVariable(
          tok(T_LOWERID, 'foo'),
          new ASTExprVariable(tok(T_LOWERID, 'bar')),
        ),
        new ASTStmtAssignVariable(
          tok(T_LOWERID, 'bar'),
          new ASTExprVariable(tok(T_LOWERID, 'baz')),
        )
      ])
    )
  ]);
});

it('Parser - Let: nullary tuple assignment', () => {
  var parser = new Parser(
                 'program {' +
                 '  let () := bar' +
                 '}\n'
               );
  expectAST(parser.parse(), [
    new ASTDefProgram(
      new ASTStmtBlock([
        new ASTStmtAssignTuple(
          [],
          new ASTExprVariable(tok(T_LOWERID, 'bar')),
        )
      ])
    )
  ]);
});

it('Parser - Let: tuple assignment', () => {
  var parser = new Parser(
                 'program {' +
                 '  let (x,y) := bar2' +
                 '  let (x,y,z) := bar3' +
                 '  let (x1,x2,x3,x4) := bar4' +
                 '}\n'
               );
  expectAST(parser.parse(), [
    new ASTDefProgram(
      new ASTStmtBlock([
        new ASTStmtAssignTuple(
          [
            tok(T_LOWERID, 'x'),
            tok(T_LOWERID, 'y'),
          ],
          new ASTExprVariable(tok(T_LOWERID, 'bar2')),
        ),
        new ASTStmtAssignTuple(
          [
            tok(T_LOWERID, 'x'),
            tok(T_LOWERID, 'y'),
            tok(T_LOWERID, 'z')
          ],
          new ASTExprVariable(tok(T_LOWERID, 'bar3')),
        ),
        new ASTStmtAssignTuple(
          [
            tok(T_LOWERID, 'x1'),
            tok(T_LOWERID, 'x2'),
            tok(T_LOWERID, 'x3'),
            tok(T_LOWERID, 'x4')
          ],
          new ASTExprVariable(tok(T_LOWERID, 'bar4')),
        )
      ])
    )
  ]);
});

it('Parser - Let: reject singleton tuple assignment', () => {
  var parser = new Parser(
                 'program {' +
                 '  let (foo) := bar' +
                 '}'
               );
  expect(() => parser.parse()).throws(
    i18n('errmsg:assignment-tuple-cannot-be-singleton')
  );
});

it('Parser - Let: keep track of positions', () => {
  var parser = new Parser(
                 'program {\n' +
                 '  let foo := bar\n' +
                 '  let (foo, bar) := baz\n' +
                 '}\n'
               );
  var tree = parser.parse();
  expect(tree[0].body.statements.length).equals(2);
  expect(tree[0].body.statements[0].startPos.line).equals(2);
  expect(tree[0].body.statements[0].startPos.column).equals(3);
  expect(tree[0].body.statements[0].endPos.line).equals(2);
  expect(tree[0].body.statements[0].endPos.column).equals(17);
  expect(tree[0].body.statements[1].startPos.line).equals(3);
  expect(tree[0].body.statements[1].startPos.column).equals(3);
  expect(tree[0].body.statements[1].endPos.line).equals(3);
  expect(tree[0].body.statements[1].endPos.column).equals(24);
});

it('Parser - Variable assignment', () => {
  var parser = new Parser(
                 'program {\n' +
                 '  a := b\n' +
                 '  b := c\n' +
                 '  c := d\n' +
                 '}\n'
               );
  expectAST(parser.parse(), [
    new ASTDefProgram(
      new ASTStmtBlock([
        new ASTStmtAssignVariable(
          tok(T_LOWERID, 'a'), new ASTExprVariable(tok(T_LOWERID, 'b'))
        ),
        new ASTStmtAssignVariable(
          tok(T_LOWERID, 'b'), new ASTExprVariable(tok(T_LOWERID, 'c'))
        ),
        new ASTStmtAssignVariable(
          tok(T_LOWERID, 'c'), new ASTExprVariable(tok(T_LOWERID, 'd'))
        )
      ])
    )
  ]);
});

it('Parser - Variable assignment: keep track of positions', () => {
  var parser = new Parser(
                 'program {\n' +
                 '  /**/\n' +
                 '  /**/foo\n' +
                 '  := bar/**/\n' +
                 '  /**/\n' +
                 '}\n'
               );
  var tree = parser.parse();
  expect(tree[0].body.statements.length).equals(1);
  expect(tree[0].body.statements[0].startPos.line).equals(3);
  expect(tree[0].body.statements[0].startPos.column).equals(7);
  expect(tree[0].body.statements[0].endPos.line).equals(4);
  expect(tree[0].body.statements[0].endPos.column).equals(9);
});

it('Parser - Procedure call', () => {
  var parser = new Parser(
                 'program {\n' +
                 '  VaciarTablero()\n' +
                 '  Mover(dir)\n' +
                 '  PonerN(n, col)\n' +
                 '  Q (a,b,c,d)\n' +
                 '}\n'
               );
  expectAST(parser.parse(), [
    new ASTDefProgram(
      new ASTStmtBlock([
        new ASTStmtProcedureCall(tok(T_UPPERID, 'VaciarTablero'), []),
        new ASTStmtProcedureCall(tok(T_UPPERID, 'Mover'), [
          new ASTExprVariable(tok(T_LOWERID, 'dir'))
        ]),
        new ASTStmtProcedureCall(tok(T_UPPERID, 'PonerN'), [
          new ASTExprVariable(tok(T_LOWERID, 'n')),
          new ASTExprVariable(tok(T_LOWERID, 'col'))
        ]),
        new ASTStmtProcedureCall(tok(T_UPPERID, 'Q'), [
          new ASTExprVariable(tok(T_LOWERID, 'a')),
          new ASTExprVariable(tok(T_LOWERID, 'b')),
          new ASTExprVariable(tok(T_LOWERID, 'c')),
          new ASTExprVariable(tok(T_LOWERID, 'd'))
        ])
      ])
    )
  ]);
});

it('Parser - Procedure call: reject if missing left parenthesis', () => {
  var parser = new Parser(
                 'program {\n' +
                 '  P\n' +
                 '}\n'
               );
  expect(() => parser.parse()).throws(
    i18n('errmsg:expected-but-found')(
      i18n('T_LPAREN'),
      i18n('T_RBRACE')
    )
  );
});

it('Parser - Procedure call: reject if missing right parenthesis', () => {
  var parser = new Parser(
                 'program {\n' +
                 '  P(\n' +
                 '}\n'
               );
  expect(() => parser.parse()).throws(
    i18n('errmsg:expected-but-found')(
      i18n('expression'),
      i18n('T_RBRACE')
    )
  );
});

it('Parser - Procedure call: keep track of positions', () => {
  var parser = new Parser('program{P(a,a,a)}');
  var tree = parser.parse();
  expect(tree[0].body.statements.length).equals(1);
  expect(tree[0].body.statements[0].startPos.line).equals(1);
  expect(tree[0].body.statements[0].startPos.column).equals(9);
  expect(tree[0].body.statements[0].endPos.line).equals(1);
  expect(tree[0].body.statements[0].endPos.column).equals(16);
});

it('Parser - Allow semicolon as statement separator', () => {
  var parser = new Parser(
                 'program {\n' +
                 '  P();Q();R();S()\n' +
                 '}'
               );
  expectAST(parser.parse(), [
    new ASTDefProgram(
      new ASTStmtBlock([
        new ASTStmtProcedureCall(tok(T_UPPERID, 'P'), []),
        new ASTStmtProcedureCall(tok(T_UPPERID, 'Q'), []),
        new ASTStmtProcedureCall(tok(T_UPPERID, 'R'), []),
        new ASTStmtProcedureCall(tok(T_UPPERID, 'S'), [])
      ])
    )
  ]);
});

it('Parser - Function call', () => {
  var parser = new Parser(
                 'program {\n' +
                 '  a1 := f()\n' +
                 '  a2 := g(x)\n' +
                 '  a3 := h(x, y)\n' +
                 '  a4 := i(x, y, z)\n' +
                 '}'
               );
  expectAST(parser.parse(), [
    new ASTDefProgram(
      new ASTStmtBlock([
        new ASTStmtAssignVariable(
          tok(T_LOWERID, 'a1'),
          new ASTExprFunctionCall(tok(T_LOWERID, 'f'), [])
        ),
        new ASTStmtAssignVariable(
          tok(T_LOWERID, 'a2'),
          new ASTExprFunctionCall(tok(T_LOWERID, 'g'), [
            new ASTExprVariable(tok(T_LOWERID, 'x'))
          ])
        ),
        new ASTStmtAssignVariable(
          tok(T_LOWERID, 'a3'),
          new ASTExprFunctionCall(tok(T_LOWERID, 'h'), [
            new ASTExprVariable(tok(T_LOWERID, 'x')),
            new ASTExprVariable(tok(T_LOWERID, 'y')),
          ])
        ),
        new ASTStmtAssignVariable(
          tok(T_LOWERID, 'a4'),
          new ASTExprFunctionCall(tok(T_LOWERID, 'i'), [
            new ASTExprVariable(tok(T_LOWERID, 'x')),
            new ASTExprVariable(tok(T_LOWERID, 'y')),
            new ASTExprVariable(tok(T_LOWERID, 'z'))
          ])
        ),
      ])
    )
  ]);
});

it('Parser - Function call: occurrences in various constructions', () => {
  var parser = new Parser(
                 'program {\n' +
                 '  if (f1()) {}\n' +
                 '  repeat (f2()) {}\n' +
                 '  foreach i in f3() {}\n' +
                 '  while (f4()) {}\n' +
                 '  switch (f5()) {}\n' +
                 '  x := f6()\n' +
                 '  let (x, y) := f7()\n' +
                 '  P(f8(), f9())\n' +
                 '  return (f10())\n' +
                 '}'
               );
  expectAST(parser.parse(), [
    new ASTDefProgram(
      new ASTStmtBlock([
        new ASTStmtIf(
          new ASTExprFunctionCall(tok(T_LOWERID, 'f1'), []),
          new ASTStmtBlock([]),
          null
        ),
        new ASTStmtRepeat(
          new ASTExprFunctionCall(tok(T_LOWERID, 'f2'), []),
          new ASTStmtBlock([]),
        ),
        new ASTStmtForeach(
          tok(T_LOWERID, 'i'),
          new ASTExprFunctionCall(tok(T_LOWERID, 'f3'), []),
          new ASTStmtBlock([]),
        ),
        new ASTStmtWhile(
          new ASTExprFunctionCall(tok(T_LOWERID, 'f4'), []),
          new ASTStmtBlock([]),
        ),
        new ASTStmtSwitch(
          new ASTExprFunctionCall(tok(T_LOWERID, 'f5'), []),
          [],
        ),
        new ASTStmtAssignVariable(
          tok(T_LOWERID, 'x'),
          new ASTExprFunctionCall(tok(T_LOWERID, 'f6'), [])
        ),
        new ASTStmtAssignTuple(
          [tok(T_LOWERID, 'x'), tok(T_LOWERID, 'y')],
          new ASTExprFunctionCall(tok(T_LOWERID, 'f7'), [])
        ),
        new ASTStmtProcedureCall(
          tok(T_UPPERID, 'P'),
          [
            new ASTExprFunctionCall(tok(T_LOWERID, 'f8'), []),
            new ASTExprFunctionCall(tok(T_LOWERID, 'f9'), [])
          ]
        ),
        new ASTStmtReturn(
          new ASTExprFunctionCall(tok(T_LOWERID, 'f10'), []),
        )
      ])
    )
  ]);
});

it('Parser - Function call: nested calls', () => {
  var parser = new Parser(
                 'program {\n' +
                 '  x := f(g(h(a),i(b,c)),j(k(),l()),d)\n' +
                 '}'
               );
  expectAST(parser.parse(), [
    new ASTDefProgram(
      new ASTStmtBlock([
        new ASTStmtAssignVariable(
          tok(T_LOWERID, 'x'),
          new ASTExprFunctionCall(tok(T_LOWERID, 'f'), [
            new ASTExprFunctionCall(tok(T_LOWERID, 'g'), [
              new ASTExprFunctionCall(tok(T_LOWERID, 'h'), [
                new ASTExprVariable(tok(T_LOWERID, 'a'))
              ]),
              new ASTExprFunctionCall(tok(T_LOWERID, 'i'), [
                new ASTExprVariable(tok(T_LOWERID, 'b')),
                new ASTExprVariable(tok(T_LOWERID, 'c'))
              ]),
            ]),
            new ASTExprFunctionCall(tok(T_LOWERID, 'j'), [
              new ASTExprFunctionCall(tok(T_LOWERID, 'k'), [
              ]),
              new ASTExprFunctionCall(tok(T_LOWERID, 'l'), [
              ])
            ]),
            new ASTExprVariable(tok(T_LOWERID, 'd'))
          ])
        )
      ])
    )
  ]);
});

it('Parser - Function call: keep track of positions', () => {
  var parser = new Parser(
                 '\nprogram {\n' +
                 '  x := f(/*)*/)\n' +
                 '}'
               );
  var tree = parser.parse();
  expect(tree[0].body.statements[0].value.startPos.line).equals(3);
  expect(tree[0].body.statements[0].value.startPos.column).equals(8);
  expect(tree[0].body.statements[0].value.endPos.line).equals(3);
  expect(tree[0].body.statements[0].value.endPos.column).equals(15);
});

it('Parser - Number constant', () => {
  var parser = new Parser(
                 'program {\n' +
                 '  x1 := 0\n' +
                 '  x2 := 11\n' +
                 '  x3 := 123\n' +
                 '  x4 := 11223344556677889900998877665544332211\n' +
                 '}'
               );
  expectAST(parser.parse(), [
    new ASTDefProgram(
      new ASTStmtBlock([
        new ASTStmtAssignVariable(
          tok(T_LOWERID, 'x1'),
          new ASTExprConstantNumber(tok(T_NUM, '0'))
        ),
        new ASTStmtAssignVariable(
          tok(T_LOWERID, 'x2'),
          new ASTExprConstantNumber(tok(T_NUM, '11'))
        ),
        new ASTStmtAssignVariable(
          tok(T_LOWERID, 'x3'),
          new ASTExprConstantNumber(tok(T_NUM, '123'))
        ),
        new ASTStmtAssignVariable(
          tok(T_LOWERID, 'x4'),
          new ASTExprConstantNumber(
            tok(T_NUM, '11223344556677889900998877665544332211')
          )
        ),
      ])
    )
  ]);
});

it('Parser - Number constant: keep track of positions', () => {
  var parser = new Parser(
                 'program {\n' +
                 '  x := 0\n' +
                 '  y := 123\n' +
                 '}'
               );
  var tree = parser.parse();
  expect(tree[0].body.statements[0].value.startPos.line).equals(2);
  expect(tree[0].body.statements[0].value.startPos.column).equals(8);
  expect(tree[0].body.statements[0].value.endPos.line).equals(2);
  expect(tree[0].body.statements[0].value.endPos.column).equals(9);
  expect(tree[0].body.statements[1].value.startPos.line).equals(3);
  expect(tree[0].body.statements[1].value.startPos.column).equals(8);
  expect(tree[0].body.statements[1].value.endPos.line).equals(3);
  expect(tree[0].body.statements[1].value.endPos.column).equals(11);
});


it('Parser - String constant', () => {
  var parser = new Parser(
                 'program {\n' +
                 '  x1 := ""\n' +
                 '  x2 := "a"\n' +
                 '  x3 := "abc"\n' +
                 '  x4 := "hola /**/ \\\"mundo\\\"\\n"\n' +
                 '}'
               );
  expectAST(parser.parse(), [
    new ASTDefProgram(
      new ASTStmtBlock([
        new ASTStmtAssignVariable(
          tok(T_LOWERID, 'x1'),
          new ASTExprConstantString(tok(T_STRING, ''))
        ),
        new ASTStmtAssignVariable(
          tok(T_LOWERID, 'x2'),
          new ASTExprConstantString(tok(T_STRING, 'a'))
        ),
        new ASTStmtAssignVariable(
          tok(T_LOWERID, 'x3'),
          new ASTExprConstantString(tok(T_STRING, 'abc'))
        ),
        new ASTStmtAssignVariable(
          tok(T_LOWERID, 'x4'),
          new ASTExprConstantString(tok(T_STRING, 'hola /**/ \"mundo\"\n'))
        ),
      ])
    )
  ]);
});

it('Parser - String constant: keep track of positions', () => {
  var parser = new Parser(
                 'program {\n' +
                 '  x := "...\\n..."\n' +
                 '}'
               );
  var tree = parser.parse();
  expect(tree[0].body.statements.length).equals(1);
  expect(tree[0].body.statements[0].value.startPos.line).equals(2);
  expect(tree[0].body.statements[0].value.startPos.column).equals(8);
  expect(tree[0].body.statements[0].value.endPos.line).equals(2);
  expect(tree[0].body.statements[0].value.endPos.column).equals(18);
});

it('Parser - Constructor with no arguments, no parentheses', () => {
  var parser = new Parser(
                 'program {\n' +
                 '  x := Norte\n' +
                 '}'
               );
  expectAST(parser.parse(), [
    new ASTDefProgram(
      new ASTStmtBlock([
        new ASTStmtAssignVariable(
          tok(T_LOWERID, 'x'),
          new ASTExprConstructor(tok(T_UPPERID, 'Norte'), [])
        )
      ])
    )
  ]);
});

it('Parser - Constructor with no arguments, parentheses', () => {
  var parser = new Parser(
                 'program {\n' +
                 '  x := Norte()\n' +
                 '}'
               );
  expectAST(parser.parse(), [
    new ASTDefProgram(
      new ASTStmtBlock([
        new ASTStmtAssignVariable(
          tok(T_LOWERID, 'x'),
          new ASTExprConstructor(tok(T_UPPERID, 'Norte'), [])
        )
      ])
    )
  ]);
});

it('Parser - Constructor: fail if it seems a procedure call (paren)', () => {
  var parser = new Parser(
                 'program {\n' +
                 '  x := P(1)\n' +
                 '}'
               );
  expect(() => parser.parse()).throws(
    i18n('errmsg:expected-but-found')(
      i18n('expression'),
      i18n('procedure call')
    )
  );
});

it('Parser - Constructor: fail if it seems a procedure call (comma)', () => {
  var parser = new Parser(
                 'program {\n' +
                 '  x := P(1, 2)\n' +
                 '}'
               );
  expect(() => parser.parse()).throws(
    i18n('errmsg:expected-but-found')(
      i18n('expression'),
      i18n('procedure call')
    )
  );
});

it('Parser - Constructor: fail: field name followed by invalid symbol', () => {
  var parser = new Parser(
                 'program {\n' +
                 '  x := Coord(x -> 2)\n' +
                 '}'
               );
  expect(() => parser.parse()).throws(
    i18n('errmsg:expected-but-found')(
      i18n('<alternative>')([
        i18n('T_GETS'),
        i18n('T_PIPE')
      ]),
      i18n('T_ARROW')
    )
  );
});

it('Parser - Constructor: fail: expression followed by invalid symbol', () => {
  var parser = new Parser(
                 'program {\n' +
                 '  x := Coord(foo() -> 2)\n' +
                 '}'
               );
  expect(() => parser.parse()).throws(
    i18n('errmsg:expected-but-found')(
      i18n('T_PIPE'),
      i18n('T_ARROW')
    )
  );
});

it('Parser - Constructor: fail: expression followed by "<-"', () => {
  var parser = new Parser(
                 'program {\n' +
                 '  x := Coord(foo() <- 3)\n' +
                 '}'
               );
  expect(() => parser.parse()).throws(
    i18n('errmsg:expected-but-found')(
      i18n('T_PIPE'),
      i18n('T_GETS')
    )
  );
});

it('Parser - Constructor: one field', () => {
  var parser = new Parser(
                 'program {\n' +
                 '  c := Coord(x <- 1)\n' +
                 '}'
               );
  expectAST(parser.parse(), [
    new ASTDefProgram(
      new ASTStmtBlock([
        new ASTStmtAssignVariable(
          tok(T_LOWERID, 'c'),
          new ASTExprConstructor(tok(T_UPPERID, 'Coord'), [
            new ASTFieldValue(
              tok(T_LOWERID, 'x'),
              new ASTExprConstantNumber(tok(T_NUM, '1'))
            )
          ])
        )
      ])
    )
  ]);
});

it('Parser - Constructor: two fields', () => {
  var parser = new Parser(
                 'program {\n' +
                 '  c := Coord(x <- 1, y <- 2)\n' +
                 '}'
               );
  expectAST(parser.parse(), [
    new ASTDefProgram(
      new ASTStmtBlock([
        new ASTStmtAssignVariable(
          tok(T_LOWERID, 'c'),
          new ASTExprConstructor(tok(T_UPPERID, 'Coord'), [
            new ASTFieldValue(
              tok(T_LOWERID, 'x'),
              new ASTExprConstantNumber(tok(T_NUM, '1'))
            ),
            new ASTFieldValue(
              tok(T_LOWERID, 'y'),
              new ASTExprConstantNumber(tok(T_NUM, '2'))
            )
          ])
        )
      ])
    )
  ]);
});

it('Parser - Constructor: three fields', () => {
  var parser = new Parser(
                 'program {\n' +
                 '  c := Coord(x<-1,y<-2,z<-3)\n' +
                 '}'
               );
  expectAST(parser.parse(), [
    new ASTDefProgram(
      new ASTStmtBlock([
        new ASTStmtAssignVariable(
          tok(T_LOWERID, 'c'),
          new ASTExprConstructor(tok(T_UPPERID, 'Coord'), [
            new ASTFieldValue(
              tok(T_LOWERID, 'x'),
              new ASTExprConstantNumber(tok(T_NUM, '1'))
            ),
            new ASTFieldValue(
              tok(T_LOWERID, 'y'),
              new ASTExprConstantNumber(tok(T_NUM, '2'))
            ),
            new ASTFieldValue(
              tok(T_LOWERID, 'z'),
              new ASTExprConstantNumber(tok(T_NUM, '3'))
            )
          ])
        )
      ])
    )
  ]);
});

it('Parser - Constructor: reject dangling comma (one argument)', () => {
  var parser = new Parser(
                 'program {\n' +
                 '  c := Coord(x<-1,)\n' +
                 '}'
               );
  expect(() => parser.parse()).throws(
    i18n('errmsg:expected-but-found')(
      i18n('T_LOWERID'),
      i18n('T_RPAREN')
    )
  );
});

it('Parser - Constructor: reject dangling comma (two arguments)', () => {
  var parser = new Parser(
                 'program {\n' +
                 '  c := Coord(x<-1,y<-2,)\n' +
                 '}'
               );
  expect(() => parser.parse()).throws(
    i18n('errmsg:expected-but-found')(
      i18n('T_LOWERID'),
      i18n('T_RPAREN')
    )
  );
});

it('Parser - Constructor: nested constructors', () => {
  var parser = new Parser(
                 'program {\n' +
                 '  c := Box(left<-Coord(x<-10,y<-20),\n' +
                 '           right<-Coord(x<-11,y<-22))\n' +
                 '}'
               );
  expectAST(parser.parse(), [
    new ASTDefProgram(
      new ASTStmtBlock([
        new ASTStmtAssignVariable(
          tok(T_LOWERID, 'c'),
          new ASTExprConstructor(tok(T_UPPERID, 'Box'), [
            new ASTFieldValue(
              tok(T_LOWERID, 'left'),
              new ASTExprConstructor(tok(T_UPPERID, 'Coord'), [
                new ASTFieldValue(
                  tok(T_LOWERID, 'x'),
                  new ASTExprConstantNumber(tok(T_NUM, '10'))
                ),
                new ASTFieldValue(
                  tok(T_LOWERID, 'y'),
                  new ASTExprConstantNumber(tok(T_NUM, '20'))
                )
              ])
            ),
            new ASTFieldValue(
              tok(T_LOWERID, 'right'),
              new ASTExprConstructor(tok(T_UPPERID, 'Coord'), [
                new ASTFieldValue(
                  tok(T_LOWERID, 'x'),
                  new ASTExprConstantNumber(tok(T_NUM, '11'))
                ),
                new ASTFieldValue(
                  tok(T_LOWERID, 'y'),
                  new ASTExprConstantNumber(tok(T_NUM, '22'))
                )
              ])
            )
          ])
        )
      ])
    )
  ]);
});

it('Parser - Constructor: keep track of positions', () => {
  var parser = new Parser(
                 'program {\n' +
                 '  c0 := A\n' +
                 '  c0 := B()\n' +
                 '  c1 := C(x <- 10)\n' +
                 '  c2 := D(y <- 20, z <- 30)\n' +
                 '}'
               );
  var tree = parser.parse();
  expect(tree[0].body.statements.length).equals(4);

  /* A */
  expect(tree[0].body.statements[0].value.startPos.line).equals(2);
  expect(tree[0].body.statements[0].value.startPos.column).equals(9);
  expect(tree[0].body.statements[0].value.endPos.line).equals(2);
  expect(tree[0].body.statements[0].value.endPos.column).equals(10);

  /* B() */
  expect(tree[0].body.statements[1].value.startPos.line).equals(3);
  expect(tree[0].body.statements[1].value.startPos.column).equals(9);
  expect(tree[0].body.statements[1].value.endPos.line).equals(3);
  expect(tree[0].body.statements[1].value.endPos.column).equals(11);

  /* C(x <- 10) */
  expect(tree[0].body.statements[2].value.startPos.line).equals(4);
  expect(tree[0].body.statements[2].value.startPos.column).equals(9);
  expect(tree[0].body.statements[2].value.endPos.line).equals(4);
  expect(tree[0].body.statements[2].value.endPos.column).equals(18);

  /* x <- 10 */
  var fvx = tree[0].body.statements[2].value.fieldValues[0];
  expect(fvx.startPos.line).equals(4);
  expect(fvx.startPos.column).equals(11);
  expect(fvx.endPos.line).equals(4);
  expect(fvx.endPos.column).equals(18);

  /* D(y <- 20, z <- 30) */
  expect(tree[0].body.statements[3].value.startPos.line).equals(5);
  expect(tree[0].body.statements[3].value.startPos.column).equals(9);
  expect(tree[0].body.statements[3].value.endPos.line).equals(5);
  expect(tree[0].body.statements[3].value.endPos.column).equals(27);

  /* y <- 20 */
  var fvy = tree[0].body.statements[3].value.fieldValues[0];
  expect(fvy.startPos.line).equals(5);
  expect(fvy.startPos.column).equals(11);
  expect(fvy.endPos.line).equals(5);
  expect(fvy.endPos.column).equals(18);

  /* z <- 30 */
  var fvz = tree[0].body.statements[3].value.fieldValues[1];
  expect(fvz.startPos.line).equals(5);
  expect(fvz.startPos.column).equals(20);
  expect(fvz.endPos.line).equals(5);
  expect(fvz.endPos.column).equals(27);
});

it('Parser - Constructor update', () => {
  var parser = new Parser(
                 'program {\n' +
                 '  c1 := Coord(c0 | x <- 10)\n' +
                 '  c2 := Coord(c1 | x <- 10, y <- 20)\n' +
                 '  c3 := Coord(c2 | )\n' +
                 '}'
               );
  expectAST(parser.parse(), [
    new ASTDefProgram(
      new ASTStmtBlock([
        new ASTStmtAssignVariable(
          tok(T_LOWERID, 'c1'),
          new ASTExprConstructorUpdate(
            tok(T_UPPERID, 'Coord'),
            new ASTExprVariable(tok(T_LOWERID, 'c0')),
            [
              new ASTFieldValue(
                tok(T_LOWERID, 'x'),
                new ASTExprConstantNumber(tok(T_NUM, '10'))
              )
            ]
          )
        ),
        new ASTStmtAssignVariable(
          tok(T_LOWERID, 'c2'),
          new ASTExprConstructorUpdate(
            tok(T_UPPERID, 'Coord'),
            new ASTExprVariable(tok(T_LOWERID, 'c1')),
            [
              new ASTFieldValue(
                tok(T_LOWERID, 'x'),
                new ASTExprConstantNumber(tok(T_NUM, '10'))
              ),
              new ASTFieldValue(
                tok(T_LOWERID, 'y'),
                new ASTExprConstantNumber(tok(T_NUM, '20'))
              ),
            ]
          )
        ),
        new ASTStmtAssignVariable(
          tok(T_LOWERID, 'c3'),
          new ASTExprConstructorUpdate(
            tok(T_UPPERID, 'Coord'),
            new ASTExprVariable(tok(T_LOWERID, 'c2')),
            [
            ]
          )
        ),
      ])
    )
  ]);
});

it('Parser - Constructor update: keep track of positions', () => {
  var parser = new Parser(
                 'program {\n' +
                 '  c1 := Coord(c0 |\n' +
                 '              x <- 12000)\n' +
                 '}'
               );
  var tree = parser.parse();
  expect(tree[0].body.statements[0].value.startPos.line).equals(2);
  expect(tree[0].body.statements[0].value.startPos.column).equals(9);
  expect(tree[0].body.statements[0].value.endPos.line).equals(3);
  expect(tree[0].body.statements[0].value.endPos.column).equals(25);
});

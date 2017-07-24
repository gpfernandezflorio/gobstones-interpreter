import { GbsWarning, GbsSyntaxError } from './exceptions';
import { Lexer } from './lexer';
import { i18n } from './i18n';
import {
  Token, T_EOF, T_NUM, T_STRING, T_LOWERID, T_UPPERID,
  /* Keywords */
  T_PROGRAM, T_INTERACTIVE, T_PROCEDURE, T_FUNCTION, T_RETURN,
  T_IF, T_THEN, T_ELSE, T_REPEAT, T_FOREACH, T_IN, T_WHILE,
  T_SWITCH, T_TO, T_LET, T_NOT, T_DIV, T_MOD, T_TYPE,
  T_IS, T_RECORD, T_VARIANT, T_CASE, T_FIELD, T_UNDERSCORE,
  /* Symbols */
  T_LPAREN, T_RPAREN, T_LBRACE, T_RBRACE, T_LBRACK, T_RBRACK, T_COMMA,
  T_SEMICOLON, T_RANGE, T_GETS, T_PIPE, T_ARROW, T_ASSIGN,
  T_EQ, T_NE, T_LE, T_GE, T_LT, T_GT, T_AND, T_OR, T_CONCAT, T_PLUS,
  T_MINUS, T_TIMES, T_POW
} from './token';
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
  ASTExprRange,
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
  //
  N_ExprVariable,
} from './ast';

const InfixL = Symbol.for('InfixL');
const InfixR = Symbol.for('InfixR');
const Infix = Symbol.for('Infix');
const Prefix = Symbol.for('Prefix');

class Operator {
  constructor(tag, functionName) {
    this._tag = tag;
    this._functionName = functionName;
  }
}

class PrecedenceLevel {
  constructor(fixity, operators) {
    this._fixity = fixity;
    this._operators = operators;
  }
}

/* OPERATORS is a list of precedence levels.
 * Precedence levels are ordered from lesser to greater precedence.
 */
const OPERATORS = [
  /* Logical operators */
  new PrecedenceLevel(InfixR, [new Operator(T_OR, '||')]),
  new PrecedenceLevel(InfixR, [new Operator(T_AND, '&&')]),
  new PrecedenceLevel(Prefix, [new Operator(T_NOT, 'not')]),
  /* Relational operators */
  new PrecedenceLevel(Infix, [
    new Operator(T_EQ, '=='),
    new Operator(T_NE, '/='),
    new Operator(T_LE, '<='),
    new Operator(T_GE, '>='),
    new Operator(T_LT, '<'),
    new Operator(T_GT, '>'),
  ]),
  /* List concatenation */
  new PrecedenceLevel(InfixL, [
    new Operator(T_CONCAT, '++'),
  ]),
  /* Additive operators */
  new PrecedenceLevel(InfixL, [
    new Operator(T_PLUS, '+'),
    new Operator(T_MINUS, '-'),
  ]),
  /* Multiplicative operators */
  new PrecedenceLevel(InfixL, [
    new Operator(T_TIMES, '*'),
  ]),
  /* Division operators */
  new PrecedenceLevel(InfixL, [
    new Operator(T_DIV, 'div'),
    new Operator(T_MOD, 'mod'),
  ]),
  /* Exponential operators */
  new PrecedenceLevel(InfixR, [
    new Operator(T_POW, '^'),
  ]),
  /* Unary minus */
  new PrecedenceLevel(Prefix, [
    new Operator(T_MINUS, '-(unary)'),
  ])
];

/* Represents a parser for a Gobstones/XGobstones program.
 * It is structured as a straightforward recursive-descent parser.
 *
 * The parameter 'input' may be either a string or a dictionary
 * mapping filenames to strings.
 *
 * All the "parseFoo" methods agree to the following convention:
 * - parseFoo returns an AST for a Foo construction,
 * - parseFoo consumes a fragment of the input by successively requesting
 *   the next token from the lexer,
 * - when calling parseFoo, the current token should already be located
 *   on the first token of the corresponding construction,
 * - when parseFoo returns, the current token is already located on
 *   the following token, after the corresponding construction.
 */
export class Parser {

  constructor(input) {
    this._lexer = new Lexer(input);
    this._nextToken();
  }

  /* Return the AST that results from parsing a full program */
  parse() {
    var definitions = [];
    while (this._currentToken.tag !== T_EOF) {
      definitions.push(this._parseDefinition());
    }
    if (definitions.length == 0) {
      throw new GbsSyntaxError(
                  this._currentToken.startPos,
                  i18n('errmsg:empty-source')
                );
    } else {
      return definitions;
    }
  }

  /** Definitions **/

  _parseDefinition() {
    switch (this._currentToken.tag) {
      case T_PROGRAM:
        return this._parseDefProgram();
      case T_INTERACTIVE:
        this._nextToken();
        throw Error('TODO');
      case T_PROCEDURE:
        return this._parseDefProcedure();
      case T_FUNCTION:
        return this._parseDefFunction();
      case T_TYPE:
        this._nextToken();
        throw Error('TODO');
      default:
        throw new GbsSyntaxError(
                    this._currentToken.startPos,
                    i18n('errmsg:expected-but-found')(
                      i18n('definition'),
                      i18n(Symbol.keyFor(this._currentToken.tag))
                    )
                  );
    }
  }

  _parseDefProgram() {
    var startPos = this._currentToken.startPos;
    this._match(T_PROGRAM);
    var block = this._parseStmtBlock();
    var result = new ASTDefProgram(block);
    result.startPos = startPos;
    result.endPos = block.endPos;
    return result;
  }

  _parseDefProcedure() {
    var startPos = this._currentToken.startPos;
    this._match(T_PROCEDURE);
    var name = this._currentToken;
    this._match(T_UPPERID);
    this._match(T_LPAREN);
    var parameters = this._parseLoweridList();
    this._match(T_RPAREN);
    var block = this._parseStmtBlock();
    var result = new ASTDefProcedure(name, parameters, block);
    result.startPos = startPos;
    result.endPos = block.endPos;
    return result;
  }

  _parseDefFunction() {
    var startPos = this._currentToken.startPos;
    this._match(T_FUNCTION);
    var name = this._currentToken;
    this._match(T_LOWERID);
    this._match(T_LPAREN);
    var parameters = this._parseLoweridList();
    this._match(T_RPAREN);
    var block = this._parseStmtBlock();
    var result = new ASTDefFunction(name, parameters, block);
    result.startPos = startPos;
    result.endPos = block.endPos;
    return result;
  }

  /** Statements **/

  /* Statement, optionally followed by semicolon */
  _parseStatement() {
    var statement = this._parsePureStatement();
    if (this._currentToken.tag === T_SEMICOLON) {
      this._match(T_SEMICOLON);
    }
    return statement;
  }

  /* Statement (not followed by semicolon) */
  _parsePureStatement() {
    switch (this._currentToken.tag) {
      case T_RETURN:
        return this._parseStmtReturn();
      case T_IF:
        return this._parseStmtIf();
      case T_REPEAT:
        return this._parseStmtRepeat();
      case T_FOREACH:
        return this._parseStmtForeach();
      case T_WHILE:
        return this._parseStmtWhile();
      case T_SWITCH:
        return this._parseStmtSwitch();
      case T_LET:
        return this._parseStmtLet();
      case T_LBRACE:
        return this._parseStmtBlock();
      case T_LOWERID:
        return this._parseStmtAssignVariable();
      case T_UPPERID:
        return this._parseStmtProcedureCall();
      default:
        throw new GbsSyntaxError(
                    this._currentToken.startPos,
                    i18n('errmsg:expected-but-found')(
                      i18n('statement'),
                      i18n(Symbol.keyFor(this._currentToken.tag))
                    )
                  );
    }
  }

  _parseStmtBlock() {
    var startPos = this._currentToken.startPos;
    var statements = [];
    this._match(T_LBRACE);
    while (this._currentToken.tag !== T_RBRACE) {
      statements.push(this._parseStatement());
      if (this._currentToken === T_SEMICOLON) {
        this._match(T_SEMICOLON);
      }
    }
    var endPos = this._currentToken.startPos; 
    this._match(T_RBRACE);
    var result = new ASTStmtBlock(statements);
    result.startPos = startPos;
    result.endPos = endPos;
    return result;
  }

  _parseStmtReturn() {
    var startPos = this._currentToken.startPos;
    this._match(T_RETURN);
    var tuple = this._parseExprTuple();
    var result = new ASTStmtReturn(tuple);
    result.startPos = startPos;
    result.endPos = tuple.endPos;
    return result;
  }

  _parseStmtIf() {
    var startPos = this._currentToken.startPos;
    this._match(T_IF);
    this._match(T_LPAREN);
    var condition = this._parseExpression();
    this._match(T_RPAREN);
    /* Optional 'then' */
    if (this._currentToken.tag === T_THEN) {
      this._match(T_THEN);
    }
    var thenBlock = this._parseStmtBlock();
    var endPos;
    var elseBlock;
    if (this._currentToken.tag === T_ELSE) {
      this._match(T_ELSE);
      elseBlock = this._parseStmtBlock();
      endPos = elseBlock.endPos
    } else {
      elseBlock = null;
      endPos = thenBlock.endPos;
    }
    var result = new ASTStmtIf(condition, thenBlock, elseBlock);
    result.startPos = startPos;
    result.endPos = endPos;
    return result;
  }

  _parseStmtRepeat() {
    var startPos = this._currentToken.startPos;
    this._match(T_REPEAT);
    this._match(T_LPAREN);
    var times = this._parseExpression();
    this._match(T_RPAREN);
    var body = this._parseStmtBlock();
    var result = new ASTStmtRepeat(times, body);
    result.startPos = startPos;
    result.endPos = body.endPos
    return result;
  }

  _parseStmtForeach() {
    var startPos = this._currentToken.startPos;
    this._match(T_FOREACH);
    var index = this._parseLowerid();
    this._match(T_IN);
    var range = this._parseExpression();
    var body = this._parseStmtBlock();
    var result = new ASTStmtForeach(index, range, body);
    result.startPos = startPos;
    result.endPos = body.endPos
    return result;
  }

  _parseStmtWhile() {
    var startPos = this._currentToken.startPos;
    this._match(T_WHILE);
    this._match(T_LPAREN);
    var condition = this._parseExpression();
    this._match(T_RPAREN);
    var body = this._parseStmtBlock();
    var result = new ASTStmtWhile(condition, body);
    result.startPos = startPos;
    result.endPos = body.endPos
    return result;
  }

  _parseStmtSwitch() {
    var startPos = this._currentToken.startPos;
    this._match(T_SWITCH);
    this._match(T_LPAREN);
    var subject = this._parseExpression();
    this._match(T_RPAREN);
    if (this._currentToken.tag === T_TO) {
      this._match(T_TO);
    }
    this._match(T_LBRACE);
    var branches = this._parseSwitchBranches();
    var endPos = this._currentToken.startPos;
    this._match(T_RBRACE);
    var result = new ASTStmtSwitch(subject, branches);
    result.startPos = startPos;
    result.endPos = endPos;
    return result;
  }

  _parseStmtLet() {
    var startPos = this._currentToken.startPos;
    this._match(T_LET);
    var result;
    if (this._currentToken.tag == T_LOWERID) {
      result = this._parseStmtAssignVariable();
    } else if (this._currentToken.tag == T_LPAREN) {
      result = this._parseStmtAssignTuple();
    } else {
      throw new GbsSyntaxError(
        this._currentToken.startPos,
        i18n('errmsg:expected-but-found')(
          i18n('<alternative>')(
            i18n('T_LOWERID'),
            i18n('T_LPAREN')
          ),
          i18n(Symbol.keyfor(this._currentToken.tag))
        )
      );
    }
    result.startPos = startPos;
    return result;
  }

  _parseStmtAssignVariable() {
    var variable = this._parseLowerid();
    this._match(T_ASSIGN);
    var value = this._parseExpression();
    let result = new ASTStmtAssignVariable(variable, value);
    result.startPos = variable.startPos;
    result.endPos = value.endPos;
    return result;
  }

  _parseStmtAssignTuple() {
    var startPos = this._currentToken.startPos;
    this._match(T_LPAREN);
    var variables = this._parseLoweridList();
    if (variables.length === 1) {
      throw new GbsSyntaxError(
        this._currentToken.startPos,
        i18n('errmsg:assignment-tuple-cannot-be-singleton')
      );
    }
    this._match(T_RPAREN);
    this._match(T_ASSIGN);
    var value = this._parseExpression();
    let result = new ASTStmtAssignTuple(variables, value);
    result.startPos = startPos;
    result.endPos = value.endPos;
    return result;
  }

  _parseStmtProcedureCall() {
    var procedureName = this._parseUpperid();
    this._match(T_LPAREN);
    let self = this;
    var args = this._parseDelimitedList(
                 T_RPAREN, T_COMMA,
                 () => self._parseExpression()
               );
    var endPos = this._currentToken.startPos;
    this._match(T_RPAREN);
    var result = new ASTStmtProcedureCall(procedureName, args);
    result.startPos = procedureName.startPos;
    result.endPos = endPos;
    return result;
  }

  /** Patterns **/

  _parsePattern() {
    if (this._currentToken.tag === T_UNDERSCORE) {
      return this._parsePatternWildcard();
    } else if (this._currentToken.tag === T_UPPERID) {
      return this._parsePatternConstructor();
    } else if (this._currentToken.tag === T_LPAREN) {
      return this._parsePatternTuple();
    } else {
      throw new GbsSyntaxError(
        this._currentToken.startPos,
        i18n('errmsg:expected-but-found')(
          i18n('pattern'),
          i18n(Symbol.keyFor(this._currentToken.tag))
        )
      );
    }
  }

  _parsePatternWildcard() {
    var startPos = this._currentToken.startPos;
    this._match(T_UNDERSCORE);
    var result = new ASTPatternWildcard();
    var endPos = startPos;
    result.startPos = startPos;
    result.endPos = endPos;
    return result;
  }

  _parsePatternConstructor() {
    var startPos = this._currentToken.startPos;
    var endPos = this._currentToken.startPos;
    var constructor = this._currentToken;
    this._match(T_UPPERID);
    var parameters;
    if (this._currentToken.tag === T_LPAREN) {
      this._match(T_LPAREN);
      parameters = this._parseLoweridList();
      endPos = this._currentToken.startPos;
      this._match(T_RPAREN);
    } else {
      parameters = [];
    }
    var result = new ASTPatternConstructor(constructor, parameters);
    result.startPos = startPos;
    result.endPos = endPos;
    return result;
  }

  _parsePatternTuple() {
    var startPos = this._currentToken.startPos;
    this._match(T_LPAREN);
    var parameters = this._parseLoweridList();
    if (parameters.length === 1) {
      throw new GbsSyntaxError(
        this._currentToken.startPos,
        i18n('errmsg:pattern-tuple-cannot-be-singleton')
      );
    }
    var endPos = this._currentToken.startPos;
    this._match(T_RPAREN);
    var result = new ASTPatternTuple(parameters);
    result.startPos = startPos;
    result.endPos = endPos;
    return result;
  }

  /** Expressions **/

  _parseExpression() {
    return this._parseExprAtom();
  }

  /* Parse an atomic expression.
   * I.e. all the operators must be surrounded by parentheses */
  _parseExprAtom() {
    switch (this._currentToken.tag) {
      case T_LOWERID:
        return this._parseExprVariableOrFunctionCall();
      case T_NUM:
        return this._parseExprConstantNumber();
      case T_STRING:
        return this._parseExprConstantString();
      case T_UPPERID:
        return this._parseExprConstructorOrConstructorUpdate();
      case T_LPAREN:
        // tuple / non-atomic expression with operators, following the
        // OPERATORS table
        throw Error('TODO');
      case T_LBRACK:
        return this._parseExprListOrRange();
      default:
        throw new GbsSyntaxError(
                    this._currentToken.startPos,
                    i18n('errmsg:expected-but-found')(
                      i18n('expression'),
                      i18n(Symbol.keyFor(this._currentToken.tag))
                    )
                  );
    }
  }

  _parseExprVariableOrFunctionCall() {
    var id = this._parseLowerid();
    var result;
    var endPos;
    if (this._currentToken.tag == T_LPAREN) {
      this._match(T_LPAREN);
      var args = this._parseExpressionList(T_RPAREN);
      result = new ASTExprFunctionCall(id, args);
      endPos = this._currentToken.startPos;
      this._match(T_RPAREN);
    } else {
      result = new ASTExprVariable(id);
      endPos = id.endPos;
    }
    result.startPos = id.startPos;
    result.endPos = endPos;
    return result;
  }

  _parseExprConstantNumber() {
    var number = this._currentToken;
    this._match(T_NUM);
    var result = new ASTExprConstantNumber(number);
    result.startPos = number.startPos;
    result.endPos = number.endPos;
    return result;
  }

  _parseExprConstantString() {
    var string = this._currentToken;
    this._match(T_STRING);
    var result = new ASTExprConstantString(string);
    result.startPos = string.startPos;
    result.endPos = string.endPos;
    return result;
  }

  /*
   * Parse any of the following constructions:
   * (1) Constructor with no arguments: "Norte"
   * (2) Constructor with no arguments and explicit parentheses: "Nil()"
   * (3) Constructor with arguments: "Coord(x <- 1, y <- 2)"
   * (4) Update constructor with arguments: "Coord(expression | x <- 2)"
   *
   * Deciding between (3) and (4) unfortunately cannot be done with one
   * token of lookahead, so after reading the constructor and a left
   * parenthesis we resort to the following workaround:
   *
   * - Parse an expression.
   * - If the next token is GETS ("<-") we are in case (3).
   *   We must then ensure that the expression is just a variable
   *   and recover its name.
   * - If the next token is PIPE ("|") we are in case (4), and we go on.
   */
  _parseExprConstructorOrConstructorUpdate() {
    var constructorName = this._parseUpperid();
    if (this._currentToken.tag !== T_LPAREN) {
      /* Constructor with no arguments, e.g. "Norte" */
      let result = new ASTExprConstructor(constructorName, []);
      result.startPos = constructorName.startPos;
      result.endPos = constructorName.endPos;
      return result;
    }
    this._match(T_LPAREN);
    if (this._currentToken.tag === T_RPAREN) {
      /* Constructor with no arguments with explicit parentheses,
       * e.g. "Nil()" */
      let result = new ASTExprConstructor(constructorName, []);
      let endPos = this._currentToken.startPos;
      this._match(T_RPAREN);
      result.startPos = constructorName.startPos;
      result.endPos = endPos;
      return result;
    }
    var subject = this._parseExpression();
    switch (this._currentToken.tag) {
      case T_GETS:
        if (subject.tag !== N_ExprVariable) {
          throw new GbsSyntaxError(
            this._currentToken.startPos,
            i18n('errmsg:expected-but-found')(
              i18n('T_PIPE'),
              i18n('T_GETS')
            )
          );
        }
        return this._parseConstructor(constructorName, subject.variableName);
      case T_PIPE:
        return this._parseConstructorUpdate(constructorName, subject);
      case T_COMMA: case T_RPAREN:
        /* Issue a specific error message to deal with a common
         * programming error, namely calling a procedure name
         * where an expression is expected. */
        throw new GbsSyntaxError(
          constructorName.startPos,
          i18n('errmsg:expected-but-found')(
            i18n('expression'),
            i18n('procedure call')
          )
        );
      default:
        var expected;
        if (subject.tag === N_ExprVariable) {
          expected = i18n('<alternative>')([
                       i18n('T_GETS'),
                       i18n('T_PIPE')
                     ]);
        } else {
          expected = i18n('T_PIPE');
        }
        throw new GbsSyntaxError(
          constructorName.startPos,
          i18n('errmsg:expected-but-found')(
            expected,
            i18n(Symbol.keyFor(this._currentToken.tag))
          )
        );
    }
  }

  /* Parse a constructor   A(x1 <- expr1, ..., xN <- exprN)
   * where N >= 1,
   * assuming that  "A(x1" has already been read.
   *
   * constructorName and fieldName1 correspond to "A" and "x1"
   * respectively.
   */
  _parseConstructor(constructorName, fieldName1) {
    /* Read "<- expr1" */
    this._match(T_GETS);
    let value1 = this._parseExpression();
    let fieldValue1 = new ASTFieldValue(fieldName1, value1);
    fieldValue1.startPos = fieldName1.startPos;
    fieldValue1.endPos = value1.endPos;
    /* Read "x2 <- expr2, ..., xN <- exprN" (this might be empty) */
    let self = this;
    let fieldValues = this._parseNonEmptyDelimitedList(
                        T_RPAREN, T_COMMA, [fieldValue1],
                        () => self._parseFieldValue()
                      );
    /* Read ")" */
    let endPos = this._currentToken.startPos;
    this._match(T_RPAREN);
    /* Return an ExprConstructor node */
    let result = new ASTExprConstructor(constructorName, fieldValues);
    result.startPos = constructorName.startPos;
    result.endPos = endPos;
    return result;
  }

  /* Parse a constructor update  A(e | x1 <- expr1, ..., xN <- exprN)
   * where N >= 1,
   * assuming that "A(e" has already been read.
   *
   * constructorName and original correspond to "A" and "e"
   * respectively.
   */
  _parseConstructorUpdate(constructorName, original) {
    /* Read "|" */
    this._match(T_PIPE);
    /* Read "x2 <- expr2, ..., xN <- exprN" (this might be empty) */
    let self = this;
    let fieldValues = this._parseDelimitedList(
                        T_RPAREN, T_COMMA,
                        () => self._parseFieldValue()
                      );
    /* Read ")" */
    let endPos = this._currentToken.startPos;
    this._match(T_RPAREN);
    /* Return an ExprConstructorUpdate node */
    let result = new ASTExprConstructorUpdate(
                      constructorName, original, fieldValues
                 );
    result.startPos = constructorName.startPos;
    result.endPos = endPos;
    return result;
  }

  /* Read a list
   *   [expr1, ..., exprN]
   * a range expression
   *   [first .. last]
   * or a range expression with step
   *   [first, second .. last]
   */
  _parseExprListOrRange() {
    var startPos = this._currentToken.startPos;
    this._match(T_LBRACK);
    if (this._currentToken.tag === T_RBRACK) {
      return this._parseExprListRemainder(startPos, []);
    }
    var first = this._parseExpression();
    switch (this._currentToken.tag) {
      case T_RBRACK:
        return this._parseExprListRemainder(startPos, [first]);
      case T_RANGE:
        return this._parseExprRange(startPos, first, null);
      case T_COMMA:
        this._match(T_COMMA);
        var second = this._parseExpression();
        switch (this._currentToken.tag) {
          case T_RBRACK:
          case T_COMMA:
            return this._parseExprListRemainder(startPos, [first, second]);
          case T_RANGE:
            return this._parseExprRange(startPos, first, second);
          default:
            throw new GbsSyntaxError(
              startPos,
              i18n('errmsg:expected-but-found')(
                i18n('<alternative>')([
                  i18n('T_COMMA'),
                  i18n('T_RANGE'),
                  i18n('T_RBRACK')
                ]),
                i18n(Symbol.keyFor(this._currentToken.tag))
              )
            );
        }
      default:
        throw new GbsSyntaxError(
          startPos,
          i18n('errmsg:expected-but-found')(
            i18n('<alternative>')([
              i18n('T_COMMA'),
              i18n('T_RANGE'),
              i18n('T_RBRACK')
            ]),
            i18n(Symbol.keyFor(this._currentToken.tag))
          )
        );
    }
  }

  /* Read the end of a list "[expr1, ..., exprN]" assumming we have
   * already read "[expr1, ..., exprK" up to some point K >= 1.
   * - startPos is the position of "["
   * - prefix is the list of elements we have already read
   */
  _parseExprListRemainder(startPos, prefix) {
    let self = this;
    var elements = this._parseNonEmptyDelimitedList(
                     T_RBRACK, T_COMMA, prefix,
                     () => self._parseExpression()
                   );
    var endPos = this._currentToken.startPos;
    this._match(T_RBRACK);
    var result = new ASTExprList(elements);
    result.startPos = startPos;
    result.endPos = endPos;
    return result;
  }

  /* Read a range "[first..last]" or "[first,second..last]"
   * assumming we are left to read "..last]"
   * - startPos is the position of "[".
   * - second may be null */
  _parseExprRange(startPos, first, second) {
    this._match(T_RANGE);
    var last = this._parseExpression();
    let endPos = this._currentToken.startPos;
    this._match(T_RBRACK);
    let result = new ASTExprRange(first, second, last);
    result.startPos = startPos;
    result.endPos = endPos;
    return result;
  }

  /* Read a list of expressions separated by commas and delimited
   * by parentheses. If there is a single expression, return the
   * expression itself. If there are 0 or >=2 expressions, return
   * a tuple.
   */
  _parseExprTuple() {
    var startPos = this._currentToken.startPos;
    this._match(T_LPAREN);
    var expressionList = this._parseExpressionList(T_RPAREN);
    var endPos = this._currentToken.startPos;
    this._match(T_RPAREN);

    var result;
    if (expressionList.length == 1) {
      result = expressionList[0];
    } else {
      result = new ASTExprTuple(expressionList);
    }
    result.startPos = startPos;
    result.endPos = endPos;
    return result;
  }

  /** SwitchBranch **/

  _parseSwitchBranches() {
    var branches = []
    while (this._currentToken.tag !== T_RBRACE) {
      branches.push(this._parseSwitchBranch());
    }
    return branches;
  }

  _parseSwitchBranch() {
    var pattern = this._parsePattern();
    this._match(T_ARROW);
    var body = this._parseStmtBlock();
    var result = new ASTSwitchBranch(pattern, body);
    result.startPos = pattern.startPos;
    result.endPos = body.endPos;
    return result;
  }

  /** FieldValue **/

  _parseFieldValue() {
    var fieldName = this._parseLowerid();
    this._match(T_GETS);
    var value = this._parseExpression();
    var result = new ASTFieldValue(fieldName, value);
    result.startPos = fieldName.startPos;
    result.endPos = value.endPos;
    return result;
  }

  /** Helpers **/

  /* Advance to the next token */
  _nextToken() {
    this._currentToken = this._lexer.nextToken();
  }

  /* Check that the current token has the expected tag.
   * Then advance to the next token. */
  _match(tokenTag) {
    if (this._currentToken.tag !== tokenTag) {
      throw new GbsSyntaxError(
                  this._currentToken.startPos,
                  i18n('errmsg:expected-but-found')(
                    i18n(Symbol.keyFor(tokenTag)),
                    i18n(Symbol.keyFor(this._currentToken.tag))
                  )
                );
    }
    this._nextToken();
  }

  /* Check that the current token has the expected tag.
   * Then advance to the next token.
   * Otherwise report that any of the alternatives in the tagList
   * was expected.
   */
  _matchExpected(tokenTag, tagList) {
    if (this._currentToken.tag !== tokenTag) {
      throw new GbsSyntaxError(
                  this._currentToken.startPos,
                  i18n('errmsg:expected-but-found')(
                    i18n('<alternative>')(
                      tagList.map(tag => i18n(Symbol.keyFor(tag)))
                    ),
                    i18n(Symbol.keyFor(this._currentToken.tag))
                  )
                );
    }
    this._nextToken();
  }

  /* Parse a delimited list:
   *   rightDelimiter: token tag for the right delimiter
   *   separator: token tag for the separator
   *   parseElement: function that parses one element */
  _parseDelimitedList(rightDelimiter, separator, parseElement) {
    if (this._currentToken.tag === rightDelimiter) {
      return []; /* Empty case */
    }
    let first = parseElement();
    return this._parseNonEmptyDelimitedList(
             rightDelimiter, separator, [first], parseElement
           );
  }

  /* Parse a delimited list, assuming the first elements are already given.
   *   rightDelimiter: token tag for the right delimiter
   *   separator: token tag for the separator
   *   prefix: non-empty list of all the first elements (already given)
   *   parseElement: function that parses one element */
  _parseNonEmptyDelimitedList(rightDelimiter, separator, prefix, parseElement) {
    var list = prefix;
    while (this._currentToken.tag === separator) {
      this._match(separator);
      list.push(parseElement());
    }
    if (this._currentToken.tag !== rightDelimiter) {
      throw new GbsSyntaxError(
                  this._currentToken.startPos,
                  i18n('errmsg:expected-but-found')(
                    i18n('<alternative>')([
                      i18n(Symbol.keyFor(separator)),
                      i18n(Symbol.keyFor(rightDelimiter))
                    ]),
                    i18n(Symbol.keyFor(this._currentToken.tag))
                  )
                );
    }
    return list;
  }

  _parseLowerid() {
    var lowerid = this._currentToken;
    this._match(T_LOWERID);
    return lowerid;
  }

  _parseUpperid() {
    var upperid = this._currentToken;
    this._match(T_UPPERID);
    return upperid;
  }

  _parseLoweridList() {
    let self = this;
    return this._parseDelimitedList(
             T_RPAREN, T_COMMA, () => self._parseLowerid()
           );
  }

  /* Parse a list of expressions delimited by the given right delimiter
   * e.g. T_RPAREN or T_RBRACK, without consuming the delimiter. */
  _parseExpressionList(rightDelimiter) {
    let self = this;
    return this._parseDelimitedList(
             rightDelimiter, T_COMMA, () => self._parseExpression()
           );
  }

}


/**
 * Industrial-grade safe expression parser (Lexer + Recursive Descent)
 * Supports arithmetic, brackets, and registered functions.
 * NO eval() or new Function().
 */

type TokenType = 'NUMBER' | 'ID' | 'OPERATOR' | 'LPAREN' | 'RPAREN' | 'COMMA' | 'EOF';

interface Token {
  type: TokenType;
  value: string;
}

class Lexer {
  private pos = 0;
  constructor(private input: string) {}

  private isDigit(c: string) { return /[0-9.]/.test(c); }
  private isAlpha(c: string) { return /[a-zA-Z_]/.test(c); }
  private isIdChar(c: string) { return /[a-zA-Z0-9_-]/.test(c); }

  tokenize(): Token[] {
    const tokens: Token[] = [];
    while (this.pos < this.input.length) {
      const char = this.input[this.pos];

      if (/\s/.test(char)) { this.pos++; continue; }

      if (this.isDigit(char)) {
        let num = '';
        while (this.pos < this.input.length && this.isDigit(this.input[this.pos])) {
          num += this.input[this.pos++];
        }
        tokens.push({ type: 'NUMBER', value: num });
        continue;
      }

      if (char === '[') {
        this.pos++;
        let id = '';
        while (this.pos < this.input.length && this.input[this.pos] !== ']') {
          id += this.input[this.pos++];
        }
        this.pos++; // skip ]
        tokens.push({ type: 'ID', value: id });
        continue;
      }

      if (this.isAlpha(char)) {
        let func = '';
        while (this.pos < this.input.length && this.isIdChar(this.input[this.pos])) {
          func += this.input[this.pos++];
        }
        tokens.push({ type: 'ID', value: func });
        continue;
      }

      if ('+-*/^'.includes(char)) {
        tokens.push({ type: 'OPERATOR', value: char });
        this.pos++;
        continue;
      }

      if (char === '(') { tokens.push({ type: 'LPAREN', value: '(' }); this.pos++; continue; }
      if (char === ')') { tokens.push({ type: 'RPAREN', value: ')' }); this.pos++; continue; }
      if (char === ',') { tokens.push({ type: 'COMMA', value: ',' }); this.pos++; continue; }

      throw new Error(`Caractere inválido: ${char}`);
    }
    tokens.push({ type: 'EOF', value: '' });
    return tokens;
  }
}

export class Parser {
  private tokens: Token[];
  private pos = 0;

  constructor(tokens: Token[], private context: Record<string, any>) {
    this.tokens = tokens;
  }

  private peek() { return this.tokens[this.pos]; }
  private consume() { return this.tokens[this.pos++]; }

  parseExpr(): any { return this.parseAddition(); }

  private parseAddition(): any {
    let left = this.parseMultiplication();
    while (this.peek().type === 'OPERATOR' && (this.peek().value === '+' || this.peek().value === '-')) {
      const op = this.consume().value;
      const right = this.parseMultiplication();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  private parseMultiplication(): any {
    let left = this.parsePower();
    while (this.peek().type === 'OPERATOR' && (this.peek().value === '*' || this.peek().value === '/')) {
      const op = this.consume().value;
      const right = this.parsePower();
      left = op === '*' ? left * right : left / right;
    }
    return left;
  }

  private parsePower(): any {
    let left = this.parsePrimary();
    while (this.peek().type === 'OPERATOR' && this.peek().value === '^') {
      this.consume();
      const right = this.parsePrimary();
      left = Math.pow(left, right);
    }
    return left;
  }

  private parsePrimary(): any {
    const token = this.consume();
    if (token.type === 'NUMBER') return parseFloat(token.value);
    
    if (token.type === 'ID') {
      // Function call?
      if (this.peek().type === 'LPAREN') {
        this.consume(); // (
        const args: any[] = [];
        if (this.peek().type !== 'RPAREN') {
          args.push(this.parseExpr());
          while (this.peek().type === 'COMMA') {
            this.consume();
            args.push(this.parseExpr());
          }
        }
        if (this.consume().type !== 'RPAREN') throw new Error('Esperado ")"');
        return this.callFunction(token.value, args);
      }
      
      // Variable access
      if (!(token.value in this.context)) {
         // Fallback for missing refs (might be 0 or null depending on rule)
         return 0;
      }
      return this.context[token.value];
    }

    if (token.type === 'LPAREN') {
      const val = this.parseExpr();
      if (this.consume().type !== 'RPAREN') throw new Error('Esperado ")"');
      return val;
    }

    if (token.type === 'OPERATOR' && token.value === '-') {
      return -this.parsePrimary();
    }

    throw new Error(`Token inesperado: ${token.value}`);
  }

  private callFunction(name: string, args: any[]): any {
    const toArr = (v: any) => Array.isArray(v) ? v : [v];
    const flatArgs = args.flatMap(toArr).map(Number).filter(v => !isNaN(v));

    switch (name.toLowerCase()) {
      case 'sum': return flatArgs.reduce((a, b) => a + b, 0);
      case 'mean': return flatArgs.length ? flatArgs.reduce((a, b) => a + b, 0) / flatArgs.length : 0;
      case 'stddev': {
        if (flatArgs.length < 2) return 0;
        const m = flatArgs.reduce((a, b) => a + b, 0) / flatArgs.length;
        return Math.sqrt(flatArgs.reduce((a, b) => a + Math.pow(b - m, 2), 0) / (flatArgs.length - 1));
      }
      case 'min': return Math.min(...flatArgs);
      case 'max': return Math.max(...flatArgs);
      case 'abs': return Math.abs(Number(args[0]) || 0);
      case 'raiz':
      case 'sqrt': return Math.sqrt(Number(args[0]) || 0);
      default: throw new Error(`Função desconhecida: ${name}`);
    }
  }
}

export function evaluate(formula: string, context: Record<string, any>): any {
  try {
    const lexer = new Lexer(formula);
    const parser = new Parser(lexer.tokenize(), context);
    const result = parser.parseExpr();
    if (typeof result === 'number' && !Number.isFinite(result)) {
      throw new Error("Resultado numérico inválido (Divisão por zero?)");
    }
    return result;
  } catch (e: any) {
    throw new Error(`${e.message}`);
  }
}

export function extractColumnDependencies(formula: string): string[] {
  const ids: string[] = [];
  const regex = /\[(.*?)\]/g;
  let match;
  while ((match = regex.exec(formula)) !== null) {
    ids.push(match[1]);
  }
  return ids;
}

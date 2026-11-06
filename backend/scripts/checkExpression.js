// Deliberately limited SQL CHECK parser. Unknown syntax/types/casts fail closed.
// Canonicalization preserves the Boolean tree and only applies equivalences
// proved for these side-effect-free expressions, not sampled database values.
class UnsupportedCheck extends Error {
  constructor() { super('Unsupported CHECK expression'); }
}
function unsupported() { throw new UnsupportedCheck(); }

const MAX_EXPRESSION_LENGTH = 30000;
const MAX_TOKENS = 5000;
const REVERSED_COMPARISONS = { '>': '<', '<': '>', '>=': '<=', '<=': '>=' };

function tokenize(sql) {
  if (typeof sql !== 'string' || sql.length > MAX_EXPRESSION_LENGTH) unsupported();
  const tokens = [];
  let offset = 0;
  while (offset < sql.length) {
    const rest = sql.slice(offset);
    const space = /^\s+/.exec(rest);
    if (space) { offset += space[0].length; continue; }
    let match;
    if ((match = /^'(?:''|[^'])*'/.exec(rest))) {
      tokens.push({ kind: 'string', value: match[0].slice(1, -1).replaceAll("''", "'") });
    } else if ((match = /^"(?:""|[^"])*"/.exec(rest))) {
      tokens.push({ kind: 'identifier', value: match[0].slice(1, -1).replaceAll('""', '"') });
    } else if ((match = /^\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(rest))) {
      tokens.push({ kind: 'number', value: match[0] });
    } else if ((match = /^[a-zA-Z_][a-zA-Z_0-9$]*/.exec(rest))) {
      tokens.push({ kind: 'word', value: match[0].toLowerCase() });
    } else if ((match = /^(::|>=|<=|<>|!=|[=<>()[\],.+-])/.exec(rest))) {
      tokens.push({ kind: 'punctuation', value: match[0] });
    } else unsupported();
    offset += match[0].length;
    if (tokens.length > MAX_TOKENS) unsupported();
  }
  return tokens;
}

class Parser {
  constructor(sql) { this.tokens = tokenize(sql); this.index = 0; }
  take(value) {
    const token = this.tokens[this.index];
    if (token && ['word', 'punctuation'].includes(token.kind) && token.value === value) { this.index++; return true; }
    return false;
  }
  expect(value) { if (!this.take(value)) unsupported(); }
  name() {
    const token = this.tokens[this.index++];
    if (!token || !['word', 'identifier'].includes(token.kind)) unsupported();
    return token.value;
  }
  path() {
    const names = [this.name()];
    while (this.take('.')) names.push(this.name());
    return names;
  }
  parse() {
    const wrapped = this.take('check');
    if (wrapped) this.expect('(');
    const expression = this.or();
    if (wrapped) this.expect(')');
    if (this.index !== this.tokens.length) unsupported();
    return expression;
  }
  or() {
    let value = this.and();
    while (this.take('or')) value = { kind: 'or', children: [value, this.and()] };
    return value;
  }
  and() {
    let value = this.predicate();
    while (this.take('and')) value = { kind: 'and', children: [value, this.predicate()] };
    return value;
  }
  predicate() {
    if (this.take('not')) return { kind: 'not', value: this.predicate() };
    const left = this.scalar();
    if (this.take('between')) {
      const lower = this.scalar();
      this.expect('and');
      return { kind: 'and', children: [
        { kind: 'compare', operator: '>=', left, right: lower },
        { kind: 'compare', operator: '<=', left, right: this.scalar() },
      ] };
    }
    if (this.take('in')) {
      this.expect('(');
      const values = this.list(')');
      return { kind: 'in', left, values: { kind: 'array', values } };
    }
    if (this.take('is')) {
      const negated = this.take('not');
      this.expect('null');
      return { kind: 'isNull', value: left, negated };
    }
    const token = this.tokens[this.index];
    if (token && token.kind === 'punctuation' && ['=', '<>', '!=', '>', '<', '>=', '<='].includes(token.value)) {
      this.index++;
      const operator = token.value === '!=' ? '<>' : token.value;
      if (this.take('any')) {
        if (operator !== '=') unsupported();
        this.expect('(');
        const values = this.scalar();
        this.expect(')');
        return { kind: 'in', left, values };
      }
      return { kind: 'compare', operator, left, right: this.scalar() };
    }
    return left;
  }
  list(end) {
    const values = [this.scalar()];
    while (this.take(',')) values.push(this.scalar());
    this.expect(end);
    return values;
  }
  scalar() {
    if (this.take('-')) return { kind: 'negative', value: this.scalar() };
    if (this.take('+')) return { kind: 'positive', value: this.scalar() };
    let value;
    const token = this.tokens[this.index];
    if (!token) unsupported();
    if (this.take('(')) {
      value = this.or();
      this.expect(')');
    } else if (this.take('cast')) {
      this.expect('(');
      const argument = this.or();
      this.expect('as');
      value = { kind: 'cast', value: argument, type: this.castType() };
      this.expect(')');
    } else if (this.take('array')) {
      this.expect('[');
      value = { kind: 'array', values: this.list(']') };
    } else if (token.kind === 'string' || token.kind === 'number') {
      this.index++;
      value = { kind: token.kind, value: token.value };
    } else if (this.take('null')) value = { kind: 'null' };
    else if (this.take('true')) value = { kind: 'boolean', value: true };
    else if (this.take('false')) value = { kind: 'boolean', value: false };
    else {
      const names = this.path();
      if (this.take('(')) {
        const name = names.at(-1);
        if (names.length > 1 && (names.length !== 2 || names[0] !== 'pg_catalog')) unsupported();
        if (!['length', 'trim', 'btrim'].includes(name)) unsupported();
        if (name === 'trim') {
          if (this.take('both')) this.expect('from');
          else this.take('from');
        }
        const argument = this.or();
        this.expect(')');
        value = { kind: 'call', name: name === 'trim' ? 'btrim' : name, argument };
      } else value = { kind: 'column', names };
    }
    while (this.take('::')) value = { kind: 'cast', value, type: this.castType() };
    return value;
  }
  castType() {
    const names = this.path();
    if (names.length > 1 && (names.length !== 2 || names[0] !== 'pg_catalog')) unsupported();
    let type = names.at(-1);
    if (type === 'double') { this.expect('precision'); type = 'float8'; }
    else if (type === 'character') { this.expect('varying'); type = 'varchar'; }
    type = ({ smallint: 'int2', integer: 'int4', bigint: 'int8', real: 'float4', decimal: 'numeric', boolean: 'bool' })[type] || type;
    if (!['text', 'varchar', 'int2', 'int4', 'int8', 'float4', 'float8', 'numeric', 'bool'].includes(type)) unsupported();
    // Typmods can truncate strings or round numbers: never strip them.
    if (this.tokens[this.index]?.value === '(') unsupported();
    if (this.take('[')) { this.expect(']'); type += '[]'; }
    return type;
  }
}

const numeric = new Set(['int2', 'int4', 'int8', 'numeric', 'float4', 'float8']);
const textual = type => type === 'text' || type === 'varchar';
const widening = { int2: ['int4', 'int8', 'numeric', 'float4', 'float8'], int4: ['int8', 'numeric', 'float8'],
  int8: ['numeric'], float4: ['float8'] };
const limits = { int2: [-32768n, 32767n], int4: [-2147483648n, 2147483647n],
  int8: [-9223372036854775808n, 9223372036854775807n], float4: [-16777216n, 16777216n],
  float8: [-9007199254740991n, 9007199254740991n] };

function integer(value, type) {
  if (!/^[+-]?\d+$/.test(value)) unsupported();
  const number = BigInt(value);
  if (limits[type] && (number < limits[type][0] || number > limits[type][1])) unsupported();
  return { type, expression: ['number', number.toString()], integer: number.toString() };
}
function cast(value, type) {
  if (type.endsWith('[]')) {
    if (!value.values) unsupported();
    return { type, values: value.values.map(item => cast(item, type.slice(0, -2))) };
  }
  if (value.values) unsupported();
  if (value.expression[0] === 'null') return { ...value, type };
  if (value.type === type) return value;
  if (textual(value.type) && textual(type)) return { ...value, type };
  if (value.type === 'unknown' && value.expression[0] === 'string') {
    if (textual(type)) return { ...value, type };
    if (numeric.has(type)) return integer(value.expression[1], type);
  }
  if (value.integer !== undefined && numeric.has(type)) return integer(value.integer, type);
  if (widening[value.type]?.includes(type)) return { ...value, type };
  unsupported();
}
function comparable(left, right) {
  if (left.type === 'unknown' && right.type !== 'unknown') left = cast(left, right.type);
  if (right.type === 'unknown' && left.type !== 'unknown') right = cast(right, left.type);
  if (textual(left.type) && textual(right.type)) return [left, right];
  if (numeric.has(left.type) && numeric.has(right.type)) {
    const type = ['float8', 'float4', 'numeric', 'int8', 'int4', 'int2'].find(item => left.type === item || right.type === item);
    return [cast(left, type), cast(right, type)];
  }
  if (left.type === 'bool' && right.type === 'bool') return [left, right];
  unsupported();
}
function logical(kind, children) {
  // Associativity/commutativity within the same connective only. AND/OR
  // boundaries remain intact, including SQL's three-valued NULL semantics.
  return [kind, ...children.flatMap(child => child[0] === kind ? child.slice(1) : [child])
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))];
}

function normalizeComparison(left, right, operator) {
  [left, right] = comparable(left, right);
  // Reversing a built-in comparison reverses its ordering operator, too.
  if (JSON.stringify(left.expression) > JSON.stringify(right.expression)) {
    [left, right] = [right, left];
    operator = REVERSED_COMPARISONS[operator] || operator;
  }
  return { type: 'bool', expression: ['compare', operator, left.expression, right.expression] };
}

function normalizeMembership(left, array) {
  if (!array.values || !array.values.length) unsupported();
  const members = array.values.map(item => {
    if (!['string', 'number', 'null', 'boolean'].includes(item.expression?.[0])) unsupported();
    const [subject, value] = comparable(left, item);
    if (JSON.stringify(subject.expression) !== JSON.stringify(left.expression)) unsupported();
    return value.expression;
  });
  return { type: 'bool', expression: ['in', left.expression,
    [...new Set(members.map(value => JSON.stringify(value)))].sort().map(value => JSON.parse(value))] };
}

function canonicalCheck(sql, columns, table) {
  const normalize = node => {
    if (node.kind === 'number') {
      const value = integer(node.value, 'numeric');
      const n = BigInt(value.integer);
      return { ...value, type: n <= 2147483647n && n >= -2147483648n ? 'int4' : 'numeric' };
    }
    if (node.kind === 'string') return { type: 'unknown', expression: ['string', node.value] };
    if (node.kind === 'null') return { type: 'unknown', expression: ['null'] };
    if (node.kind === 'boolean') return { type: 'bool', expression: ['boolean', node.value] };
    if (node.kind === 'negative') {
      const value = normalize(node.value);
      if (value.integer === undefined) unsupported();
      return integer((-BigInt(value.integer)).toString(), value.type);
    }
    if (node.kind === 'positive') {
      const value = normalize(node.value);
      if (!numeric.has(value.type)) unsupported();
      return value;
    }
    if (node.kind === 'column') {
      const name = node.names.at(-1);
      if (node.names.length > 1 && ![`${table}.${name}`, `public.${table}.${name}`].includes(node.names.join('.'))) unsupported();
      const definition = columns[name];
      if (!definition || typeof definition.type !== 'string') unsupported();
      const sqlType = definition.type;
      const type = sqlType.startsWith('varchar') ? 'varchar' : ({ integer: 'int4', bigint: 'int8', bigserial: 'int8',
        serial: 'int4', real: 'float4', 'double precision': 'float8', boolean: 'bool' })[sqlType] || sqlType;
      return { type, expression: ['column', name] };
    }
    if (node.kind === 'cast') return cast(normalize(node.value), node.type);
    if (node.kind === 'array') return { type: 'array', values: node.values.map(normalize) };
    if (node.kind === 'call') {
      const argument = cast(normalize(node.argument), 'text');
      return { type: node.name === 'length' ? 'int4' : 'text', expression: ['call', node.name, argument.expression] };
    }
    if (['and', 'or'].includes(node.kind)) {
      const children = node.children.map(normalize);
      if (children.some(child => child.type !== 'bool')) unsupported();
      return { type: 'bool', expression: logical(node.kind, children.map(child => child.expression)) };
    }
    if (node.kind === 'not') {
      const value = normalize(node.value);
      if (value.type !== 'bool') unsupported();
      return { type: 'bool', expression: ['not', value.expression] };
    }
    if (node.kind === 'isNull') {
      const value = normalize(node.value);
      if (!value.expression) unsupported();
      return { type: 'bool', expression: ['isNull', node.negated, value.expression] };
    }
    if (node.kind === 'compare') {
      return normalizeComparison(normalize(node.left), normalize(node.right), node.operator);
    }
    if (node.kind === 'in') {
      return normalizeMembership(normalize(node.left), normalize(node.values));
    }
    unsupported();
  };
  const value = normalize(new Parser(sql).parse());
  if (value.type !== 'bool') unsupported();
  return JSON.stringify(value.expression);
}

module.exports = { canonicalCheck, UnsupportedCheck };

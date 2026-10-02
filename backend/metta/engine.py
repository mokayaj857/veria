"""Deterministic MeTTa subset used to execute VERIA .metta rule files."""

from __future__ import annotations

from pathlib import Path
from typing import Any


Atom = Any


def tokenize(src: str) -> list[str]:
    tokens: list[str] = []
    buf: list[str] = []
    i = 0
    while i < len(src):
        ch = src[i]
        if ch == ";":
            if buf:
                tokens.append("".join(buf))
                buf = []
            while i < len(src) and src[i] != "\n":
                i += 1
            continue
        if ch in " \t\r\n":
            if buf:
                tokens.append("".join(buf))
                buf = []
            i += 1
            continue
        if ch in "()":
            if buf:
                tokens.append("".join(buf))
                buf = []
            tokens.append(ch)
            i += 1
            continue
        buf.append(ch)
        i += 1
    if buf:
        tokens.append("".join(buf))
    return tokens


def parse_all(src: str) -> list[Atom]:
    tokens = tokenize(src)
    pos = 0

    def parse_one() -> Atom:
        nonlocal pos
        if pos >= len(tokens):
            raise ValueError("unexpected end of MeTTa source")
        tok = tokens[pos]
        pos += 1
        if tok == "!":
            return ["!", parse_one()]
        if tok == "(":
            items: list[Atom] = []
            while pos < len(tokens) and tokens[pos] != ")":
                items.append(parse_one())
            if pos >= len(tokens):
                raise ValueError("unclosed S-expression")
            pos += 1
            return items
        if tok == ")":
            raise ValueError("unmatched )")
        if tok in ("True", "False"):
            return tok == "True"
        try:
            if tok.startswith("-") and tok[1:].isdigit():
                return int(tok)
            if tok.isdigit():
                return int(tok)
        except ValueError:
            pass
        return tok

    exprs: list[Atom] = []
    while pos < len(tokens):
        exprs.append(parse_one())
    return exprs


def is_var(x: Atom) -> bool:
    return isinstance(x, str) and x.startswith("$")


def substitute(expr: Atom, env: dict[str, Atom]) -> Atom:
    if is_var(expr):
        return env.get(expr, expr)
    if isinstance(expr, list):
        return [substitute(part, env) for part in expr]
    return expr


def unify(pattern: Atom, value: Atom, env: dict[str, Atom]) -> dict[str, Atom] | None:
    if is_var(pattern):
        if pattern in env:
            return env if env[pattern] == value else None
        nxt = dict(env)
        nxt[pattern] = value
        return nxt
    if isinstance(pattern, list) and isinstance(value, list):
        if len(pattern) != len(value):
            return None
        cur = env
        for p, v in zip(pattern, value):
            cur = unify(p, v, cur)
            if cur is None:
                return None
        return cur
    return env if pattern == value else None


class MeTTaEngine:
    def __init__(self) -> None:
        self.defs: dict[str, list[tuple[list[Atom], Atom]]] = {}

    def load(self, src: str) -> None:
        for expr in parse_all(src):
            if isinstance(expr, list) and expr and expr[0] == "=" and len(expr) == 3:
                head, body = expr[1], expr[2]
                if not isinstance(head, list) or not head:
                    raise ValueError(f"bad definition head: {head}")
                name = head[0]
                params = head[1:]
                self.defs.setdefault(str(name), []).append((params, body))
            elif isinstance(expr, list) and expr and expr[0] == "!":
                self.eval(expr[1] if len(expr) == 2 else expr[1:])

    def load_file(self, path: Path) -> None:
        self.load(path.read_text(encoding="utf-8"))

    def bind(self, name: str, value: Atom) -> None:
        self.defs[name] = [([], value)]

    def eval(self, expr: Atom) -> Atom:
        if isinstance(expr, (int, float, bool, str)) and not isinstance(expr, list):
            return expr
        if not isinstance(expr, list) or not expr:
            return expr

        op = expr[0]
        if op == "!":
            return self.eval(expr[1] if len(expr) > 1 else expr)
        if op == "quote":
            return expr[1] if len(expr) > 1 else expr
        if op == "if":
            if len(expr) < 4:
                return False
            cond = self.eval(expr[1])
            return self.eval(expr[2] if self._truth(cond) else expr[3])
        if op == "and":
            return all(self._truth(self.eval(arg)) for arg in expr[1:])
        if op == "or":
            return any(self._truth(self.eval(arg)) for arg in expr[1:])
        if op == "not":
            return not self._truth(self.eval(expr[1]))
        if op in {">", "<", ">=", "<=", "==", "+", "-", "*", "/"}:
            args = [self.eval(arg) for arg in expr[1:]]
            return self._builtin(str(op), args)

        if isinstance(op, str) and op in self.defs:
            args = [self.eval(arg) for arg in expr[1:]]
            for params, body in reversed(self.defs[op]):
                env = unify(params, args, {})
                if env is not None:
                    return self.eval(substitute(body, env))

        return [self.eval(part) if isinstance(part, list) else part for part in expr]

    def run(self, expr_src: str) -> Atom:
        parsed = parse_all(expr_src)
        if not parsed:
            return None
        expr = parsed[0]
        if isinstance(expr, list) and expr and expr[0] == "!":
            expr = expr[1] if len(expr) == 2 else expr[1:]
        return self.eval(expr)

    def _truth(self, value: Atom) -> bool:
        if value is False or value == "False" or value == 0 or value == [] or value is None:
            return False
        return True

    def _builtin(self, op: str, args: list[Atom]) -> Atom:
        if op == "==":
            return args[0] == args[1]
        if op == "+":
            acc = 0
            for arg in args:
                acc = acc + arg
            return acc
        if op == "-":
            if len(args) == 1:
                return -args[0]
            acc = args[0]
            for arg in args[1:]:
                acc = acc - arg
            return acc
        if op == "*":
            acc = 1
            for arg in args:
                acc = acc * arg
            return acc
        left, right = self._num(args[0]), self._num(args[1])
        if left is None or right is None:
            return False
        if op == ">":
            return left > right
        if op == "<":
            return left < right
        if op == ">=":
            return left >= right
        if op == "<=":
            return left <= right
        if op == "/":
            if right == 0:
                return 0
            return int(left / right)
        raise ValueError(f"unknown builtin {op}")

    def _num(self, value: Atom) -> int | float | None:
        if isinstance(value, bool):
            return int(value)
        if isinstance(value, (int, float)):
            return value
        if isinstance(value, str):
            try:
                if value.lstrip("-").isdigit():
                    return int(value)
                return float(value)
            except ValueError:
                return None
        return None

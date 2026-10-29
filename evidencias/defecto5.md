# Evidencia local del defecto 5

Ejecutado el 29/10/2026 con Node 24.19.0, desde la raíz del repositorio.
El harness evalúa el check real de `test/load/transferir.js` con respuestas
controladas, comparándolo con el commit anterior a su corrección. Es una
simulación de la validación funcional: no ejecuta k6, tráfico HTTP ni thresholds.

```powershell
@'
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const antes = execFileSync('git', ['show', 'ae3cebdf17a996dcc4091dd8efc70b1c09fbfe67:test/load/transferir.js'], { encoding: 'utf8' });
const despues = fs.readFileSync('test/load/transferir.js', 'utf8');
const correcta = { id: 1, origen: 'ana', destino: 'beto', monto: 1, saldoOrigen: 999 };
const casos = [
  ['200 transferencia correcta', 200, JSON.stringify(correcta), true],
  ['400 saldo insuficiente', 400, JSON.stringify({ error: 'saldo insuficiente' }), true],
  ['400 usuario inexistente', 400, JSON.stringify({ error: 'usuario inexistente' }), false],
  ['400 cuerpo invalido', 400, JSON.stringify({ error: 'cuerpo invalido' }), false],
  ['400 JSON invalido', 400, '<html>error</html>', false],
  ['400 cuerpo null', 400, 'null', false],
  ['200 monto incorrecto', 200, JSON.stringify({ ...correcta, monto: 2 }), false],
  ['200 JSON invalido', 200, 'no-json', false],
  ['500 error interno', 500, JSON.stringify({ error: 'error interno' }), false],
];
function evaluar(fuente, status, body) {
  const fragmento = fuente.match(/  check\(t,[\s\S]*?(?=\r?\n  const s =)/);
  assert.ok(fragmento, 'debe encontrarse el check de transferencia');
  const respuesta = { status, json: () => JSON.parse(body) };
  let resultado;
  vm.runInNewContext(fragmento[0], {
    t: respuesta, origen: 'ana', destino: 'beto',
    check: (r, predicados) => { resultado = Object.values(predicados)[0](r); },
  });
  return resultado;
}
console.log('Caso | Antes | Despues');
for (const [nombre, status, body, esperado] of casos) {
  const resultadoAntes = evaluar(antes, status, body);
  const resultadoDespues = evaluar(despues, status, body);
  assert.equal(resultadoDespues, esperado, nombre);
  console.log(`${nombre} | ${resultadoAntes} | ${resultadoDespues}`);
}
console.log('9 casos verificados.');
'@ | node -
```

Salida observada:

```text
Caso | Antes | Despues
200 transferencia correcta | true | true
400 saldo insuficiente | true | true
400 usuario inexistente | true | false
400 cuerpo invalido | true | false
400 JSON invalido | true | false
400 cuerpo null | true | false
200 monto incorrecto | true | false
200 JSON invalido | true | false
500 error interno | false | false
9 casos verificados.
```

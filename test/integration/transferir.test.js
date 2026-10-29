const { test, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { handler } = require('../../src/handler');
const { obtenerStore } = require('../../src/db');

const rutaOriginal = process.env.DB_PATH;
const directorio = mkdtempSync(join(tmpdir(), 'monedero-integration-'));
let numeroPrueba = 0;

beforeEach(() => {
  process.env.DB_PATH = join(directorio, `${++numeroPrueba}.db`);
});

after(() => {
  try {
    // Cambiar de ruta cierra la ultima base de pruebas antes de eliminarla.
    process.env.DB_PATH = ':memory:';
    obtenerStore();
  } finally {
    if (rutaOriginal === undefined) delete process.env.DB_PATH;
    else process.env.DB_PATH = rutaOriginal;
    rmSync(directorio, { recursive: true, force: true });
  }
});

async function llamar(metodo, ruta, cuerpo) {
  const r = await handler({
    rawPath: ruta,
    requestContext: { http: { method: metodo } },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  return { status: r.statusCode, cuerpo: JSON.parse(r.body) };
}

async function prepararTransferencia(origen, destino, monto) {
  const r = await llamar('POST', '/transferir', { origen, destino, monto });
  assert.equal(r.status, 200, 'la transferencia de preparacion debe completarse');
}

test('ana transfiere 100 a beto', async () => {
  const r = await llamar('POST', '/transferir', { origen: 'ana', destino: 'beto', monto: 100 });
  assert.equal(r.status, 200);
  assert.equal(r.cuerpo.saldoOrigen, 900);
});

test('el saldo de ana refleja el debito', async () => {
  await prepararTransferencia('ana', 'beto', 100);
  const r = await llamar('GET', '/saldo/ana');
  assert.deepEqual(r.cuerpo, { usuario: 'ana', saldo: 900 });
});

test('el saldo de beto refleja el credito', async () => {
  await prepararTransferencia('ana', 'beto', 100);
  const r = await llamar('GET', '/saldo/beto');
  assert.deepEqual(r.cuerpo, { usuario: 'beto', saldo: 600 });
});

test('el historial de ana registra la transferencia', async () => {
  await prepararTransferencia('ana', 'beto', 100);
  const r = await llamar('GET', '/historial/ana');
  assert.equal(r.status, 200);
  assert.equal(r.cuerpo.length, 1);
  assert.equal(r.cuerpo[0].destino, 'beto');
  assert.equal(r.cuerpo[0].monto, 100);
});

test('ana no puede transferir 950', async () => {
  await prepararTransferencia('ana', 'beto', 100);
  const r = await llamar('POST', '/transferir', { origen: 'ana', destino: 'carla', monto: 950 });
  assert.equal(r.status, 400);
  assert.equal(r.cuerpo.error, 'saldo insuficiente');
});

test('una transferencia rechazada no cambia saldos', async () => {
  await prepararTransferencia('ana', 'beto', 100);
  const rechazada = await llamar('POST', '/transferir', { origen: 'ana', destino: 'carla', monto: 950 });
  assert.equal(rechazada.status, 400);
  const ana = await llamar('GET', '/saldo/ana');
  const carla = await llamar('GET', '/saldo/carla');
  assert.equal(ana.cuerpo.saldo, 900);
  assert.equal(carla.cuerpo.saldo, 750);
});

test('diego transfiere todo su saldo a elena', async () => {
  const r = await llamar('POST', '/transferir', { origen: 'diego', destino: 'elena', monto: 300 });
  assert.equal(r.status, 200);
  const elena = await llamar('GET', '/saldo/elena');
  assert.equal(elena.cuerpo.saldo, 1500);
});

test('diego sin saldo no puede transferir', async () => {
  await prepararTransferencia('diego', 'elena', 300);
  const r = await llamar('POST', '/transferir', { origen: 'diego', destino: 'ana', monto: 0.01 });
  assert.equal(r.status, 400);
});

test('el historial de elena muestra solo la transferencia de diego', async () => {
  await prepararTransferencia('diego', 'elena', 300);
  const r = await llamar('GET', '/historial/elena');
  assert.equal(r.cuerpo.length, 1);
  assert.equal(r.cuerpo[0].origen, 'diego');
});

test('transferir al mismo usuario es 422', async () => {
  const r = await llamar('POST', '/transferir', { origen: 'beto', destino: 'beto', monto: 1 });
  assert.equal(r.status, 422);
});

test('transferir a un usuario inexistente es 400', async () => {
  const r = await llamar('POST', '/transferir', { origen: 'beto', destino: 'zoe', monto: 1 });
  assert.equal(r.status, 400);
});

test('un cuerpo que no es JSON es 400', async () => {
  const r = await handler({
    rawPath: '/transferir',
    requestContext: { http: { method: 'POST' } },
    body: 'monto=1',
  });
  assert.equal(r.statusCode, 400);
});

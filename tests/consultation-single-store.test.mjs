import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createConsultation } from '../lib/consultations/service.js'
import { createPrescriptionStore } from '../lib/prescriptions/store.js'

test('encrypted REST single-document save is atomic with client, indexed, and retry-safe', async () => {
  const storage = new Map()
  const sets = new Map()
  const commands = []
  let loseFirstResponse = true
  const fetchFn = async (_url, request) => {
    const command = JSON.parse(request.body)
    commands.push(command)
    let result
    if (command[0] === 'GET') result = storage.get(command[1]) ?? null
    else if (command[0] === 'MGET') result = command.slice(1).map(key => storage.get(key) ?? null)
    else if (command[0] === 'SMEMBERS') result = [...(sets.get(command[1]) ?? [])]
    else if (command[0] === 'EVAL') {
      const [, script, keyCount, recordKey, requestKey, valuesJson, clientJson] = command
      assert.equal(keyCount, 2)
      assert.match(script, /redis\.call\('MSET', unpack\(values\)\)/)
      assert.match(script, /redis\.call\('SADD', client\.history, client\.documentId\)/)
      if (storage.has(requestKey)) {
        const [savedKey] = JSON.parse(storage.get(requestKey))
        result = storage.get(savedKey)
      } else {
        assert.equal(storage.has(recordKey), false)
        const values = JSON.parse(valuesJson)
        const client = clientJson ? JSON.parse(clientJson) : undefined
        if (client) {
          assert.ok(client.isNew ? !storage.has(client.key) : storage.get(client.key) === client.expected)
        }
        for (let i = 0; i < values.length; i += 2) storage.set(values[i], values[i + 1])
        if (client) {
          if (!sets.has(client.directory)) sets.set(client.directory, new Set())
          sets.get(client.directory).add(client.id)
          if (!sets.has(client.history)) sets.set(client.history, new Set())
          sets.get(client.history).add(client.documentId)
        }
        result = values[1]
        // Mimic an upstream response loss after an already committed transaction.
        if (loseFirstResponse) {
          loseFirstResponse = false
          throw new Error('Simulated lost response')
        }
      }
    } else throw new Error('Unexpected command')
    return { ok: true, json: async () => ({ result }) }
  }
  const store = createPrescriptionStore({
    environment: {
      PRESCRIPTIONS_KV_REST_API_URL: 'https://synthetic.invalid',
      PRESCRIPTIONS_KV_REST_API_TOKEN: 'synthetic-token',
      PRESCRIPTIONS_DATA_ENCRYPTION_KEY: Buffer.alloc(32, 6).toString('base64'),
    }, fetchFn,
  })
  const input = {
    patientName: 'Synthetic Client', consultationDate: '2026-09-18',
    items: [{ remedySlug: 'arsenicum-album' }], includeInvoice: false,
    newClient: { fullName: 'Synthetic Client', preferredLocale: 'en' },
  }
  const requestId = randomUUID()
  await assert.rejects(createConsultation(input, { store, requestId }), /Simulated lost response/)
  const created = await createConsultation(input, { store, requestId })
  assert.ok(created.recommendation)
  assert.equal(created.payment, undefined)
  const clientId = created.recommendation.clientId
  const client = await store.findClientById(clientId)
  assert.equal(client.fullName, 'Synthetic Client')
  assert.deepEqual((await store.listClientDocuments(clientId)).map(row => row.id), [created.recommendation.id])
  assert.equal((await store.listClients()).length, 1)
  assert.deepEqual(await createConsultation(input, { store, requestId }), created)
  assert.equal(commands.filter(row => row[0] === 'EVAL').length, 3)
  for (const command of commands) {
    assert.equal(JSON.stringify(command).includes('Synthetic Client'), false)
    assert.equal(JSON.stringify(command).includes('arsenicum-album'), false)
  }
})

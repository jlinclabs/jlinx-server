const Debug = require('debug')
const tape = require('tape')
const tmp = require('tmp-promise')
const fs = require('node:fs/promises')
const HyperDHT = require('@hyperswarm/dht')
const { createSigningKeyPair } = require('jlinx-util')

const JlinxNode = require('../..')

const debug = Debug('jlinx:node:test')

exports.test = async function (name, fn, _tape = tape) {
  return _tape(name, run)
  async function run (t) {
    const bootstrappers = []
    const nodes = []

    while (bootstrappers.length < 3) {
      bootstrappers.push(new HyperDHT({ ephemeral: true, bootstrap: [] }))
    }

    const bootstrap = []
    for (const node of bootstrappers) {
      await node.ready()
      bootstrap.push({ host: '127.0.0.1', port: node.address().port })
    }

    while (nodes.length < 3) {
      const node = new HyperDHT({ ephemeral: false, bootstrap })
      await node.ready()
      nodes.push(node)
    }

    const tmpDirs = []
    const newTmpDir = async () => {
      const { path } = await tmp.dir()
      const destroy = () => fs.rm(path, { recursive: true })
      tmpDirs.push({ path, destroy })
      return path
    }

    const jlinxNodes = []
    const createNode = async () => {
      const jlinx = new JlinxNode({
        topic: Buffer.from('_testing_jlinx_node_on_hypercore'),
        storagePath: await newTmpDir(),
        bootstrap,
        keyPair: createSigningKeyPair()
      })
      jlinxNodes.push(jlinx)
      debug('created node', jlinx)
      await jlinx.ready()
      return jlinx
    }
    let error
    try {
      await fn(t, createNode)
    } catch (e) {
      error = e
    }

    destroy(jlinxNodes)
    destroy(tmpDirs)
    destroy(bootstrappers)
    destroy(nodes)
    t.end(error)
  }
}
exports.test.only = (name, fn) => exports.test(name, fn, tape.only)
exports.test.skip = (name, fn) => exports.test(name, fn, tape.skip)

function destroy (...nodes) {
  for (const node of nodes) {
    if (Array.isArray(node)) destroy(...node)
    else node.destroy()
  }
}


exports.coreValues = async function coreValues(core){
  const values = []
  for (let n = 0; n < core.length; n++){
    values[n] = (await core.get(n)).toString()
  }
  return values
}

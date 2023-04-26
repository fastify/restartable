'use strict'

const { test } = require('tap')

const createMutableProxy = require('../lib/mutable-proxy')

test('createMutableProxy - apply', (t) => {
  t.plan(2)

  const target1 = () => 'foo'
  const target2 = () => 'bar'

  const { proxy, changeTarget } = createMutableProxy(target1, {})

  t.equal(proxy(), 'foo')
  changeTarget(target2)
  t.equal(proxy(), 'bar')
})

test('createMutableProxy - custom apply trap', (t) => {
  t.plan(4)

  const target1 = () => 'foo'
  const target2 = () => 'bar'

  const { proxy, changeTarget } = createMutableProxy(target1, {
    apply (target, thisArg, args) {
      t.pass('apply trap called')
      return target.apply(thisArg, args)
    }
  })

  t.equal(proxy(), 'foo')
  changeTarget(target2)
  t.equal(proxy(), 'bar')
})

test('createMutableProxy - construct', (t) => {
  t.plan(2)

  function Target1 (a, b) {
    this.sum = a + b
  }

  function Target2 (a, b) {
    this.sum = a - b
  }

  const { proxy: TargetProxy, changeTarget } = createMutableProxy(Target1, {})

  const obj1 = new TargetProxy(1, 2)
  t.equal(obj1.sum, 3)

  changeTarget(Target2)

  const obj2 = new TargetProxy(2, 1)
  t.equal(obj2.sum, 1)
})

test('createMutableProxy - construct', (t) => {
  t.plan(2)

  class Target1 {
    constructor () { this.foo = 'foo' }
  }
  class Target2 {
    constructor () { this.foo = 'bar' }
  }

  const { proxy: TargetProxy, changeTarget } = createMutableProxy(Target1, {})

  const obj1 = new TargetProxy()
  t.equal(obj1.foo, 'foo')

  changeTarget(Target2)

  const obj2 = new TargetProxy()
  t.equal(obj2.foo, 'bar')
})

test('createMutableProxy - custom construct trap', (t) => {
  t.plan(4)

  class Target1 {
    constructor () { this.foo = 'foo' }
  }
  class Target2 {
    constructor () { this.foo = 'bar' }
  }

  const { proxy: TargetProxy, changeTarget } = createMutableProxy(Target1, {
    construct (target, args) {
      t.pass('construct trap called')
      return Reflect.construct(target, args)
    }
  })

  const obj1 = new TargetProxy()
  t.equal(obj1.foo, 'foo')

  changeTarget(Target2)

  const obj2 = new TargetProxy()
  t.equal(obj2.foo, 'bar')
})

test('createMutableProxy - defineProperty', (t) => {
  t.plan(2)

  const target1 = {}
  const target2 = {}

  const { proxy, changeTarget } = createMutableProxy(target1, {})

  Object.defineProperty(proxy, 'foo', { value: 'bar' })
  t.equal(target1.foo, 'bar')

  changeTarget(target2)

  Object.defineProperty(proxy, 'foo', { value: 'baz' })
  t.equal(target2.foo, 'baz')
})

test('createMutableProxy - custom defineProperty trap', (t) => {
  t.plan(4)

  const target1 = {}
  const target2 = {}

  const { proxy, changeTarget } = createMutableProxy(target1, {
    defineProperty (target, prop, descriptor) {
      t.pass('defineProperty trap called')
      return Object.defineProperty(target, prop, descriptor)
    }
  })

  Object.defineProperty(proxy, 'foo', { value: 'bar' })
  t.same(
    Object.getOwnPropertyDescriptor(proxy, 'foo'),
    Object.getOwnPropertyDescriptor(target1, 'foo')
  )

  changeTarget(target2)

  Object.defineProperty(proxy, 'foo', { value: 'baz' })
  t.same(
    Object.getOwnPropertyDescriptor(proxy, 'foo'),
    Object.getOwnPropertyDescriptor(target2, 'foo')
  )
})

test('createMutableProxy - deleteProperty', (t) => {
  t.plan(2)

  const target1 = { foo: 'foo' }
  const target2 = { foo: 'foo' }

  const { proxy, changeTarget } = createMutableProxy(target1, {})

  delete proxy.foo
  t.equal(target1.foo, undefined)

  changeTarget(target2)

  delete proxy.foo
  t.equal(target2.foo, undefined)
})

test('createMutableProxy - deleteProperty after defineProperty', (t) => {
  t.plan(2)

  const target1 = {}
  const target2 = {}

  const { proxy, changeTarget } = createMutableProxy(target1, {})

  Object.defineProperty(proxy, 'foo', { value: 'bar' })
  delete proxy.foo
  t.equal(target1.foo, undefined)

  changeTarget(target2)

  Object.defineProperty(proxy, 'foo', { value: 'bar' })
  delete proxy.foo
  t.equal(target2.foo, undefined)
})

test('createMutableProxy - custom deleteProperty trap', (t) => {
  t.plan(4)

  const target1 = { foo: 'bar' }
  const target2 = { foo: 'bar' }

  const { proxy, changeTarget } = createMutableProxy(target1, {
    deleteProperty (target, prop) {
      t.pass('deleteProperty trap called')
      return delete target[prop]
    }
  })

  delete proxy.foo
  t.equal(target1.foo, undefined)

  changeTarget(target2)

  delete proxy.foo
  t.equal(target2.foo, undefined)
})

test('createMutableProxy - get', (t) => {
  t.plan(2)

  const target1 = { foo: 'foo' }
  const target2 = { foo: 'bar' }

  const { proxy, changeTarget } = createMutableProxy(target1, {})

  t.equal(proxy.foo, 'foo')

  changeTarget(target2)

  t.equal(proxy.foo, 'bar')
})

test('createMutableProxy - custom get trap', (t) => {
  t.plan(4)

  const target1 = { foo: 'bar' }
  const target2 = { foo: 'baz' }

  const { proxy, changeTarget } = createMutableProxy(target1, {
    get (target, prop) {
      t.pass('get trap called')
      return target[prop]
    }
  })

  t.equal(proxy.foo, 'bar')

  changeTarget(target2)

  t.equal(proxy.foo, 'baz')
})

test('createMutableProxy - getOwnPropertyDescriptor', (t) => {
  t.plan(2)

  const target1 = { foo: 'foo' }
  const target2 = { foo: 'bar' }

  const { proxy, changeTarget } = createMutableProxy(target1, {})

  t.same(
    Object.getOwnPropertyDescriptor(proxy, 'foo'),
    Object.getOwnPropertyDescriptor(target1, 'foo')
  )

  changeTarget(target2)

  t.same(
    Object.getOwnPropertyDescriptor(proxy, 'foo'),
    Object.getOwnPropertyDescriptor(target2, 'foo')
  )
})

test('createMutableProxy - custom getOwnPropertyDescriptor trap', (t) => {
  t.plan(4)

  const target1 = { foo1: 'bar' }
  const target2 = { foo2: 'bar' }

  const { proxy, changeTarget } = createMutableProxy(target1, {
    getOwnPropertyDescriptor (target, prop) {
      t.pass('getOwnPropertyDescriptor trap called')
      return Object.getOwnPropertyDescriptor(target, prop)
    }
  })

  t.same(
    Object.getOwnPropertyDescriptor(proxy, 'foo1'),
    Object.getOwnPropertyDescriptor(target1, 'foo1')
  )

  changeTarget(target2)

  t.same(
    Object.getOwnPropertyDescriptor(proxy, 'foo2'),
    Object.getOwnPropertyDescriptor(target2, 'foo2')
  )
})

test('createMutableProxy - getPrototypeOf', (t) => {
  t.plan(2)

  const target1 = {}
  const target2 = {}

  const { proxy, changeTarget } = createMutableProxy(target1, {})

  t.equal(Object.getPrototypeOf(proxy), Object.getPrototypeOf(target1))

  changeTarget(target2)

  t.equal(Object.getPrototypeOf(proxy), Object.getPrototypeOf(target2))
})

test('createMutableProxy - custom getPrototypeOf trap', (t) => {
  t.plan(4)

  const target1 = {}
  const target2 = {}

  const { proxy, changeTarget } = createMutableProxy(target1, {
    getPrototypeOf (target) {
      t.pass('getPrototypeOf trap called')
      return Object.getPrototypeOf(target)
    }
  })

  t.equal(Object.getPrototypeOf(proxy), Object.getPrototypeOf(target1))

  changeTarget(target2)

  t.equal(Object.getPrototypeOf(proxy), Object.getPrototypeOf(target2))
})

test('createMutableProxy - has', (t) => {
  t.plan(2)

  const target1 = { foo: 'foo' }
  const target2 = { foo: 'bar' }

  const { proxy, changeTarget } = createMutableProxy(target1, {})

  t.equal('foo' in proxy, true)

  changeTarget(target2)

  t.equal('foo' in proxy, true)
})

test('createMutableProxy - custom has trap', (t) => {
  t.plan(4)

  const target1 = { foo: 'bar' }
  const target2 = { foo: 'bar' }

  const { proxy, changeTarget } = createMutableProxy(target1, {
    has (target, prop) {
      t.pass('has trap called')
      return prop in target
    }
  })

  t.equal('foo' in proxy, true)

  changeTarget(target2)

  t.equal('foo' in proxy, true)
})

test('createMutableProxy - isExtensible', (t) => {
  t.plan(2)

  const target1 = {}
  const target2 = {}

  const { proxy, changeTarget } = createMutableProxy(target1, {})

  t.equal(Object.isExtensible(proxy), Object.isExtensible(target1))

  changeTarget(target2)

  t.equal(Object.isExtensible(proxy), Object.isExtensible(target2))
})

test('createMutableProxy - custom isExtensible trap', (t) => {
  t.plan(4)

  const target1 = {}
  const target2 = {}

  const { proxy, changeTarget } = createMutableProxy(target1, {
    isExtensible (target) {
      t.pass('isExtensible trap called')
      return Object.isExtensible(target)
    }
  })

  t.equal(Object.isExtensible(proxy), true)

  changeTarget(target2)

  t.equal(Object.isExtensible(proxy), true)
})

test('createMutableProxy - ownKeys', (t) => {
  t.plan(2)

  const target1 = { foo: 'foo' }
  const target2 = { bar: 'bar' }

  const { proxy, changeTarget } = createMutableProxy(target1, {})

  t.same(Object.keys(proxy), Object.keys(target1))

  changeTarget(target2)

  t.same(Object.keys(proxy), Object.keys(target2))
})

test('createMutableProxy - custom ownKeys trap', (t) => {
  t.plan(4)

  const target1 = { foo: 'bar' }
  const target2 = { foo: 'bar' }

  const { proxy, changeTarget } = createMutableProxy(target1, {
    ownKeys (target) {
      t.pass('ownKeys trap called')
      return Object.keys(target)
    }
  })

  t.same(Object.keys(proxy), Object.keys(target1))

  changeTarget(target2)

  t.same(Object.keys(proxy), Object.keys(target2))
})

test('createMutableProxy - preventExtensions', (t) => {
  t.plan(2)

  const target = {}
  const { proxy } = createMutableProxy(target, {})

  try {
    Object.preventExtensions(proxy)
    t.fail('should throw')
  } catch (error) {
    t.equal(error.message, 'Cannot prevent extensions for mutable proxy')
  }

  try {
    Object.freeze(proxy)
    t.fail('should throw')
  } catch (error) {
    t.equal(error.message, 'Cannot prevent extensions for mutable proxy')
  }
})

test('createMutableProxy - custom preventExtensions trap', (t) => {
  t.plan(2)

  const target = {}

  const { proxy } = createMutableProxy(target, {
    preventExtensions () {
      t.fail('should throw')
    }
  })

  try {
    Object.preventExtensions(proxy)
    t.fail('should throw')
  } catch (error) {
    t.equal(error.message, 'Cannot prevent extensions for mutable proxy')
  }

  try {
    Object.freeze(proxy)
    t.fail('should throw')
  } catch (error) {
    t.equal(error.message, 'Cannot prevent extensions for mutable proxy')
  }
})

test('createMutableProxy - set', (t) => {
  t.plan(2)

  const target1 = {}
  const target2 = {}

  const { proxy, changeTarget } = createMutableProxy(target1, {})

  proxy.foo = 'foo'
  t.equal(target1.foo, 'foo')

  changeTarget(target2)

  proxy.foo = 'bar'
  t.equal(target2.foo, 'bar')
})

test('createMutableProxy - custom set trap', (t) => {
  t.plan(4)

  const target1 = {}
  const target2 = {}

  const { proxy, changeTarget } = createMutableProxy(target1, {
    set (target, prop, value) {
      t.pass('set trap called')
      target[prop] = value
      return true
    }
  })

  proxy.foo = 'bar'
  t.equal(target1.foo, 'bar')

  changeTarget(target2)

  proxy.foo = 'baz'
  t.equal(target2.foo, 'baz')
})

test('createMutableProxy - setPrototypeOf', (t) => {
  t.plan(2)

  const target1 = {}
  const target2 = {}

  const { proxy, changeTarget } = createMutableProxy(target1, {})

  const proto1 = {}
  Object.setPrototypeOf(proxy, proto1)
  t.equal(Object.getPrototypeOf(target1), proto1)

  changeTarget(target2)

  const proto2 = {}
  Object.setPrototypeOf(proxy, proto2)
  t.equal(Object.getPrototypeOf(target2), proto2)
})

test('createMutableProxy - custom setPrototypeOf trap', (t) => {
  t.plan(4)

  const target1 = {}
  const target2 = {}

  const { proxy, changeTarget } = createMutableProxy(target1, {
    setPrototypeOf (target, proto) {
      t.pass('setPrototypeOf trap called')
      return Object.setPrototypeOf(target, proto)
    }
  })

  const proto1 = {}
  Object.setPrototypeOf(proxy, proto1)
  t.equal(Object.getPrototypeOf(proxy), proto1)

  changeTarget(target2)

  const proto2 = {}
  Object.setPrototypeOf(proxy, proto2)
  t.equal(Object.getPrototypeOf(proxy), proto2)
})

test('should throw if define non-configurable property throw the proxy', (t) => {
  t.plan(1)

  const target = {}
  const { proxy } = createMutableProxy(target, {})

  try {
    Object.defineProperty(proxy, 'foo', { value: 'bar', configurable: false })
    t.fail('should throw')
  } catch (error) {
    t.equal(error.message, 'Cannot define non-configurable property for mutable proxy')
  }
})

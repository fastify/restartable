'use strict'

function createMutableProxy (target, handler) {
  let mutableTarget = target

  const handlerMethods = {}
  const defaultHandler = {
    apply (_, thisArg, args) {
      return handlerMethods.apply(mutableTarget, thisArg, args)
    },
    construct (_, args) {
      return handlerMethods.construct(mutableTarget, args)
    },
    defineProperty (_, prop, descriptor) {
      if (descriptor.configurable === false) {
        throw new TypeError('Cannot define non-configurable property for mutable proxy')
      }
      const configurableDescriptor = { ...descriptor, configurable: true }
      Reflect.defineProperty(_, prop, configurableDescriptor)
      return handlerMethods.defineProperty(mutableTarget, prop, configurableDescriptor)
    },
    deleteProperty (_, prop) {
      if (Object.prototype.hasOwnProperty.call(_, prop)) {
        Reflect.deleteProperty(_, prop)
      }
      return handlerMethods.deleteProperty(mutableTarget, prop)
    },
    get (_, prop, receiver) {
      return handlerMethods.get(mutableTarget, prop, receiver)
    },
    getOwnPropertyDescriptor (_, prop) {
      return handlerMethods.getOwnPropertyDescriptor(mutableTarget, prop)
    },
    getPrototypeOf (_) {
      return handlerMethods.getPrototypeOf(mutableTarget)
    },
    has (_, prop) {
      return handlerMethods.has(mutableTarget, prop)
    },
    isExtensible (_) {
      return handlerMethods.isExtensible(mutableTarget)
    },
    ownKeys (_) {
      return handlerMethods.ownKeys(mutableTarget)
    },
    preventExtensions () {
      throw new TypeError('Cannot prevent extensions for mutable proxy')
    },
    set (_, prop, value) {
      return handlerMethods.set(mutableTarget, prop, value)
    },
    setPrototypeOf (_, prototype) {
      return handlerMethods.setPrototypeOf(mutableTarget, prototype)
    }
  }

  for (const methodName in defaultHandler) {
    handlerMethods[methodName] = handler[methodName] || Reflect[methodName]
  }

  /* istanbul ignore next */
  const noop = function () {}

  const defaultTarget = typeof target === 'function' ? noop : {}
  const proxy = new Proxy(defaultTarget, defaultHandler)

  function changeTarget (newTarget) {
    mutableTarget = newTarget

    if (typeof target === 'object') {
      for (const key of Object.getOwnPropertyNames(defaultTarget)) {
        delete defaultTarget[key]
      }
    }
  }

  return { proxy, changeTarget }
}

module.exports = createMutableProxy

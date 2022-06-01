import { EL_LOCAL_NAME, PROTOTYPE } from './constant'

export const {
  defineProperty,
  defineProperties,
  entries,
  assign,
  keys,
  getOwnPropertyDescriptor,
} = Object

export const {
  // EventTarget
  addEventListener,
  // Node
  appendChild,
  insertBefore,
  replaceChild,
  // ParentNode
  append,
  prepend,
  replaceChildren,
  // ChildNode
  after,
  before,
  replaceWith,
} = HTMLElement[PROTOTYPE]

export function warn(...args: unknown[]) {
  console.warn(`[${EL_LOCAL_NAME}]`, ...args)
}

export function addEventListenerTo(target: EventTarget, ...args: unknown[]) {
  addEventListener.apply(target, args)
}

export function appendChildTo<T extends Node>(node: Node, newChild: T): T {
  return appendChild.call(node, newChild)
}

export function appendTo(node: Node, ...args: (string | Node)[]) {
  append.apply(node, args)
}

export function isObject(value: unknown): value is object {
  return value ? typeof value === 'object' : false
}

export function generateFrameHtml(origin: string) {
  return `
  <!DOCTYPE html>
  <html lang="en">
  
  <head>
    <meta charset="UTF-8" />
    <base href="${origin}" />
  </head>
  
  <body>
  </body>
  
  </html>
  `
}

export function generateStaticResourceMutator(doc: Document, entryOrigin: string) {
  const srcElem = doc.createElement('script')
  srcElem.type = 'raw:text/javascript'
  srcElem.textContent = `
const docElem = document.documentElement;

const options = {
  childList: true,
  subtree: true,
};
function mCallback(mutations) {
  for (let mutation of mutations) {
    if (mutation.type === 'childList' && mutation.addedNodes.length) {
      for (let node of mutation.addedNodes) {
        // 处理自己有 src 的情况
        if (node.nodeType === 1 && node.src) {
          node.src = node.src.replace(window.location.origin, '${entryOrigin}');
        }
        const children = node.querySelectorAll('[src]');
        for (let child of children) {
          child.src = child.src.replace(window.location.origin, '${entryOrigin}');
        }
      }      
    }
  }
}
const observer = new MutationObserver(mCallback);

observer.observe(docElem, options);
  `
  return srcElem
}

export const domParser = new DOMParser()

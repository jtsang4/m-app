import { addEventListenerTo, appendChildTo, appendTo, defineProperties, defineProperty, domParser, generateFrameHtml, replaceChild, warn } from './utils'
import { syncUrlToTopWindow, updateTopWindowUrl } from './sync-url'
import { hijackNodeMethodsOfIframe } from './hijack-node-methods'
import { SCRIPT_TYPES } from './constant'
import { hijackEventAttr } from './hijack-event-attr'

export async function initApp(option: MicroAppOption, root: MicroAppRoot) {
  try {
    const iframe = document.createElement('iframe')
    const entryUrl = new URL(option.entry)
    const entryOrigin = entryUrl.origin
    const blob = new Blob([generateFrameHtml(entryOrigin)], { type: 'text/html' })
    iframe.src = URL.createObjectURL(blob)
    iframe.hidden = true
    defineProperty(root, 'frameElement', { value: iframe })

    const [response] = await Promise.all([
      fetch(option.entry, option.fetchOption),
      new Promise((resolve) => {
        addEventListenerTo(iframe, 'load', resolve, { once: true })
        // DocumentFragment.prototype.append.call(root, iframe, style, doc)
        DocumentFragment.prototype.append.call(root, iframe)
      }),
    ])
    addEventListenerTo(iframe, 'load', () => onIframeReload(option, root))

    const htmlText = await response.text()
    initShadowDom(option, root, htmlText, origin)
  }
  catch (error) {
    warn(error)
  }
  root.host.dispatchEvent(new Event('load'))
}

function initShadowDom(option: MicroAppOption, root: MicroAppRoot, htmlText: string, origin: string) {
  const { contentWindow, contentDocument } = root.frameElement
  const newDoc = domParser.parseFromString(htmlText, 'text/html')
  const baseElem = document.createElement('base')
  baseElem.href = origin
  const externalHtmlEl = newDoc.documentElement
  newDoc.head.appendChild(baseElem)

  // 这里只是设置属性，还没有把 DOM 挂载上去
  defineProperties(root, {
    documentElement: {
      configurable: true,
      value: externalHtmlEl,
    },
    head: {
      configurable: true,
      value: newDoc.head,
    },
    body: {
      configurable: true,
      value: newDoc.body,
    },
  })

  // Isolate <base> element
  const internalHtmlEl = contentDocument.documentElement
  const baseEl = externalHtmlEl.querySelector('base')
  if (baseEl) {
    const clonedBaseElem = baseEl.cloneNode()
    appendChildTo(internalHtmlEl, clonedBaseElem)
  }

  // Recreate <script> elements
  const scriptList = externalHtmlEl.querySelectorAll('script')
  const newScripts: HTMLScriptElement[] = []
  const deferScripts: HTMLScriptElement[] = []
  const asyncScripts: HTMLScriptElement[] = []
  scriptList.forEach((el) => {
    const { type, attributes } = el
    if (SCRIPT_TYPES.includes(type)) {
      const newEl = contentDocument.createElement('script')
      newEl.text = el.text
      newEl.async = el.async // fix: the default value of "async" is true
      for (let i = 0, { length } = attributes; i < length; ++i) {
        newEl.setAttribute(attributes[i].name, attributes[i].value)
      }
      el.type = `m;${el.type}`
      newScripts.push(newEl)
      if (newEl.defer) {
        deferScripts.push(newEl)
      }
      else if (newEl.async) {
        asyncScripts.push(newEl)
      }
    }
  })

  // Dispatch event "MicroAppReady" when the last script element has been loaded
  if (newScripts.length) {
    let lastScriptEl: HTMLScriptElement
    if (deferScripts.length) {
      lastScriptEl = deferScripts[deferScripts.length - 1]
    }
    else if (asyncScripts.length) {
      lastScriptEl = asyncScripts[asyncScripts.length - 1]
    }
    else {
      lastScriptEl = newScripts[newScripts.length - 1]
    }
    const listener = () => {
      contentWindow.dispatchEvent(new Event('MicroAppReady'))
    }
    addEventListenerTo(lastScriptEl, 'load', listener)
    addEventListenerTo(lastScriptEl, 'error', listener)
  }

  defineProperty(contentWindow, 'mRoot', { value: root })
  // contentWindow.history.replaceState(option.initialState, '', option.initialUrl) // TODO 修复这个问题
  console.log('running here')
  syncUrlToTopWindow(contentWindow, option)
  hijackEventAttr([externalHtmlEl], root, contentWindow)
  hijackNodeMethodsOfIframe(contentWindow)
  option.beforeReady?.(contentWindow)

  requestAnimationFrame(() => {
    appendChildTo(root, externalHtmlEl)
    appendTo(internalHtmlEl, ...newScripts)
  })
}

function onIframeReload(option: MicroAppOption, root: MicroAppRoot) {
  const { contentWindow, contentDocument } = root.frameElement
  if (contentDocument === null) {
    const name = option.id ? ` "${option.id}"` : ''
    const message = `app${name} lost connection`
    warn(message)
    // eslint-disable-next-line no-alert
    alert(message)
    return
  }

  const { documentElement, head, body } = contentDocument
  const newHtmlEl = contentDocument.createElement('html')
  const baseEl = documentElement.querySelector('base')

  defineProperty(contentWindow, 'mRoot', { value: root })
  updateTopWindowUrl(option, contentWindow)
  syncUrlToTopWindow(contentWindow, option)
  hijackEventAttr([documentElement], root, contentWindow)
  hijackNodeMethodsOfIframe(contentWindow)

  requestAnimationFrame(() => {
    if (baseEl) {
      appendChildTo(newHtmlEl, baseEl)
    }
    replaceChild.call(root.document, documentElement, root.documentElement)
    defineProperties(root, {
      documentElement: { value: documentElement },
      head: { value: head },
      body: { value: body },
    })
    appendChildTo(contentDocument, newHtmlEl)
    option.beforeReady?.(contentWindow)
    contentWindow.dispatchEvent(new Event('MicroAppReady'))
  })
}

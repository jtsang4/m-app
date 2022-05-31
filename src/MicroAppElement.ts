import { initOption } from './helpers/init-option'
import { initApp } from './helpers/init-app'
import { defineProperties } from './helpers/utils'

export default class MicroAppElement extends HTMLElement {
  _option: MicroAppOption
  #root: MicroAppRoot

  connectedCallback() {
    const option = initOption(this)
    this._option = option
    let shadowRoot: MicroAppRoot
    if (this.#root) {
      shadowRoot = this.#root
    }
    else {
      shadowRoot = <MicroAppRoot> this.attachShadow({ mode: option.shadowMode })
      this.#root = shadowRoot
    }
    initApp(option, shadowRoot)
  }

  disconnectedCallback() {
    this.#root.innerHTML = ''
    defineProperties(this.#root, {
      documentElement: { value: null },
      head: { value: null },
      body: { value: null },
    })
  }
}

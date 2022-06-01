declare type MicroAppOption = {
  id?: string
  entry?: string
  route?: RegExp
  shadowMode?: ShadowRootMode
  runtimePath?: string
  fetchOption?: object
  beforeReady?: (win: Window) => void
  initialUrl?: string
  initialState?: any
  publicPath?: string
}

declare type MicroAppRoot = {
  frameElement: HTMLIFrameElement
  documentElement: HTMLHtmlElement
  head: HTMLHeadElement
  body: HTMLBodyElement
  host: MicroAppElement
  document: HTMLElement
} & ShadowRoot

declare type MicroAppElement = {
  _option: MicroAppOption
} & HTMLElement

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
declare interface HTMLElement {
  replaceChildren(...nodes: (string | Node)[]): void
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
declare interface Window {
  mRoot?: MicroAppRoot
  HTMLElement: Function
  ShadowRoot: Function
  History: Function
  Node: Function
  Function: (...args: string[]) => Function
}

declare function setAppOption(id: string, option: MicroAppOption, merge?: boolean)
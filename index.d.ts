
interface MicroAppOption {
    id?: string;
    entry?: string;
    route?: RegExp;
    shadowMode: ShadowRootMode;
    runtimePath: string;
    fetchOption?: object;
}

interface MicroAppRoot extends ShadowRoot {
    frameElement?: HTMLIFrameElement;
    documentElement?: HTMLHtmlElement;
    head?: HTMLHeadElement;
    body?: HTMLBodyElement;
}

interface MicroAppElement extends HTMLElement {}

declare interface HTMLElement {
    replaceChildren(...nodes: (string | Node)[]): void;
}

declare interface Window {
    mRoot?: MicroAppRoot;
    HTMLElement: Function;
    ShadowRoot: Function;
    History: Function;
    Node: Function;
}
/**
 * The inheritance relationships:
 *   ShadowRoot -> DocumentFragment(impl ParentNode) -> Node -> EventTarget
 *   HTMLDocument -> Document(impl ParentNode) -> Node -> EventTarget
 *   HTMLHtmlElement -> HTMLElement -> Element(impl ParentNode, ChildNode) -> Node -> EventTarget
 *   HTMLBodyElement -> HTMLElement -> Element(impl ParentNode, ChildNode) -> Node -> EventTarget
 *   HTMLHeadElement -> HTMLElement -> Element(impl ParentNode, ChildNode) -> Node -> EventTarget
 */
import { PROTOTYPE } from './constant';
import { alternativeMethods } from './alternative-methods';
import { defineProperties, defineProperty, entries, getOwnPropertyDescriptor, keys } from './utils';


const methodsOfEventTargetProto = getObjectMethods(EventTarget[PROTOTYPE]);
const methodsOfNodeProto = getObjectMethods(Node[PROTOTYPE]);
const methodsOfParentNodeProto = getObjectMethods(DocumentFragment[PROTOTYPE]);
const methodsOfDocument = methodsOfParentNodeProto.concat(methodsOfNodeProto, methodsOfEventTargetProto);

function getObjectMethods(obj: object): string[] {
    const methods: string[] = [];
    for (const key of keys(obj)) {
        const desc = getOwnPropertyDescriptor(obj, key);
        if (typeof desc.value === 'function') {
            methods.push(key);
        }
    }
    return methods;
}


export function hijackNodeMethodsOfGlobal() {
    hijackElement(window);
    hijackShadowRoot(window);
}


export function hijackNodeMethodsOfIframe(contentWindow: Window) {
    hijackElement(contentWindow);
    hijackDocument(contentWindow);
    hijackWindow(contentWindow);
}


function hijackElement({ HTMLElement }: Window) {
    for (const [key, method] of entries(alternativeMethods)) {
        HTMLElement[PROTOTYPE][key] = method;
    }
}


function hijackShadowRoot({ ShadowRoot }: Window) {
    for (const [key, method] of entries(alternativeMethods)) {
        if (key in ShadowRoot[PROTOTYPE]) {
            ShadowRoot[PROTOTYPE][key] = method;
        }
    }
}


const commonDesc = {
    configurable: true,
    enumerable: false,
    writable: true,
};


function hijackDocument({ document, mRoot }: Window) {
    for (const key of methodsOfDocument) {
        defineProperty(document, key, {
            ...commonDesc,
            value: (...args) => mRoot[key](...args),
        });
    }
    defineProperties(document, {
        getElementById: {
            ...commonDesc,
            value: (id: string) => mRoot.querySelector(`#${id}`),
        },
        getElementsByClassName: {
            ...commonDesc,
            value(names: string) {
                const selector = names.split(/\s+/).map(name => `.${name}`).join('');
                return mRoot.querySelectorAll(selector);
            },
        },
        getElementsByName: {
            ...commonDesc,
            value: (name: string) => mRoot.querySelectorAll(`[name=${name}]`),
        },
        getElementsByTagName: {
            ...commonDesc,
            value: (name: string) => mRoot.querySelectorAll(name),
        },
        activeElement: {
            enumerable: true,
            get: () => mRoot.activeElement,
        },
        documentElement: {
            enumerable: true,
            get: () => mRoot.documentElement,
        },
        head: {
            enumerable: true,
            get: () => mRoot.head,
        },
        body: {
            enumerable: true,
            get: () => mRoot.body,
        },
    });
}


function hijackWindow(contentWindow: Window) {
    const { getComputedStyle } = contentWindow;
    contentWindow.getComputedStyle = (el: Element, ...args) => {
        const win = el?.ownerDocument?.defaultView;
        return win
            // @ts-ignore
            ? el.host?.tagName === 'M-APP' ? el.host.style : win.getComputedStyle(el, ...args)
            : getComputedStyle(el, ...args);
    };
}
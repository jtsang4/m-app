import { addEventListenerTo, appendChildTo, appendTo, defineProperties, defineProperty, warn } from './utils';
import { syncUrlToTopWindow, updateTopWindowUrl } from './sync-url';
import { hijackNodeMethodsOfIframe } from './hijack-node-methods';
import { SCRIPT_TYPES } from './constant';


export async function initApp(option: MicroAppOption, root: MicroAppRoot) {
    try {
        const iframe = document.createElement('iframe');
        iframe.src = option.runtimePath;
        iframe.hidden = true;
        const [ response ] = await Promise.all([
            fetch(option.entry, option.fetchOption),
            new Promise(resolve => {
                addEventListenerTo(iframe, 'load', resolve, { once: true });
                appendChildTo(root, iframe);
            }),
        ]);
        defineProperty(root, 'frameElement', { value: iframe });
        addEventListenerTo(iframe, 'load', () => onIframeReload(option, root));
        const htmlText = await response.text();
        initShadowDom(option, root, htmlText);
    } catch (error) {
        warn(error);
    }
    root.host.dispatchEvent(new Event('load'));
}


function initShadowDom(option: MicroAppOption, root: MicroAppRoot, htmlText: string) {
    const { contentWindow, contentDocument } = root.frameElement;
    const htmlEl = contentDocument.createElement('html');
    htmlEl.innerHTML = htmlText;
    defineProperties(root, {
        documentElement: {
            configurable: true,
            value: htmlEl,
        },
        head: {
            configurable: true,
            value: htmlEl.querySelector('head'),
        },
        body: {
            configurable: true,
            value: htmlEl.querySelector('body'),
        },
    });

    // Isolate <base> element
    const baseEl = htmlEl.querySelector('base');
    if (baseEl) {
        appendChildTo(contentDocument.head, baseEl);
    }

    // Recreate <script> elements
    const scriptList = htmlEl.querySelectorAll('script');
    const newScripts: HTMLScriptElement[] = [];
    const deferScripts: HTMLScriptElement[] = [];
    const asyncScripts: HTMLScriptElement[] = [];
    scriptList.forEach(el => {
        const { type, attributes } = el;
        if (SCRIPT_TYPES.includes(type)) {
            const newEl = contentDocument.createElement('script');
            for (let i = 0, { length } = attributes; i < length; ++i) {
                newEl.setAttribute(attributes[i].name, attributes[i].value);
            }
            newEl.text = el.text;
            newScripts.push(newEl);
            if (newEl.defer) {
                deferScripts.push(newEl);
            } else if (newEl.async) {
                asyncScripts.push(newEl);
            }
        }
    });

    // Dispatch event "MicroAppReady" when the last script element has been loaded
    if (newScripts.length) {
        let lastScriptEl: HTMLScriptElement;
        if (deferScripts.length) {
            lastScriptEl = deferScripts[deferScripts.length - 1];
        } else if (asyncScripts.length) {
            lastScriptEl = asyncScripts[asyncScripts.length - 1];
        } else {
            lastScriptEl = newScripts[newScripts.length - 1];
        }
        const listener = () => {
            contentWindow.dispatchEvent(new Event('MicroAppReady'));
        };
        addEventListenerTo(lastScriptEl, 'load', listener);
        addEventListenerTo(lastScriptEl, 'error', listener);
    }

    defineProperty(contentWindow, 'mRoot', { value: root });
    contentWindow.history.replaceState(history.state, '', location.href);
    syncUrlToTopWindow(contentWindow, option);
    hijackNodeMethodsOfIframe(contentWindow);
    
    requestAnimationFrame(() => {
        appendChildTo(root, htmlEl);
        appendTo(contentDocument.body, ...newScripts);
    });
}



function onIframeReload(option: MicroAppOption, root: MicroAppRoot) {
    const { contentWindow, contentDocument } = root.frameElement;
    if (contentDocument === null) {
        const name = option.id ? ` "${option.id}"` : '';
        warn(`app${name} lost connection`);
        return;
    }

    // Create a new DOM tree
    const newHtmlEl = contentDocument.createElement('html');
    const newHeadEl = contentDocument.createElement('head');
    appendTo(newHtmlEl, newHeadEl, contentDocument.createElement('body'));

    // Isolate <base> element
    const { documentElement, head, body } = contentDocument;
    const baseEl = documentElement.querySelector('base');
    if (baseEl) {
        appendChildTo(newHeadEl, baseEl);
    }

    // Move iframe DOM tree into Shadow DOM
    root.replaceChild(documentElement, root.documentElement);
    defineProperties(root, {
        documentElement: {
            value: documentElement,
        },
        head: {
            value: head,
        },
        body: {
            value: body,
        },
    });

    // Append new Dom tree into iframe
    appendChildTo(contentDocument, newHtmlEl);

    defineProperty(contentWindow, 'mRoot', { value: root });
    updateTopWindowUrl(option, contentWindow);
    syncUrlToTopWindow(contentWindow, option);
    hijackNodeMethodsOfIframe(contentWindow);
    contentWindow.dispatchEvent(new Event('MicroAppReady'));
}
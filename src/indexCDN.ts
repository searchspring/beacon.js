import { Beacon } from './Beacon';
import { getContext } from '@searchspring/snap-toolbox';

const SEARCHSPRING_CDN_HOST = 'snapui.searchspring.io';
const ATHOSCOMMERCE_CDN_HOST = 'snapui.athoscommerce.io';

let siteId;
let domain: 'searchspring' | 'athos' = 'searchspring';
let scriptEl = document.currentScript as HTMLScriptElement;

if(!scriptEl) {
    scriptEl = document.querySelector(`script[src*="${SEARCHSPRING_CDN_HOST}/beacon.js"],script[src*="${ATHOSCOMMERCE_CDN_HOST}/beacon.js"]`) as HTMLScriptElement;
}

if(scriptEl) {
    const siteIdAttribute = scriptEl.getAttribute('siteId');
    if (siteIdAttribute) {
        siteId = siteIdAttribute;
    } else {
        const context = getContext(['siteId'], scriptEl);
        if (context.siteId) {
            siteId = context.siteId;
        }
    }

    if(scriptEl.src && scriptEl.src.includes('athoscommerce')) {
        domain = 'athos';
    }
}

if(typeof window !== 'undefined') {
    if(!window.Beacon) {
        window.Beacon = Beacon;
    }
    if (!window[domain]?.tracker) {
        window[domain] = window[domain] || {};
        window[domain].tracker = new Beacon({ siteId });
    }
}

export { Beacon };
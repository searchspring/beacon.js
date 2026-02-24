import packageJSON from '../package.json';
export const { version } = packageJSON;
import { Beacon } from './Beacon';
import { getContext } from './utils/getContext';

const scriptEl = document.currentScript as HTMLScriptElement;
if (scriptEl) {
	try {
		const context = getContext(['siteId', 'siteid'], scriptEl);
		const siteId = `${context.siteId || context.siteid}`.trim().toLowerCase();
		let initializeBeacon = true;

		if (typeof window !== 'undefined') {
			if (window.searchspring?.tracker?.track || window.athos?.tracker?.track) {
				console.warn('Beacon: This script should be removed. An existing Snap instance is already on the page.');
				initializeBeacon = false;
			}
			if (window.athos?.tracker && !window.athos?.tracker?.track) {
				console.warn('Beacon: Beacon script included multiple times. Second initialization ignored.');
				initializeBeacon = false;
			}
			if (!siteId) {
				throw new Error('Beacon: No siteId found in script context. Beacon will not initialize.');
			}
			if (initializeBeacon) {
				const domain = siteId.startsWith('at') ? 'athos' : 'searchspring';
				window.athos = window.athos || {};
				window.athos.tracker = new Beacon({ siteId }, { initiator: `${domain}/cdn/beaconjs/${version}` });
			}
		}
	} catch (e) {
		console.error(e);
	}
}

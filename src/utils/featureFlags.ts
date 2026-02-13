export function getFlags(): FeatureFlags {
	return {
		cookies: function () {
			return typeof window == 'undefined' ? false : window?.navigator?.cookieEnabled;
		},
		storage: function () {
			const test = 'ss-test';
			if (typeof window == 'undefined') {
				return false;
			}

			try {
				window?.localStorage.setItem(test, test);
				window?.localStorage.removeItem(test);

				return true;
			} catch {
				return false;
			}
		},
	};
}

interface FeatureFlags {
	cookies: () => boolean;
	storage: () => boolean;
}

const flags = getFlags();
export const featureFlags = {
	cookies: flags.cookies(),
	storage: flags.storage(),
};

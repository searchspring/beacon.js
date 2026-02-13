import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	eslintConfigPrettier,
	{
		ignores: [
			'src/client/**',
			'dist/**',
			'coverage/**',
			'public/**',
		],
	},
	{
		languageOptions: {
			ecmaVersion: 2020,
			sourceType: 'module',
		},
		rules: {
			'no-debugger': 'error',
			'no-unsafe-finally': 'warn',
			'@typescript-eslint/ban-ts-comment': [
				'warn',
				{ 'ts-ignore': 'allow-with-description' },
			],
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/no-non-null-assertion': 'error',
			'@typescript-eslint/no-non-null-asserted-optional-chain': 'error',
			'@typescript-eslint/no-empty-function': 'error',
			'@typescript-eslint/no-unused-vars': 'error',
		},
	}
);

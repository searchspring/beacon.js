name: PublishGithub

on:
  workflow_run:
    workflows: ["Publish"]
    types: [completed]

jobs:
  PublishGithub:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      packages: write
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: "0"
          token: ${{ secrets.MACHINE_PAT }}

      - name: Set Github credentials
        run: |
          git config user.name searchspring-machine
          git config user.email machine@searchspring.com

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://npm.pkg.github.com'
          scope: '@searchspring'
        env:
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Install packages
        run: npm ci
      
      - name: Build
        run: npm run build

      - name: Test
        run: npm run test
      
      - name: Publish packages to github
        run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
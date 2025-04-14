export default {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
  ],
  plugins: [
    // Handle import.meta
    function () {
      return {
        visitor: {
          MetaProperty(path) {
            if (path.node.meta.name === 'import' && path.node.property.name === 'meta') {
              path.replaceWithSourceString('({ env: { VITE_SUPABASE_URL: "test-url", VITE_SUPABASE_ANON_KEY: "test-key" } })');
            }
          }
        }
      };
    }
  ]
}; 
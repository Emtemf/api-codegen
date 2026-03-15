module.exports = {
  apps: [
    {
      name: 'api-codegen-web-ui',
      cwd: './web-ui',
      script: 'npx',
      args: '-y serve . -l 8080',
      interpreter: 'none',
      env: {
        NODE_ENV: 'development'
      }
    }
  ]
};

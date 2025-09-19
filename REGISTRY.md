# MCP Registry Publishing Guide

This repository is now ready for MCP Registry publishing! 🎉

## What's Been Done ✅

1. **server.json created** - Standardized MCP server description
2. **package.json updated** - Added `mcpName` field for NPM validation
3. **GitHub Actions workflow** - Automated publishing on releases
4. **Validation script** - Ensures server.json integrity
5. **Documentation updated** - README includes registry installation

## Manual Publishing Steps

If you want to publish manually (one-time setup):

### 1. Install mcp-publisher CLI
```bash
# Download and install
curl -L "https://github.com/modelcontextprotocol/registry/releases/download/v1.0.0/mcp-publisher_1.0.0_$(uname -s | tr '[:upper:]' '[:lower:]')_$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/').tar.gz" | tar xz mcp-publisher
chmod +x mcp-publisher
sudo mv mcp-publisher /usr/local/bin/
```

### 2. Authenticate with GitHub
```bash
mcp-publisher login github
```
This will open your browser for OAuth authentication.

### 3. Publish to Registry
```bash
mcp-publisher publish
```

### 4. Verify Publication
```bash
curl "https://registry.modelcontextprotocol.io/v0/servers?search=io.github.delorenj/mcp-server-trello"
```

## Automated Publishing 🤖

**Automatic publishing is set up!** The GitHub Actions workflow will:

- Trigger on new releases
- Trigger on changes to `server.json` or `package.json` on main branch  
- Validate the server.json file
- Build and test the project
- Publish to MCP Registry using GitHub OIDC

## Next Steps

1. **Create a release** to trigger automatic publishing
2. **Monitor the workflow** in GitHub Actions tab
3. **Verify registration** after successful workflow run

## Registry Benefits

✅ **Discoverable** - Users can find your server in MCP clients  
✅ **Automatic installation** - No manual setup required  
✅ **Version management** - Automatic updates when you release  
✅ **Standards compliance** - Follows MCP best practices

Your MCP Server Trello is now ready for the official registry! 🚀
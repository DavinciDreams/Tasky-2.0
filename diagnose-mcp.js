#!/usr/bin/env node

/**
 * MCP Diagnostic Tool - Find out why tools aren't showing
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('🔍 Diagnosing MCP Configuration Issues...\n');

// Check all possible MCP config locations
const configPaths = [
  // Local project configs
  path.join(process.cwd(), '.cursor', 'mcp.json'),
  path.join(process.cwd(), 'mcp-config.json'),
  
  // User configs
  path.join(os.homedir(), '.cursor', 'mcp.json'),
  path.join(process.env.APPDATA || '', 'Cursor', 'User', 'mcp-config.json'),
  path.join(process.env.APPDATA || '', 'Cursor', 'User', 'globalStorage', 'mcp.json'),
  
  // Alternative locations
  path.join(process.env.LOCALAPPDATA || '', 'Cursor', 'User', 'mcp.json'),
  path.join(process.env.USERPROFILE || '', '.cursor', 'mcp.json'),
];

console.log('📁 Checking MCP config file locations:\n');

let foundConfigs = [];

configPaths.forEach((configPath, index) => {
  const exists = fs.existsSync(configPath);
  console.log(`${exists ? '✅' : '❌'} ${configPath}`);
  
  if (exists) {
    try {
      const content = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(content);
      const hasTasky = config.mcpServers && config.mcpServers.tasky;
      
      foundConfigs.push({
        path: configPath,
        hasTasky,
        serverCount: Object.keys(config.mcpServers || {}).length
      });
      
      console.log(`   📊 Servers: ${Object.keys(config.mcpServers || {}).length}, Has Tasky: ${hasTasky ? '✅' : '❌'}`);
    } catch (e) {
      console.log(`   ❌ Invalid JSON: ${e.message}`);
    }
  }
});

console.log('\n📋 Summary of found configs:');
foundConfigs.forEach(config => {
  console.log(`   ${config.hasTasky ? '✅' : '❌'} ${config.path}`);
  console.log(`      Servers: ${config.serverCount}, Tasky: ${config.hasTasky}`);
});

// Test MCP agent directly
console.log('\n🧪 Testing MCP Agent directly...');
const { spawn } = require('child_process');

const testAgent = () => {
  return new Promise((resolve) => {
    const agent = spawn('node', ['tasky-mcp-agent/dist/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let output = '';
    agent.stderr.on('data', (data) => {
      output += data.toString();
    });
    
    setTimeout(() => {
      agent.kill();
      resolve(output.includes('Tasky MCP Agent started'));
    }, 2000);
  });
};

testAgent().then(started => {
  console.log(`   MCP Agent: ${started ? '✅ Working' : '❌ Failed'}`);
  
  console.log('\n🎯 Recommendations:');
  
  if (foundConfigs.length === 0) {
    console.log('   ❌ No MCP configs found - This is the problem!');
    console.log('   📝 Create config at: %APPDATA%\\Cursor\\User\\globalStorage\\mcp.json');
  } else if (foundConfigs.filter(c => c.hasTasky).length === 0) {
    console.log('   ❌ No configs contain Tasky server - This is the problem!');
    console.log('   📝 Add Tasky server to one of the existing configs');
  } else {
    console.log('   ✅ Configs look good. Try these steps:');
    console.log('   1. Completely restart Cursor (close all windows)');
    console.log('   2. Wait 10 seconds after restart');
    console.log('   3. Open new chat and check for tools');
    console.log('   4. If still no tools, try creating a new workspace');
  }
  
  if (!started) {
    console.log('   ❌ MCP Agent not starting - rebuild it:');
    console.log('      cd tasky-mcp-agent && npm run build');
  }
});

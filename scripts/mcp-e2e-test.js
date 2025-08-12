/*
 End-to-end MCP tools test against the HTTP agent on localhost:7843
 - initialize → capture session header
 - tools/list → ensure expected tools
 - tasky_create_task → create
 - tasky_get_task → fetch
 - tasky_update_task → update
 - tasky_list_tasks → list
 - tasky_delete_task → delete
 - tasky_create_reminder → create
 - tasky_list_reminders → list
*/

const MCP_URL = process.env.MCP_URL || 'http://localhost:7843/mcp';

async function post(method, params = {}, headers = {}, id = 1) {
  const res = await fetch(MCP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params })
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch {
    throw new Error(`Non-JSON response for ${method}: ${text}`);
  }
  return { res, json };
}

(async () => {
  try {
    console.log(`MCP E2E → ${MCP_URL}`);

    // initialize
    const init = await post('initialize', { clientInfo: { name: 'e2e', version: '1.0.0' } });
    const sessionId = init.res.headers.get('mcp-session-id');
    if (!sessionId) throw new Error('Missing mcp-session-id header');
    console.log('✓ initialize, session:', sessionId);

    const commonHeaders = { 'mcp-session-id': sessionId };

    // tools/list
    const list = await post('tools/list', {}, commonHeaders);
    const toolNames = (list.json.result?.tools || []).map(t => t.name);
    const required = ['tasky_create_task','tasky_update_task','tasky_delete_task','tasky_get_task','tasky_list_tasks','tasky_execute_task','tasky_create_reminder','tasky_list_reminders'];
    const missing = required.filter(n => !toolNames.includes(n));
    if (missing.length) throw new Error('Missing tools: ' + missing.join(', '));
    console.log('✓ tools/list includes expected tools');

    // create task
    const title = `E2E Task ${Date.now()}`;
    const create = await post('tools/call', { name: 'tasky_create_task', arguments: { title, description: 'e2e test' } }, commonHeaders);
    const createdSummary = create.json.result?.content?.[0]?.text || '';
    const createdObjText = create.json.result?.content?.[1]?.text || '';
    const created = createdObjText ? JSON.parse(createdObjText) : null;
    if (!created?.schema?.id) throw new Error('Create task did not return task object');
    const taskId = created.schema.id;
    console.log('✓ task created:', taskId);

    // get task
    const got = await post('tools/call', { name: 'tasky_get_task', arguments: { id: taskId } }, commonHeaders);
    if (got.json.result?.isError) throw new Error('get_task returned error');
    console.log('✓ task fetched');

    // update task
    const upd = await post('tools/call', { name: 'tasky_update_task', arguments: { id: taskId, updates: { status: 'IN_PROGRESS' } } }, commonHeaders);
    if (upd.json.result?.isError) throw new Error('update_task returned error');
    console.log('✓ task updated to IN_PROGRESS');

    // list tasks
    const listTasks = await post('tools/call', { name: 'tasky_list_tasks', arguments: { search: 'E2E Task' } }, commonHeaders);
    const listPayload = listTasks.json.result?.content?.[1]?.text || '[]';
    const tasksArr = JSON.parse(listPayload);
    if (!Array.isArray(tasksArr)) throw new Error('list_tasks did not return array');
    console.log(`✓ task list returned ${tasksArr.length} items`);

    // create reminder
    const rem = await post('tools/call', { name: 'tasky_create_reminder', arguments: { message: 'E2E Reminder', time: '09:00', days: ['Mon'] } }, commonHeaders);
    if (rem.json.result?.isError) throw new Error('create_reminder returned error');
    console.log('✓ reminder created');

    // list reminders
    const remList = await post('tools/call', { name: 'tasky_list_reminders', arguments: { search: 'E2E' } }, commonHeaders);
    const remPayload = remList.json.result?.content?.[1]?.text || '[]';
    const remArr = JSON.parse(remPayload);
    if (!Array.isArray(remArr)) throw new Error('list_reminders did not return array');
    console.log(`✓ reminders list returned ${remArr.length} items`);

    // cleanup task
    await post('tools/call', { name: 'tasky_delete_task', arguments: { id: taskId } }, commonHeaders);
    console.log('✓ cleanup done');

    console.log('E2E OK');
    process.exit(0);
  } catch (e) {
    console.error('E2E FAILED:', e?.stack || e?.message || String(e));
    process.exit(1);
  }
})();



import { ReminderBridge } from './utils/reminder-bridge.js';

async function main() {
	const dbPath = process.env.TASKY_DB_PATH || 'UNSET';
	console.error('[test-reminders] Using DB:', dbPath);

	const bridge = new ReminderBridge();

	const now = new Date();
	const hh = 20; // 8pm
	const mm = 0;
	const time = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;

	const create = await bridge.createReminder({
		message: 'Call mom',
		time,
		// no days provided to test default daily schedule
		enabled: true,
		oneTime: false,
	});
	console.log('[create] isError=', (create as any).isError, 'content=', create.content);

	const list = await bridge.listReminders({});
	const parsed = (() => {
		try {
			const jsonText = (list.content?.[1] as any)?.text || (list.content?.[0] as any)?.text;
			return JSON.parse(jsonText);
		} catch {
			return [] as any[];
		}
	})();
	console.log('[list] count=', Array.isArray(parsed) ? parsed.length : 'n/a');
	if (Array.isArray(parsed) && parsed.length) {
		const last = parsed[parsed.length - 1];
		console.log('[last]', last);
	}
}

main().catch((e) => {
	console.error('[test-reminders] Error:', e);
	process.exit(1);
});


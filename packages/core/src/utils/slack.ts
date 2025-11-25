export async function sendSlack(
	content: string,
	webhookUrl: string,
): Promise<void> {
	const response = await fetch(webhookUrl, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			text: "📊 *Customer Churn Risk Report*",
			blocks: [
				{
					type: "header",
					text: {
						type: "plain_text",
						text: "📊 Customer Churn Risk Report",
					},
				},
				{
					type: "section",
					text: {
						type: "mrkdwn",
						text: content,
					},
				},
			],
		}),
	});

	if (!response.ok) {
		throw new Error(`Slack send failed: ${response.statusText}`);
	}
}
